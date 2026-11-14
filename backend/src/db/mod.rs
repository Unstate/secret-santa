//! Репозитории sqlx по таблицам. Роуты не должны писать сырой SQL —
//! только звать функции отсюда.

pub mod assignments;
pub mod exclusions;
pub mod players;
pub mod rooms;
pub mod wishlist;
