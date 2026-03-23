<script setup>
import { onMounted, ref } from "vue";
import ModalDialog from "../components/ModalDialog.vue";
import http from "../api/http";
import { formatDate } from "../utils/format";

const messages = ref([]);
const success = ref("");
const error = ref("");
const deletingMessageId = ref("");

async function loadMessages() {
  try {
    const { data } = await http.get("/messages");
    messages.value = data;
    error.value = "";
  } catch (err) {
    error.value = err.response?.data?.message || "加载消息失败。";
  }
}

async function respond(id, action) {
  try {
    const { data } = await http.post(`/messages/${id}/respond`, { action });
    success.value = data.message;
    await loadMessages();
  } catch (err) {
    error.value = err.response?.data?.message || "处理消息失败。";
  }
}

async function markAllRead() {
  try {
    const { data } = await http.post("/messages/read-all");
    success.value = data.message;
    await loadMessages();
  } catch (err) {
    error.value = err.response?.data?.message || "一键已读失败。";
  }
}

async function removeMessage() {
  if (!deletingMessageId.value) {
    return;
  }

  try {
    const { data } = await http.delete(`/messages/${deletingMessageId.value}`);
    success.value = data.message;
    deletingMessageId.value = "";
    await loadMessages();
  } catch (err) {
    error.value = err.response?.data?.message || "删除消息失败。";
  }
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
    <p v-if="error" class="error-text">{{ error }}</p>

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
          class="btn btn-secondary"
          @click="respond(message._id, 'reject')"
        >
          拒绝
        </button>
        <button class="btn btn-danger" @click="deletingMessageId = message._id">删除消息</button>
      </div>
    </article>

    <p v-if="!messages.length" class="empty-state">暂时没有消息哟！</p>

    <ModalDialog v-if="deletingMessageId" title="确认删除消息" width="480px" @close="deletingMessageId = ''">
      <div class="stack">
        <p>删除后将无法恢复，确定要继续吗？</p>
        <div class="panel-actions end">
          <button class="btn btn-secondary" type="button" @click="deletingMessageId = ''">取消</button>
          <button class="btn btn-danger" type="button" @click="removeMessage">确认删除</button>
        </div>
      </div>
    </ModalDialog>
  </section>
</template>
