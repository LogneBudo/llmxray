/**
 * Findings over the turns seen on the observe port. The computation lives in
 * server/findings.mjs so the Live page and the MCP server read the same
 * sentences from the same thresholds; this module is the typed door to it.
 */
export {
  median,
  cacheShare,
  messageTokensEst,
  cacheFixSavingMs,
  computeFindings,
  summariseClients,
  renderFinding,
  reloaded,
  silentlyTruncated,
  estimateTokens,
  requestContext,
  underReportedMemory,
  UNDER_REPORT_ISSUE,
} from '../../server/findings.mjs'
export type { LiveFinding, LiveFindingKind, LiveClientSummary } from '../../server/findings.mjs'
