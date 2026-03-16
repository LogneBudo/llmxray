<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'

const { frontmatter } = useData()
</script>

<template>
  <div v-if="frontmatter.layout === 'home'" class="landscape-bg" />
  <DefaultTheme.Layout />
</template>

<style scoped>
.landscape-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: url('/lakeside-day.png');
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
  opacity: 0.25;
}

:global(.dark) .landscape-bg {
  background-image: url('/lakeside-night.png');
  opacity: 0.35;
}
</style>
