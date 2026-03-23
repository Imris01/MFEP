<script setup>
import { onMounted, ref } from "vue";
import http from "../api/http";
import EventCard from "../components/EventCard.vue";
import { formatDate } from "../utils/format";

const recentEvents = ref([]);
const recentPosts = ref([]);

onMounted(async () => {
  const { data } = await http.get("/events/home-summary");
  recentEvents.value = data.recentEvents;
  recentPosts.value = data.recentPosts;
});
</script>

<template>
  <section class="stack">
    <section class="hero-grid">
      <article class="panel hero-panel">
        <span class="eyebrow">欢迎来到 MFEP</span>
        <h2>在这里发起企划、报名活动、提交作品，也能和同好一起讨论。</h2>
        <p>主页会展示最近的新活动和论坛新帖子，帮助大家快速追踪社区动态。</p>
      </article>

      <article class="panel info-panel">
        <h3>你可以在这里做什么？</h3>
        <p>申请举办活动、审核参与申请、上传作品文件、查看消息通知、浏览用户主页。</p>
      </article>
    </section>

    <section class="two-column">
      <div class="stack">
        <div class="section-title-row">
          <h2>最近的新活动</h2>
          <RouterLink class="inline-link" to="/events">查看全部</RouterLink>
        </div>
        <EventCard v-for="event in recentEvents" :key="event._id" :event="event" />
        <p v-if="!recentEvents.length" class="empty-state">最近还没有新的活动哟！</p>
      </div>

      <div class="stack">
        <div class="section-title-row">
          <h2>论坛新帖子</h2>
          <RouterLink class="inline-link" to="/forum">前往论坛</RouterLink>
        </div>
        <article v-for="post in recentPosts" :key="post._id" class="panel">
          <h3>{{ post.title }}</h3>
          <p class="muted">作者：{{ post.author?.username }} · 发布时间：{{ formatDate(post.createdAt) }}</p>
        </article>
        <p v-if="!recentPosts.length" class="empty-state">论坛暂时还没有新帖子哟！</p>
      </div>
    </section>
  </section>
</template>
