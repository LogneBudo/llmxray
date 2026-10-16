export interface GpuInfo { name: string; adapterRamBytes: number; driverVersion: string }
/** GPUs as nvidia-smi reports them: exact memory where it exists, empty elsewhere. */
export function nvidiaGpus(): Array<{ name: string; adapterRamBytes: number }>
/** Replace the memory figure of every GPU that nvidia-smi also knows; add the ones it knows and the OS did not list. */
export function mergeGpuMemory(gpus: GpuInfo[], nvidia: Array<{ name: string; adapterRamBytes: number }>): GpuInfo[]
export function collectSystemInfo(): unknown
