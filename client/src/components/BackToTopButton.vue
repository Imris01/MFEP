<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const visible = ref(false);

function handleScroll() {
  visible.value = window.scrollY > 260;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  handleScroll();
  window.addEventListener("scroll", handleScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <button v-if="visible" class="to-top-button" @click="scrollToTop">回到顶部</button>
</template>
