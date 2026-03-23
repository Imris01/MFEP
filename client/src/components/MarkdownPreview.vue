<script setup>
import MarkdownIt from "markdown-it";
import { computed } from "vue";

const props = defineProps({
  source: {
    type: String,
    default: "",
  },
});

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

const rendered = computed(() => md.render(props.source || ""));
</script>

<template>
  <div class="markdown-body" v-html="rendered"></div>
</template>
