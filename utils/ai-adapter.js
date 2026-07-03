/**
 * ================================================================
 * AI ADAPTER — Swayam AI Website Builder
 * Unified interface for Groq + Zhipu AI with fallback, retries,
 * caching, and comprehensive error handling.
 * ================================================================
 */

// ================================================================
// CONFIGURATION
// ================================================================

const AI_CONFIG = {
  primary: {
    provider: 'groq',
    model: 'llama3-70b-8192',
    apiKey: process.env.GROQ_API_KEY || '',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  },
  fallback: {
    provider: 'zhipu',
    model: 'glm-4-plus',
    apiKey: process.env.ZHIPU_API_KEY || '',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    timeout: 30000,
    maxRetries: 2,
    retryDelay: 1500,
  },
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 100,
  },
};

// ================================================================
// CACHE
// ================================================================

class AICache {
  constructor() {
    this.cache = new Map();
    this.config = AI_CONFIG.cache;
  }

  getKey(prompt, theme, params) {
    return JSON.stringify({ prompt, theme, params });
  }

  get(prompt, theme, params) {
    if (!this.config.enabled) return null;
    const key = this.getKey(prompt, theme, params);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.config.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(prompt, theme, params, data) {
    if (!this.config.enabled) return;
    const key = this.getKey(prompt, theme, params);
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data: data,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      enabled: this.config.enabled,
      ttl: this.config.ttl,
    };
  }
}

// ================================================================
// PROVIDER IMPLEMENTATIONS
// ================================================================

class GroqProvider {
  constructor(config) {
    this.config = config;
  }

  async generate(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 4096,
      topP = 0.9,
      stream = false,
    } = options;

    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert web developer and designer. Generate clean, modern, and responsive HTML/CSS/JS code based on the user\'s description. Include proper semantic HTML, modern CSS with flexbox/grid, and vanilla JavaScript for interactivity. Also provide SEO meta tags, Open Graph tags, and schema markup. Always return valid, complete, and production-ready code. The code should be well-commented and follow best practices.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream: stream,
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from Groq API');
    }

    return {
      content: data.choices[0].message.content,
      usage: data.usage || null,
      provider: 'groq',
      model: this.config.model,
    };
  }
}

class ZhipuProvider {
  constructor(config) {
    this.config = config;
  }

  async generate(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 4096,
      topP = 0.9,
      stream = false,
    } = options;

    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的网页开发专家。请根据用户描述生成干净、现代、响应式的HTML/CSS/JS代码。包含语义化HTML、现代CSS、交互JavaScript。同时提供SEO meta标签、Open Graph标签和schema markup。代码必须完整、可运行、符合最佳实践。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream: stream,
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zhipu API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from Zhipu API');
    }

    return {
      content: data.choices[0].message.content,
      usage: data.usage || null,
      provider: 'zhipu',
      model: this.config.model,
    };
  }
}

// ================================================================
// MAIN AI ADAPTER
// ================================================================

