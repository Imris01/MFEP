<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import MarkdownPreview from "../components/MarkdownPreview.vue";
import UserBadge from "../components/UserBadge.vue";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";
import { formatDate } from "../utils/format";

const route = useRoute();
const authStore = useAuthStore();
const post = ref(null);
const error = ref("");
const replyState = reactive({});
const newFloor = ref("");
const liked = ref(false);

const floors = computed(() => post.value?.comments || []);

async function loadPost() {
  try {
    const { data } = await http.get(`/posts/${route.params.id}`);
    post.value = data;
    error.value = "";
  } catch (err) {
    error.value = err.response?.data?.message || "帖子加载失败";
  }
}

async function togglePostLike() {
  const { data } = await http.post(`/posts/${route.params.id}/like`);
  post.value.likes = new Array(data.likesCount).fill(null);
  liked.value = data.liked;
}

async function submitFloor() {
  if (!newFloor.value.trim()) {
    error.value = "请输入回复内容";
    return;
  }

  const { data } = await http.post(`/posts/${route.params.id}/comments`, { content: newFloor.value });
  post.value = data;
  newFloor.value = "";
}

async function submitReply(comment, reply) {
  if (!reply.content?.trim()) {
    return;
  }

  const { data } = await http.post(`/posts/${route.params.id}/comments`, {
    content: reply.content,
    parentCommentId: comment._id,
    replyToUserId: reply.replyToUserId || "",
  });

  post.value = data;
  replyState[comment._id] = { content: "", replyToUserId: "", open: false };
}

function openReply(comment, targetUser = null) {
  replyState[comment._id] = {
    open: true,
    replyToUserId: targetUser?._id || "",
    content: targetUser ? `@${targetUser.username} ` : "",
  };
}

async function toggleCommentLike(commentId) {
  await http.post(`/posts/${route.params.id}/comments/${commentId}/like`);
  await loadPost();
}

onMounted(loadPost);
</script>

<template>
  <section class="stack">
    <p v-if="error" class="error-text">{{ error }}</p>

    <article v-if="post" class="panel">
      <div class="section-title-row">
        <div>
          <h2>{{ post.title }}</h2>
          <p class="muted">{{ formatDate(post.createdAt) }}</p>
        </div>
        <button v-if="authStore.isAuthenticated" @click="togglePostLike">点赞 {{ post.likes?.length || 0 }}</button>
      </div>

      <UserBadge :user="post.author" />
      <MarkdownPreview :source="post.content" />
    </article>

    <section v-if="authStore.isAuthenticated" class="panel form-panel">
      <h3>发表新回复</h3>
      <form class="form-grid" @submit.prevent="submitFloor">
        <textarea v-model="newFloor" rows="4" placeholder="说点什么吧，支持 Markdown 和 @用户名"></textarea>
        <button type="submit">发表回复</button>
      </form>
    </section>

    <section class="stack">
      <article v-for="(comment, index) in floors" :key="comment._id" class="panel forum-floor">
        <div class="section-title-row">
          <UserBadge :user="comment.author" compact />
          <span class="muted">{{ index + 1 }} 楼 · {{ formatDate(comment.createdAt) }}</span>
        </div>
        <MarkdownPreview :source="comment.content" />
        <div class="action-row">
          <button v-if="authStore.isAuthenticated" class="ghost-button" @click="toggleCommentLike(comment._id)">
            点赞 {{ comment.likes?.length || 0 }}
          </button>
          <button v-if="authStore.isAuthenticated" class="ghost-button" @click="openReply(comment)">回复</button>
        </div>

        <div v-if="comment.replies?.length" class="nested-reply-list">
          <article v-for="reply in comment.replies" :key="reply._id" class="nested-reply">
            <div class="section-title-row">
              <UserBadge :user="reply.author" compact />
              <span class="muted">{{ formatDate(reply.createdAt) }}</span>
            </div>
            <p v-if="reply.replyToUser" class="muted">回复 @{{ reply.replyToUser.username }}</p>
            <MarkdownPreview :source="reply.content" />
            <div class="action-row">
              <button v-if="authStore.isAuthenticated" class="ghost-button" @click="toggleCommentLike(reply._id)">
                点赞 {{ reply.likes?.length || 0 }}
              </button>
              <button v-if="authStore.isAuthenticated" class="ghost-button" @click="openReply(comment, reply.author)">
                回复 Ta
              </button>
            </div>
          </article>
        </div>

        <form
          v-if="authStore.isAuthenticated && replyState[comment._id]?.open"
          class="form-grid nested-reply-editor"
          @submit.prevent="submitReply(comment, replyState[comment._id])"
        >
          <textarea v-model="replyState[comment._id].content" rows="3" placeholder="输入楼中楼回复"></textarea>
          <button type="submit">发送回复</button>
        </form>
      </article>
      <p v-if="post && !floors.length" class="empty-state">还没有回复，来抢个一楼吧！</p>
    </section>
  </section>
</template>
