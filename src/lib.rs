#![forbid(unsafe_code)]
use beatrice::{ContentType, Request, Response};
use include_dir::{include_dir, Dir};
use serde::Deserialize;
use serde_json::json;
use std::path::Path;
use std::sync::{Arc, RwLock};

pub const MAX_MESSAGE_LEN_CHARS: usize = 200;
pub const MAX_MESSAGE_COUNT: usize = 100;
static PUBLIC_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/public/");

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
    {
        let mut guard = state.message_list.write().unwrap();
        guard.add(input.text).map_err(|s| Response::text(400, s))?;
    }
    Ok(Response::new(200))
}

pub fn handle_req(state: &Arc<State>, req: &Request) -> Result<Response, Response> {
    // TODO: Move this into a new fn,
    // Request::try_from_include_dir(&'static include_dir::Dir) -> Result<Option<Response>,Response>.
    // Then replace this with if let Some(resp) = req.try_from_include_dir(&PUBLIC_DIR)? { return Ok(resp); }
    if req.method() == "GET" {
        let path = Path::new(req.url().path()).strip_prefix("/").unwrap();
        if let Some(file) = PUBLIC_DIR.get_file(path) {
            let content_type = match file
                .path()
                .extension()
                .map(|os_str| os_str.to_str().unwrap())
            {
                Some("css") => ContentType::Css,
                Some("html") => ContentType::Html,
                Some("js") => ContentType::JavaScript,
                _ => ContentType::None,
            };
            return Ok(Response::new(200)
                .with_type(content_type)
                .with_body(file.contents()));
        }
    }
    match (req.method(), req.url().path()) {
        ("GET", "/health") => Ok(Response::text(200, "ok")),
        ("GET", "/") => {
            // TODO: Return the file to eliminate latency from extra round-trip.
            // Ideally, the `try_from_include_dir` function would do this automatically.
            Ok(Response::redirect_303("/index.html"))
        }
        ("GET", "/get-messages") => Ok(get_messages(state)),
        ("POST", "/add-message") => add_message(state, req),
        _ => Ok(Response::text(404, "Not found")),
    }
}
