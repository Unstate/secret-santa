//! Интеграционные тесты API против живого Postgres.
//!
//! Запуск: `SANTA_TEST_DB=postgres://santa:santa@localhost:5432/santa cargo test`
//! Без `SANTA_TEST_DB` тесты пропускаются (локально и в CI переменная задаётся).

use std::time::Duration;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use futures_util::StreamExt;
use serde_json::{Value, json};
use tower::ServiceExt;

use backend::{build_router, parser::ParserRegistry, state::AppState, ws::EventHub};

type TestApp = axum::Router;

async fn setup() -> Option<TestApp> {
    let Ok(url) = std::env::var("SANTA_TEST_DB") else {
        eprintln!("SANTA_TEST_DB не задан — интеграционные тесты пропущены");
        return None;
    };
    let pool = sqlx::postgres::PgPoolOptions::new()
        .acquire_timeout(Duration::from_secs(5))
        .connect(&url)
        .await
        .expect("тестовая БД недоступна");
    sqlx::migrate!()
        .run(&pool)
        .await
        .expect("миграции применились");

    Some(build_router(AppState {
        db: pool,
        events: EventHub::default(),
        parsers: ParserRegistry::new(),
    }))
}

async fn call(
    app: &TestApp,
    method: &str,
    uri: &str,
    token: Option<&str>,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(token) = token {
        builder = builder.header("authorization", format!("Bearer {token}"));
    }
    let request = builder
        .header("content-type", "application/json")
        .body(Body::from(
            body.map(|body| body.to_string()).unwrap_or_default(),
        ))
        .unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 1 << 20)
        .await
        .unwrap();
    let value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("ответ не JSON")
    };
    (status, value)
}

fn token_of(player: &Value) -> String {
    player["player"]["token"].as_str().unwrap().to_string()
}

