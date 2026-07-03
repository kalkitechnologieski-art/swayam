/**
 * ================================================================
 * VERCEL DEPLOYMENT UTILITY — Swayam AI Website Builder
 * Handles deployment to Vercel with API integration,
 * project management, and deployment status tracking.
 * ================================================================
 */

// ================================================================
// CONFIGURATION
// ================================================================

const VERCEL_CONFIG = {
  apiBase: 'https://api.vercel.com',
  teamId: process.env.VERCEL_TEAM_ID || '',
  projectName: process.env.VERCEL_PROJECT_NAME || 'swayam-site',
  token: process.env.VERCEL_API_TOKEN || '',
  defaultFramework: 'nextjs',
  buildCommand: 'npm run build',
  outputDir: 'dist',
  productionBranch: 'main',
  previewBranch: 'preview',
};

// ================================================================
// DEPLOYMENT CLASS
// ================================================================

class VercelDeploy {
  constructor(config = {}) {
    this.config = { ...VERCEL_CONFIG, ...config };
    this.deployments = new Map();
  }

  /**
   * Create a new project on Vercel
   */
  async createProject(name, options = {}) {
    if (!this.config.token) {
      throw new Error('Vercel API token is required. Set VERCEL_API_TOKEN environment variable.');
    }

    const {
      framework = this.config.defaultFramework,
      buildCommand = this.config.buildCommand,
      outputDir = this.config.outputDir,
      publicSource = true,
    } = options;

    const response = await fetch(`${this.config.apiBase}/v9/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.token}`,
      },
      body: JSON.stringify({
        name: name || this.config.projectName,
        framework: framework,
        buildCommand: buildCommand,
        outputDirectory: outputDir,
        publicSource: publicSource,
        teamId: this.config.teamId || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Vercel project creation failed: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Deploy a website to Vercel
   */
  async deploy(siteData, options = {}) {
    if (!this.config.token) {
      throw new Error('Vercel API token is required. Set VERCEL_API_TOKEN environment variable.');
    }

    const {
      projectId,
      target = 'preview', // 'production' or 'preview'
      deployHook,
      files = [],
    } = options;

    // If we have a deploy hook URL, use it
    if (deployHook) {
      return this.deployViaHook(deployHook, siteData);
    }

    // If we have a project ID, use the API
    if (projectId) {
      return this.deployViaAPI(projectId, siteData, target);
    }

    // Create project first
    const project = await this.createProject(this.config.projectName);
    return this.deployViaAPI(project.id, siteData, target);
  }

  /**
   * Deploy via Vercel API
   */
  async deployViaAPI(projectId, siteData, target) {
    const deploymentId = this.generateDeploymentId();

    try {
      // Prepare files
      const files = this.prepareFiles(siteData);

      // Create deployment
      const response = await fetch(`${this.config.apiBase}/v13/deployments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.token}`,
        },
        body: JSON.stringify({
          projectId: projectId,
          target: target,
          files: files,
          name: siteData.title || 'swayam-site',
          meta: {
            siteId: siteData.id || 'unknown',
            title: siteData.title || 'Untitled',
          },
          teamId: this.config.teamId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Vercel deployment failed: ${error.error?.message || response.statusText}`);
      }

      const result = await response.json();

      this.deployments.set(deploymentId, {
        id: result.id,
        url: result.url,
        status: 'deploying',
        target: target,
        createdAt: new Date().toISOString(),
        projectId: projectId,
      });

      // Wait for deployment to complete
      const status = await this.waitForDeployment(result.id);

      return {
        deploymentId: deploymentId,
        url: `https://${result.url}`,
        status: status.status,
        ready: status.ready,
        projectId: projectId,
        createdAt: status.createdAt,
        ...status,
      };

    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Deploy using a deploy hook URL
   */
  async deployViaHook(hookUrl, siteData) {
    const deploymentId = this.generateDeploymentId();

    try {
      const response = await fetch(hookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: siteData.title || 'Swayam Site',
          siteId: siteData.id || 'unknown',
          files: this.prepareFiles(siteData),
        }),
      });

      if (!response.ok) {
        throw new Error(`Deploy hook failed: ${response.statusText}`);
      }

      const result = await response.json();

      this.deployments.set(deploymentId, {
        id: result.id,
        url: result.url,
        status: 'deploying',
        createdAt: new Date().toISOString(),
      });

      return {
        deploymentId: deploymentId,
        url: result.url,
        status: 'deployed',
        ready: true,
        viaHook: true,
        ...result,
      };

    } catch (error) {
      throw new Error(`Deploy hook failed: ${error.message}`);
    }
  }

  /**
   * Wait for deployment to complete
   */
  async waitForDeployment(deploymentId, maxAttempts = 30, interval = 3000) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await fetch(`${this.config.apiBase}/v13/deployments/${deploymentId}`, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get deployment status: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.readyState === 'READY' || data.status === 'ready') {
          return {
            status: 'ready',
            ready: true,
            url: data.url,
            createdAt: data.createdAt,
            deployedAt: data.createdAt,
          };
        }

        if (data.readyState === 'ERROR' || data.status === 'error') {
          return {
            status: 'error',
            ready: false,
            error: data.error?.message || 'Unknown error',
            url: data.url,
          };
        }

        // Still deploying
        await new Promise(function(resolve) { setTimeout(resolve, interval); });

      } catch (error) {
        // If we get an error, wait and retry
        await new Promise(function(resolve) { setTimeout(resolve, interval); });
      }
    }

    return {
      status: 'timeout',
      ready: false,
      error: 'Deployment timed out',
    };
  }

