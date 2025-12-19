/**
 * Deployment Configuration Contracts
 *
 * Type definitions for Cloudflare Workers deployment configuration.
 * These interfaces document the expected shape of configuration files
 * used in the deployment pipeline.
 *
 * @feature 002-cloudflare-deploy
 * @date 2025-12-14
 */

/**
 * Wrangler configuration for Cloudflare Workers
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/
 */
export interface WranglerConfig {
  /** JSON schema reference for IDE validation */
  $schema?: string;

  /** Worker name - used in Cloudflare dashboard and as subdomain */
  name: string;

  /** Workers runtime compatibility date (YYYY-MM-DD format) */
  compatibility_date: string;

  /**
   * Runtime compatibility flags
   * @example ["nodejs_compat"] - Enable Node.js API compatibility
   */
  compatibility_flags?: string[];

  /** Entry point module path */
  main: string;

  /** Observability settings */
  observability?: {
    /** Enable built-in Cloudflare logging */
    enabled: boolean;
  };

  /** Environment-specific overrides */
  env?: Record<string, Partial<WranglerConfig>>;
}

/**
 * GitHub Actions workflow configuration for deployment
 */
export interface DeployWorkflowConfig {
  name: string;
  on: {
    push: {
      branches: string[];
    };
  };
  jobs: {
    deploy: DeployJobConfig;
  };
}

/**
 * Deploy job configuration within GitHub Actions workflow
 */
export interface DeployJobConfig {
  'runs-on': string;
  'timeout-minutes'?: number;
  steps: WorkflowStep[];
}

/**
 * Individual step in GitHub Actions workflow
 */
export interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string>;
}

/**
 * Required GitHub Secrets for deployment
 */
export interface RequiredSecrets {
  /**
   * Cloudflare API token with "Edit Cloudflare Workers" permission
   * @see https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
   */
  CLOUDFLARE_API_TOKEN: string;

  /**
   * Cloudflare account identifier
   * @see https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/
   */
  CLOUDFLARE_ACCOUNT_ID: string;
}

/**
 * Client-side environment variables (VITE_ prefixed)
 * These are embedded at build time
 */
export interface ClientEnvironment {
  /** Sentry DSN for client-side error tracking */
  VITE_SENTRY_DSN?: string;

  /** Application title */
  VITE_APP_TITLE?: string;
}

/**
 * Server-side environment variables (accessed via Cloudflare bindings)
 * These are set via Wrangler secrets or Cloudflare dashboard
 */
export interface ServerEnvironment {
  /** Server-side secrets accessed via `env` binding in Workers */
  [key: string]: string | undefined;
}

/**
 * Deployment result returned after successful wrangler deploy
 */
export interface DeploymentResult {
  /** Worker name */
  name: string;

  /** Public URL of deployed Worker */
  url: string;

  /** Deployment ID */
  id: string;

  /** Timestamp of deployment */
  deployedAt: Date;
}


