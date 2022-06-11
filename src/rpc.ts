// TODO: Find a good library to replace `fetchWithTimeout` and `doRpc`.
interface RequestInitWithTimeout extends RequestInit {
    timeout_ms?: number,
}

export class TimeoutError {
}

async function fetchWithTimeout(input: RequestInfo, init?: RequestInitWithTimeout): Promise<Response> {
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

export async function doRpc(method: string, path: string, body: Object | null): Promise<Object | null> {
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
        const response: Response = await fetchWithTimeout(url.toString(), init);
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
