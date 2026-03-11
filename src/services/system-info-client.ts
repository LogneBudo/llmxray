export interface SystemHardwareInfo {
  os: {
    name: string
    version: string
    build: string
    arch: string
  }
  device: {
    name: string
    manufacturer: string
    model: string
    family: string
  }
  cpu: {
    name: string
    cores: number
    logicalProcessors: number
    maxClockMhz: number
  }
  memory: {
    totalBytes: number
    freeBytes: number
  }
  gpu: Array<{
    name: string
    adapterRamBytes: number
    driverVersion: string
  }>
  storage: Array<{
    drive: string
    totalBytes: number
    freeBytes: number
  }>
}

export async function fetchSystemInfo(): Promise<SystemHardwareInfo | null> {
  try {
    const res = await fetch('/__system-info')
    if (!res.ok) return null
    return (await res.json()) as SystemHardwareInfo
  } catch {
    return null
  }
}
