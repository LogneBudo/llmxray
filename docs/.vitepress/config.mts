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
        { text: fr ? 'Comparaison de Langues' : 'Language Compare', link: `${prefix}/guide/language-compare` },
        { text: fr ? 'Plongements' : 'Embeddings', link: `${prefix}/guide/embeddings` },
        { text: fr ? 'Base de Connaissances' : 'Knowledge Base', link: `${prefix}/guide/knowledge-base` },
        { text: fr ? "Atelier d'Outils" : 'Tool Workshop', link: `${prefix}/guide/tool-workshop` },
        { text: fr ? 'Complétion au Milieu (FIM)' : 'Fill-in-the-Middle (FIM)', link: `${prefix}/guide/fim` },
        { text: fr ? 'Labo de cache' : 'Cache Lab', link: `${prefix}/guide/cache-lab` },
        { text: fr ? 'Observatoire des Protocoles' : 'Protocol Observatory', link: `${prefix}/guide/protocols` },
        { text: fr ? 'Entraînement IA' : 'AI Training', link: `${prefix}/guide/ai-training` },
        { text: fr ? 'Modèles' : 'Models', link: `${prefix}/guide/models` },
        { text: 'Benchmark', link: `${prefix}/guide/benchmark` },
        { text: fr ? 'Constructeur de Benchmark' : 'Benchmark Builder', link: `${prefix}/guide/benchmark-builder` },
        { text: fr ? 'Tableau de Bord des Coûts' : 'Cost Dashboard', link: `${prefix}/guide/cost-dashboard` },
        { text: fr ? 'Analytique' : 'Analytics', link: `${prefix}/guide/analytics` },
        { text: fr ? 'Mon Système' : 'My System', link: `${prefix}/guide/system` },
        { text: fr ? 'Paramètres' : 'Settings', link: `${prefix}/guide/settings` },
        { text: fr ? 'Exporter vos données' : 'Exporting Your Data', link: `${prefix}/guide/export` },
        { text: fr ? 'Historique local' : 'Local History', link: `${prefix}/guide/history` },
      ],
    },
  ]
}

function guideNavZh() {
  return [
    {
      text: '\u5165\u95e8',
      items: [
        { text: '\u7b80\u4ecb', link: '/zh/guide/' },
        { text: '\u5b89\u88c5', link: '/zh/guide/installation' },
      ],
    },
    {
      text: '\u7ae0\u8282',
      items: [
        { text: '\u5bf9\u8bdd\u8bca\u65ad', link: '/zh/guide/chat-diagnostics' },
        { text: '\u5bf9\u6bd4', link: '/zh/guide/compare' },
        { text: '\u8bed\u8a00\u5bf9\u6bd4', link: '/zh/guide/language-compare' },
        { text: '\u5d4c\u5165', link: '/zh/guide/embeddings' },
        { text: '\u77e5\u8bc6\u5e93', link: '/zh/guide/knowledge-base' },
        { text: '\u5de5\u5177\u5de5\u574a', link: '/zh/guide/tool-workshop' },
        { text: '\u4e2d\u95f4\u586b\u5145\uff08FIM\uff09', link: '/zh/guide/fim' },
        { text: '\u7f13\u5b58\u5b9e\u9a8c\u5ba4', link: '/zh/guide/cache-lab' },
        { text: '\u534f\u8bae\u89c2\u5bdf\u53f0', link: '/zh/guide/protocols' },
        { text: 'AI \u8bad\u7ec3', link: '/zh/guide/ai-training' },
        { text: '\u6a21\u578b', link: '/zh/guide/models' },
        { text: '\u57fa\u51c6\u6d4b\u8bd5', link: '/zh/guide/benchmark' },
        { text: '\u6d4b\u8bd5\u96c6\u6784\u5efa\u5668', link: '/zh/guide/benchmark-builder' },
        { text: '\u6210\u672c\u9762\u677f', link: '/zh/guide/cost-dashboard' },
        { text: '\u5206\u6790', link: '/zh/guide/analytics' },
        { text: '\u6211\u7684\u7cfb\u7edf', link: '/zh/guide/system' },
        { text: '\u8bbe\u7f6e', link: '/zh/guide/settings' },
        { text: '\u5bfc\u51fa\u6570\u636e', link: '/zh/guide/export' },
        { text: '\u672c\u5730\u5386\u53f2', link: '/zh/guide/history' },
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
        { text: fr ? 'Module 7: Comment comparer les modèles ?' : 'Module 7: How Do Models Compare?', link: `${prefix}/community/educators/module-7` },
        { text: fr ? 'Module 8: La vue d\'ensemble' : 'Module 8: The Full Picture', link: `${prefix}/community/educators/module-8` },
        { text: fr ? 'Module 9: Ce que coûtent les mots' : 'Module 9: What Words Cost', link: `${prefix}/community/educators/module-9` },
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
          { text: 'Articles', link: '/en/articles/ollama-prefill-metrics' },
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
        outline: { label: 'Sur cette page' },
        docFooter: { prev: 'Page pr\u00e9c\u00e9dente', next: 'Page suivante' },
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Retour en haut',
        darkModeSwitchLabel: 'Apparence',
        lightModeSwitchTitle: 'Passer au th\u00e8me clair',
        darkModeSwitchTitle: 'Passer au th\u00e8me sombre',
        langMenuLabel: 'Changer de langue',
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
    zh: {
      label: '\u7b80\u4f53\u4e2d\u6587',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        outline: { label: '\u672c\u9875\u76ee\u5f55' },
        docFooter: { prev: '\u4e0a\u4e00\u9875', next: '\u4e0b\u4e00\u9875' },
        sidebarMenuLabel: '\u83dc\u5355',
        returnToTopLabel: '\u56de\u5230\u9876\u90e8',
        darkModeSwitchLabel: '\u5916\u89c2',
        lightModeSwitchTitle: '\u5207\u6362\u5230\u6d45\u8272\u6a21\u5f0f',
        darkModeSwitchTitle: '\u5207\u6362\u5230\u6df1\u8272\u6a21\u5f0f',
        langMenuLabel: '\u5207\u6362\u8bed\u8a00',
        nav: [
          { text: '\u6307\u5357', link: '/zh/guide/' },
          { text: '\u5f00\u53d1\u8005\u53c2\u8003', link: '/en/reference/' },
          { text: '\u5b98\u7f51', link: 'https://lognebudo.github.io/llmxray/' },
        ],
        sidebar: {
          '/zh/guide/': guideNavZh(),
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
