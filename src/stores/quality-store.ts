import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QualityReport } from '@/types/quality'

export const useQualityStore = defineStore('quality', () => {
  const reportsByMessage = ref<Map<string, QualityReport>>(new Map())

  function getReport(messageId: string): QualityReport | null {
    return reportsByMessage.value.get(messageId) ?? null
  }

  function setReport(messageId: string, report: QualityReport) {
    reportsByMessage.value.set(messageId, report)
  }

  function hasReport(messageId: string): boolean {
    return reportsByMessage.value.has(messageId)
  }

  return { reportsByMessage, getReport, setReport, hasReport }
})
