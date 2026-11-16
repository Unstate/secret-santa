pub mod exclusions;
pub mod rooms;
pub mod shuffle;
pub mod wishlist;
pub mod ws;

use axum::{
    Router,
    routing::{get, patch, post},
};

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/rooms", post(rooms::create_room))
        .route(
            "/rooms/{code}",
            get(rooms::get_room).patch(rooms::patch_room),
        )
        .route("/rooms/{code}/join", post(rooms::join))
        .route(
            "/rooms/{code}/exclusions",
            get(exclusions::get_exclusions).put(exclusions::put_exclusions),
        )
        .route("/rooms/{code}/shuffle", post(shuffle::shuffle))
        .route("/rooms/{code}/reset", post(shuffle::reset))
        .route("/rooms/{code}/me/assignment", get(shuffle::my_assignment))
        .route("/rooms/{code}/assignments", get(shuffle::all_assignments))
        .route("/rooms/{code}/wishlist", get(wishlist::list_wishlist))
        .route("/rooms/{code}/wishlist/items", post(wishlist::add_item))
        .route(
            "/rooms/{code}/wishlist/items/{id}",
            patch(wishlist::patch_item).delete(wishlist::delete_item),
        )
        .route("/rooms/{code}/ws", get(ws::room_ws))
}
