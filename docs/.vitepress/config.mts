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
        { text: fr ? 'Entraînement IA' : 'AI Training', link: `${prefix}/guide/ai-training` },
        { text: fr ? 'Modèles' : 'Models', link: `${prefix}/guide/models` },
        { text: 'Benchmark', link: `${prefix}/guide/benchmark` },
        { text: fr ? 'Mon Système' : 'My System', link: `${prefix}/guide/system` },
        { text: fr ? 'Paramètres' : 'Settings', link: `${prefix}/guide/settings` },
      ],
    },
  ]
}

function referenceNav(prefix: string) {
  const fr = prefix === '/fr'
  return [
    {
      text: fr ? 'Référence' : 'Reference',
      items: [
        { text: fr ? "Vue d'ensemble" : 'Overview', link: `${prefix}/reference/` },
        { text: 'Architecture', link: `${prefix}/reference/architecture` },
        { text: 'Stores (Pinia)', link: `${prefix}/reference/stores` },
        { text: 'Services', link: `${prefix}/reference/services` },
        { text: 'Composables', link: `${prefix}/reference/composables` },
        { text: 'Types', link: `${prefix}/reference/types` },
        { text: fr ? "Intégration API" : 'API Integration', link: `${prefix}/reference/api-integration` },
        { text: 'Testing', link: `${prefix}/reference/testing` },
      ],
    },
  ]
}

function communityNav(prefix: string) {
  const fr = prefix === '/fr'
  return [
    {
      text: fr ? 'Communauté' : 'Community',
      items: [
        { text: fr ? "Vue d'ensemble" : 'Overview', link: `${prefix}/community/` },
        { text: fr ? 'Vitrine' : 'Showcase', link: `${prefix}/community/showcase` },
        { text: fr ? 'Benchmarks Communautaires' : 'Community Benchmarks', link: `${prefix}/community/benchmarks` },
        { text: fr ? 'Outils Communautaires' : 'Community Tools', link: `${prefix}/community/tools` },
        { text: 'Badge', link: `${prefix}/community/badge` },
        { text: fr ? 'Kit Enseignants' : 'Educators Kit', link: `${prefix}/community/educators/` },
      ],
    },
    {
      text: fr ? 'Modules du Curriculum' : 'Curriculum Modules',
      items: [
        { text: fr ? 'Module 1: Qu\'est-ce qu\'un Token ?' : 'Module 1: What Is a Token?', link: `${prefix}/community/educators/module-1` },
        { text: fr ? 'Module 2: La Température' : 'Module 2: Temperature', link: `${prefix}/community/educators/module-2` },
        { text: fr ? 'Module 3: L\'IA peut-elle mentir ?' : 'Module 3: Can AI Lie?', link: `${prefix}/community/educators/module-3` },
        { text: fr ? 'Module 4: Que voit le modèle ?' : 'Module 4: What Does the Model See?', link: `${prefix}/community/educators/module-4` },
        { text: fr ? 'Module 5: Quand le modèle oublie-t-il ?' : 'Module 5: When Does the Model Forget?', link: `${prefix}/community/educators/module-5` },
        { text: fr ? 'Module 6: L\'IA peut-elle utiliser des outils ?' : 'Module 6: Can AI Use Tools?', link: `${prefix}/community/educators/module-6` },
      ],
    },
  ]
}

export default defineConfig({
  title: 'LLMxRay',
  description: 'Local LLM Observatory — Documentation',

  base: '/llmxray/docs/',

  head: [
    ['link', { rel: 'icon', href: '/llmxray/docs/favicon.svg' }],
    ['meta', { property: 'og:title', content: 'LLMxRay — Local LLM Observatory | Free AI Model Analysis' }],
    ['meta', { property: 'og:description', content: 'See what your AI is actually doing — token by token, layer by layer. Stream, compare, benchmark, and inspect local LLMs with zero cloud, zero cost. Run with npx llmxray.' }],
    ['meta', { property: 'og:image', content: 'https://lognebudo.github.io/llmxray/docs/og-image.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://lognebudo.github.io/llmxray/docs/og-image.png' }],
  ],

  markdown: {
    // Allow localhost URLs in docs without flagging as dead links
  },

  ignoreDeadLinks: [
    /localhost/,
    /module-\d+/,
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
          { text: 'Community', link: '/en/community/' },
          { text: 'Website', link: 'https://lognebudo.github.io/llmxray/' },
        ],
        sidebar: {
          '/en/guide/': guideNav('/en'),
          '/en/reference/': referenceNav('/en'),
          '/en/community/': communityNav('/en'),
        },
      },
    },
    fr: {
      label: 'Français',
      lang: 'fr',
      link: '/fr/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/' },
          { text: 'Référence', link: '/fr/reference/' },
          { text: 'Communauté', link: '/fr/community/' },
          { text: 'Site Web', link: 'https://lognebudo.github.io/llmxray/' },
        ],
        sidebar: {
          '/fr/guide/': guideNav('/fr'),
          '/fr/reference/': referenceNav('/fr'),
          '/fr/community/': communityNav('/fr'),
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
