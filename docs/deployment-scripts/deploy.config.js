/**
 * 🚀 Configuration de Déploiement GesFlex Pro
 * 
 * Ce fichier contient la configuration pour le déploiement automatique
 * sur GitHub Pages et autres plateformes.
 */

module.exports = {
  // 🌐 Configuration GitHub Pages
  githubPages: {
    basePath: '/gesflex-pro/',
    branch: 'main',
    domain: 'gesflex-pro.github.io',
    customDomain: null, // À configurer si vous avez un domaine personnalisé
  },

  // 🔧 Configuration Build
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    target: 'es2018',
    assetsInlineLimit: 4096,
  },

  // 📱 Configuration PWA
  pwa: {
    enabled: false, // À activer pour la version 2.0
    name: 'GesFlex Pro',
    shortName: 'GesFlex',
    description: 'Gestion de stock et de vente professionnelle',
    themeColor: '#2563eb',
    backgroundColor: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
  },

  // 🔒 Configuration Sécurité
  security: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://*.supabase.co'],
    },
  },

  // 📊 Configuration Analytics
  analytics: {
    enabled: false, // À configurer selon vos besoins
    googleAnalytics: null,
    plausible: null,
  },

  // 🚀 Configuration Déploiement
  deployment: {
    auto: true,
    environments: ['staging', 'production'],
    rollback: {
      enabled: true,
      maxVersions: 5,
    },
    notifications: {
      slack: null, // Webhook Slack pour les notifications
      email: null, // Notifications par email
    },
  },

  // 🧪 Configuration Tests
  testing: {
    unit: true,
    integration: true,
    e2e: false, // À activer pour la version 2.0
    coverage: {
      enabled: true,
      threshold: 80,
    },
  },

  // 📚 Configuration Documentation
  documentation: {
    autoGenerate: true,
    includeExamples: true,
    includeApiDocs: true,
  },
};
