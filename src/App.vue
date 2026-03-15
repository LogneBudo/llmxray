<script setup lang="ts">
import { onMounted } from 'vue'
import { useConversationStore } from '@/stores/conversation-store'

const conversationStore = useConversationStore()

onMounted(() => {
  conversationStore.hydrate()
})
</script>

<template>
  <RouterView />
</template>
