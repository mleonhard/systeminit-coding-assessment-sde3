<script lang="ts" setup>
import {ref} from "vue"
import {MessageListModel} from "@/MessageListModel";
import {RpcError} from "@/rpc";

// The linter fails with "error 'defineProps' is not defined".
// The docs https://eslint.vuejs.org/user-guide/#faq say:
// > # Compiler macros such as defineProps and defineEmits generate no-undef warnings
// > You need to use vue-eslint-parser v9.0.0 or later.
// But vue-eslint-parser v9.0.1 & v9.0.2 crash with "Parsing error: Maximum call stack size exceeded".
// So the workaround is to just disable the lint check.
// eslint-disable-next-line
const props = defineProps({
  model: MessageListModel,
});

const text = ref("");

async function submitForm() {
  console.log(`submit "${text.value}"`)
  try {
    await props.model?.addMessage(text.value);
    text.value = "";
    // TODO: Activate the text box again.
  } catch (e) {
    if (e instanceof RpcError) {
      e.showAlert();
    } else {
      console.error(e);
    }
  }
}

</script>

<template>
  <form class="p-4 flex gap-x-4 gap-y-2 items-center flex-wrap"
        @submit.prevent="submitForm">
    <label for="messageFormBox">Enter a message:</label>
    <input id="messageFormBox"
           type="text"
           size="40"
           class="flex-1 box-border p-2 border border-black"
           placeholder="Type here"
           autofocus
           v-model="text"
    />
    <button class="box-border p-2 border-2 rounded-xl border-black bg-sky-100 hover:bg-sky-200 text-black"
            type="submit">Add Message
    </button>
  </form>
</template>
