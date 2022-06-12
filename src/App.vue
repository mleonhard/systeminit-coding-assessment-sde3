<script lang="ts" setup>
import {onMounted} from "vue"
import {RpcError} from "@/rpc";
import {MessageListModel} from "@/MessageListModel";
import MessageForm from './components/MessageForm.vue';
import MessageList from './components/MessageList.vue';

const messageListModel = new MessageListModel();

onMounted(async () => {
  console.log("App onMounted");
  try {
    await messageListModel.fetchMessages();
  } catch (e) {
    if (e instanceof RpcError) {
      e.showAlert();
    } else {
      console.error(e);
    }
  }
});

</script>

<template>
  <div class="container mx-auto bg-white">
    <h2 class="box-border border-2 border-b-gray-700 p-4 text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
      Ephemeral Bulletin Board
    </h2>
    <p class="p-4 text-lg">
      Messages disappear whenever the server restarts.
    </p>
    <MessageForm :model="messageListModel"/>
    <MessageList :model="messageListModel"/>
  </div>
</template>