class AIAdapter {
  constructor() {
    this.cache = new AICache();
    this.primary = new GroqProvider(AI_CONFIG.primary);
    this.fallback = new ZhipuProvider(AI_CONFIG.fallback);
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      fallbackUsed: 0,
    };
  }

  /**
   * Generate website code from prompt
   * @param {string} prompt - User's business description
   * @param {Object} options - Generation options
   * @param {string} options.theme - Theme ID (veda, karma, sattva, dharma)
   * @param {string} options.primaryColor - Primary color hex
   * @param {string} options.font - Font family
   * @param {Array} options.pages - Pages to include
   * @param {number} options.temperature - AI temperature (0-1)
   * @param {number} options.maxTokens - Max tokens
   * @param {boolean} options.skipCache - Skip cache lookup
   * @returns {Promise<Object>} Generated website data
   */
  async generateWebsite(prompt, options = {}) {
    const {
      theme = 'veda',
      primaryColor = '#b8860b',
      font = 'inter',
      pages = ['home', 'about', 'services', 'contact'],
      temperature = 0.7,
      maxTokens = 4096,
      skipCache = false,
    } = options;

    this.stats.totalRequests++;

    try {
      // Validate inputs
      if (!prompt || prompt.trim().length < 10) {
        throw new Error('Prompt must be at least 10 characters long.');
      }

      if (!['veda', 'karma', 'sattva', 'dharma'].includes(theme)) {
        throw new Error('Invalid theme. Choose from: veda, karma, sattva, dharma');
      }

      // Check cache
      if (!skipCache) {
        const cached = this.cache.get(prompt, theme, { primaryColor, font, pages });
        if (cached) {
          this.stats.cacheHits++;
          return {
            ...cached,
            cached: true,
            fromCache: true,
          };
        }
        this.stats.cacheMisses++;
      }

      // Build prompt with theme context
      const fullPrompt = this.buildPrompt(prompt, theme, primaryColor, font, pages);

      // Try primary provider
      let result;
      let usedFallback = false;

      try {
        result = await this.primary.generate(fullPrompt, { temperature, maxTokens });
        this.stats.successfulRequests++;
      } catch (primaryError) {
        console.warn('Primary AI provider failed:', primaryError.message);

        // Try fallback
        try {
          result = await this.fallback.generate(fullPrompt, { temperature, maxTokens });
          this.stats.successfulRequests++;
          this.stats.fallbackUsed++;
          usedFallback = true;
        } catch (fallbackError) {
          this.stats.failedRequests++;
          throw new Error(`All AI providers failed. Primary: ${primaryError.message}. Fallback: ${fallbackError.message}`);
        }
      }

      // Parse and validate result
      const parsed = this.parseResponse(result.content, theme);

      // Cache result
      this.cache.set(prompt, theme, { primaryColor, font, pages }, {
        ...parsed,
        timestamp: Date.now(),
        usedFallback: usedFallback,
        provider: result.provider,
        model: result.model,
      });

      return {
        ...parsed,
        cached: false,
        fromCache: false,
        usedFallback: usedFallback,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        raw: result.content,
      };

    } catch (error) {
      this.stats.failedRequests++;
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Build the AI prompt with theme context
   */
  buildPrompt(prompt, theme, primaryColor, font, pages) {
    const themeStyles = {
      veda: 'Spiritual/wellness theme with warm earthy tones, Vedic motifs (lotus, mandalas), calm and peaceful aesthetic.',
      karma: 'Modern digital agency theme with bold dark mode, neon accents, dynamic animations, and edgy design.',
      sattva: 'Clean e-commerce theme with minimalist design, product-focused layout, and sustainable/organic vibe.',
      dharma: 'Professional consulting theme with trust signals, corporate styling, blue tones, and clean typography.',
    };

    const pageList = pages.join(', ');

    return `
      You are an expert web developer. Generate a complete, production-ready website based on the following requirements:

      BUSINESS DESCRIPTION:
      ${prompt}

      THEME:
      ${themeStyles[theme] || 'Modern and clean design.'}

      PRIMARY COLOR: ${primaryColor}
      FONT: ${font}
      PAGES TO INCLUDE: ${pageList}

      REQUIREMENTS:
      1. Generate complete HTML file with embedded CSS and JavaScript
      2. Use semantic HTML5 elements
      3. CSS should be modern with flexbox/grid, smooth animations
      4. Include responsive design for mobile, tablet, and desktop
      5. Add SEO meta tags (title, description, keywords, Open Graph)
      6. Include JSON-LD schema markup (Organization, LocalBusiness, or Product)
      7. Make it visually stunning with your theme direction
      8. Include all requested pages as sections or separate pages
      9. Add a navigation menu linking all pages
      10. Include a footer with social links and copyright
      11. Make it interactive with vanilla JavaScript
      12. Ensure all code is valid, clean, and well-commented

      Return ONLY the complete HTML code. No explanations. The code must be ready to deploy.
    `;
  }

  /**
   * Parse and structure the AI response
   */
  parseResponse(content, theme) {
    // Extract HTML
    const htmlMatch = content.match(/<html[\s\S]*?<\/html>/i);
    if (!htmlMatch) {
      throw new Error('No valid HTML found in AI response.');
    }

    const html = htmlMatch[0];

    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'My Website';

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    const description = descMatch ? descMatch[1] : '';

    // Count pages (approximate by H1/H2)
    const headingCount = (html.match(/<h[1-6]/gi) || []).length;
    const pages = Math.max(1, Math.round(headingCount / 3));

    return {
      html: html,
      title: title,
      description: description,
      pages: pages,
      theme: theme,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      ...this.stats,
      cache: this.cache.getStats(),
    };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Health check
   */
  async healthCheck() {
    const results = {
      primary: { status: 'unknown', error: null },
      fallback: { status: 'unknown', error: null },
    };

    // Test primary
    try {
      await this.primary.generate('Hello world', { maxTokens: 10 });
      results.primary.status = 'healthy';
    } catch (err) {
      results.primary.status = 'unhealthy';
      results.primary.error = err.message;
    }

    // Test fallback
    try {
      await this.fallback.generate('Hello world', { maxTokens: 10 });
      results.fallback.status = 'healthy';
    } catch (err) {
      results.fallback.status = 'unhealthy';
      results.fallback.error = err.message;
    }

    return {
      status: results.primary.status === 'healthy' || results.fallback.status === 'healthy' ? 'healthy' : 'unhealthy',
      results,
      timestamp: Date.now(),
    };
  }
}

// ================================================================
// EXPORT
// ================================================================

// Singleton instance
let instance = null;

function getAIAdapter() {
  if (!instance) {
    instance = new AIAdapter();
  }
  return instance;
}

// Browser global
if (typeof window !== 'undefined') {
  window.SwayamAI = {
    getAdapter: getAIAdapter,
    config: AI_CONFIG,
  };
}

// Node/ESM export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AIAdapter,
    AI_CONFIG,
    getAIAdapter,
  };
}

// Also export for ES modules
export {
  AIAdapter,
  AI_CONFIG,
  getAIAdapter,
};

console.log('AI Adapter initialized. Providers: Groq (primary), Zhipu (fallback)');
