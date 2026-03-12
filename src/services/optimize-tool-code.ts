/**
 * Splice an existing tool's code to return only selected JSON paths.
 *
 * Strategy: find the last `return` statement, capture the returned expression,
 * assign it to `__raw`, then return only the selected fields from `__raw`.
 */

import { selectedPathsToReturnCode } from './path-to-code'

/**
 * Given the original AsyncFunction body and the user's selected paths,
 * produce an optimized code body that returns only those fields.
 */
export function optimizeToolCode(originalCode: string, paths: string[]): string {
  if (paths.length === 0) return originalCode

  const returnCode = selectedPathsToReturnCode(paths, '__raw')

  const lines = originalCode.split('\n')

  // Search from the end for the last return statement
  let lastReturnIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*return\s+/.test(lines[i] ?? '')) {
      lastReturnIdx = i
      break
    }
  }

  if (lastReturnIdx === -1) {
    // No return found — append a filter block at the end
    // Assume `args` holds the result (common pattern in tool code)
    return `${originalCode}\n\n  // Optimized: return selected fields only\n  const __raw = args\n  ${returnCode}`
  }

  // Extract the return expression (may span multiple lines if it's an object literal)
  const returnLine = lines[lastReturnIdx]!
  const match = returnLine.match(/^(\s*)return\s+/)
  const indent = match?.[1] ?? '  '

  // Check if the return spans multiple lines (opening { without closing })
  let returnExpr = returnLine.replace(/^\s*return\s+/, '').trim()
  let endIdx = lastReturnIdx

  if (returnExpr.includes('{') && !isBalanced(returnExpr)) {
    // Collect lines until braces balance
    for (let j = lastReturnIdx + 1; j < lines.length; j++) {
      returnExpr += '\n' + lines[j]
      endIdx = j
      if (isBalanced(returnExpr)) break
    }
  }

  // Build the replacement: assign to __raw, then return selected fields
  const replacement = [
    `${indent}const __raw = ${returnExpr.trim()}`,
    `${indent}${returnCode}`,
  ].join('\n')

  // Splice the new lines in place of the old return
  const result = [
    ...lines.slice(0, lastReturnIdx),
    '',
    `${indent}// Optimized: return selected fields only`,
    replacement,
    ...lines.slice(endIdx + 1),
  ].join('\n')

  return result
}

/** Check if braces {} are balanced in a string */
function isBalanced(s: string): boolean {
  let depth = 0
  for (const ch of s) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth < 0) return false
  }
  return depth === 0
}
