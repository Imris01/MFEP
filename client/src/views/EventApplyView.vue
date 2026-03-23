<script setup>
import { onMounted, reactive, ref } from "vue";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";
import { formatDateRange } from "../utils/format";

const authStore = useAuthStore();
const success = ref("");
const error = ref("");
const applications = ref([]);
const form = reactive({
  title: "",
  summary: "",
  description: "",
  rules: "",
  startDate: "",
  endDate: "",
  visibility: "public",
  bannerImage: null,
});

async function loadPending() {
  if (authStore.user?.role !== "admin") {
    return;
  }

  const { data } = await http.get("/events/applications/pending");
  applications.value = data;
}

async function submitApplication() {
  const payload = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if (value !== null && value !== "") {
      payload.append(key, value);
    }
  });

  success.value = "";
  error.value = "";

  try {
    const { data } = await http.post("/events/applications", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    success.value = data.message;
  } catch (err) {
    error.value = err.response?.data?.message || "提交申请失败";
  }
}

async function review(id, action) {
  await http.post(`/events/${id}/review`, { action });
  await loadPending();
}

onMounted(loadPending);
</script>

<template>
  <section class="stack">
    <section class="panel form-panel">
      <h2>申请开办活动</h2>
      <form class="form-grid" @submit.prevent="submitApplication">
        <input v-model="form.title" type="text" placeholder="活动标题" />
        <input v-model="form.summary" type="text" placeholder="活动摘要（用于列表展示）" />
        <textarea v-model="form.description" rows="6" placeholder="活动详细介绍"></textarea>
        <textarea v-model="form.rules" rows="6" placeholder="活动规则"></textarea>
        <div class="inline-form">
          <label>
            开始日期
            <input v-model="form.startDate" type="date" />
          </label>
          <label>
            结束日期
            <input v-model="form.endDate" type="date" />
          </label>
        </div>
        <select v-model="form.visibility">
          <option value="public">公开活动</option>
          <option value="private">私密活动</option>
        </select>
        <label class="file-label">
          上传活动头图
          <input type="file" accept="image/*" @change="form.bannerImage = $event.target.files[0]" />
        </label>
        <button type="submit">提交申请</button>
      </form>
      <p v-if="success" class="success-text">{{ success }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </section>

    <section v-if="authStore.user?.role === 'admin'" class="panel">
      <h3>待审核活动申请</h3>
      <article v-for="event in applications" :key="event._id" class="panel inner-panel">
        <h4>{{ event.title }}</h4>
        <p class="muted">提交者：{{ event.createdBy?.username }}</p>
        <p>{{ event.summary || event.description }}</p>
        <p class="muted">时间：{{ formatDateRange(event.startTime, event.endTime) }}</p>
        <div class="action-row">
          <button @click="review(event._id, 'approve')">通过</button>
          <button class="danger-button" @click="review(event._id, 'reject')">拒绝</button>
        </div>
      </article>
      <p v-if="!applications.length" class="empty-state">当前没有待审核活动。</p>
    </section>
  </section>
</template>
