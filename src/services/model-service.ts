import { useModelStore } from '@/stores/model-store'
import { useIntrospectionStore } from '@/stores/introspection-store'
import { parseModelArchitecture } from './introspection-service'

export async function loadAvailableModels(): Promise<void> {
  const modelStore = useModelStore()
  await modelStore.fetchModels()
}

export async function loadModelInfo(name: string): Promise<void> {
  const modelStore = useModelStore()
  const introspectionStore = useIntrospectionStore()

  await modelStore.fetchModelInfo(name)
  const info = modelStore.getModelDetails(name)
  if (info) {
    const arch = parseModelArchitecture(name, info)
    introspectionStore.setArchitecture(name, arch)
  }
}
