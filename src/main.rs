#![forbid(unsafe_code)]
use beatrice::reexport::{safina_executor, safina_timer};
use beatrice::{print_log_response, socket_addr_127_0_0_1, HttpServerBuilder, Request};
use ebb_server::{handle_req, State};
use std::sync::Arc;

pub fn main() {
    println!("Access the web app at http://127.0.0.1:8000/");
    safina_timer::start_timer_thread();
    let executor = safina_executor::Executor::default();
    let state = Arc::new(State::new());
    let request_handler = move |req: Request| print_log_response(&req, handle_req(&state, &req));
    executor
        .block_on(
            HttpServerBuilder::new()
                .listen_addr(socket_addr_127_0_0_1(8000))
                .max_conns(100)
                .spawn_and_join(request_handler),
        )
        .unwrap();
}
