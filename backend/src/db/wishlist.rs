use sqlx::PgExecutor;
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WishlistItem {
    pub id: Uuid,
    pub room_id: Uuid,
    pub player_id: Uuid,
    pub title: String,
    pub url: Option<String>,
    pub image_url: Option<String>,
    pub price: Option<i64>,
}

pub struct NewItem<'a> {
    pub room_id: Uuid,
    pub player_id: Uuid,
    pub title: &'a str,
    pub url: Option<&'a str>,
    pub image_url: Option<&'a str>,
    pub price: Option<i64>,
}

const COLUMNS: &str = "id, room_id, player_id, title, url, image_url, price";

pub async fn insert(db: impl PgExecutor<'_>, item: NewItem<'_>) -> sqlx::Result<WishlistItem> {
    sqlx::query_as::<_, WishlistItem>(
        "insert into wishlist_items (room_id, player_id, title, url, image_url, price)
         values ($1, $2, $3, $4, $5, $6)
         returning id, room_id, player_id, title, url, image_url, price",
    )
    .bind(item.room_id)
    .bind(item.player_id)
    .bind(item.title)
    .bind(item.url)
    .bind(item.image_url)
    .bind(item.price)
    .fetch_one(db)
    .await
}

pub async fn find_by_id(db: impl PgExecutor<'_>, id: Uuid) -> sqlx::Result<Option<WishlistItem>> {
    sqlx::query_as::<_, WishlistItem>(&format!(
        "select {COLUMNS} from wishlist_items where id = $1"
    ))
    .bind(id)
    .fetch_optional(db)
    .await
}

pub async fn update(db: impl PgExecutor<'_>, item: &WishlistItem) -> sqlx::Result<WishlistItem> {
    sqlx::query_as::<_, WishlistItem>(
        "update wishlist_items set title = $2, url = $3, image_url = $4, price = $5
         where id = $1
         returning id, room_id, player_id, title, url, image_url, price",
    )
    .bind(item.id)
    .bind(&item.title)
    .bind(&item.url)
    .bind(&item.image_url)
    .bind(item.price)
    .fetch_one(db)
    .await
}

pub async fn delete(db: impl PgExecutor<'_>, id: Uuid) -> sqlx::Result<bool> {
    let result = sqlx::query("delete from wishlist_items where id = $1")
        .bind(id)
        .execute(db)
        .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn list_by_room(
    db: impl PgExecutor<'_>,
    room_id: Uuid,
) -> sqlx::Result<Vec<WishlistItem>> {
    sqlx::query_as::<_, WishlistItem>(&format!(
        "select {COLUMNS} from wishlist_items where room_id = $1 order by created_at, id"
    ))
    .bind(room_id)
    .fetch_all(db)
    .await
}

pub async fn list_by_player(
    db: impl PgExecutor<'_>,
    player_id: Uuid,
) -> sqlx::Result<Vec<WishlistItem>> {
    sqlx::query_as::<_, WishlistItem>(&format!(
        "select {COLUMNS} from wishlist_items where player_id = $1 order by created_at, id"
    ))
    .bind(player_id)
    .fetch_all(db)
    .await
}
