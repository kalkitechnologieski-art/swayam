/**
 * ================================================================
 * DOMAIN CHECK — Swayam AI Website Builder
 * Checks domain availability, pricing, and manages purchases.
 * ================================================================
 */

// ================================================================
// CONFIGURATION
// ================================================================

const DOMAIN_CONFIG = {
  providers: {
    godaddy: {
      apiKey: process.env.GODADDY_API_KEY || '',
      apiSecret: process.env.GODADDY_API_SECRET || '',
      endpoint: 'https://api.godaddy.com/v1',
      timeout: 10000,
    },
    namecheap: {
      apiKey: process.env.NAMECHEAP_API_KEY || '',
      username: process.env.NAMECHEAP_USERNAME || '',
      endpoint: 'https://api.namecheap.com/xml.response',
      timeout: 10000,
    },
  },
  defaultTLDs: ['.com', '.in', '.co', '.org', '.io', '.ai', '.tech', '.store', '.dev', '.app'],
  pricing: {
    '.com': 3000,
    '.in': 3000,
    '.co': 3000,
    '.org': 3000,
    '.io': 3500,
    '.ai': 4500,
    '.tech': 3200,
    '.store': 3500,
    '.dev': 2800,
    '.app': 3500,
  },
  currency: 'INR',
  renewalBuffer: 30, // days before expiry to send reminders
};

// ================================================================
// DOMAIN CLASS
// ================================================================

class DomainManager {
  constructor(config = {}) {
    this.config = { ...DOMAIN_CONFIG, ...config };
    this.cache = new Map();
    this.ownedDomains = [];
    this.loadOwnedDomains();
  }

  /**
   * Check domain availability
   */
  async checkAvailability(domain, tlds = null) {
    const tldList = tlds || this.config.defaultTLDs;
    const base = this.extractBase(domain);

    if (!base) {
      throw new Error('Invalid domain name. Please enter a valid domain (e.g., mybrand).');
    }

    // Check cache first
    const cacheKey = `${base}-${tldList.join(',')}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const results = [];

    for (const tld of tldList) {
      const fullDomain = base + tld;
      try {
        const available = await this.checkSingleDomain(fullDomain);
        const price = this.config.pricing[tld] || 3000;
        results.push({
          domain: fullDomain,
          tld: tld,
          available: available,
          price: price,
          currency: this.config.currency,
        });
      } catch (error) {
        results.push({
          domain: fullDomain,
          tld: tld,
          available: false,
          price: this.config.pricing[tld] || 3000,
          error: error.message,
        });
      }
    }

    // Cache results
    this.cache.set(cacheKey, results);

    return results;
  }

  /**
   * Check a single domain
   */
  async checkSingleDomain(domain) {
    // If we have a real API key, use it
    if (this.config.providers.godaddy.apiKey) {
      return this.checkViaGoDaddy(domain);
    }

    // Fallback: simulate availability (50% chance)
    // In production, replace with real API call
    return Math.random() > 0.3;
  }

  /**
   * Check domain via GoDaddy API
   */
  async checkViaGoDaddy(domain) {
    const response = await fetch(
      `${this.config.providers.godaddy.endpoint}/domains/available?domain=${domain}`,
      {
        headers: {
          'Authorization': `sso-key ${this.config.providers.godaddy.apiKey}:${this.config.providers.godaddy.apiSecret}`,
        },
        signal: AbortSignal.timeout(this.config.providers.godaddy.timeout),
      }
    );

    if (!response.ok) {
      throw new Error(`GoDaddy API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.available === true;
  }

