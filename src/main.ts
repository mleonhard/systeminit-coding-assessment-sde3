import './assets/tailwind.css'
import { doRpc } from './rpc'
console.log('index.ts');

function getElementById(id: string): HTMLElement {
    const elem = document.getElementById(id) as HTMLInputElement;
    console.assert(elem !== null, `element with id "${id}" not found`);
    return elem;
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
    const element = document.createElement('div');
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
    const messageListElem = getElementById("messageListElem") as HTMLOListElement;
    const messageTemplateElem = getElementById("messageTemplateElem") as HTMLLIElement;
    const messageElems: Array<HTMLLIElement> = Array.from(messageListElem.querySelectorAll("li"));
    while (messageElems.length > 0) {
        // https://github.com/microsoft/TypeScript/issues/37639
        const messageElem = messageElems.shift();
        if (messageElem === undefined) {
            break;
        }
        const message = messages.shift();
        if (message === undefined) {
            messageListElem.removeChild(messageElem);
        } else {
            messageElem.innerHTML = sanitizeHTML(message);
        }
    }
    while (messages.length > 0) {
        const message = messages.shift();
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
// eslint-disable-next-line
export var running: Boolean;
running = false;

async function add_button_clicked() {
    console.log("add_button_clicked");
    if (running) {
        return;
    }
    try {
        running = true;
        const messageBoxElem = getElementById("messageBoxElem") as HTMLInputElement;
        const messageListElem = getElementById("messageListElem") as HTMLOListElement;
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

async function load() {
    console.log("load()");
    const messageForm = getElementById("messageForm");
    messageForm.onsubmit = () => {
        add_button_clicked();
        return false;
    };
    try {
        running = true;
        const response = await doRpc("GET", "/get-messages", null);
        processMessagesResponse(response);
    } finally {
        running = false;
    }
}
window.onload = load;
