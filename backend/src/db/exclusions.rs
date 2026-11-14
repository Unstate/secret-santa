use sqlx::PgExecutor;
use uuid::Uuid;

/// Полная замена исключений комнаты (внутри транзакции хендлера).
pub async fn replace_all(
    conn: &mut sqlx::PgConnection,
    room_id: Uuid,
    pairs: &[(Uuid, Uuid)],
) -> sqlx::Result<()> {
    sqlx::query(
        "delete from exclusions e using players p where e.player_id = p.id and p.room_id = $1",
    )
    .bind(room_id)
    .execute(&mut *conn)
    .await?;

    for (player_id, blocked_recipient_id) in pairs {
        sqlx::query("insert into exclusions (player_id, blocked_recipient_id) values ($1, $2)")
            .bind(player_id)
            .bind(blocked_recipient_id)
            .execute(&mut *conn)
            .await?;
    }
    Ok(())
}

/// Все исключения комнаты: `(player_id, blocked_recipient_id)`.
pub async fn list_by_room(
    db: impl PgExecutor<'_>,
    room_id: Uuid,
) -> sqlx::Result<Vec<(Uuid, Uuid)>> {
    sqlx::query_as::<_, (Uuid, Uuid)>(
        "select e.player_id, e.blocked_recipient_id
         from exclusions e
         join players p on p.id = e.player_id
         where p.room_id = $1
         order by e.player_id",
    )
    .bind(room_id)
    .fetch_all(db)
    .await
}
