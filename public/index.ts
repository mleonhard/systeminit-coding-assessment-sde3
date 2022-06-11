console.log('loading index.ts');

// async function sleepMs(ms: number): Promise<void> {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

const messageBoxElem = document.getElementById("messageBoxElem") as HTMLInputElement;
console.assert(messageBoxElem !== null, messageBoxElem);
const messageListElem = document.getElementById("messageListElem") as HTMLOListElement;
console.assert(messageListElem !== null, messageListElem);
const messageTemplateElem = document.getElementById("messageTemplateElem") as HTMLLIElement;
console.assert(messageTemplateElem !== null, messageTemplateElem);

interface RequestInitWithTimeout extends RequestInit {
    timeout_ms?: number,
}

// TODO: Find a good library to replace `fetchWithTimeout` and `doRpc`.
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

// https://www.technicalfeeder.com/2022/05/object-type-check-by-user-defined-type-guard-with-record-type/
function isObject(object: unknown): object is Record<string, unknown> {
    return typeof object === "object";
}

interface MessagesResponse {
    messages: Array<string>,
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

function processMessagesResponse(response: Object | null): Array<String> | null {
    if (response == null) {
        return null;
    }
    if (isMessagesResponse(response)) {
        return response.messages;
    }
    console.log(`unexpected server response: ${JSON.stringify(response)}`);
    alert("Error talking to server");
    return null;
}

declare var running: Boolean;
running = false;

async function add_button_clicked() {
    console.log("add button clicked");
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
        processMessagesResponse(response);
        messageBoxElem.value = "";
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
