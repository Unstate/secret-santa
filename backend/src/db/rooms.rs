use sqlx::PgExecutor;
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Room {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub budget: i32,
    pub status: String,
}

/// Код приглашения без похожих символов (0/O, 1/I/L).
const CODE_ALPHABET: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";

fn generate_code() -> String {
    use rand::Rng;

    let mut rng = rand::rng();
    (0..8)
        .map(|_| CODE_ALPHABET[rng.random_range(0..CODE_ALPHABET.len())] as char)
        .collect()
}

pub async fn insert(conn: &mut sqlx::PgConnection, name: &str, budget: i32) -> sqlx::Result<Room> {
    for _ in 0..8 {
        match insert_with_code(&mut *conn, &generate_code(), name, budget).await {
            Ok(room) => return Ok(room),
            Err(sqlx::Error::Database(e)) if e.is_unique_violation() => continue, // коллизия кода
            Err(e) => return Err(e),
        }
    }
    Err(sqlx::Error::Configuration(
        "не удалось сгенерировать уникальный код комнаты".into(),
    ))
}

async fn insert_with_code(
    db: impl PgExecutor<'_>,
    code: &str,
    name: &str,
    budget: i32,
) -> sqlx::Result<Room> {
    sqlx::query_as::<_, Room>(
        "insert into rooms (code, name, budget) values ($1, $2, $3)
         returning id, code, name, budget, status",
    )
    .bind(code)
    .bind(name)
    .bind(budget)
    .fetch_one(db)
    .await
}

pub async fn find_by_code(db: impl PgExecutor<'_>, code: &str) -> sqlx::Result<Option<Room>> {
    sqlx::query_as::<_, Room>("select id, code, name, budget, status from rooms where code = $1")
        .bind(code)
        .fetch_optional(db)
        .await
}

pub async fn update_settings(
    db: impl PgExecutor<'_>,
    room_id: Uuid,
    name: &str,
    budget: i32,
) -> sqlx::Result<Room> {
    sqlx::query_as::<_, Room>(
        "update rooms set name = $2, budget = $3 where id = $1
         returning id, code, name, budget, status",
    )
    .bind(room_id)
    .bind(name)
    .bind(budget)
    .fetch_one(db)
    .await
}

pub async fn set_status(db: impl PgExecutor<'_>, room_id: Uuid, status: &str) -> sqlx::Result<()> {
    sqlx::query("update rooms set status = $2 where id = $1")
        .bind(room_id)
        .bind(status)
        .execute(db)
        .await?;
    Ok(())
}
