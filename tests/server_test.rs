use beatrice::{ContentType, Request, RequestBody, Response};
use ebb_server::{handle_req, State, MAX_MESSAGE_COUNT, MAX_MESSAGE_LEN_CHARS};
use serde::Deserialize;
use serde_json::json;
use std::net::Ipv4Addr;
use std::sync::Arc;
use url::Url;

// TODO: Add constructor and builder functions to Request, like we have with Response.
fn new_req(path: &'static str) -> Request {
    Request {
        remote_addr: (Ipv4Addr::LOCALHOST, 0).into(),
        method: "GET".to_string(),
        url: Url::parse(&("http://host1".to_string() + path)).unwrap(),
        headers: Default::default(),
        cookies: Default::default(),
        content_type: ContentType::None,
        expect_continue: false,
        chunked: false,
        gzip: false,
        content_length: None,
        body: RequestBody::empty(),
    }
}

fn post_json_req(path: &'static str, body: impl serde::Serialize) -> Request {
    let mut req = new_req(path);
    req.method = "POST".to_string();
    req.content_type = ContentType::Json;
    req.body = RequestBody::Vec(serde_json::to_vec(&body).unwrap());
    req
}

#[test]
fn test_get_index_html() {
    for path in ["/", "/index.html"] {
        assert_eq!(
            Ok(Response::html(
                200,
                include_bytes!("../dist/index.html").as_slice()
            )),
            handle_req(&Arc::new(State::new()), &new_req(path))
        );
    }
}

#[test]
fn test_add_message() {
    let state = Arc::new(State::new());
    assert_eq!(
        Ok(Response::json(200, json!({"messages": ["message1"]})).unwrap()),
        handle_req(
            &state,
            &post_json_req("/add-message", json!({"text": "message1"}))
        )
    );
    assert_eq!(
        Ok(Response::json(200, json!({"messages": ["message2", "message1"]})).unwrap()),
        handle_req(
            &state,
            &post_json_req("/add-message", json!({"text": "message2"})),
        )
    );
}

#[test]
fn test_add_message_many_messages() {
    let state = Arc::new(State::new());
    let mut response: Response = Response::new(0);
    for n in 0..(MAX_MESSAGE_COUNT) {
        let message = format!("m{}", n);
        response = handle_req(
            &state,
            &post_json_req("/add-message", json!({ "text": message })),
        )
        .unwrap();
    }
    #[derive(Deserialize)]
    struct MessagesResponse {
        messages: Vec<String>,
    }
    let messages_resp: MessagesResponse =
        serde_json::from_reader(response.body.reader().unwrap()).unwrap();
    assert_eq!(MAX_MESSAGE_COUNT, messages_resp.messages.len());
    assert_eq!("m0", messages_resp.messages.last().unwrap());
    let response = handle_req(
        &state,
        &post_json_req("/add-message", json!({ "text": "messageX" })),
    )
    .unwrap();
    let messages_resp: MessagesResponse =
        serde_json::from_reader(response.body.reader().unwrap()).unwrap();
    assert_eq!(MAX_MESSAGE_COUNT, messages_resp.messages.len());
    assert_eq!("m1", messages_resp.messages.last().unwrap());
    assert_eq!("messageX", messages_resp.messages.first().unwrap());
}

#[test]
fn test_add_message_check_len() {
    let under_len_message = "".to_string();
    let min_len_message = "a".to_string();
    let max_len_message = "a".repeat(MAX_MESSAGE_LEN_CHARS);
    let over_len_message = "a".repeat(MAX_MESSAGE_LEN_CHARS + 1);
    let state = Arc::new(State::new());
    for message in [&under_len_message, &over_len_message] {
        assert_eq!(
            400,
            handle_req(
                &state,
                &post_json_req("/add-message", json!({ "text": message }))
            )
            .unwrap_err()
            .code
        );
    }
    handle_req(
        &state,
        &post_json_req("/add-message", json!({ "text": min_len_message })),
    )
    .unwrap();
    assert_eq!(
        Ok(Response::json(200, json!({"messages": [max_len_message, min_len_message]})).unwrap()),
        handle_req(
            &state,
            &post_json_req("/add-message", json!({ "text": max_len_message })),
        )
    );
}

#[test]
fn test_get_messages() {
    let state = Arc::new(State::new());
    let messages = ["m1", "m2"];
    for message in messages {
        handle_req(
            &state,
            &post_json_req("/add-message", json!({ "text": message })),
        )
        .unwrap();
    }
    assert_eq!(
        Ok(Response::json(200, json!({"messages": ["m2", "m1"]})).unwrap()),
        handle_req(&state, &new_req("/get-messages"))
    );
}
