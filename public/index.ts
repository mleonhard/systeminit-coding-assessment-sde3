console.log('loading index.ts');

function getElementById(id: string): HTMLElement {
    const elem = document.getElementById(id) as HTMLInputElement;
    console.assert(elem !== null, `element with id "${id}" not found`);
    return elem;
}

const messageBoxElem = getElementById("messageBoxElem") as HTMLInputElement;
const messageListElem = getElementById("messageListElem") as HTMLOListElement;
const messageTemplateElem = getElementById("messageTemplateElem") as HTMLLIElement;

// TODO: Find a good library to replace `fetchWithTimeout` and `doRpc`.
interface RequestInitWithTimeout extends RequestInit {
    timeout_ms?: number,
}

class TimeoutError {
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInitWithTimeout): Promise<Response> {
    let timeout_ms: number;
    if (init?.timeout_ms == null) {
        return fetch(input, init);
    } else {
        timeout_ms = init.timeout_ms;
    }
    let timedOut = false;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
        timedOut = true;
        abortController.abort();
    }, timeout_ms);
    const initWithSignal = {
        signal: abortController.signal,
        ...init
    };
    try {
        return await fetch(input, initWithSignal);
    } catch (e) {
        if (timedOut) {
            throw new TimeoutError();
        } else {
            throw e;
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

async function doRpc(method: string, path: string, body: Object | null): Promise<Object | null> {
    console.log(`doRpc request ${method} ${path} ${JSON.stringify(body)}`);
    const url = new URL(document.URL);
    url.pathname = path;
    url.search = ""; // Remove query portion.
    try {
        const init: RequestInitWithTimeout = {
            cache: "no-store",
            credentials: "omit",
            method: method,
            redirect: "error",
            timeout_ms: 5000,
        };
        if (body != null) {
            init.body = JSON.stringify(body);
            init.headers = {
                "content-type": "application/json",
            };
        }
        let response: Response = await fetchWithTimeout(url, init);
        const contentType = (response.headers.get('content-type') ?? "").toLowerCase();
        const responseBody = await response.blob();
        console.log(`doRpc response {status: ${response.status}, type: ${contentType}, len: ${responseBody.size}}`);
        if (response.status == 400) {
            // noinspection ExceptionCaughtLocallyJS
            throw `Error: ${await responseBody.text().catch((_: any) => "")}`;
        } else if (response.status != 200) {
            // noinspection ExceptionCaughtLocallyJS
            throw `Error: ${response.status}, ${await responseBody.text().catch((_: any) => "")}`;
        } else if (contentType != "" && !contentType.startsWith("application/json")) {
            // noinspection ExceptionCaughtLocallyJS
            throw `Error: server response content-type is not JSON: ${contentType}`;
        } else if (responseBody.size < 1) {
            return null;
        }
        const responseBodyString = await responseBody.text().catch((_: any) => "");
        let responseJson;
        try {
            responseJson = JSON.parse(responseBodyString);
        } catch (e) {
            console.log(`doRpc response body is not JSON: ${responseBodyString}`);
            // noinspection ExceptionCaughtLocallyJS
            throw "Error talking to server";
        }
        if (responseJson instanceof Object) {
            console.log(`doRpc response body ${JSON.stringify(responseJson)}`);
            return responseJson as Object;
        }
        console.log(`doRpc response is not a JSON object: ${responseJson}`);
        // noinspection ExceptionCaughtLocallyJS
        throw "Error talking to server";
    } catch (e) {
        console.error(e);
        if (e instanceof TypeError) {
            alert("Error talking to server.  Please check your connection.");
        } else if (e instanceof TimeoutError) {
            alert("Error talking to server.  Please try again.");
        } else if (typeof e === "string") {
            alert(e);
        } else {
            alert(`Error talking to server: ${e}`);
        }
        return null;
    }
}

interface MessagesResponse {
    messages: Array<string>,
}

// https://www.technicalfeeder.com/2022/05/object-type-check-by-user-defined-type-guard-with-record-type/
// TODO: Use a library to do these checks concisely.
function isObject(object: unknown): object is Record<string, unknown> {
    return typeof object === "object";
}

function isMessagesResponse(object: unknown): object is MessagesResponse {
    if (!isObject(object)) {
        return false;
    }
    if (!Array.isArray(object.messages)) {
        return false;
    }
    const messages: Array<unknown> = object.messages;
    for (const item in messages) {
        // noinspection SuspiciousTypeOfGuard
        if (typeof item !== 'string') {
            return false;
        }
    }
    return true;
}

function sanitizeHTML(text: string): string {
    // TODO: Find out if this is enough.
    var element = document.createElement('div');
    element.innerText = text;
    return element.innerHTML;
}

function processMessagesResponse(response: Object | null) {
    if (response == null) {
        return null;
    }
    if (!isMessagesResponse(response)) {
        console.log(`unexpected server response: ${JSON.stringify(response)}`);
        alert("Error talking to server");
        return;
    }
    const messages = response.messages;
    // TODO: Use a library or framework to make these DOM changes.
    let messageElems: Array<HTMLLIElement> = Array.from(messageListElem.querySelectorAll("li"));
    while (true) {
        // https://github.com/microsoft/TypeScript/issues/37639
        let messageElem = messageElems.shift();
        if (messageElem === undefined) {
            break;
        }
        let message = messages.shift();
        if (message === undefined) {
            messageListElem.removeChild(messageElem);
        } else {
            messageElem.innerHTML = sanitizeHTML(message);
        }
    }
    while (true) {
        let message = messages.shift();
        if (message === undefined) {
            break;
        }
        const messageElem = messageTemplateElem.cloneNode(true) as HTMLLIElement;
        messageElem.innerHTML = sanitizeHTML(message);
        messageListElem.appendChild(messageElem);
    }
}

// TODO: Separate this logic into a class.
// TODO: Show an activity indicator while processing.
declare var running: Boolean;
running = false;

async function add_button_clicked() {
    console.log("add_button_clicked");
    if (running) {
        return;
    }
    try {
        running = true;
        const message: String = messageBoxElem.value.trim();
        if (message.length < 1) {
            return;
        }
        const response: Object | null = await doRpc("POST", "/add-message", {"text": message});
        // TODO: Focus the message box after user dismisses error dialog.
        processMessagesResponse(response);
        messageBoxElem.value = "";
        messageListElem.focus();
    } finally {
        running = false;
    }
}

(async () => {
    try {
        running = true;
        const response = await doRpc("GET", "/get-messages", null);
        processMessagesResponse(response);
    } finally {
        running = false;
    }
})();
