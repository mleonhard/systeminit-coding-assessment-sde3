#![forbid(unsafe_code)]
use beatrice::{Request, Response};
use include_dir::{include_dir, Dir};
use serde::Deserialize;
use serde_json::json;
use std::sync::{Arc, RwLock};

static DIST_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/dist");

pub const MAX_MESSAGE_LEN_CHARS: usize = 200;
pub const MAX_MESSAGE_COUNT: usize = 100;

pub struct MessageList {
    messages: Vec<String>,
}
impl MessageList {
    pub fn new() -> Self {
        Self {
            messages: Vec::new(),
        }
    }

    pub fn add(&mut self, text: String) -> Result<(), String> {
        if text.is_empty() {
            return Err("Message is empty.".to_string());
        }
        if text.chars().count() > MAX_MESSAGE_LEN_CHARS {
            return Err(format!(
                "Message too long.  Max {} characters.",
                MAX_MESSAGE_LEN_CHARS
            ));
        }
        while self.messages.len() >= MAX_MESSAGE_COUNT {
            self.messages.pop();
        }
        self.messages.insert(0, text);
        Ok(())
    }

    pub fn as_slice(&self) -> &[String] {
        self.messages.as_slice()
    }
}

pub struct State {
    pub message_list: RwLock<MessageList>,
}

impl State {
    pub fn new() -> Self {
        Self {
            message_list: RwLock::new(MessageList::new()),
        }
    }
}

fn get_messages(state: &Arc<State>) -> Response {
    let guard = state.message_list.read().unwrap();
    Response::json(200, json!({ "messages": guard.as_slice() })).unwrap()
}

fn add_message(state: &Arc<State>, req: &Request) -> Result<Response, Response> {
    #[derive(Deserialize)]
    struct Input {
        text: String,
    }
    let input: Input = req.json()?;
    let mut guard = state.message_list.write().unwrap();
    guard
        .add(input.text)
        .map_err(|s| Response::json(400, json!({ "user_error_message": s })).unwrap())?;
    Ok(Response::json(200, json!({ "messages": guard.as_slice() })).unwrap())
}

pub fn handle_req(state: &Arc<State>, req: &Request) -> Result<Response, Response> {
    match (req.method(), req.url().path()) {
        ("GET", "/health") => Ok(Response::text(200, "ok")),
        ("GET", "/get-messages") => Ok(get_messages(state)),
        ("POST", "/add-message") => add_message(state, req),
        ("GET", path) => Response::include_dir(path, &DIST_DIR),
        _ => Ok(Response::text(404, "Not found")),
    }
}
