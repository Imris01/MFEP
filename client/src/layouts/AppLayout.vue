<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";
import BackToTopButton from "../components/BackToTopButton.vue";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const unreadCount = ref(0);

const eventSubmenu = computed(() => [
  { label: "活动列表", to: "/events" },
  { label: "申请开办", to: "/events/apply" },
]);

const avatarUrl = computed(
  () => `http://localhost:5000${authStore.user?.avatar || "/defaults/avatar-default.svg"}`
);

async function handleLogout() {
  await authStore.logout();
  unreadCount.value = 0;
  router.push("/");
}

async function loadUnreadCount() {
  if (!authStore.isAuthenticated) {
    unreadCount.value = 0;
    return;
  }

  try {
    const { data } = await http.get("/messages/summary");
    unreadCount.value = data.unreadCount;
  } catch (_error) {
    unreadCount.value = 0;
  }
}

onMounted(async () => {
  if (authStore.token && !authStore.user) {
    await authStore.fetchMe();
  }
  await loadUnreadCount();
});

watch(
  () => router.currentRoute.value.fullPath,
  async () => {
    await loadUnreadCount();
  }
);
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand-block">
          <RouterLink to="/" class="brand-title">MFEP</RouterLink>
          <p>maimai Fanmade Event Platform</p>
        </div>

        <nav class="nav">
          <RouterLink to="/">主页</RouterLink>

          <div class="nav-dropdown">
            <RouterLink to="/events">活动</RouterLink>
            <div class="dropdown-menu">
              <RouterLink v-for="item in eventSubmenu" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
            </div>
          </div>

          <RouterLink to="/forum">论坛</RouterLink>
          <RouterLink v-if="authStore.user?.role === 'admin'" to="/admin/users">用户管理</RouterLink>
          <RouterLink v-if="!authStore.isAuthenticated" to="/login">登录</RouterLink>
          <RouterLink v-if="!authStore.isAuthenticated" to="/register">注册</RouterLink>

          <div v-if="authStore.isAuthenticated" class="nav-dropdown nav-avatar-entry">
            <RouterLink to="/profile" class="nav-avatar-link" title="个人主页">
              <span class="nav-avatar-bubble" v-if="unreadCount > 0">{{ unreadCount > 99 ? "99+" : unreadCount }}</span>
              <img class="nav-avatar-image" :src="avatarUrl" alt="头像" />
              <span>{{ authStore.user?.username }}</span>
            </RouterLink>
            <div class="dropdown-menu avatar-menu">
              <RouterLink to="/profile">个人主页</RouterLink>
              <RouterLink to="/messages">未读消息（{{ unreadCount }}条）</RouterLink>
              <button class="menu-button" @click="handleLogout">登出</button>
            </div>
          </div>
        </nav>
      </div>
    </header>

    <main class="page-container">
      <RouterView />
    </main>

    <BackToTopButton />
  </div>
</template>
