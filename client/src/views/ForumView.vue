<script setup>
import { onMounted, reactive, ref } from "vue";
import UserBadge from "../components/UserBadge.vue";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";
import { formatDate } from "../utils/format";

const authStore = useAuthStore();
const posts = ref([]);
const error = ref("");
const form = reactive({
  title: "",
  content: "",
});

async function loadPosts() {
  const { data } = await http.get("/posts");
  posts.value = data;
}

async function submitPost() {
  try {
    await http.post("/posts", form);
    form.title = "";
    form.content = "";
    await loadPosts();
  } catch (err) {
    error.value = err.response?.data?.message || "发帖失败";
  }
}

onMounted(loadPosts);
</script>

<template>
  <section class="stack">
    <section v-if="authStore.isAuthenticated" class="panel form-panel">
      <h2>发布新帖子</h2>
      <form class="form-grid" @submit.prevent="submitPost">
        <input v-model="form.title" type="text" placeholder="帖子标题" />
        <textarea v-model="form.content" rows="6" placeholder="帖子正文，支持 Markdown、@用户名"></textarea>
        <button type="submit">发帖</button>
      </form>
      <p v-if="error" class="error-text">{{ error }}</p>
    </section>

    <section class="stack">
      <RouterLink v-for="post in posts" :key="post._id" :to="`/forum/${post._id}`" class="panel forum-list-item">
        <div class="section-title-row">
          <h3>{{ post.title }}</h3>
          <span class="muted">{{ formatDate(post.createdAt) }}</span>
        </div>
        <UserBadge :user="post.author" compact />
        <p>{{ post.summary }}</p>
        <div class="forum-meta-row">
          <span class="muted">作者 ID：{{ post.author?.username }}</span>
          <span class="muted">点赞 {{ post.likesCount }} · 回复 {{ post.commentsCount }}</span>
        </div>
      </RouterLink>
      <p v-if="!posts.length" class="empty-state">论坛里还没有帖子哟！</p>
    </section>
  </section>
</template>
