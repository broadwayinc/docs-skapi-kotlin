import { defineConfig } from 'vitepress'
import { sidebar } from './site.mjs'

// skapi-kotlin documentation: the Skapi API for Kotlin and Android. The same page set as
// docs-skapi-py (accounts, sign-in, database, files, users, realtime, API bridge, tickets), with
// Kotlin names, plus an Android page, a Java page (skapi-java) and a page listing the skapi-js
// features left out.
export default defineConfig({
  title: 'Skapi for Kotlin',
  description: 'Skapi backend for Kotlin, Android and Java. Sign users in and use your project database.',
  lang: 'en-US',
  cleanUrls: false,
  lastUpdated: false,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
  ],
  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'Skapi Kotlin',
    search: { provider: 'local' },
    nav: [
      { text: 'Getting Started', link: '/introduction/getting-started' },
      { text: 'API Reference', link: '/api-reference/' },
      { text: 'Version History', link: '/versionlog/versions' },
      { text: 'skapi.com', link: 'https://www.skapi.com' },
    ],
    sidebar,
    socialLinks: [{ icon: 'github', link: 'https://github.com/broadwayinc/skapi-kotlin' }],
    footer: { message: 'skapi-kotlin 2.5.0', copyright: 'broadway Inc.' },
  },
  vite: {
    server: {
      allowedHosts: ['seoul.broadwayinc.computer', 'us.broadwayinc.computer', 'us-dev.broadwayinc.computer', 'dev.broadwayinc.computer'],
    },
  },
})