  /**
   * Check domain via Namecheap API
   */
  async checkViaNamecheap(domain) {
    const params = new URLSearchParams({
      ApiUser: this.config.providers.namecheap.username,
      ApiKey: this.config.providers.namecheap.apiKey,
      UserName: this.config.providers.namecheap.username,
      Command: 'namecheap.domains.check',
      DomainList: domain,
    });

    const response = await fetch(
      `${this.config.providers.namecheap.endpoint}?${params}`,
      {
        signal: AbortSignal.timeout(this.config.providers.namecheap.timeout),
      }
    );

    if (!response.ok) {
      throw new Error(`Namecheap API error: ${response.statusText}`);
    }

    const text = await response.text();
    // Parse XML response (simplified)
    const available = !text.includes('<ErrCount>');
    return available;
  }

  /**
   * Purchase a domain
   */
  async purchaseDomain(domain, options = {}) {
    const {
      years = 1,
      contactName = '',
      contactEmail = '',
      contactPhone = '',
      autoRenew = true,
    } = options;

    // Validate domain
    if (!domain || !domain.includes('.')) {
      throw new Error('Invalid domain name.');
    }

    // Check if already owned
    if (this.isDomainOwned(domain)) {
      throw new Error(`Domain ${domain} is already in your account.`);
    }

    // Check availability
    const availability = await this.checkSingleDomain(domain);
    if (!availability) {
      throw new Error(`Domain ${domain} is not available for purchase.`);
    }

    // Calculate price
    const tld = domain.substring(domain.lastIndexOf('.'));
    const pricePerYear = this.config.pricing[tld] || 3000;
    const totalPrice = pricePerYear * years;

    // Simulate purchase
    // In production, this would call the payment API
    const purchase = {
      domain: domain,
      years: years,
      price: totalPrice,
      currency: this.config.currency,
      purchasedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: autoRenew,
      status: 'active',
    };

    // Add to owned domains
    this.ownedDomains.push(purchase);
    this.saveOwnedDomains();

    return purchase;
  }

  /**
   * Renew a domain
   */
  async renewDomain(domain, years = 1) {
    const owned = this.ownedDomains.find(function(d) {
      return d.domain === domain;
    });

    if (!owned) {
      throw new Error(`Domain ${domain} is not in your account.`);
    }

    if (owned.status === 'expired') {
      throw new Error(`Domain ${domain} has expired. You may need to repurchase it.`);
    }

    const tld = domain.substring(domain.lastIndexOf('.'));
    const pricePerYear = this.config.pricing[tld] || 3000;
    const totalPrice = pricePerYear * years;

    // Simulate renewal
    owned.years += years;
    owned.expiresAt = new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000).toISOString();
    owned.price += totalPrice;
    owned.renewedAt = new Date().toISOString();

    this.saveOwnedDomains();

