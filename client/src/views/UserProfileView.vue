<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import http from "../api/http";
import EventCard from "../components/EventCard.vue";

const route = useRoute();
const profile = ref(null);
const hostedEvents = ref([]);
const participatedEvents = ref([]);
const canViewParticipatedEvents = ref(false);

async function loadProfile() {
  const { data } = await http.get(`/users/${route.params.id}`);
  profile.value = data.user;
  hostedEvents.value = data.hostedEvents;
  participatedEvents.value = data.participatedEvents;
  canViewParticipatedEvents.value = data.canViewParticipatedEvents;
}

onMounted(loadProfile);
watch(() => route.params.id, loadProfile);
</script>

<template>
  <section v-if="profile" class="stack">
    <section class="panel profile-header">
      <img class="profile-avatar-large" :src="`http://localhost:5000${profile.avatar}`" alt="头像" />
      <div>
        <h2>{{ profile.username }}</h2>
        <p class="muted">ID：{{ profile.username }}</p>
        <p class="muted">邮箱：{{ profile.email }}</p>
        <p>{{ profile.bio || "这个人很神秘，还没有留下自我介绍。" }}</p>
      </div>
    </section>

    <section class="stack">
      <h3>主办过的活动</h3>
      <EventCard v-for="event in hostedEvents" :key="event._id" :event="{ ...event, participants: [] }" />
      <p v-if="!hostedEvents.length" class="empty-state">Ta 还没有公开的主办活动哟！</p>
    </section>

    <section class="stack">
      <h3>参加过的活动</h3>
      <template v-if="canViewParticipatedEvents">
        <EventCard v-for="event in participatedEvents" :key="event._id" :event="{ ...event, participants: [] }" />
        <p v-if="!participatedEvents.length" class="empty-state">Ta 还没有公开展示参加记录哟！</p>
      </template>
      <p v-else class="empty-state">Ta 没有公开参加过的活动信息。</p>
    </section>
  </section>
</template>
