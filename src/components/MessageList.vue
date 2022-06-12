<script lang="ts" setup>
import {MessageListModel} from "@/MessageListModel";

// eslint-disable-next-line
const props = defineProps({
  model: MessageListModel,
});

function sanitizeHTML(text: string): string {
  // TODO: Find out if this is enough.
  const element = document.createElement('div');
  element.innerText = text;
  return element.innerHTML;
}

// TODO: Show an activity indicator while processing.

</script>

<template>
  <ul>
    <li class="p-4 box-border border-2 border-dashed border-transparent border-t-gray-200"
        v-for="(message, n) in props.model?.messages.value" :key="n">
      {{ sanitizeHTML(message) }}
    </li>
  </ul>
</template>
