<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import UserBadge from "./UserBadge.vue";
import { formatDateRange, summarize } from "../utils/format";

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

const stateMap = {
  upcoming: { label: "未开始", className: "status-upcoming" },
  active: { label: "进行中", className: "status-active" },
  ended: { label: "已结束", className: "status-ended" },
};

const stateMeta = computed(() => stateMap[props.event.state] || stateMap.upcoming);
</script>

<template>
  <article class="event-card">
    <img
      v-if="event.bannerImage"
      class="event-banner"
      :src="`http://localhost:5000${event.bannerImage}`"
      alt="活动头图"
    />
    <div class="event-card-body">
      <div class="event-card-head">
        <div class="stack">
          <div class="card-title-row">
            <RouterLink :to="`/events/${event._id}`" class="inline-link">
              {{ event.title }}
            </RouterLink>
            <span class="pill" :class="stateMeta.className">{{ stateMeta.label }}</span>
          </div>
          <p class="muted">
            {{ event.activityType === "contest" ? "赛事" : "企划" }}
            ·
            {{ event.visibility === "private" ? "私密活动" : "公开活动" }}
          </p>
        </div>
      </div>

      <UserBadge :user="event.createdBy" compact />

      <p>{{ summarize(event.summary || event.description, "暂无活动简介") }}</p>
      <p class="muted">活动时间：{{ formatDateRange(event.startTime, event.endTime) }}</p>
      <p class="muted">参与人数：{{ event.participantCount || event.participants?.length || 0 }}</p>

      <div class="panel-actions end">
        <RouterLink class="btn btn-secondary" :to="`/events/${event._id}`">进入活动</RouterLink>
      </div>
    </div>
  </article>
</template>
