<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData, withBase } from 'vitepress'
import { computed } from 'vue'

const { frontmatter, isDark } = useData()

const bgStyle = computed(() => ({
  backgroundImage: `url('${withBase(isDark.value ? '/lakeside-night.png' : '/lakeside-day.png')}')`,
  opacity: isDark.value ? 0.4 : 0.3,
}))
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-top>
      <div v-if="frontmatter.layout === 'home'" class="landscape-bg" :style="bgStyle" />
    </template>
  </DefaultTheme.Layout>
</template>

<style>
.landscape-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
}

/* Ensure content sits above the background */
.VPNav,
.VPContent,
.VPFooter {
  position: relative;
  z-index: 1;
}
</style>
