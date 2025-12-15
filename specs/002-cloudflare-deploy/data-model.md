# Data Model: Cloudflare Workers Deployment

**Feature**: 002-cloudflare-deploy  
**Date**: 2025-12-14

## Overview

This feature is infrastructure-focused and does not introduce new application data entities. Instead, it defines configuration entities for the deployment pipeline.

---

## Configuration Entities

### 1. Wrangler Configuration

**Entity**: `WranglerConfig`  
**Location**: `wrangler.jsonc` (repository root)  
**Purpose**: Defines Cloudflare Workers deployment settings

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | No | JSON schema for validation |
| `name` | string | Yes | Worker name (used in Cloudflare dashboard) |
| `compatibility_date` | string | Yes | Workers runtime compatibility date (YYYY-MM-DD) |
| `compatibility_flags` | string[] | Yes | Runtime feature flags (e.g., `nodejs_compat`) |
| `main` | string | Yes | Entry point module |
| `observability.enabled` | boolean | No | Enable built-in logging |

**Validation Rules**:
- `name` must be lowercase alphanumeric with hyphens
- `compatibility_date` must be a valid ISO date
- `main` must point to a valid entry module

---

### 2. GitHub Actions Workflow

**Entity**: `DeployWorkflow`  
**Location**: `.github/workflows/deploy.yml`  
**Purpose**: Defines CI/CD pipeline for automated deployments

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Workflow display name |
| `on.push.branches` | string[] | Yes | Branches that trigger deployment |
| `jobs.deploy.runs-on` | string | Yes | Runner environment |
| `jobs.deploy.timeout-minutes` | number | No | Maximum execution time |
| `secrets.CLOUDFLARE_API_TOKEN` | secret | Yes | Cloudflare API authentication |
| `secrets.CLOUDFLARE_ACCOUNT_ID` | secret | Yes | Target Cloudflare account |

**State Transitions**:
- Triggered → Running → Success/Failure

---

### 3. Environment Variables

**Entity**: `EnvironmentConfig`  
**Location**: Various (see below)  
**Purpose**: Runtime configuration for the deployed application

| Variable | Scope | Storage Location | Description |
|----------|-------|------------------|-------------|
| `VITE_SENTRY_DSN` | Client | `.dev.vars` (local) / Cloudflare Secrets (prod) | Sentry client-side DSN |
| `VITE_APP_TITLE` | Client | Build-time | Application title |
| `CLOUDFLARE_API_TOKEN` | CI/CD | GitHub Secrets | Deployment authentication |
| `CLOUDFLARE_ACCOUNT_ID` | CI/CD | GitHub Secrets | Target account for deployment |

**Validation Rules**:
- Client variables must be prefixed with `VITE_`
- Secrets must never be committed to version control
- All production secrets managed via Wrangler CLI or Cloudflare dashboard

---

## Relationships

```text
┌─────────────────────┐
│   GitHub Actions    │
│   (deploy.yml)      │
└─────────┬───────────┘
          │ uses
          ▼
┌─────────────────────┐
│   Wrangler Config   │
│   (wrangler.jsonc)  │
└─────────┬───────────┘
          │ deploys
          ▼
┌─────────────────────┐
│  Cloudflare Worker  │
│   (production)      │
└─────────┬───────────┘
          │ uses
          ▼
┌─────────────────────┐
│ Environment Config  │
│ (secrets/variables) │
└─────────────────────┘
```

---

## No Database Entities

This feature does not introduce any persistent data storage or database entities. All configuration is file-based (wrangler.jsonc, deploy.yml) or managed externally (GitHub Secrets, Cloudflare Secrets).
