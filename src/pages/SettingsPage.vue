<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/common/TabBar.vue'
import SettingsGeneralTab from '@/components/settings/SettingsGeneralTab.vue'
import SettingsModelsTab from '@/components/settings/SettingsModelsTab.vue'
import SettingsIntegrationsTab from '@/components/settings/SettingsIntegrationsTab.vue'
import SettingsAboutTab from '@/components/settings/SettingsAboutTab.vue'

const route = useRoute()
const activeTab = ref((route.query.tab as string) ?? 'general')

const tabs = [
  { key: 'general', label: 'General' },
  { key: 'models', label: 'Models' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'about', label: 'About' },
]
</script>

<template>
  <div class="max-w-4xl space-y-6">
    <TabBar :tabs="tabs" :active-tab="activeTab" @update:active-tab="activeTab = $event" />
    <SettingsGeneralTab v-if="activeTab === 'general'" />
    <SettingsModelsTab v-else-if="activeTab === 'models'" />
    <SettingsIntegrationsTab v-else-if="activeTab === 'integrations'" />
    <SettingsAboutTab v-else-if="activeTab === 'about'" />
  </div>
</template>
