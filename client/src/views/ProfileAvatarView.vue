<script setup>
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const fileInput = ref(null);
const imageUrl = ref("");
const avatarFile = ref(null);
const imageNatural = ref({ width: 0, height: 0 });
const dragState = ref(null);
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const success = ref("");
const error = ref("");
const cropSize = 260;

const cropImageStyle = computed(() => {
  if (!imageNatural.value.width || !imageNatural.value.height) {
    return {};
  }

  const baseScale = Math.max(cropSize / imageNatural.value.width, cropSize / imageNatural.value.height);
  const finalScale = baseScale * scale.value;
  const width = imageNatural.value.width * finalScale;
  const height = imageNatural.value.height * finalScale;

  return {
    width: `${width}px`,
    height: `${height}px`,
    left: `${(cropSize - width) / 2 + position.value.x}px`,
    top: `${(cropSize - height) / 2 + position.value.y}px`,
  };
});

const roundPreviewStyle = computed(() => cropImageStyle.value);

function chooseFile() {
  fileInput.value?.click();
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  imageUrl.value = URL.createObjectURL(file);
  avatarFile.value = null;
  success.value = "";
  error.value = "";
  position.value = { x: 0, y: 0 };
  scale.value = 1;

  const image = new Image();
  image.src = imageUrl.value;
  await image.decode();
  imageNatural.value = { width: image.width, height: image.height };
}

function startDrag(event) {
  dragState.value = {
    x: event.clientX,
    y: event.clientY,
    startX: position.value.x,
    startY: position.value.y,
  };
}

function moveDrag(event) {
  if (!dragState.value) return;
  position.value = {
    x: dragState.value.startX + event.clientX - dragState.value.x,
    y: dragState.value.startY + event.clientY - dragState.value.y,
  };
}

function endDrag() {
  dragState.value = null;
}

async function generateAvatarBlob() {
  const image = new Image();
  image.src = imageUrl.value;
  await image.decode();

  const canvas = document.createElement("canvas");
  const outputSize = 360;
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");

  const baseScale = Math.max(cropSize / imageNatural.value.width, cropSize / imageNatural.value.height);
  const finalScale = baseScale * scale.value;
  const width = imageNatural.value.width * finalScale;
  const height = imageNatural.value.height * finalScale;

  const drawX = ((cropSize - width) / 2 + position.value.x) * (outputSize / cropSize);
  const drawY = ((cropSize - height) / 2 + position.value.y) * (outputSize / cropSize);
  const drawWidth = width * (outputSize / cropSize);
  const drawHeight = height * (outputSize / cropSize);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

async function submitAvatar() {
  try {
    const blob = await generateAvatarBlob();
    avatarFile.value = new File([blob], "avatar.jpg", { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("avatar", avatarFile.value);
    formData.append("bio", authStore.user?.bio || "");
    formData.append("showParticipatedEvents", authStore.user?.showParticipatedEvents ?? true);

    const data = await authStore.updateProfile(formData);
    success.value = data.message;
    setTimeout(() => router.push("/profile"), 500);
  } catch (err) {
    error.value = err.response?.data?.message || "头像更新失败";
  }
}
</script>

<template>
  <section class="panel form-panel">
    <div class="avatar-page-header">
      <RouterLink to="/profile" class="inline-link">我的头像</RouterLink>
      <span>></span>
      <span>更换头像</span>
    </div>

    <div class="avatar-editor-layout">
      <div class="avatar-editor-main">
        <div class="avatar-editor-cropbox" @mousedown="startDrag" @mousemove="moveDrag" @mouseup="endDrag" @mouseleave="endDrag">
          <img v-if="imageUrl" :src="imageUrl" alt="裁剪图片" class="avatar-editor-image" :style="cropImageStyle" />
          <div class="avatar-crop-overlay"></div>
          <div class="avatar-crop-frame">
            <span class="crop-corner top-left"></span>
            <span class="crop-corner top-right"></span>
            <span class="crop-corner bottom-left"></span>
            <span class="crop-corner bottom-right"></span>
          </div>
        </div>
        <button class="ghost-button" type="button" @click="chooseFile">重新选择</button>
        <input ref="fileInput" hidden type="file" accept="image/png,image/jpeg" @change="handleFile" />
      </div>

      <div class="avatar-editor-side">
        <div class="avatar-editor-round-preview">
          <img v-if="imageUrl" :src="imageUrl" alt="预览头像" class="avatar-editor-image" :style="roundPreviewStyle" />
        </div>
        <p class="muted">预览头像</p>
      </div>
    </div>

    <div class="form-grid">
      <label>缩放图片 <input v-model="scale" type="range" min="1" max="3" step="0.01" /></label>
      <p class="muted">选择图片后可拖拽位置、缩放裁剪。裁剪结果始终为正方形，并实时显示圆形头像预览。</p>
      <button type="button" @click="submitAvatar">更新</button>
      <p v-if="success" class="success-text">{{ success }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </section>
</template>
