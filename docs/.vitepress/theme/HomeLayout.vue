<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import NeuralBackground from './NeuralBackground.vue'

const { frontmatter } = useData()
</script>

<template>
  <NeuralBackground v-if="frontmatter.layout === 'home'" />
  <DefaultTheme.Layout />
</template>
