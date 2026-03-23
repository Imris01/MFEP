<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import UserBadge from "../components/UserBadge.vue";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";
import { formatDate, formatDateRange } from "../utils/format";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const event = ref(null);
const error = ref("");
const success = ref("");
const inviteKeyword = ref("");
const inviteCandidates = ref([]);
const joinNote = ref("");
const participants = ref([]);
const commentDrafts = reactive({});
const editForm = reactive({
  title: "",
  summary: "",
  description: "",
  rules: "",
  startDate: "",
  endDate: "",
  visibility: "public",
  bannerImage: null,
});

const isHost = computed(() => authStore.user && event.value?.createdBy?._id === authStore.user.id);
const isParticipant = computed(() => authStore.user && event.value?.participants?.some((item) => item._id === authStore.user.id));

function fillEditForm() {
  if (!event.value) return;
  editForm.title = event.value.title;
  editForm.summary = event.value.summary || "";
  editForm.description = event.value.description;
  editForm.rules = event.value.rules;
  editForm.startDate = event.value.startTime?.slice(0, 10);
  editForm.endDate = event.value.endTime?.slice(0, 10);
  editForm.visibility = event.value.visibility;
}

function sortSubmissions(submissions = []) {
  return [...submissions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function loadEvent() {
  try {
    const { data } = await http.get(`/events/${route.params.id}`);
    data.submissions = sortSubmissions(data.submissions);
    event.value = data;
    fillEditForm();
    error.value = "";
  } catch (err) {
    error.value = err.response?.data?.message || "加载活动失败";
  }
}

async function applyJoin() {
  try {
    const { data } = await http.post(`/events/${route.params.id}/join-requests`, { note: joinNote.value });
    success.value = data.message;
    error.value = "";
    joinNote.value = "";
  } catch (err) {
    error.value = err.response?.data?.message || "参与申请提交失败";
  }
}

async function leaveCurrentEvent() {
  if (!window.confirm("确定要退出这个活动吗？")) return;
  const { data } = await http.post(`/events/${route.params.id}/leave`);
  success.value = data.message;
  await loadEvent();
}

async function updateEvent() {
  const payload = new FormData();
  payload.append("title", editForm.title);
  payload.append("summary", editForm.summary);
  payload.append("description", editForm.description);
  payload.append("rules", editForm.rules);
  payload.append("startDate", editForm.startDate);
  payload.append("endDate", editForm.endDate);
  payload.append("visibility", editForm.visibility);
  if (editForm.bannerImage) payload.append("bannerImage", editForm.bannerImage);

  const { data } = await http.put(`/events/${route.params.id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  success.value = data.message;
  await loadEvent();
}

async function deleteCurrentEvent() {
  if (!window.confirm("确定要删除这个活动吗？删除后将无法恢复。")) return;
  await http.delete(`/events/${route.params.id}`);
  router.push("/events");
}

async function loadParticipants() {
  const { data } = await http.get(`/events/${route.params.id}/participants`);
  participants.value = data;
}

async function searchInvitees() {
  if (!inviteKeyword.value.trim()) {
    inviteCandidates.value = [];
    return;
  }
  const { data } = await http.get(`/users?keyword=${encodeURIComponent(inviteKeyword.value)}`);
  inviteCandidates.value = data;
}

async function inviteUser(userId) {
  const { data } = await http.post(`/events/${route.params.id}/invite`, { userId });
  success.value = data.message;
  inviteCandidates.value = [];
  inviteKeyword.value = "";
}

async function toggleSubmissionLike(submissionId) {
  const { data } = await http.post(`/events/${route.params.id}/submissions/${submissionId}/like`);
  success.value = data.message;
  await loadEvent();
}

async function addSubmissionComment(submissionId) {
  const content = commentDrafts[submissionId];
  if (!content?.trim()) return;

  const { data } = await http.post(`/events/${route.params.id}/submissions/${submissionId}/comments`, {
    content,
  });
  success.value = data.message;
  commentDrafts[submissionId] = "";
  await loadEvent();
}

async function removeSubmission(submissionId) {
  if (!window.confirm("确定要删除这个作品吗？")) return;
  const { data } = await http.delete(`/events/${route.params.id}/submissions/${submissionId}`);
  success.value = data.message;
  await loadEvent();
}

function difficultyStyle(item) {
  return {
    background: item.color,
    color: item.key === "advanced" || item.key === "easy" ? "#263238" : "#fff",
  };
}

onMounted(loadEvent);
</script>

<template>
  <section class="stack">
    <p v-if="error" class="error-text">{{ error }}</p>

    <template v-if="event">
      <article class="panel event-detail-hero">
        <img v-if="event.bannerImage" class="detail-banner" :src="`http://localhost:5000${event.bannerImage}`" alt="活动头图" />
        <div class="stack">
          <div class="section-title-row">
            <div>
              <h2>{{ event.title }}</h2>
              <p>{{ event.summary || "暂无活动摘要" }}</p>
            </div>
            <span class="pill">{{ event.visibility === "public" ? "公开活动" : "私密活动" }}</span>
          </div>

          <UserBadge :user="event.createdBy" />
          <p class="muted">活动时间：{{ formatDateRange(event.startTime, event.endTime) }} · 共 {{ event.durationDays }} 天</p>
          <p class="muted">已参加人数：{{ event.participants.length }}</p>
          <p>{{ event.description }}</p>
          <div class="rule-box">
            <h3>活动规则</h3>
            <p>{{ event.rules }}</p>
          </div>

          <div class="panel-actions">
            <button v-if="authStore.isAuthenticated && !isHost && !isParticipant" class="btn btn-primary" @click="applyJoin">申请参与</button>
            <RouterLink v-if="isParticipant" class="btn btn-primary" :to="`/events/${event._id}/submit`">前往提交作品</RouterLink>
            <button v-if="isParticipant" class="btn btn-secondary" @click="leaveCurrentEvent">退出活动</button>
            <button v-if="isHost" class="btn btn-secondary" @click="loadParticipants">查看参与者</button>
            <button v-if="isHost" class="btn btn-secondary" @click="updateEvent">保存活动修改</button>
            <button v-if="isHost" class="btn btn-danger" @click="deleteCurrentEvent">删除活动</button>
          </div>

          <label v-if="authStore.isAuthenticated && !isHost && !isParticipant" class="form-grid">
            <span>参与申请备注</span>
            <textarea v-model="joinNote" rows="3" placeholder="可以简单说明你的参与意向"></textarea>
          </label>

          <p v-if="success" class="success-text">{{ success }}</p>
        </div>
      </article>

      <section v-if="isHost" class="panel form-panel">
        <h3>编辑活动信息</h3>
        <div class="form-grid">
          <input v-model="editForm.title" type="text" placeholder="活动标题" />
          <input v-model="editForm.summary" type="text" placeholder="活动摘要" />
          <textarea v-model="editForm.description" rows="5" placeholder="活动描述"></textarea>
          <textarea v-model="editForm.rules" rows="5" placeholder="活动规则"></textarea>
          <div class="inline-form">
            <label>开始日期<input v-model="editForm.startDate" type="date" /></label>
            <label>结束日期<input v-model="editForm.endDate" type="date" /></label>
          </div>
          <select v-model="editForm.visibility">
            <option value="public">公开活动</option>
            <option value="private">私密活动</option>
          </select>
          <label class="file-label">
            更换活动头图
            <input type="file" accept="image/*" @change="editForm.bannerImage = $event.target.files[0]" />
          </label>
        </div>
      </section>

      <section v-if="isHost" class="panel form-panel">
        <h3>邀请其他用户参与</h3>
        <div class="form-grid">
          <input v-model="inviteKeyword" type="text" placeholder="输入用户名搜索" @input="searchInvitees" />
          <div class="invite-list">
            <div v-for="user in inviteCandidates" :key="user.id" class="invite-item">
              <UserBadge :user="user" compact />
              <button class="btn btn-secondary" @click="inviteUser(user.id)">邀请</button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="isHost && participants.length" class="panel">
        <h3>参与者详情</h3>
        <div class="participant-grid">
          <UserBadge v-for="user in participants" :key="user._id" :user="user" />
        </div>
      </section>

      <section class="stack">
        <div class="section-title-row">
          <h3>作品条目</h3>
        </div>

        <article
          v-for="(submission, index) in event.submissions"
          :key="submission._id"
          class="panel submission-item"
        >
          <div class="submission-cover-wrap" :data-index="index + 1">
            <img class="submission-cover" :src="`http://localhost:5000${submission.files.cover}`" alt="作品封面" />
          </div>

          <div class="submission-main">
            <div class="submission-topline">
              <div class="submission-heading">
                <div class="difficulty-strip">
                  <div v-for="item in submission.difficulties" :key="item.key" class="difficulty-chip compact" :style="difficultyStyle(item)">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                </div>
                <h4>{{ submission.title }}</h4>
                <p><strong>曲师：</strong>{{ submission.artist }}</p>
                <p><strong>谱师：</strong>{{ submission.charterName }}</p>
              </div>

              <div class="submission-side">
                <p class="muted">{{ index + 1 }} 号作品</p>
                <p class="muted">投稿时间：{{ formatDate(submission.createdAt) }}</p>
              </div>
            </div>

            <div class="submission-meta">
              <UserBadge :user="submission.participant" compact />
              <span class="muted">评论 {{ submission.comments?.length || 0 }}</span>
              <span class="muted">点赞 {{ submission.likes?.length || 0 }}</span>
            </div>

            <div class="panel-actions">
              <button class="btn btn-secondary" @click="toggleSubmissionLike(submission._id)">点赞</button>
              <a class="btn btn-secondary" :href="`http://localhost:5000/api/events/${event._id}/submissions/${submission._id}/download`">下载谱面包</a>
              <button v-if="isHost" class="btn btn-danger" @click="removeSubmission(submission._id)">删除作品</button>
            </div>

            <div class="submission-comment-box">
              <div v-for="comment in submission.comments" :key="comment._id" class="submission-comment-item">
                <span class="muted">{{ comment.author?.username || "用户" }}</span>
                <span>{{ comment.content }}</span>
              </div>

              <div v-if="authStore.isAuthenticated" class="submission-comment-editor">
                <input v-model="commentDrafts[submission._id]" type="text" placeholder="写下你的评论" />
                <button class="btn btn-secondary" @click="addSubmissionComment(submission._id)">评论</button>
              </div>
            </div>
          </div>
        </article>

        <p v-if="!event.submissions.length" class="empty-state">暂时还没有人提交作品哟！</p>
      </section>
    </template>
  </section>
</template>