  /**
   * Prepare files for deployment
   */
  prepareFiles(siteData) {
    // This would bundle the site files
    // For now, we return a simple structure
    return {
      'index.html': siteData.html || '<html><body><h1>Hello World</h1></body></html>',
      '_meta.json': JSON.stringify({
        title: siteData.title || 'Swayam Site',
        description: siteData.description || '',
        theme: siteData.theme || 'default',
        createdAt: new Date().toISOString(),
      }),
    };
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found.`);
    }

    try {
      const response = await fetch(`${this.config.apiBase}/v13/deployments/${deployment.id}`, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get deployment status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        url: data.url,
        status: data.status || data.readyState,
        ready: data.readyState === 'READY',
        error: data.error?.message || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

    } catch (error) {
      throw new Error(`Failed to get deployment status: ${error.message}`);
    }
  }

  /**
   * List deployments for a project
   */
  async listDeployments(projectId, limit = 20) {
    if (!this.config.token) {
      throw new Error('Vercel API token is required.');
    }

    const response = await fetch(
      `${this.config.apiBase}/v6/deployments?projectId=${projectId}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to list deployments: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(deploymentId) {
    if (!this.config.token) {
      throw new Error('Vercel API token is required.');
    }

    const response = await fetch(`${this.config.apiBase}/v13/deployments/${deploymentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to delete deployment: ${error.error?.message || response.statusText}`);
    }

    return { success: true, deploymentId };
  }

  /**
   * Generate a unique deployment ID
   */
  generateDeploymentId() {
    return 'dep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  }

  /**
   * Get deployment history for a site
   */
  getDeploymentHistory(siteId) {
    const history = [];
    this.deployments.forEach(function(value, key) {
      if (value.siteId === siteId || value.siteId === 'unknown') {
        history.push({
          deploymentId: key,
          ...value,
        });
      }
    });
    return history;
  }

  /**
   * Get overall stats
   */
  getStats() {
    const total = this.deployments.size;
    const deploying = Array.from(this.deployments.values()).filter(function(d) {
      return d.status === 'deploying';
    }).length;
    const deployed = Array.from(this.deployments.values()).filter(function(d) {
      return d.status === 'deployed' || d.status === 'ready';
    }).length;
    const failed = Array.from(this.deployments.values()).filter(function(d) {
      return d.status === 'error' || d.status === 'failed';
    }).length;

    return {
      total: total,
      deploying: deploying,
      deployed: deployed,
      failed: failed,
    };
  }
}

// ================================================================
// EXPORT
// ================================================================

let vercelInstance = null;

function getVercelDeploy() {
  if (!vercelInstance) {
    vercelInstance = new VercelDeploy();
  }
  return vercelInstance;
}

// Browser global
if (typeof window !== 'undefined') {
  window.SwayamVercel = {
    deploy: getVercelDeploy,
    config: VERCEL_CONFIG,
  };
}

// Node/ESM export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VercelDeploy,
    VERCEL_CONFIG,
    getVercelDeploy,
  };
}

export {
  VercelDeploy,
  VERCEL_CONFIG,
  getVercelDeploy,
};

console.log('Vercel Deploy utility initialized.');
