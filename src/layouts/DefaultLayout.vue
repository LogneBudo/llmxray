<script setup lang="ts">
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppHeader from '@/components/common/AppHeader.vue'
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <AppSidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <AppHeader />
      <main class="flex-1 overflow-hidden">
        <RouterView v-slot="{ Component, route }">
          <div
            class="h-full"
            :class="route.name === 'dashboard' || route.name === 'tools' ? '' : 'overflow-auto p-6'"
          >
            <component :is="Component" />
          </div>
        </RouterView>
      </main>
    </div>
  </div>
</template>
