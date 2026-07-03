/**
 * ================================================================
 * THEME LOADER — Swayam AI Website Builder
 * Loads, validates, and manages themes with caching and previews.
 * ================================================================
 */

// ================================================================
// THEME DATA
// ================================================================

const THEMES = {
  veda: {
    id: 'veda',
    name: 'Veda',
    category: 'spiritual',
    icon: '🕉',
    description: 'Spiritual & wellness — calm, earthy, with Vedic motifs.',
    colors: {
      primary: '#b8860b',
      secondary: '#8b6508',
      accent: '#f5deb3',
      background: '#faf0e6',
      text: '#2d1b0e',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    pages: ['home', 'about', 'services', 'blog', 'contact'],
    features: ['event-calendar', 'donation', 'podcast'],
    demo: '/theme-preview/veda-demo.html',
    thumbnail: '/assets/images/themes/veda-thumb.png',
    preview: {
      dark: false,
      gradient: 'linear-gradient(135deg, #faf0e6, #e8ddd0)',
    },
    tags: ['spiritual', 'wellness', 'minimal', 'earthy'],
  },
  karma: {
    id: 'karma',
    name: 'Karma',
    category: 'agency',
    icon: '🚀',
    description: 'Digital agency & creative — bold, modern, with dark mode.',
    colors: {
      primary: '#6d28d9',
      secondary: '#1a1a2e',
      accent: '#8b5cf6',
      background: '#0a0a12',
      text: '#e8e8f0',
    },
    fonts: {
      heading: 'Orbitron',
      body: 'Inter',
    },
    pages: ['home', 'portfolio', 'services', 'team', 'contact'],
    features: ['portfolio-filter', 'case-studies', 'dark-mode'],
    demo: '/theme-preview/karma-demo.html',
    thumbnail: '/assets/images/themes/karma-thumb.png',
    preview: {
      dark: true,
      gradient: 'linear-gradient(135deg, #0a0a12, #1a1a2e)',
    },
    tags: ['agency', 'creative', 'dark', 'modern'],
  },
  sattva: {
    id: 'sattva',
    name: 'Sattva',
    category: 'ecommerce',
    icon: '🛍️',
    description: 'E‑commerce — clean, minimalist, product‑focused.',
    colors: {
      primary: '#2e7d32',
      secondary: '#1b5e20',
      accent: '#66bb6a',
      background: '#f8f6f2',
      text: '#1a1a2e',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    pages: ['home', 'shop', 'product', 'cart', 'checkout', 'contact'],
    features: ['shopping-cart', 'product-filter', 'wishlist'],
    demo: '/theme-preview/sattva-demo.html',
    thumbnail: '/assets/images/themes/sattva-thumb.png',
    preview: {
      dark: false,
      gradient: 'linear-gradient(135deg, #f8f6f2, #e8f5e9)',
    },
    tags: ['ecommerce', 'retail', 'clean', 'organic'],
  },
  dharma: {
    id: 'dharma',
    name: 'Dharma',
    category: 'consulting',
    icon: '📊',
    description: 'Consulting & corporate — trustworthy, professional, crisp.',
    colors: {
      primary: '#3b82f6',
      secondary: '#1e293b',
      accent: '#60a5fa',
      background: '#f8fafc',
      text: '#1a1a2e',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    pages: ['home', 'about', 'services', 'resources', 'contact'],
    features: ['appointment-booking', 'resource-library', 'testimonials'],
    demo: '/theme-preview/dharma-demo.html',
    thumbnail: '/assets/images/themes/dharma-thumb.png',
    preview: {
      dark: false,
      gradient: 'linear-gradient(135deg, #f8fafc, #dbeafe)',
    },
    tags: ['consulting', 'corporate', 'professional', 'trust'],
  },
  'veda-gold': {
    id: 'veda-gold',
    name: 'Veda Gold',
    category: 'spiritual',
    icon: '🌅',
    description: 'Spiritual with warm gold accents and elegant typography.',
    colors: {
      primary: '#d4a017',
      secondary: '#b8860b',
      accent: '#f5deb3',
      background: '#faf0e6',
      text: '#2d1b0e',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    pages: ['home', 'about', 'services', 'blog', 'contact'],
    features: ['event-calendar', 'donation', 'podcast'],
    demo: '/theme-preview/veda-demo.html',
    thumbnail: '/assets/images/themes/veda-gold-thumb.png',
    preview: {
      dark: false,
      gradient: 'linear-gradient(135deg, #faf0e6, #f5deb3)',
    },
    tags: ['spiritual', 'premium', 'gold', 'elegant'],
  },
  'karma-neon': {
    id: 'karma-neon',
    name: 'Karma Neon',
    category: 'agency',
    icon: '⚡',
    description: 'Agency with neon accents and dynamic animations.',
    colors: {
      primary: '#8b5cf6',
      secondary: '#1a1a2e',
      accent: '#22d3ee',
      background: '#0a0a12',
      text: '#e8e8f0',
    },
    fonts: {
      heading: 'Orbitron',
      body: 'Inter',
    },
    pages: ['home', 'portfolio', 'services', 'team', 'contact'],
    features: ['portfolio-filter', 'case-studies', 'dark-mode'],
    demo: '/theme-preview/karma-demo.html',
    thumbnail: '/assets/images/themes/karma-neon-thumb.png',
    preview: {
      dark: true,
      gradient: 'linear-gradient(135deg, #0a0a12, #1a1a2e)',
    },
    tags: ['agency', 'neon', 'dynamic', 'modern'],
  },
  'sattva-dark': {
    id: 'sattva-dark',
    name: 'Sattva Dark',
    category: 'ecommerce',
    icon: '🌙',
    description: 'E‑commerce with dark mode and premium product focus.',
    colors: {
      primary: '#4caf50',
      secondary: '#1b5e20',
      accent: '#81c784',
      background: '#0a0a12',
      text: '#e8e8f0',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    pages: ['home', 'shop', 'product', 'cart', 'checkout', 'contact'],
    features: ['shopping-cart', 'product-filter', 'wishlist'],
    demo: '/theme-preview/sattva-demo.html',
    thumbnail: '/assets/images/themes/sattva-dark-thumb.png',
    preview: {
      dark: true,
      gradient: 'linear-gradient(135deg, #0a0a12, #1a1a2e)',
    },
    tags: ['ecommerce', 'dark', 'premium', 'modern'],
  },
  'dharma-blue': {
    id: 'dharma-blue',
    name: 'Dharma Blue',
    category: 'consulting',
    icon: '💎',
    description: 'Corporate consulting with deep blue and trust signals.',
    colors: {
      primary: '#2563eb',
      secondary: '#1e293b',
      accent: '#60a5fa',
      background: '#f8fafc',
      text: '#1a1a2e',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    pages: ['home', 'about', 'services', 'resources', 'contact'],
    features: ['appointment-booking', 'resource-library', 'testimonials'],
    demo: '/theme-preview/dharma-demo.html',
    thumbnail: '/assets/images/themes/dharma-blue-thumb.png',
    preview: {
      dark: false,
      gradient: 'linear-gradient(135deg, #f8fafc, #dbeafe)',
    },
    tags: ['consulting', 'corporate', 'trust', 'professional'],
  },
};

// ================================================================
// THEME LOADER
// ================================================================

class ThemeLoader {
  constructor() {
    this.themes = THEMES;
    this.cache = new Map();
    this.loaded = false;
  }

  /**
   * Get all themes
   */
  getAllThemes() {
    return Object.values(this.themes);
  }

  /**
   * Get a theme by ID
   */
  getTheme(id) {
    const theme = this.themes[id];
    if (!theme) {
      throw new Error(`Theme "${id}" not found. Available themes: ${Object.keys(this.themes).join(', ')}`);
    }
    return { ...theme };
  }

  /**
   * Get themes by category
   */
  getThemesByCategory(category) {
    return Object.values(this.themes).filter(function(theme) {
      return theme.category === category;
    });
  }

  /**
   * Get themes by tag
   */
  getThemesByTag(tag) {
    return Object.values(this.themes).filter(function(theme) {
      return theme.tags && theme.tags.includes(tag);
    });
  }

  /**
   * Search themes
   */
  searchThemes(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllThemes();

    return Object.values(this.themes).filter(function(theme) {
      return theme.name.toLowerCase().includes(q) ||
             theme.description.toLowerCase().includes(q) ||
             theme.tags.some(function(tag) { return tag.toLowerCase().includes(q); }) ||
             theme.category.toLowerCase().includes(q);
    });
  }

  /**
   * Get categories
   */
  getCategories() {
    const categories = new Set();
    Object.values(this.themes).forEach(function(theme) {
      categories.add(theme.category);
    });
    return Array.from(categories);
  }

  /**
   * Get tags
   */
  getTags() {
    const tags = new Set();
    Object.values(this.themes).forEach(function(theme) {
      if (theme.tags) {
        theme.tags.forEach(function(tag) {
          tags.add(tag);
        });
      }
    });
    return Array.from(tags);
  }

  /**
   * Validate theme config
   */
  validateTheme(theme) {
    const required = ['id', 'name', 'category', 'colors', 'pages'];
    const missing = required.filter(function(key) {
      return !theme[key];
    });
    if (missing.length > 0) {
      throw new Error(`Theme validation failed. Missing: ${missing.join(', ')}`);
    }
    return true;
  }

  /**
   * Generate CSS variables for a theme
   */
  generateCSSVars(theme, overrides = {}) {
    const colors = { ...theme.colors, ...overrides };
    return `
      :root {
        --theme-primary: ${colors.primary};
        --theme-secondary: ${colors.secondary};
        --theme-accent: ${colors.accent || colors.primary};
        --theme-background: ${colors.background};
        --theme-text: ${colors.text};
        --theme-font-heading: "${theme.fonts.heading}", serif;
        --theme-font-body: "${theme.fonts.body}", sans-serif;
      }
    `;
  }

  /**
   * Get theme preview URL
   */
  getPreviewUrl(themeId) {
    const theme = this.getTheme(themeId);
    return theme.demo || `/theme-preview/${themeId}-demo.html`;
  }

  /**
   * Get theme thumbnail
   */
  getThumbnail(themeId) {
    const theme = this.getTheme(themeId);
    return theme.thumbnail || `/assets/images/themes/${themeId}-thumb.png`;
  }

  /**
   * Get theme stats
   */
  getStats() {
    const themes = this.getAllThemes();
    const categories = this.getCategories();

    return {
      total: themes.length,
      categories: categories.length,
      tags: this.getTags().length,
      themes: themes.map(function(t) {
        return {
          id: t.id,
          name: t.name,
          category: t.category,
          pages: t.pages.length,
        };
      }),
    };
  }

  /**
   * Preload theme assets (thumbnails, etc.)
   */
  async preloadTheme(themeId) {
    const theme = this.getTheme(themeId);
    const imageUrl = this.getThumbnail(themeId);

    // Preload image
    if (typeof window !== 'undefined') {
      return new Promise(function(resolve, reject) {
        const img = new Image();
        img.onload = function() { resolve(true); };
        img.onerror = function() { resolve(false); };
        img.src = imageUrl;
      });
    }

    return true;
  }
}

// ================================================================
// EXPORT
// ================================================================

let themeLoaderInstance = null;

function getThemeLoader() {
  if (!themeLoaderInstance) {
    themeLoaderInstance = new ThemeLoader();
  }
  return themeLoaderInstance;
}

// Browser global
if (typeof window !== 'undefined') {
  window.SwayamThemes = {
    loader: getThemeLoader,
    themes: THEMES,
  };
}

// Node/ESM export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ThemeLoader,
    THEMES,
    getThemeLoader,
  };
}

export {
  ThemeLoader,
  THEMES,
  getThemeLoader,
};

console.log('Theme Loader initialized. ' + Object.keys(THEMES).length + ' themes available.');