    return {
      success: true,
      domain: domain,
      years: years,
      price: totalPrice,
      newExpiry: owned.expiresAt,
    };
  }

  /**
   * Transfer a domain
   */
  async transferDomain(domain, authCode) {
    const owned = this.ownedDomains.find(function(d) {
      return d.domain === domain;
    });

    if (owned) {
      throw new Error(`Domain ${domain} is already in your account.`);
    }

    // Simulate transfer
    // In production, this would call the registrar API
    const tld = domain.substring(domain.lastIndexOf('.'));
    const pricePerYear = this.config.pricing[tld] || 3000;

    const transfer = {
      domain: domain,
      years: 1,
      price: pricePerYear,
      currency: this.config.currency,
      transferredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      status: 'active',
      transferred: true,
    };

    this.ownedDomains.push(transfer);
    this.saveOwnedDomains();

    return transfer;
  }

  /**
   * Get all owned domains
   */
  getOwnedDomains() {
    return [...this.ownedDomains];
  }

  /**
   * Check if a domain is owned
   */
  isDomainOwned(domain) {
    return this.ownedDomains.some(function(d) {
      return d.domain === domain && d.status === 'active';
    });
  }

  /**
   * Get domain details
   */
  getDomainDetails(domain) {
    return this.ownedDomains.find(function(d) {
      return d.domain === domain;
    }) || null;
  }

  /**
   * Update domain settings
   */
  updateDomain(domain, settings) {
    const index = this.ownedDomains.findIndex(function(d) {
      return d.domain === domain;
    });

    if (index === -1) {
      throw new Error(`Domain ${domain} not found.`);
    }

    this.ownedDomains[index] = {
      ...this.ownedDomains[index],
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    this.saveOwnedDomains();

    return this.ownedDomains[index];
  }

  /**
   * Get expiry alerts (domains expiring soon)
   */
  getExpiryAlerts(days = 30) {
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.ownedDomains.filter(function(d) {
      if (d.status !== 'active') return false;
      const expiry = new Date(d.expiresAt);
      return expiry <= threshold && expiry > now;
    });
  }

  /**
   * Get expired domains
   */
  getExpiredDomains() {
    const now = new Date();
    return this.ownedDomains.filter(function(d) {
      if (d.status === 'expired') return true;
      const expiry = new Date(d.expiresAt);
      return expiry <= now;
    });
  }

  /**
   * Get pricing for a TLD
   */
  getPricing(tld) {
    return this.config.pricing[tld] || 3000;
  }

  /**
   * Get all TLDs with pricing
   */
  getAllTLDs() {
    return this.config.defaultTLDs.map(function(tld) {
      return {
        tld: tld,
        price: DOMAIN_CONFIG.pricing[tld] || 3000,
      };
    });
  }

  /**
   * Extract base domain name
   */
  extractBase(domain) {
    const trimmed = domain.trim().toLowerCase();
    // Remove http://, https://, www.
    let clean = trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove TLD
    const parts = clean.split('.');
    if (parts.length > 1) {
      parts.pop();
    }
    return parts.join('.') || clean;
  }

  /**
   * Load owned domains from localStorage
   */
  loadOwnedDomains() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = localStorage.getItem('swayam_owned_domains');
      if (data) {
        this.ownedDomains = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load owned domains:', error);
    }
  }

  /**
   * Save owned domains to localStorage
   */
  saveOwnedDomains() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('swayam_owned_domains', JSON.stringify(this.ownedDomains));
    } catch (error) {
      console.warn('Could not save owned domains:', error);
    }
  }

  /**
   * Get domain stats
   */
  getStats() {
    const total = this.ownedDomains.length;
    const active = this.ownedDomains.filter(function(d) {
      return d.status === 'active';
    }).length;
    const expired = this.getExpiredDomains().length;
    const expiringSoon = this.getExpiryAlerts(30).length;

    return {
      total: total,
      active: active,
      expired: expired,
      expiringSoon: expiringSoon,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Suggest domains based on a keyword
   */
  suggestDomains(keyword) {
    const suggestions = [];
    const tlds = this.config.defaultTLDs;
    const modifiers = ['', 'get', 'my', 'the', 'go', 'try', 'use', 'app', 'official'];

    for (const tld of tlds) {
      for (const mod of modifiers) {
        if (suggestions.length >= 20) break;
        const name = mod ? `${mod}${keyword}` : keyword;
        suggestions.push({
          domain: `${name}${tld}`,
          tld: tld,
          price: this.config.pricing[tld] || 3000,
          keyword: keyword,
        });
      }
    }

    return suggestions;
  }
}

// ================================================================
// EXPORT
// ================================================================

let domainManagerInstance = null;

function getDomainManager() {
  if (!domainManagerInstance) {
    domainManagerInstance = new DomainManager();
  }
  return domainManagerInstance;
}

// Browser global
if (typeof window !== 'undefined') {
  window.SwayamDomain = {
    manager: getDomainManager,
    config: DOMAIN_CONFIG,
  };
}

// Node/ESM export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DomainManager,
    DOMAIN_CONFIG,
    getDomainManager,
  };
}

export {
    DomainManager,
    DOMAIN_CONFIG,
    getDomainManager,
};

console.log('Domain Manager initialized. ' + DOMAIN_CONFIG.defaultTLDs.length + ' TLDs available.');
