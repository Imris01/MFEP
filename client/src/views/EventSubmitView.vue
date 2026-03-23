<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import http from "../api/http";

const route = useRoute();
const router = useRouter();
const error = ref("");
const success = ref("");
const form = reactive({
  maidata: null,
  audio: null,
  cover: null,
  video: null,
});

async function submit() {
  if (!form.maidata || !form.audio || !form.cover) {
    error.value = "请先上传必需文件：maidata.txt、track.mp3 和封面图片";
    return;
  }

  const payload = new FormData();
  payload.append("maidata", form.maidata);
  payload.append("audio", form.audio);
  payload.append("cover", form.cover);
  if (form.video) {
    payload.append("video", form.video);
  }

  try {
    const { data } = await http.post(`/events/${route.params.id}/submissions`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    success.value = data.message;
    error.value = "";
    setTimeout(() => router.push(`/events/${route.params.id}`), 800);
  } catch (err) {
    error.value = err.response?.data?.message || "作品提交失败";
  }
}
</script>

<template>
  <section class="panel form-panel">
    <h2>提交参赛作品</h2>
    <p class="muted">系统会自动从 `maidata.txt` 中读取作品标题、曲师、谱师名义和难度信息。</p>
    <form class="form-grid" @submit.prevent="submit">
      <label class="file-label">上传 maidata.txt <input type="file" @change="form.maidata = $event.target.files[0]" /></label>
      <label class="file-label">上传 track.mp3 <input type="file" @change="form.audio = $event.target.files[0]" /></label>
      <label class="file-label">上传封面 bg.jpg / bg.png <input type="file" @change="form.cover = $event.target.files[0]" /></label>
      <label class="file-label">上传视频 pv.mp4 / bg.mp4（可选） <input type="file" @change="form.video = $event.target.files[0]" /></label>
      <button type="submit">提交作品</button>
      <p v-if="success" class="success-text">{{ success }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </form>
  </section>
</template>
