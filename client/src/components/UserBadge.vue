<script setup>
import { ref } from "vue";

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const hovered = ref(false);
</script>

<template>
  <div class="user-badge-wrapper" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <div class="user-hover-bridge"></div>
    <RouterLink :to="`/users/${props.user._id || props.user.id}`" class="user-badge" :class="{ compact }">
      <img :src="`http://localhost:5000${props.user.avatar || '/defaults/avatar-default.svg'}`" alt="用户头像" />
      <span class="user-badge-text">
        <strong>{{ props.user.username }}</strong>
        <small>ID：{{ props.user.username }}</small>
      </span>
    </RouterLink>

    <div v-if="hovered" class="user-hover-card">
      <div class="user-hover-head">
        <img :src="`http://localhost:5000${props.user.avatar || '/defaults/avatar-default.svg'}`" alt="用户头像" />
        <div>
          <strong>{{ props.user.username }}</strong>
          <p>ID：{{ props.user.username }}</p>
        </div>
      </div>
      <p>{{ props.user.bio || "这个人还没有留下简介。" }}</p>
      <p v-if="props.user.email" class="muted">{{ props.user.email }}</p>
      <RouterLink :to="`/users/${props.user._id || props.user.id}`" class="inline-link">进入个人主页</RouterLink>
    </div>
  </div>
</template>
