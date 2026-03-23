<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const error = ref("");
const form = reactive({
  email: "",
  password: "",
});

async function submit() {
  error.value = "";
  try {
    await authStore.login(form);
    router.push("/");
  } catch (err) {
    error.value = err.response?.data?.message || "登录失败，请稍后再试";
  }
}
</script>

<template>
  <section class="panel form-panel narrow-panel">
    <h2>登录账号</h2>
    <form class="form-grid" @submit.prevent="submit">
      <input v-model="form.email" type="email" placeholder="请输入邮箱" />
      <input v-model="form.password" type="password" placeholder="请输入密码" />
      <button type="submit">登录</button>
      <p v-if="error" class="error-text">{{ error }}</p>
    </form>
  </section>
</template>
