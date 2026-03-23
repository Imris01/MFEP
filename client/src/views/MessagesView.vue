<script setup>
import { onMounted, ref } from "vue";
import http from "../api/http";
import { formatDate } from "../utils/format";

const messages = ref([]);
const success = ref("");

async function loadMessages() {
  const { data } = await http.get("/messages");
  messages.value = data;
}

async function respond(id, action) {
  const { data } = await http.post(`/messages/${id}/respond`, { action });
  success.value = data.message;
  await loadMessages();
}

async function markAllRead() {
  const { data } = await http.post("/messages/read-all");
  success.value = data.message;
  await loadMessages();
}

async function removeMessage(id) {
  const { data } = await http.delete(`/messages/${id}`);
  success.value = data.message;
  await loadMessages();
}

onMounted(loadMessages);
</script>

<template>
  <section class="stack">
    <div class="section-title-row">
      <h2>消息中心</h2>
      <button class="btn btn-secondary" @click="markAllRead">一键已读</button>
    </div>

    <p v-if="success" class="success-text">{{ success }}</p>

    <article v-for="message in messages" :key="message._id" class="panel message-card">
      <div class="section-title-row">
        <div>
          <h3>{{ message.title }}</h3>
          <p class="muted">{{ formatDate(message.createdAt) }}</p>
        </div>
        <span class="pill" :class="{ 'pill-action': message.category === 'action' }">
          {{ message.category === "action" ? "待处理" : "通知" }}
        </span>
      </div>

      <p>{{ message.content }}</p>
      <p v-if="message.event?.title" class="muted">关联活动：{{ message.event.title }}</p>

      <div class="panel-actions end">
        <button
          v-if="message.category === 'action' && message.status === 'pending'"
          class="btn btn-primary"
          @click="respond(message._id, 'accept')"
        >
          同意
        </button>
        <button
          v-if="message.category === 'action' && message.status === 'pending'"
          class="btn btn-danger"
          @click="respond(message._id, 'reject')"
        >
          拒绝
        </button>
        <button class="btn btn-secondary" @click="removeMessage(message._id)">删除消息</button>
      </div>
    </article>

    <p v-if="!messages.length" class="empty-state">暂时没有消息哟！</p>
  </section>
</template>
