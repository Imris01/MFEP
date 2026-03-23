<script setup>
defineProps({
  title: {
    type: String,
    default: "",
  },
  width: {
    type: String,
    default: "720px",
  },
});

const emit = defineEmits(["close"]);
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <section class="modal-panel" :style="{ maxWidth: width }">
        <header class="modal-header">
          <h3>{{ title }}</h3>
          <button class="btn btn-secondary" type="button" @click="emit('close')">关闭</button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>
