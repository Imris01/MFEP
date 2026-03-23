<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UserBadge from "../components/UserBadge.vue";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";
import { formatDateTime } from "../utils/format";

const route = useRoute();
const authStore = useAuthStore();
const eventInfo = ref(null);
const submission = ref(null);
const canScore = ref(false);
const success = ref("");
const error = ref("");
const commentForm = reactive({
  content: "",
  anonymous: false,
});
const ratingForm = reactive({
  score: 50,
  anonymous: false,
});

const currentUserRating = computed(() =>
  submission.value?.ratings?.find((item) => item.author?._id === (authStore.user?.id || authStore.user?._id))
);

function difficultyStyle(item) {
  return {
    background: item.color,
    color: item.key === "advanced" || item.key === "easy" ? "#24292f" : "#ffffff",
  };
}

async function loadSubmission() {
  try {
    const { data } = await http.get(`/events/${route.params.id}/submissions/${route.params.submissionId}`);
    eventInfo.value = data.event;
    submission.value = data.submission;
    canScore.value = data.canScore;
    if (currentUserRating.value) {
      ratingForm.score = currentUserRating.value.score;
      ratingForm.anonymous = currentUserRating.value.anonymous;
    }
    error.value = "";
  } catch (err) {
    error.value = err.response?.data?.message || "加载作品详情失败。";
  }
}

async function submitComment() {
  try {
    const { data } = await http.post(`/events/${route.params.id}/submissions/${route.params.submissionId}/comments`, {
      content: commentForm.content,
      anonymous: commentForm.anonymous,
    });
    success.value = data.message;
    commentForm.content = "";
    await loadSubmission();
  } catch (err) {
    error.value = err.response?.data?.message || "发表评论失败。";
  }
}

async function submitScore() {
  try {
    const { data } = await http.post(`/events/${route.params.id}/submissions/${route.params.submissionId}/rate`, {
      score: ratingForm.score,
      anonymous: ratingForm.anonymous,
    });
    success.value = data.message;
    await loadSubmission();
  } catch (err) {
    error.value = err.response?.data?.message || "保存评分失败。";
  }
}

onMounted(loadSubmission);
</script>

<template>
  <section class="stack">
    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="success" class="success-text">{{ success }}</p>

    <template v-if="submission && eventInfo">
      <div class="panel submission-detail-page">
        <div class="panel-actions">
          <RouterLink class="btn btn-secondary" :to="`/events/${route.params.id}`">返回活动页</RouterLink>
        </div>

        <div class="submission-detail-grid">
          <img class="submission-detail-cover" :src="`http://localhost:5000${submission.files.cover}`" alt="作品封面" />

          <div class="stack">
            <div class="difficulty-strip">
              <div
                v-for="item in submission.difficulties"
                :key="item.key"
                class="difficulty-chip"
                :style="difficultyStyle(item)"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>

            <h2>{{ submission.title }}</h2>
            <p><strong>曲师：</strong>{{ submission.artist }}</p>
            <p><strong>谱师名义：</strong>{{ submission.displayCharterName }}</p>
            <p class="muted">投稿时间：{{ formatDateTime(submission.createdAt) }}</p>
            <p class="muted">点赞 {{ submission.likesCount }} · 评论 {{ submission.commentsCount }} · 评分 {{ submission.ratingsCount }}</p>
            <p v-if="submission.averageScore !== null" class="muted">当前均分：{{ submission.averageScore }}</p>
            <UserBadge v-if="submission.showRealAuthor && submission.participant" :user="submission.participant" compact />

            <div class="panel-actions">
              <a
                class="btn btn-secondary"
                :href="`http://localhost:5000/api/events/${route.params.id}/submissions/${route.params.submissionId}/download`"
              >
                下载谱面包
              </a>
            </div>
          </div>
        </div>
      </div>

      <section class="two-column">
        <article class="panel stack">
          <h3>评论区</h3>
          <div v-if="submission.comments.length" class="stack">
            <article v-for="comment in submission.comments" :key="comment._id" class="comment-card">
              <div class="section-title-row">
                <strong>{{ comment.displayAuthorName }}</strong>
                <span class="muted">{{ formatDateTime(comment.createdAt) }}</span>
              </div>
              <p>{{ comment.content }}</p>
            </article>
          </div>
          <p v-else class="empty-state">还没有评论。</p>

          <div v-if="authStore.isAuthenticated" class="form-grid">
            <textarea v-model="commentForm.content" rows="4" placeholder="写下你的评论"></textarea>
            <label class="checkbox-inline">
              <input v-model="commentForm.anonymous" type="checkbox" />
              <span>匿名评论</span>
            </label>
            <div class="panel-actions end">
              <button class="btn btn-primary" type="button" @click="submitComment">发布评论</button>
            </div>
          </div>
        </article>

        <article class="panel stack">
          <h3>评分</h3>
          <p class="muted">当前活动：{{ eventInfo.title }}</p>
          <p v-if="eventInfo.scoreFormula" class="muted">评分公式：{{ eventInfo.scoreFormula }}</p>

          <div v-if="submission.ratings.length" class="stack">
            <article v-for="rating in submission.ratings" :key="rating._id" class="comment-card">
              <div class="section-title-row">
                <strong>{{ rating.displayAuthorName }}</strong>
                <span class="muted">{{ formatDateTime(rating.createdAt) }}</span>
              </div>
              <p>{{ rating.score }} 分</p>
            </article>
          </div>
          <p v-else class="empty-state">还没有评分记录。</p>

          <div v-if="authStore.isAuthenticated && canScore" class="form-grid">
            <label>
              滑条评分
              <input v-model.number="ratingForm.score" type="range" min="0" max="100" step="0.1" />
            </label>
            <label>
              输入评分
              <input v-model.number="ratingForm.score" type="number" min="0" max="100" step="0.1" />
            </label>
            <label class="checkbox-inline">
              <input v-model="ratingForm.anonymous" type="checkbox" />
              <span>匿名评分</span>
            </label>
            <div class="panel-actions end">
              <button class="btn btn-primary" type="button" @click="submitScore">保存评分</button>
            </div>
          </div>
          <p v-else-if="authStore.isAuthenticated" class="empty-state">你当前没有评分权限。</p>
        </article>
      </section>
    </template>
  </section>
</template>
