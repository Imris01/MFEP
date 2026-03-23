<script setup>
import { reactive, ref, watchEffect } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const success = ref("");
const error = ref("");
const profile = reactive({
  bio: "",
  showParticipatedEvents: true,
});

watchEffect(() => {
  profile.bio = authStore.user?.bio || "";
  profile.showParticipatedEvents = authStore.user?.showParticipatedEvents ?? true;
});

async function submit() {
  const formData = new FormData();
  formData.append("bio", profile.bio);
  formData.append("showParticipatedEvents", profile.showParticipatedEvents);

  success.value = "";
  error.value = "";

  try {
    const data = await authStore.updateProfile(formData);
    success.value = data.message;
  } catch (err) {
    error.value = err.response?.data?.message || "保存失败，请稍后再试。";
  }
}
</script>

<template>
  <section class="stack">
    <section class="panel profile-summary-card">
      <RouterLink class="editable-avatar" to="/profile/avatar">
        <img
          class="profile-avatar-large"
          :src="`http://localhost:5000${authStore.user?.avatar || '/defaults/avatar-default.svg'}`"
          alt="头像"
        />
        <div class="avatar-hover-mask">更换头像</div>
      </RouterLink>

      <div class="profile-summary-text">
        <h2>{{ authStore.user?.username }}</h2>
        <p class="muted">ID：{{ authStore.user?.username }}</p>
        <p class="muted">邮箱：{{ authStore.user?.email }}</p>
      </div>
    </section>

    <section class="panel form-panel">
      <h3>编辑个人资料</h3>
      <form class="form-grid" @submit.prevent="submit">
        <textarea v-model="profile.bio" rows="5" placeholder="写一点个人介绍吧"></textarea>
        <label class="checkbox-inline">
          <input v-model="profile.showParticipatedEvents" type="checkbox" />
          <span>公开我参加过的活动</span>
        </label>
        <div class="panel-actions end">
          <button class="btn btn-primary" type="submit">保存资料</button>
        </div>
      </form>
      <p v-if="success" class="success-text">{{ success }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </section>
  </section>
</template>
