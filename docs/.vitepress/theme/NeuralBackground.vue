<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref<HTMLCanvasElement>()
let animId = 0

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pulse: number
  pulseSpeed: number
}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')!
  let nodes: Node[] = []
  const CONNECTION_DIST = 180
  const NODE_COUNT = 60

  function resize() {
    el.width = el.offsetWidth * devicePixelRatio
    el.height = el.offsetHeight * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)
  }

  function isDark() {
    return document.documentElement.classList.contains('dark')
  }

  function createNodes() {
    const w = el.offsetWidth
    const h = el.offsetHeight
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1.5,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.01 + Math.random() * 0.02,
    }))
  }

  function draw() {
    const w = el.offsetWidth
    const h = el.offsetHeight
    ctx.clearRect(0, 0, w, h)

    const dark = isDark()
    const lineColor = dark ? 'rgba(168, 85, 247,' : 'rgba(124, 58, 237,'
    const nodeColor = dark ? 'rgba(192, 132, 252,' : 'rgba(147, 51, 234,'
    const glowColor = dark ? 'rgba(168, 85, 247,' : 'rgba(147, 51, 234,'

    // Update positions
    for (const n of nodes) {
      n.x += n.vx
      n.y += n.vy
      n.pulse += n.pulseSpeed

      if (n.x < 0 || n.x > w) n.vx *= -1
      if (n.y < 0 || n.y > h) n.vy *= -1
      n.x = Math.max(0, Math.min(w, n.x))
      n.y = Math.max(0, Math.min(h, n.y))
    }

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CONNECTION_DIST) {
          const opacity = (1 - dist / CONNECTION_DIST) * (dark ? 0.35 : 0.25)
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.strokeStyle = lineColor + opacity + ')'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }

    // Draw nodes
    for (const n of nodes) {
      const pulseScale = 0.5 + 0.5 * Math.sin(n.pulse)
      const r = n.radius * (1 + pulseScale * 0.4)
      const opacity = dark ? 0.6 + pulseScale * 0.4 : 0.5 + pulseScale * 0.4

      // Glow
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4)
      glow.addColorStop(0, glowColor + (opacity * 0.3) + ')')
      glow.addColorStop(1, glowColor + '0)')
      ctx.beginPath()
      ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // Core
      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
      ctx.fillStyle = nodeColor + opacity + ')'
      ctx.fill()
    }

    animId = requestAnimationFrame(draw)
  }

  resize()
  createNodes()
  draw()

  const ro = new ResizeObserver(() => {
    resize()
    createNodes()
  })
  ro.observe(el)

  onUnmounted(() => {
    cancelAnimationFrame(animId)
    ro.disconnect()
  })
})
</script>

<template>
  <canvas ref="canvas" class="neural-bg" />
</template>

<style scoped>
.neural-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
