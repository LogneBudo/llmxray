import { defineConfig } from 'vitepress'

function guideNav(prefix: string) {
  const fr = prefix === '/fr'
  return [
    {
      text: fr ? 'Pour commencer' : 'Getting Started',
      items: [
        { text: 'Introduction', link: `${prefix}/guide/` },
        { text: 'Installation', link: `${prefix}/guide/installation` },
      ],
    },
    {
      text: fr ? 'Chapitres' : 'Chapters',
      items: [
        { text: fr ? 'Diagnostics de Chat' : 'Chat Diagnostics', link: `${prefix}/guide/chat-diagnostics` },
        { text: fr ? 'Comparer' : 'Compare', link: `${prefix}/guide/compare` },
        { text: fr ? 'Plongements' : 'Embeddings', link: `${prefix}/guide/embeddings` },
        { text: fr ? 'Base de Connaissances' : 'Knowledge Base', link: `${prefix}/guide/knowledge-base` },
        { text: fr ? "Atelier d'Outils" : 'Tool Workshop', link: `${prefix}/guide/tool-workshop` },
        { text: fr ? 'Entrainement IA' : 'AI Training', link: `${prefix}/guide/ai-training` },
        { text: fr ? 'Modeles' : 'Models', link: `${prefix}/guide/models` },
        { text: 'Benchmark', link: `${prefix}/guide/benchmark` },
        { text: fr ? 'Mon Systeme' : 'My System', link: `${prefix}/guide/system` },
        { text: fr ? 'Parametres' : 'Settings', link: `${prefix}/guide/settings` },
      ],
    },
  ]
}

function referenceNav(prefix: string) {
  const fr = prefix === '/fr'
  return [
    {
      text: fr ? 'Reference' : 'Reference',
      items: [
        { text: fr ? "Vue d'ensemble" : 'Overview', link: `${prefix}/reference/` },
        { text: 'Architecture', link: `${prefix}/reference/architecture` },
        { text: 'Stores (Pinia)', link: `${prefix}/reference/stores` },
        { text: 'Services', link: `${prefix}/reference/services` },
        { text: 'Composables', link: `${prefix}/reference/composables` },
        { text: 'Types', link: `${prefix}/reference/types` },
        { text: fr ? "Integration API" : 'API Integration', link: `${prefix}/reference/api-integration` },
        { text: 'Testing', link: `${prefix}/reference/testing` },
      ],
    },
  ]
}

export default defineConfig({
  title: 'LLMxRay',
  description: 'Local LLM Observatory — Documentation',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
  ],

  markdown: {
    // Allow localhost URLs in docs without flagging as dead links
  },

  ignoreDeadLinks: [
    /localhost/,
  ],

  locales: {
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/' },
          { text: 'Reference', link: '/en/reference/' },
        ],
        sidebar: {
          '/en/guide/': guideNav('/en'),
          '/en/reference/': referenceNav('/en'),
        },
      },
    },
    fr: {
      label: 'Francais',
      lang: 'fr',
      link: '/fr/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/' },
          { text: 'Reference', link: '/fr/reference/' },
        ],
        sidebar: {
          '/fr/guide/': guideNav('/fr'),
          '/fr/reference/': referenceNav('/fr'),
        },
      },
    },
  },

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'LLMxRay',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/LogneBudo/llmxray' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright 2026 Ivan Stankovic (LogneBudo)',
    },
  },
})
