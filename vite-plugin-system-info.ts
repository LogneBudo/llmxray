import { execSync } from 'node:child_process'
import os from 'node:os'
import type { Plugin } from 'vite'

interface SystemHardwareInfo {
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

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10_000, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

function psJson<T>(query: string): T | null {
  const raw = exec(`powershell -NoProfile -Command "${query} | ConvertTo-Json"`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function ensureArray<T>(val: T | T[] | null): T[] {
  if (val === null) return []
  return Array.isArray(val) ? val : [val]
}

interface WinOs { Caption: string; Version: string; BuildNumber: string }
interface WinCs { Name: string; Manufacturer: string; Model: string; SystemFamily: string }
interface WinCpu { Name: string; NumberOfCores: number; NumberOfLogicalProcessors: number; MaxClockSpeed: number }
interface WinGpu { Name: string; AdapterRAM: number; DriverVersion: string }
interface WinDisk { DeviceID: string; Size: number; FreeSpace: number }

function getWindowsInfo(): SystemHardwareInfo {
  const osInfo = psJson<WinOs>('Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber')
  const csInfo = psJson<WinCs>('Get-CimInstance Win32_ComputerSystem | Select-Object Name,Manufacturer,Model,SystemFamily')
  const cpuInfo = psJson<WinCpu>('Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed')
  const gpuInfoRaw = psJson<WinGpu | WinGpu[]>('Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion')
  const diskInfoRaw = psJson<WinDisk | WinDisk[]>('Get-CimInstance Win32_LogicalDisk -Filter \\\"DriveType=3\\\" | Select-Object DeviceID,Size,FreeSpace')

  const gpuList = ensureArray(gpuInfoRaw)
  const diskList = ensureArray(diskInfoRaw)

  return {
    os: {
      name: osInfo?.Caption?.trim() ?? os.version(),
      version: osInfo?.Version ?? os.release(),
      build: osInfo?.BuildNumber ?? '',
      arch: os.arch(),
    },
    device: {
      name: csInfo?.Name ?? os.hostname(),
      manufacturer: csInfo?.Manufacturer ?? '',
      model: csInfo?.Model ?? '',
      family: csInfo?.SystemFamily ?? '',
    },
    cpu: {
      name: cpuInfo?.Name?.trim() ?? (os.cpus()[0]?.model ?? 'Unknown'),
      cores: cpuInfo?.NumberOfCores ?? os.cpus().length,
      logicalProcessors: cpuInfo?.NumberOfLogicalProcessors ?? os.cpus().length,
      maxClockMhz: cpuInfo?.MaxClockSpeed ?? (os.cpus()[0]?.speed ?? 0),
    },
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
    gpu: gpuList.length > 0
      ? gpuList.map((g) => ({
          name: g.Name ?? 'Unknown',
          adapterRamBytes: g.AdapterRAM ?? 0,
          driverVersion: g.DriverVersion ?? '',
        }))
      : [{ name: 'Not detected', adapterRamBytes: 0, driverVersion: '' }],
    storage: diskList.map((d) => ({
      drive: d.DeviceID ?? '',
      totalBytes: d.Size ?? 0,
      freeBytes: d.FreeSpace ?? 0,
    })),
  }
}

function getLinuxInfo(): SystemHardwareInfo {
  const cpuModel = exec("grep -m1 'model name' /proc/cpuinfo | cut -d: -f2").trim()
  const cpuCores = parseInt(exec("grep -c '^processor' /proc/cpuinfo"), 10) || os.cpus().length

  // GPU via lspci
  const gpuLines = exec("lspci | grep -i 'vga\\|3d\\|display'").split('\n').filter(Boolean)
  const gpus = gpuLines.map((line) => ({
    name: line.replace(/^[^:]+:\s*/, ''),
    adapterRamBytes: 0,
    driverVersion: '',
  }))

  // Storage via df
  const dfLines = exec("df -B1 --output=target,size,avail / /home 2>/dev/null").split('\n').slice(1)
  const storage = dfLines.filter(Boolean).map((line) => {
    const parts = line.trim().split(/\s+/)
    return {
      drive: parts[0] ?? '/',
      totalBytes: parseInt(parts[1] ?? '0', 10) || 0,
      freeBytes: parseInt(parts[2] ?? '0', 10) || 0,
    }
  })

  // OS
  const prettyName = exec("grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '\"'")

  return {
    os: {
      name: prettyName || `Linux ${os.release()}`,
      version: os.release(),
      build: '',
      arch: os.arch(),
    },
    device: {
      name: os.hostname(),
      manufacturer: exec('cat /sys/class/dmi/id/sys_vendor 2>/dev/null'),
      model: exec('cat /sys/class/dmi/id/product_name 2>/dev/null'),
      family: exec('cat /sys/class/dmi/id/product_family 2>/dev/null'),
    },
    cpu: {
      name: cpuModel || (os.cpus()[0]?.model ?? 'Unknown'),
      cores: cpuCores,
      logicalProcessors: os.cpus().length,
      maxClockMhz: (os.cpus()[0]?.speed ?? 0),
    },
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
    gpu: gpus.length > 0 ? gpus : [{ name: 'Not detected', adapterRamBytes: 0, driverVersion: '' }],
    storage,
  }
}

function getMacInfo(): SystemHardwareInfo {
  const cpuBrand = exec('sysctl -n machdep.cpu.brand_string')
  const cpuCores = parseInt(exec('sysctl -n hw.physicalcpu'), 10) || os.cpus().length
  const logicalCores = parseInt(exec('sysctl -n hw.logicalcpu'), 10) || os.cpus().length

  // GPU from system_profiler
  const gpuName = exec("system_profiler SPDisplaysDataType 2>/dev/null | grep 'Chipset Model' | head -1 | cut -d: -f2").trim()
  const gpuVram = exec("system_profiler SPDisplaysDataType 2>/dev/null | grep 'VRAM' | head -1 | cut -d: -f2").trim()

  // Storage
  const dfLines = exec("df -b / | tail -1").split(/\s+/)
  const totalBlocks = parseInt(dfLines[1] ?? '0', 10) || 0
  const availBlocks = parseInt(dfLines[3] ?? '0', 10) || 0

  // OS version
  const swVers = exec('sw_vers -productVersion')

  return {
    os: {
      name: `macOS ${swVers}`,
      version: swVers,
      build: exec('sw_vers -buildVersion'),
      arch: os.arch(),
    },
    device: {
      name: os.hostname(),
      manufacturer: 'Apple',
      model: exec('sysctl -n hw.model'),
      family: '',
    },
    cpu: {
      name: cpuBrand || (os.cpus()[0]?.model ?? 'Unknown'),
      cores: cpuCores,
      logicalProcessors: logicalCores,
      maxClockMhz: os.cpus()[0]?.speed ?? 0,
    },
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
    gpu: [{
      name: gpuName || 'Integrated',
      adapterRamBytes: gpuVram ? parseInt(gpuVram, 10) * 1024 * 1024 : 0,
      driverVersion: '',
    }],
    storage: [{
      drive: '/',
      totalBytes: totalBlocks * 512,
      freeBytes: availBlocks * 512,
    }],
  }
}

function collectSystemInfo(): SystemHardwareInfo {
  const platform = os.platform()
  if (platform === 'win32') return getWindowsInfo()
  if (platform === 'darwin') return getMacInfo()
  return getLinuxInfo()
}

export function systemInfoPlugin(): Plugin {
  let cachedInfo: SystemHardwareInfo | null = null
  let cacheTime = 0

  return {
    name: 'system-info',
    configureServer(server) {
      server.middlewares.use('/__system-info', (_req, res) => {
        // Cache for 30 seconds to avoid hammering OS commands
        const now = Date.now()
        if (!cachedInfo || now - cacheTime > 30_000) {
          cachedInfo = collectSystemInfo()
          cacheTime = now
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(cachedInfo))
      })
    },
  }
}
