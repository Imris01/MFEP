<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import ModalDialog from "../components/ModalDialog.vue";
import UserBadge from "../components/UserBadge.vue";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";
import { formatDateRange, formatDateTime } from "../utils/format";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const event = ref(null);
const inviteKeyword = ref("");
const inviteCandidates = ref([]);
const joinNote = ref("");
const error = ref("");
const success = ref("");
const editModalOpen = ref(false);
const participantModalOpen = ref(false);
const deleteEventModalOpen = ref(false);
const submissionToDelete = ref(null);

const editForm = reactive({
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
  managerIds: [],
  judgeIds: [],
  testerIds: [],
  bsMemberIds: [],
  judgeWeights: {},
  testerWeights: {},
});

const currentUserId = computed(() => authStore.user?.id || authStore.user?._id || "");
const isHost = computed(() => event.value?.createdBy?._id === currentUserId.value);
const isParticipant = computed(() => event.value?.participants?.some((item) => item._id === currentUserId.value));
const canManageMembers = computed(() => event.value?.canManageMembers);
const statusMap = {
  upcoming: { label: "未开始", className: "status-upcoming" },
  active: { label: "进行中", className: "status-active" },
  ended: { label: "已结束", className: "status-ended" },
};

const stateMeta = computed(() => statusMap[event.value?.state] || statusMap.upcoming);
const availableMembers = computed(() => event.value?.participants || []);

function fillEditForm() {
  if (!event.value) {
    return;
  }

  editForm.title = event.value.title;
  editForm.summary = event.value.summary || "";
  editForm.description = event.value.description;
  editForm.rules = event.value.rules;
  editForm.startDate = event.value.startTime?.slice(0, 10);
  editForm.endDate = event.value.endTime?.slice(0, 10);
  editForm.activityType = event.value.activityType;
  editForm.isPrivate = event.value.visibility === "private";
  editForm.isAnonymous = event.value.isAnonymous;
  editForm.useJudgeGroup = event.value.useJudgeGroup;
  editForm.judgeGroupPublic = event.value.judgeGroupPublic;
  editForm.useBsGroup = event.value.useBsGroup;
  editForm.bsGroupPublic = event.value.bsGroupPublic;
  editForm.useTestGroup = event.value.useTestGroup;
  editForm.testGroupPublic = event.value.testGroupPublic;
  editForm.useManagers = event.value.useManagers;
  editForm.scoreFormula = event.value.scoreFormula || "";
  editForm.managerIds = event.value.participants.filter((item) => item.roles.some((role) => role.key === "manager")).map((item) => item._id);
  editForm.judgeIds = event.value.participants.filter((item) => item.roles.some((role) => role.key === "judge")).map((item) => item._id);
  editForm.testerIds = event.value.participants.filter((item) => item.roles.some((role) => role.key === "tester")).map((item) => item._id);
  editForm.bsMemberIds = event.value.participants.filter((item) => item.roles.some((role) => role.key === "bs")).map((item) => item._id);
  editForm.judgeWeights = Object.fromEntries(event.value.participants.map((item) => [item._id, item.weights?.judgeWeight || 1]));
  editForm.testerWeights = Object.fromEntries(event.value.participants.map((item) => [item._id, item.weights?.testerWeight || 1]));
}

function difficultyStyle(item) {
  return {
    background: item.color,
    color: item.key === "advanced" || item.key === "easy" ? "#24292f" : "#ffffff",
  };
}

function roleBadgeStyle(role) {
  return {
    background: `${role.color}18`,
    color: role.color,
    borderColor: `${role.color}40`,
  };
}

async function loadEvent() {
  try {
    const { data } = await http.get(`/events/${route.params.id}`);
    event.value = data;
    fillEditForm();
    error.value = "";
  } catch (err) {
    error.value = err.response?.data?.message || "加载活动失败。";
  }
}

async function applyJoin() {
  try {
    const { data } = await http.post(`/events/${route.params.id}/join-requests`, { note: joinNote.value });
    success.value = data.message;
    error.value = "";
    joinNote.value = "";
  } catch (err) {
    error.value = err.response?.data?.message || "提交参与申请失败。";
  }
}

