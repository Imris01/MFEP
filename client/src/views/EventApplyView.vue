<script setup>
import { reactive, ref } from "vue";
import http from "../api/http";

const success = ref("");
const error = ref("");
const form = reactive({
  title: "",
  summary: "",
  description: "",
  rules: "",
  startDate: "",
  endDate: "",
  activityType: "project",
  isPrivate: false,
  isAnonymous: false,
  useJudgeGroup: false,
  judgeGroupPublic: false,
  useBsGroup: false,
  bsGroupPublic: false,
  useTestGroup: false,
  testGroupPublic: false,
  useManagers: false,
  scoreFormula: "",
  bannerImage: null,
});

async function submitApplication() {
  const payload = new FormData();

  Object.entries(form).forEach(([key, value]) => {
    if (value !== null && value !== "") {
      payload.append(key, typeof value === "boolean" ? String(value) : value);
    }
  });

  try {
    const { data } = await http.post("/events/applications", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    success.value = data.message;
    error.value = "";
  } catch (err) {
    error.value = err.response?.data?.message || "提交活动申请失败。";
  }
}
</script>

<template>
  <section class="panel form-panel">
    <h2>申请开办活动</h2>
    <form class="form-grid" @submit.prevent="submitApplication">
      <input v-model="form.title" type="text" placeholder="活动标题" />
      <input v-model="form.summary" type="text" placeholder="活动摘要（用于活动列表展示）" />
      <textarea v-model="form.description" rows="5" placeholder="活动详细介绍"></textarea>
      <textarea v-model="form.rules" rows="5" placeholder="活动规则"></textarea>

      <div class="inline-form">
        <label>
          开始日期
          <input v-model="form.startDate" type="date" />
        </label>
        <label>
          结束日期
          <input v-model="form.endDate" type="date" />
        </label>
      </div>

      <label>
        活动类型
        <select v-model="form.activityType">
          <option value="project">企划</option>
          <option value="contest">赛事</option>
        </select>
      </label>

      <div class="checkbox-line">
        <label class="checkbox-inline">
          <input v-model="form.isPrivate" type="checkbox" />
          <span>私密活动</span>
        </label>
        <label class="checkbox-inline">
          <input v-model="form.isAnonymous" type="checkbox" />
          <span>匿名投稿</span>
        </label>
      </div>

      <template v-if="form.activityType === 'contest'">
        <div class="checkbox-line">
          <label class="checkbox-inline">
            <input v-model="form.useJudgeGroup" type="checkbox" />
            <span>启用评委制</span>
          </label>
          <label v-if="form.useJudgeGroup" class="checkbox-inline">
            <input v-model="form.judgeGroupPublic" type="checkbox" />
            <span>评委组公开</span>
          </label>
        </div>

        <div class="checkbox-line">
          <label class="checkbox-inline">
            <input v-model="form.useBsGroup" type="checkbox" />
            <span>启用海选制</span>
          </label>
          <label v-if="form.useBsGroup" class="checkbox-inline">
            <input v-model="form.bsGroupPublic" type="checkbox" />
            <span>bs 组公开</span>
          </label>
        </div>

        <div class="checkbox-line">
          <label class="checkbox-inline">
            <input v-model="form.useTestGroup" type="checkbox" />
            <span>启用实测组</span>
          </label>
          <label v-if="form.useTestGroup" class="checkbox-inline">
            <input v-model="form.testGroupPublic" type="checkbox" />
            <span>实测组公开</span>
          </label>
        </div>

        <label class="checkbox-inline">
          <input v-model="form.useManagers" type="checkbox" />
          <span>启用活动管理员</span>
        </label>

        <textarea
          v-model="form.scoreFormula"
          rows="3"
          placeholder="评分公式，例如：(judge * 0.7) + (tester * 0.3)"
        ></textarea>
      </template>

      <label class="file-label">
        上传活动头图
        <input type="file" accept="image/*" @change="form.bannerImage = $event.target.files[0]" />
      </label>

      <div class="panel-actions end">
        <button class="btn btn-primary" type="submit">提交申请</button>
      </div>
    </form>

    <p v-if="success" class="success-text">{{ success }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>
  </section>
</template>
