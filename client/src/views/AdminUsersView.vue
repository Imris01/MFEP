<script setup>
import { onMounted, ref } from "vue";
import UserBadge from "../components/UserBadge.vue";
import http from "../api/http";

const users = ref([]);
const success = ref("");

async function loadUsers() {
  const { data } = await http.get("/admin/users");
  users.value = data;
}

async function updateRole(id, role) {
  const { data } = await http.put(`/admin/users/${id}/role`, { role });
  success.value = data.message;
  await loadUsers();
}

onMounted(loadUsers);
</script>

<template>
  <section class="stack">
    <div class="section-title-row">
      <h2>用户管理</h2>
      <p class="muted">在这里可以直接设定管理员和普通用户角色。</p>
    </div>

    <p v-if="success" class="success-text">{{ success }}</p>

    <article v-for="user in users" :key="user._id" class="panel">
      <div class="section-title-row">
        <UserBadge :user="user" />
        <span class="pill">{{ user.role === "admin" ? "管理员" : "普通用户" }}</span>
      </div>
      <p class="muted">{{ user.email }}</p>
      <p>{{ user.bio || "暂无个人介绍" }}</p>
      <div class="action-row">
        <button @click="updateRole(user._id, 'user')">设为普通用户</button>
        <button class="ghost-button" @click="updateRole(user._id, 'admin')">设为管理员</button>
      </div>
    </article>
  </section>
</template>
