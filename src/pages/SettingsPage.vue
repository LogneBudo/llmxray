<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TabBar from '@/components/common/TabBar.vue'
import SettingsGeneralTab from '@/components/settings/SettingsGeneralTab.vue'
import SettingsModelsTab from '@/components/settings/SettingsModelsTab.vue'
import SettingsIntegrationsTab from '@/components/settings/SettingsIntegrationsTab.vue'
import SettingsAboutTab from '@/components/settings/SettingsAboutTab.vue'
import SettingsHistoryTab from '@/components/settings/SettingsHistoryTab.vue'

const { t } = useI18n()
const route = useRoute()
const activeTab = ref((route.query.tab as string) ?? 'general')

const tabs = computed(() => [
  { key: 'general', label: t('settings.tabs.general') },
  { key: 'models', label: t('settings.tabs.models') },
  { key: 'integrations', label: t('settings.tabs.integrations') },
  { key: 'about', label: t('settings.tabs.about') },
  { key: 'history', label: t('settings.tabs.history') },
])
</script>

<template>
  <div class="max-w-4xl space-y-6">
    <TabBar :tabs="tabs" :active-tab="activeTab" @update:active-tab="activeTab = $event" />
    <SettingsGeneralTab v-if="activeTab === 'general'" />
    <SettingsModelsTab v-else-if="activeTab === 'models'" />
    <SettingsIntegrationsTab v-else-if="activeTab === 'integrations'" />
    <SettingsAboutTab v-else-if="activeTab === 'about'" />
    <SettingsHistoryTab v-else-if="activeTab === 'history'" />
  </div>
</template>
