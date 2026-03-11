import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/pages/DashboardPage.vue'),
        },
        {
          path: 'session/:id',
          name: 'session',
          component: () => import('@/pages/SessionPage.vue'),
          props: true,
        },
        {
          path: 'compare',
          name: 'comparison',
          component: () => import('@/pages/ComparisonPage.vue'),
        },
        {
          path: 'embeddings',
          name: 'embeddings',
          component: () => import('@/pages/EmbeddingsPage.vue'),
        },
        {
          path: 'rag',
          name: 'rag',
          component: () => import('@/pages/RAGPage.vue'),
        },
        {
          path: 'models',
          name: 'models',
          component: () => import('@/pages/ModelsPage.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/SettingsPage.vue'),
        },
      ],
    },
  ],
})