async function leaveCurrentEvent() {
  try {
    const { data } = await http.post(`/events/${route.params.id}/leave`);
    success.value = data.message;
    await loadEvent();
  } catch (err) {
    error.value = err.response?.data?.message || "退出活动失败。";
  }
}

async function saveEventEdit() {
  const payload = new FormData();
  payload.append("title", editForm.title);
  payload.append("summary", editForm.summary);
  payload.append("description", editForm.description);
  payload.append("rules", editForm.rules);
  payload.append("startDate", editForm.startDate);
  payload.append("endDate", editForm.endDate);
  payload.append("activityType", editForm.activityType);
  payload.append("isPrivate", String(editForm.isPrivate));
  payload.append("isAnonymous", String(editForm.isAnonymous));
  payload.append("useJudgeGroup", String(editForm.useJudgeGroup));
  payload.append("judgeGroupPublic", String(editForm.judgeGroupPublic));
  payload.append("useBsGroup", String(editForm.useBsGroup));
  payload.append("bsGroupPublic", String(editForm.bsGroupPublic));
  payload.append("useTestGroup", String(editForm.useTestGroup));
  payload.append("testGroupPublic", String(editForm.testGroupPublic));
  payload.append("useManagers", String(editForm.useManagers));
  payload.append("scoreFormula", editForm.scoreFormula);
  payload.append("managerIds", JSON.stringify(editForm.managerIds));
  payload.append("judgeIds", JSON.stringify(editForm.judgeIds));
  payload.append("testerIds", JSON.stringify(editForm.testerIds));
  payload.append("bsMemberIds", JSON.stringify(editForm.bsMemberIds));
  payload.append("judgeWeights", JSON.stringify(editForm.judgeWeights));
  payload.append("testerWeights", JSON.stringify(editForm.testerWeights));
  if (editForm.bannerImage) {
    payload.append("bannerImage", editForm.bannerImage);
  }

  try {
    const { data } = await http.put(`/events/${route.params.id}`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    success.value = data.message;
    editModalOpen.value = false;
    await loadEvent();
  } catch (err) {
    error.value = err.response?.data?.message || "保存活动信息失败。";
  }
}

async function deleteCurrentEvent() {
  try {
    await http.delete(`/events/${route.params.id}`);
    router.push("/events");
  } catch (err) {
    error.value = err.response?.data?.message || "删除活动失败。";
  }
}

async function searchInvitees() {
  if (!inviteKeyword.value.trim()) {
    inviteCandidates.value = [];
    return;
  }

  try {
    const { data } = await http.get(`/users?keyword=${encodeURIComponent(inviteKeyword.value)}`);
    inviteCandidates.value = data;
  } catch (_err) {
    inviteCandidates.value = [];
  }
}

async function inviteUser(userId) {
  try {
    const { data } = await http.post(`/events/${route.params.id}/invite`, { userId });
    success.value = data.message;
    inviteKeyword.value = "";
    inviteCandidates.value = [];
  } catch (err) {
    error.value = err.response?.data?.message || "发送邀请失败。";
  }
}

async function toggleSubmissionLike(submissionId) {
  try {
    const { data } = await http.post(`/events/${route.params.id}/submissions/${submissionId}/like`);
    success.value = data.message;
    await loadEvent();
  } catch (err) {
    error.value = err.response?.data?.message || "点赞失败。";
  }
}

async function deleteSubmission() {
  if (!submissionToDelete.value) {
    return;
  }

  try {
    const { data } = await http.delete(`/events/${route.params.id}/submissions/${submissionToDelete.value}`);
    success.value = data.message;
    submissionToDelete.value = null;
    await loadEvent();
  } catch (err) {
    error.value = err.response?.data?.message || "删除作品失败。";
  }
}

onMounted(loadEvent);
</script>

<template>
  <section class="stack">
    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="success" class="success-text">{{ success }}</p>

    <template v-if="event">
      <article class="panel event-detail-hero">
        <img
          v-if="event.bannerImage"
          class="detail-banner"
          :src="`http://localhost:5000${event.bannerImage}`"
          alt="活动头图"
        />

        <div class="stack">
          <div class="section-title-row">
            <div class="stack compact-gap">
              <div class="card-title-row">
                <h2>{{ event.title }}</h2>
                <span class="pill" :class="stateMeta.className">{{ stateMeta.label }}</span>
              </div>
              <p class="muted">
                {{ event.activityType === "contest" ? "赛事" : "企划" }}
                ·
                {{ event.visibility === "private" ? "私密活动" : "公开活动" }}
                ·
                {{ event.durationDays }} 天
              </p>
            </div>

            <div class="panel-actions">
              <button v-if="event.canEdit" class="btn btn-secondary" @click="editModalOpen = true">编辑活动信息</button>
              <button v-if="event.canManageMembers" class="btn btn-secondary" @click="participantModalOpen = true">查看参与者</button>
              <button v-if="event.canEdit" class="btn btn-danger" @click="deleteEventModalOpen = true">删除活动</button>
            </div>
          </div>

          <UserBadge :user="event.createdBy" />
          <p>{{ event.summary || "暂无活动摘要" }}</p>
          <p class="muted">活动时间：{{ formatDateRange(event.startTime, event.endTime) }}</p>
          <p class="muted">参加人数：{{ event.participantCount }}</p>
          <p>{{ event.description }}</p>

          <div class="rule-box">
            <h3>活动规则</h3>
            <p>{{ event.rules }}</p>
          </div>

          <div v-if="event.activityType === 'contest'" class="event-config-summary">
            <p v-if="event.isAnonymous" class="muted">当前赛事已开启匿名投稿。</p>
            <p v-if="event.scoreFormula" class="muted">评分公式：{{ event.scoreFormula }}</p>
          </div>

          <div class="panel-actions">
            <button
              v-if="authStore.isAuthenticated && event.canJoin"
              class="btn btn-primary"
              @click="applyJoin"
            >
              申请参与
            </button>
            <RouterLink
              v-if="authStore.isAuthenticated && event.canSubmit"
              class="btn btn-primary"
              :to="`/events/${event._id}/submit`"
            >
              提交作品
            </RouterLink>
            <button
              v-if="authStore.isAuthenticated && event.canLeave"
              class="btn btn-secondary"
              @click="leaveCurrentEvent"
            >
              退出活动
            </button>
          </div>

          <label v-if="authStore.isAuthenticated && event.canJoin" class="form-grid">
            <span>参与申请备注</span>
            <textarea v-model="joinNote" rows="3" placeholder="可以简单说明你的参与意向"></textarea>
          </label>
        </div>
      </article>

      <section class="stack">
        <div class="section-title-row">
          <h3>作品条目</h3>
        </div>

        <article
          v-for="submission in event.submissions"
          :key="submission._id"
          class="panel submission-item compact-card"
        >
          <RouterLink class="submission-cover-wrap" :data-index="submission.orderNumber" :to="`/events/${event._id}/submissions/${submission._id}`">
            <img
              class="submission-cover"
              :src="`http://localhost:5000${submission.files.cover}`"
              alt="作品封面"
            />
          </RouterLink>

          <div class="submission-main">
            <div class="submission-topline">
              <div class="submission-heading">
                <div class="difficulty-strip">
                  <div
                    v-for="item in submission.difficulties"
                    :key="item.key"
                    class="difficulty-chip compact"
                    :style="difficultyStyle(item)"
                  >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                </div>
                <RouterLink :to="`/events/${event._id}/submissions/${submission._id}`" class="submission-title-link">
                  {{ submission.title }}
                </RouterLink>
                <p><strong>曲师：</strong>{{ submission.artist }}</p>
                <p><strong>谱师名义：</strong>{{ submission.displayCharterName }}</p>
              </div>

              <div class="submission-side">
                <p class="muted">No.{{ submission.orderNumber }}</p>
                <p class="muted">投稿时间：{{ formatDateTime(submission.createdAt) }}</p>
              </div>
            </div>

            <div class="submission-meta">
              <UserBadge v-if="submission.showRealAuthor && submission.participant" :user="submission.participant" compact />
              <span class="muted">点赞 {{ submission.likesCount }}</span>
              <span class="muted">评论 {{ submission.commentsCount }}</span>
              <span class="muted" v-if="submission.averageScore !== null">均分 {{ submission.averageScore }}</span>
            </div>

            <div class="panel-actions end">
              <button class="btn btn-secondary" @click="toggleSubmissionLike(submission._id)">
                {{ submission.likedByCurrentUser ? "取消点赞" : "点赞" }}
              </button>
              <a
                class="btn btn-secondary"
                :href="`http://localhost:5000/api/events/${event._id}/submissions/${submission._id}/download`"
              >
                下载谱面包
              </a>
              <button
                v-if="isHost"
                class="btn btn-danger"
                @click="submissionToDelete = submission._id"
              >
                删除作品
              </button>
            </div>
          </div>
        </article>

        <p v-if="!event.submissions.length" class="empty-state">暂时还没有人提交作品哟！</p>
      </section>
    </template>

    <ModalDialog v-if="editModalOpen" title="编辑活动信息" width="900px" @close="editModalOpen = false">
      <div class="form-grid">
        <input v-model="editForm.title" type="text" placeholder="活动标题" />
        <input v-model="editForm.summary" type="text" placeholder="活动摘要" />
        <textarea v-model="editForm.description" rows="4" placeholder="活动描述"></textarea>
        <textarea v-model="editForm.rules" rows="4" placeholder="活动规则"></textarea>

        <div class="inline-form">
          <label>
            开始日期
            <input v-model="editForm.startDate" type="date" />
          </label>
          <label>
            结束日期
            <input v-model="editForm.endDate" type="date" />
          </label>
        </div>

        <label>
          活动类型
          <select v-model="editForm.activityType">
            <option value="project">企划</option>
            <option value="contest">赛事</option>
          </select>
        </label>

        <div class="checkbox-line">
          <label class="checkbox-inline">
            <input v-model="editForm.isPrivate" type="checkbox" />
            <span>私密活动</span>
          </label>
          <label class="checkbox-inline">
            <input v-model="editForm.isAnonymous" type="checkbox" />
            <span>匿名投稿</span>
          </label>
          <label class="checkbox-inline">
            <input v-model="editForm.useManagers" type="checkbox" />
            <span>启用活动管理员</span>
          </label>
        </div>

        <template v-if="editForm.activityType === 'contest'">
          <div class="checkbox-line">
            <label class="checkbox-inline">
              <input v-model="editForm.useJudgeGroup" type="checkbox" />
              <span>启用评委制</span>
            </label>
            <label v-if="editForm.useJudgeGroup" class="checkbox-inline">
              <input v-model="editForm.judgeGroupPublic" type="checkbox" />
              <span>评委组公开</span>
            </label>
          </div>

          <div class="checkbox-line">
            <label class="checkbox-inline">
              <input v-model="editForm.useBsGroup" type="checkbox" />
              <span>启用海选制</span>
            </label>
            <label v-if="editForm.useBsGroup" class="checkbox-inline">
              <input v-model="editForm.bsGroupPublic" type="checkbox" />
              <span>bs 组公开</span>
            </label>
          </div>

          <div class="checkbox-line">
            <label class="checkbox-inline">
              <input v-model="editForm.useTestGroup" type="checkbox" />
              <span>启用实测组</span>
            </label>
            <label v-if="editForm.useTestGroup" class="checkbox-inline">
              <input v-model="editForm.testGroupPublic" type="checkbox" />
              <span>实测组公开</span>
            </label>
          </div>

          <textarea v-model="editForm.scoreFormula" rows="3" placeholder="评分公式"></textarea>
        </template>

        <div class="role-picker-grid">
          <div v-if="editForm.useManagers" class="role-picker-panel">
            <h4>活动管理员</h4>
            <label v-for="member in availableMembers" :key="`manager-${member._id}`" class="checkbox-inline">
              <input v-model="editForm.managerIds" type="checkbox" :value="member._id" />
              <span>{{ member.username }}</span>
            </label>
          </div>

          <div v-if="editForm.useJudgeGroup" class="role-picker-panel">
            <h4>评委</h4>
            <label v-for="member in availableMembers" :key="`judge-${member._id}`" class="checkbox-inline">
              <input v-model="editForm.judgeIds" type="checkbox" :value="member._id" />
              <span>{{ member.username }}</span>
            </label>
            <label
              v-for="memberId in editForm.judgeIds"
              :key="`judge-weight-${memberId}`"
              class="weight-input-row"
            >
              <span>{{ availableMembers.find((item) => item._id === memberId)?.username }} 权重</span>
              <input v-model.number="editForm.judgeWeights[memberId]" type="number" min="0" step="0.1" />
            </label>
          </div>

          <div v-if="editForm.useBsGroup" class="role-picker-panel">
            <h4>bs</h4>
            <label v-for="member in availableMembers" :key="`bs-${member._id}`" class="checkbox-inline">
              <input v-model="editForm.bsMemberIds" type="checkbox" :value="member._id" />
              <span>{{ member.username }}</span>
            </label>
          </div>

          <div v-if="editForm.useTestGroup" class="role-picker-panel">
            <h4>实测</h4>
            <label v-for="member in availableMembers" :key="`tester-${member._id}`" class="checkbox-inline">
              <input v-model="editForm.testerIds" type="checkbox" :value="member._id" />
              <span>{{ member.username }}</span>
            </label>
            <label
              v-for="memberId in editForm.testerIds"
              :key="`tester-weight-${memberId}`"
              class="weight-input-row"
            >
              <span>{{ availableMembers.find((item) => item._id === memberId)?.username }} 权重</span>
              <input v-model.number="editForm.testerWeights[memberId]" type="number" min="0" step="0.1" />
            </label>
          </div>
        </div>

        <label class="file-label">
          更换活动头图
          <input type="file" accept="image/*" @change="editForm.bannerImage = $event.target.files[0]" />
        </label>

        <div class="panel-actions end">
          <button class="btn btn-secondary" type="button" @click="editModalOpen = false">取消</button>
          <button class="btn btn-primary" type="button" @click="saveEventEdit">保存</button>
        </div>
      </div>
    </ModalDialog>

    <ModalDialog v-if="participantModalOpen && event" title="参与者名单" width="860px" @close="participantModalOpen = false">
      <div class="stack">
        <div class="form-grid">
          <label v-if="canManageMembers">
            搜索用户并发送邀请
            <input v-model="inviteKeyword" type="text" placeholder="输入用户 ID 搜索" @input="searchInvitees" />
          </label>
          <div v-if="inviteCandidates.length" class="invite-list">
            <div v-for="user in inviteCandidates" :key="user.id" class="invite-item">
              <UserBadge :user="user" compact />
              <button class="btn btn-secondary" @click="inviteUser(user.id)">发送邀请</button>
            </div>
          </div>
        </div>

        <div class="participant-list">
          <div class="participant-list-item">
            <UserBadge :user="event.createdBy" compact />
            <div class="participant-role-badges">
              <span
                v-for="role in event.createdByRoles"
                :key="`host-${role.key}`"
                class="role-badge"
                :style="roleBadgeStyle(role)"
              >
                {{ role.label }}
              </span>
            </div>
          </div>

          <div v-for="member in event.participants" :key="member._id" class="participant-list-item">
            <UserBadge :user="member" compact />
            <div class="participant-role-badges">
              <span
                v-for="role in member.roles"
                :key="`${member._id}-${role.key}`"
                class="role-badge"
                :style="roleBadgeStyle(role)"
              >
                {{ role.label }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ModalDialog>

    <ModalDialog v-if="deleteEventModalOpen" title="确认删除活动" width="480px" @close="deleteEventModalOpen = false">
      <div class="stack">
        <p>删除活动后将无法恢复，确定要继续吗？</p>
        <div class="panel-actions end">
          <button class="btn btn-secondary" type="button" @click="deleteEventModalOpen = false">取消</button>
          <button class="btn btn-danger" type="button" @click="deleteCurrentEvent">确认删除</button>
        </div>
      </div>
    </ModalDialog>

    <ModalDialog v-if="submissionToDelete" title="确认删除作品" width="480px" @close="submissionToDelete = null">
      <div class="stack">
        <p>删除作品后将无法恢复，确定要继续吗？</p>
        <div class="panel-actions end">
          <button class="btn btn-secondary" type="button" @click="submissionToDelete = null">取消</button>
          <button class="btn btn-danger" type="button" @click="deleteSubmission">确认删除</button>
        </div>
      </div>
    </ModalDialog>
  </section>
</template>
