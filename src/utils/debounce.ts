export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    const now = Date.now()
    const remaining = limit - (now - lastCall)
    if (remaining <= 0) {
      lastCall = now
      fn(...args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now()
        timeout = null
        fn(...args)
      }, remaining)
    }
  }
}
