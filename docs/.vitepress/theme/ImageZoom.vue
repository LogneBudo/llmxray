<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vitepress'

const overlay = ref<HTMLDivElement>()
const zoomedSrc = ref('')
const isOpen = ref(false)

function openZoom(src: string) {
  zoomedSrc.value = src
  isOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closeZoom() {
  isOpen.value = false
  document.body.style.overflow = ''
}

function handleClick(e: Event) {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG' && target.closest('.vp-doc')) {
    const img = target as HTMLImageElement
    if (img.src) {
      e.preventDefault()
      openZoom(img.src)
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) closeZoom()
}

onMounted(() => {
  document.addEventListener('click', handleClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClick)
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

// Close on route change
const router = useRouter()
router.onAfterRouteChanged = () => {
  if (isOpen.value) closeZoom()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="zoom">
      <div
        v-if="isOpen"
        ref="overlay"
        class="image-zoom-overlay"
        @click="closeZoom"
      >
        <img
          :src="zoomedSrc"
          class="image-zoom-img"
          @click.stop="closeZoom"
        />
        <span class="image-zoom-hint">Click anywhere to close</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.image-zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  cursor: zoom-out;
  padding: 2rem;
}

.image-zoom-img {
  max-width: 92vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.image-zoom-hint {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
}

/* Transition */
.zoom-enter-active,
.zoom-leave-active {
  transition: opacity 0.2s ease;
}
.zoom-enter-from,
.zoom-leave-to {
  opacity: 0;
}
</style>
