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
}

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
         returning id, room_id, name, avatar, is_organizer",
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
    sqlx::query_as::<_, Player>(
        "select id, room_id, name, avatar, is_organizer
         from players
         where token_hash = $1",
    )
    .bind(token_hash)
    .fetch_optional(db)
    .await
}

pub async fn find_by_name_in_room(
    db: impl PgExecutor<'_>,
    room_id: Uuid,
    name: &str,
) -> sqlx::Result<Option<Player>> {
    sqlx::query_as::<_, Player>(
        "select id, room_id, name, avatar, is_organizer
         from players
         where room_id = $1 and name = $2",
    )
    .bind(room_id)
    .bind(name)
    .fetch_optional(db)
    .await
}

pub async fn list_by_room(db: impl PgExecutor<'_>, room_id: Uuid) -> sqlx::Result<Vec<Player>> {
    sqlx::query_as::<_, Player>(
        "select id, room_id, name, avatar, is_organizer
         from players
         where room_id = $1
         order by created_at, id",
    )
    .bind(room_id)
    .fetch_all(db)
    .await
}
