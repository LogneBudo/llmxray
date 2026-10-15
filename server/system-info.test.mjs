import { describe, it, expect } from 'vitest'
import { mergeGpuMemory, collectSystemInfo } from './system-info.mjs'

describe('mergeGpuMemory', () => {
  it('replaces the 4 GB ceiling Windows reports with the figure the NVIDIA driver gives', () => {
    const fromWindows = [{ name: 'NVIDIA GeForce RTX 5070', adapterRamBytes: 4293918720, driverVersion: '32.0.15.8000' }]
    const fromNvidia = [{ name: 'NVIDIA GeForce RTX 5070', adapterRamBytes: 12227 * 1024 * 1024 }]
    const out = mergeGpuMemory(fromWindows, fromNvidia)
    expect(out).toHaveLength(1)
    expect(out[0].adapterRamBytes).toBe(12227 * 1024 * 1024)
    expect(out[0].driverVersion).toBe('32.0.15.8000')
  })

  it('adds a GPU the OS did not list and drops the "Not detected" placeholder', () => {
    const out = mergeGpuMemory([{ name: 'Not detected', adapterRamBytes: 0, driverVersion: '' }], [{ name: 'NVIDIA A10', adapterRamBytes: 24 * 1024 ** 3 }])
    expect(out).toEqual([{ name: 'NVIDIA A10', adapterRamBytes: 24 * 1024 ** 3, driverVersion: '' }])
  })

  it('leaves the list alone when nvidia-smi knows nothing', () => {
    const gpus = [{ name: 'AMD Radeon', adapterRamBytes: 8e9, driverVersion: '' }]
    expect(mergeGpuMemory(gpus, [])).toBe(gpus)
  })
})

describe('collectSystemInfo', () => {
  it('never reports an NVIDIA card with the 32-bit ceiling when nvidia-smi is on this machine', () => {
    const info = collectSystemInfo()
    for (const g of info.gpu) {
      if (/nvidia/i.test(g.name)) expect(g.adapterRamBytes).not.toBe(4293918720)
    }
  })
})
