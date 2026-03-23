<script setup>
import { computed } from "vue";
import UserBadge from "./UserBadge.vue";
import { formatDateRange, summarize } from "../utils/format";

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

const status = computed(() => {
  const now = Date.now();
  const start = new Date(props.event.startTime).getTime();
  const end = new Date(props.event.endTime).getTime();

  if (now < start) return { label: "未开始", className: "status-upcoming" };
  if (now > end) return { label: "已结束", className: "status-ended" };
  return { label: "进行中", className: "status-active" };
});
</script>

<template>
  <article class="event-card">
    <img
      v-if="props.event.bannerImage"
      class="event-banner"
      :src="`http://localhost:5000${props.event.bannerImage}`"
      alt="活动头图"
    />
    <div class="event-card-body">
      <div class="event-card-head">
        <div>
          <div class="card-title-row">
            <h3>{{ props.event.title }}</h3>
            <span class="pill" :class="status.className">{{ status.label }}</span>
          </div>
          <p class="muted">{{ summarize(props.event.summary || props.event.description, "暂无活动摘要") }}</p>
        </div>
        <RouterLink class="inline-link" :to="`/events/${props.event._id}`">查看详情</RouterLink>
      </div>
      <UserBadge :user="props.event.createdBy" />
      <p class="muted">参加人数：{{ props.event.participants?.length || 0 }}</p>
      <p class="muted">持续时间：{{ formatDateRange(props.event.startTime, props.event.endTime) }}</p>
    </div>
  </article>
</template>
