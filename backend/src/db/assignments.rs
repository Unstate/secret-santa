use sqlx::PgExecutor;
use uuid::Uuid;

use super::players::Player;

pub async fn replace_all(
    conn: &mut sqlx::PgConnection,
    room_id: Uuid,
    pairs: &[(Uuid, Uuid)],
) -> sqlx::Result<()> {
    sqlx::query("delete from assignments where room_id = $1")
        .bind(room_id)
        .execute(&mut *conn)
        .await?;

    for (giver_id, recipient_id) in pairs {
        sqlx::query(
            "insert into assignments (room_id, giver_id, recipient_id) values ($1, $2, $3)",
        )
        .bind(room_id)
        .bind(giver_id)
        .bind(recipient_id)
        .execute(&mut *conn)
        .await?;
    }
    Ok(())
}

pub async fn find_recipient_of(
    db: impl PgExecutor<'_>,
    giver_id: Uuid,
) -> sqlx::Result<Option<Player>> {
    sqlx::query_as::<_, Player>(
        "select p2.id, p2.room_id, p2.name, p2.avatar, p2.is_organizer, p2.wishlist_comment
         from assignments a
         join players p2 on p2.id = a.recipient_id
         where a.giver_id = $1",
    )
    .bind(giver_id)
    .fetch_optional(db)
    .await
}

pub async fn list_pairs(db: impl PgExecutor<'_>, room_id: Uuid) -> sqlx::Result<Vec<(Uuid, Uuid)>> {
    sqlx::query_as::<_, (Uuid, Uuid)>(
        "select a.giver_id, a.recipient_id
         from assignments a
         join players p on p.id = a.giver_id
         where p.room_id = $1
         order by a.giver_id",
    )
    .bind(room_id)
    .fetch_all(db)
    .await
}
