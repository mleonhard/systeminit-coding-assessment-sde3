// TODO: Find a good library to replace `fetchWithTimeout` and `doRpc`.
interface RequestInitWithTimeout extends RequestInit {
    timeout_ms?: number,
}

// https://www.technicalfeeder.com/2022/05/object-type-check-by-user-defined-type-guard-with-record-type/
export function isObject(object: unknown): object is Record<string, unknown> {
    return typeof object === "object";
}

export class RpcError {
    showAlert(): void {
    }
}

// export function isRpcError(object: unknown): object is RpcError {
//     if (object instanceof TimeoutError
//         || object instanceof NetworkError
//         || object instanceof UserError
//         || object instanceof ServerError) {
//         return true;
//     }
//     if (!isObject(object)) {
//         return false;
//     }
//     return typeof object.showAlert === "function";
// }

export class TimeoutError extends RpcError {
    showAlert(): void {
        alert("Error talking to server.  Please try again.");
    }
}

export class NetworkError extends RpcError {
    showAlert(): void {
        alert("Error connecting to server.  Please check your connection.");
    }
}

export class UserError extends RpcError {
    message: string;

    constructor(message: string) {
        super();
        this.message = message;
    }

    showAlert(): void {
        alert(this.message);
    }
}

export class ServerError extends RpcError {
    message: string | null;

    constructor(message: string | null) {
        super();
        this.message = message;
    }

    showAlert(): void {
        if (this.message == null) {
            alert("Error talking to server");
        } else {
            alert(`Error talking to server: ${this.message}`);
        }
    }
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

interface UserErrorResponse {
    user_error_message: string,
}

function isUserErrorResponse(object: unknown): object is UserErrorResponse {
    if (!isObject(object)) {
        return false;
    }
    return typeof object.user_error_message === "string";
}

export async function doRpc(method: string, path: string, body: Object | null): Promise<Object | null> {
    console.log(`doRpc request ${method} ${path} ${JSON.stringify(body)}`);
    const url = new URL(document.URL);
    url.pathname = path;
    url.search = ""; // Remove query portion.
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
    let response: Response;
    let contentType: string;
    let responseBody: Blob;
    let responseBodyString: string;
    try {
        response = await fetchWithTimeout(url.toString(), init);
        contentType = (response.headers.get('content-type') ?? "").toLowerCase();
        responseBody = await response.blob();
        responseBodyString = await responseBody.text().catch((_: any) => "");
    } catch (e) {
        console.error(e);
        if (e instanceof TypeError) {
            throw new NetworkError();
        } else if (e instanceof TimeoutError) {
            throw e;
        } else {
            throw new ServerError(`${e}`);
        }
    }
    console.log(`doRpc response {status: ${response.status}, type: ${contentType}, len: ${responseBody.size}}`);
    let responseJsonObject: Object | null = null;
    if (contentType.startsWith("application/json")) {
        let responseJson;
        try {
            responseJson = JSON.parse(responseBodyString);
        } catch (e) {
            console.error(`doRpc response body is not JSON: ${responseBodyString}`);
            throw new ServerError(null);
        }
        if (!isObject(responseJson)) {
            console.error(`doRpc response is not a JSON object: ${responseJson}`);
            throw new ServerError(null);
        }
        console.log(`doRpc response body ${JSON.stringify(responseJson)}`);
        responseJsonObject = responseJson as Object;
    }
    if (response.status == 200) {
        if (responseJsonObject != null) {
            return responseJsonObject;
        }
        if (responseBody.size == 0 && contentType.length == 0) {
            return null;
        }
        throw new ServerError(`server response content-type is not JSON: ${contentType}`);
    }
    if (responseJsonObject != null && isUserErrorResponse(responseJsonObject)) {
        throw new UserError(responseJsonObject.user_error_message);
    }
    if (contentType.startsWith("text/")) {
        throw new ServerError(`${response.status} ${response.statusText}, ${responseBodyString}`);
    } else {
        throw new ServerError(null);
    }
}