#[tokio::test]
async fn full_room_lifecycle() {
    let Some(app) = setup().await else { return };

    // Комната: создатель — организатор.
    let (status, room) = call(
        &app,
        "POST",
        "/api/v1/rooms",
        None,
        Some(json!({"name": "Интеграционная комната", "budget": 150000, "organizerName": "Оля", "avatar": 1})),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{room}");
    assert_eq!(room["player"]["isOrganizer"], json!(true));
    let code = room["room"]["code"].as_str().unwrap().to_string();
    let organizer = token_of(&room);

    // Два игрока заходят по коду.
    let (_, anya) = call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/join"),
        None,
        Some(json!({"name": "Аня", "avatar": 7})),
    )
    .await;
    let anya = token_of(&anya);
    let (_, borya) = call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/join"),
        None,
        Some(json!({"name": "Боря", "avatar": 12})),
    )
    .await;
    let borya = token_of(&borya);

    // Дубликат имени и чужой токен.
    let (status, _) = call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/join"),
        None,
        Some(json!({"name": "Аня", "avatar": 2})),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
    let (status, error) = call(
        &app,
        "GET",
        &format!("/api/v1/rooms/{code}"),
        Some("плохой-токен"),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(error["code"], json!("unauthorized"));

    // Состав комнаты и id игроков.
    let (status, details) = call(
        &app,
        "GET",
        &format!("/api/v1/rooms/{code}"),
        Some(&organizer),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(details["players"].as_array().unwrap().len(), 3);
    let player_id = |name: &str| {
        details["players"]
            .as_array()
            .unwrap()
            .iter()
            .find(|player| player["name"] == json!(name))
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .to_string()
    };
    let (anya_id, borya_id) = (player_id("Аня"), player_id("Боря"));

    // Взаимные блокировки двух из трёх — неразрешимы, ловим на вводе.
    let (status, error) = call(
        &app,
        "PUT",
        &format!("/api/v1/rooms/{code}/exclusions"),
        Some(&organizer),
        Some(json!({"exclusions": [
            {"playerId": anya_id, "blockedRecipientId": borya_id},
            {"playerId": borya_id, "blockedRecipientId": anya_id},
        ]})),
    )
    .await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(error["code"], json!("shuffle_impossible"));

    // Валидное исключение сохраняется.
    let (status, saved) = call(
        &app,
        "PUT",
        &format!("/api/v1/rooms/{code}/exclusions"),
        Some(&organizer),
        Some(json!({"exclusions": [{"playerId": anya_id, "blockedRecipientId": borya_id}]})),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{saved}");
    assert_eq!(saved.as_array().unwrap().len(), 1);

    // Текущие пары читает организатор, игроку — forbidden.
    let (status, list) = call(
        &app,
        "GET",
        &format!("/api/v1/rooms/{code}/exclusions"),
        Some(&organizer),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        list,
        json!([{"playerId": anya_id, "blockedRecipientId": borya_id}])
    );
    let (status, _) = call(
        &app,
        "GET",
        &format!("/api/v1/rooms/{code}/exclusions"),
        Some(&anya),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    // Игрок шафлить не может.
    let (status, _) = call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/shuffle"),
        Some(&anya),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    // Шафл + ресафл, пока результат никто не открывал.
    for _ in 0..2 {
        let (status, _) = call(
            &app,
            "POST",
            &format!("/api/v1/rooms/{code}/shuffle"),
            Some(&organizer),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::NO_CONTENT);
    }

    // У каждого свой получатель, все получатели разные, исключение соблюдено.
    let mut recipients = Vec::new();
    for token in [&organizer, &anya, &borya] {
        let (status, assignment) = call(
            &app,
            "GET",
            &format!("/api/v1/rooms/{code}/me/assignment"),
            Some(token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        let recipient = assignment["recipient"]["name"]
            .as_str()
            .unwrap()
            .to_string();
        if token == &anya {
            assert_ne!(recipient, "Боря", "исключение Аня→Боря нарушено");
        }
        recipients.push(recipient);
    }
    recipients.sort();
    recipients.dedup();
    assert_eq!(recipients.len(), 3, "каждый выпадает ровно один раз");

    // Ресафл после открытия запрещён.
    let (status, error) = call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/shuffle"),
        Some(&organizer),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(error["code"], json!("reshuffle_blocked"));

    // Полный порядок — только организатор.
    let (status, pairs) = call(
        &app,
        "GET",
        &format!("/api/v1/rooms/{code}/assignments"),
        Some(&organizer),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(pairs.as_array().unwrap().len(), 3);
    let (status, _) = call(
        &app,
        "GET",
        &format!("/api/v1/rooms/{code}/assignments"),
        Some(&anya),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn wishlist_crud_and_permissions() {
    let Some(app) = setup().await else { return };

    let (_, room) = call(&app, "POST", "/api/v1/rooms", None,
        Some(json!({"name": "Комната вишлистов", "budget": 100000, "organizerName": "Оля", "avatar": 2}))).await;
    let code = room["room"]["code"].as_str().unwrap().to_string();
    let organizer = token_of(&room);
    let (_, anya) = call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/join"),
        None,
        Some(json!({"name": "Аня", "avatar": 7})),
    )
    .await;
    let anya = token_of(&anya);
    let (_, borya) = call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/join"),
        None,
        Some(json!({"name": "Боря", "avatar": 12})),
    )
    .await;
    let borya = token_of(&borya);
    let base = format!("/api/v1/rooms/{code}/wishlist");

    // Ручной товар без ссылки.
    let (status, item) = call(
        &app,
        "POST",
        &format!("{base}/items"),
        Some(&anya),
        Some(json!({"title": "Кружка", "price": 50000})),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{item}");
    assert_eq!(item["source"], json!("manual"));
    assert_eq!(item["url"], Value::Null);
    let item_id = item["id"].as_str().unwrap().to_string();

    // WB-артикул: даже если card API недоступен (403 по IP), ссылка генерируется.
    let (status, item) = call(
        &app,
        "POST",
        &format!("{base}/items"),
        Some(&anya),
        Some(json!({"source": "wildberries", "code": "198340521", "title": "Носки"})),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{item}");
    assert_eq!(
        item["url"],
        json!("https://www.wildberries.ru/catalog/198340521/detail.aspx")
    );

    // Чужой PATCH запрещён, свой работает.
    let (status, _) = call(
        &app,
        "PATCH",
        &format!("{base}/items/{item_id}"),
        Some(&borya),
        Some(json!({"title": "взлом"})),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, patched) = call(
        &app,
        "PATCH",
        &format!("{base}/items/{item_id}"),
        Some(&anya),
        Some(json!({"price": 99900})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(patched["price"], json!(99900));

    // Удаление своим, список после этого — из одного товара.
    let (status, _) = call(
        &app,
        "DELETE",
        &format!("{base}/items/{item_id}"),
        Some(&anya),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    let (status, list) = call(&app, "GET", &base, Some(&organizer), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(list.as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn ws_broadcasts_player_joined() {
    let Some(app) = setup().await else { return };

    let (_, room) = call(&app, "POST", "/api/v1/rooms", None,
        Some(json!({"name": "Комната событий", "budget": 100000, "organizerName": "Оля", "avatar": 3}))).await;
    let code = room["room"]["code"].as_str().unwrap().to_string();
    let (_, anya) = call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/join"),
        None,
        Some(json!({"name": "Аня", "avatar": 7})),
    )
    .await;
    let anya = token_of(&anya);

    // Реальный сервер на эфемерном порту — для WS-рукопожатия.
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn({
        let app = app.clone();
        async move {
            axum::serve(listener, app).await.unwrap();
        }
    });

    // Плохой токен — рукопожатие не проходит.
    let bad = tokio_tungstenite::connect_async(format!(
        "ws://{addr}/api/v1/rooms/{code}/ws?token=badtoken"
    ))
    .await;
    assert!(bad.is_err(), "недействительный токен должен отклоняться");

    // Аня подписывается на события комнаты.
    let (mut socket, _) = tokio_tungstenite::connect_async(format!(
        "ws://{addr}/api/v1/rooms/{code}/ws?token={anya}"
    ))
    .await
    .expect("валидный токен должен подключаться");

    // Новый игрок по REST → Аня получает playerJoined по WS.
    call(
        &app,
        "POST",
        &format!("/api/v1/rooms/{code}/join"),
        None,
        Some(json!({"name": "Боря", "avatar": 12})),
    )
    .await;
    let message = tokio::time::timeout(Duration::from_secs(5), socket.next())
        .await
        .expect("событие не пришло за 5 секунд")
        .expect("поток не оборвался")
        .expect("без ошибок протокола");
    let event: Value = serde_json::from_str(&message.into_text().unwrap()).unwrap();
    assert_eq!(event["type"], json!("playerJoined"));
    assert_eq!(event["name"], json!("Боря"));
    // Поля событий — camelCase, как и во всём REST-контракте.
    assert!(event["playerId"].is_string());
    assert!(event["player_id"].is_null());
}
