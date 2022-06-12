import {doRpc, isObject, ServerError} from './rpc'
import {ref, Ref} from "vue";

interface MessagesResponse {
    messages: Array<string>,
}

// TODO: Find a more concise way to check the response object.
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

export class MessageListModel {
    public messages: Ref<Array<string>> = ref([])
    public running: Ref<boolean> = ref(false)

    private processResponse(response: Object | null) {
        if (response == null) {
            return null;
        }
        if (!isMessagesResponse(response)) {
            console.error(`unexpected server response: ${JSON.stringify(response)}`);
            throw new ServerError(null);
        }
        this.messages.value = response.messages;
    }

    public async fetchMessages() {
        if (this.running.value) {
            return;
        }
        try {
            this.running.value = true;
            const response = await doRpc("GET", "/get-messages", null);
            this.processResponse(response);
        } finally {
            this.running.value = false;
        }
    }

    public async addMessage(text: string) {
        if (text.length < 1) {
            return;
        }
        if (this.running.value) {
            return;
        }
        try {
            this.running.value = true;
            const response: Object | null = await doRpc("POST", "/add-message", {"text": text});
            this.processResponse(response);
        } finally {
            this.running.value = false;
        }
    }
}
