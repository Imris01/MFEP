<script setup>
import { onMounted, ref } from "vue";
import http from "../api/http";
import EventCard from "../components/EventCard.vue";

const events = ref([]);

onMounted(async () => {
  const { data } = await http.get("/events");
  events.value = data;
});
</script>

<template>
  <section class="stack">
    <div class="section-title-row">
      <h2>活动列表</h2>
    </div>

    <template v-if="events.length">
      <EventCard v-for="event in events" :key="event._id" :event="event" />
    </template>
    <p v-else class="empty-state">还没有相关活动哟！</p>
  </section>
</template>
