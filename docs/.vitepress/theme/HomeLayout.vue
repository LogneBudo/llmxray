<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData, withBase } from 'vitepress'
import { computed } from 'vue'

const { frontmatter, isDark } = useData()

const bgStyle = computed(() => ({
  backgroundImage: `url('${withBase(isDark.value ? '/lakeside-night.png' : '/lakeside-day.png')}')`,
  opacity: isDark.value ? 0.35 : 0.25,
}))
</script>

<template>
  <div v-if="frontmatter.layout === 'home'" class="landscape-bg" :style="bgStyle" />
  <DefaultTheme.Layout />
</template>

<style scoped>
.landscape-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
}
</style>
