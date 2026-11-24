use sqlx::PgExecutor;
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub id: Uuid,
    pub room_id: Uuid,
    pub name: String,
    pub avatar: i16,
    pub is_organizer: bool,
    pub wishlist_comment: Option<String>,
}

const COLUMNS: &str = "id, room_id, name, avatar, is_organizer, wishlist_comment";

pub async fn insert(
    db: impl PgExecutor<'_>,
    room_id: Uuid,
    name: &str,
    avatar: i16,
    is_organizer: bool,
    token_hash: &str,
) -> sqlx::Result<Player> {
    sqlx::query_as::<_, Player>(
        "insert into players (room_id, name, avatar, is_organizer, token_hash)
         values ($1, $2, $3, $4, $5)
         returning id, room_id, name, avatar, is_organizer, wishlist_comment",
    )
    .bind(room_id)
    .bind(name)
    .bind(avatar)
    .bind(is_organizer)
    .bind(token_hash)
    .fetch_one(db)
    .await
}

pub async fn find_by_token_hash(
    db: impl PgExecutor<'_>,
    token_hash: &str,
) -> sqlx::Result<Option<Player>> {
    sqlx::query_as::<_, Player>(&format!(
        "select {COLUMNS}
         from players
         where token_hash = $1"
    ))
    .bind(token_hash)
    .fetch_optional(db)
    .await
}

pub async fn find_by_name_in_room(
    db: impl PgExecutor<'_>,
    room_id: Uuid,
    name: &str,
) -> sqlx::Result<Option<Player>> {
    sqlx::query_as::<_, Player>(&format!(
        "select {COLUMNS}
         from players
         where room_id = $1 and name = $2"
    ))
    .bind(room_id)
    .bind(name)
    .fetch_optional(db)
    .await
}

pub async fn list_by_room(db: impl PgExecutor<'_>, room_id: Uuid) -> sqlx::Result<Vec<Player>> {
    sqlx::query_as::<_, Player>(&format!(
        "select {COLUMNS}
         from players
         where room_id = $1
         order by created_at, id"
    ))
    .bind(room_id)
    .fetch_all(db)
    .await
}

pub async fn set_wishlist_comment(
    db: impl PgExecutor<'_>,
    player_id: Uuid,
    comment: Option<&str>,
) -> sqlx::Result<()> {
    sqlx::query("update players set wishlist_comment = $2 where id = $1")
        .bind(player_id)
        .bind(comment)
        .execute(db)
        .await?;
    Ok(())
}
