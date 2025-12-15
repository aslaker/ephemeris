# Quickstart: Cloudflare Workers Deployment

**Feature**: 002-cloudflare-deploy  
**Date**: 2025-12-14

## Prerequisites

- [x] Cloudflare account with Workers enabled
- [x] GitHub repository with Actions enabled
- [x] Bun installed locally (for development)

---

## 1. Configure Cloudflare API Token

1. Go to [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Select **Edit Cloudflare Workers** template
4. Customize permissions (optional) and create token
5. Copy the token value (you won't see it again)

---

## 2. Find Your Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select **Workers & Pages** from the sidebar
3. Your Account ID is displayed in the right sidebar

---

## 3. Add GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings → Secrets and variables → Actions**
3. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | Your API token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID from step 2 |

---

## 4. Local Development

### Install dependencies

```bash
bun install
```

### Start development server

```bash
bun run dev
```

### Create local environment file

Create `.dev.vars` in the project root (already in `.gitignore`):

```bash
# .dev.vars
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project
```

---

## 5. Preview Production Build

Build and preview locally to test the Workers environment:

```bash
bun run build
bun run preview
```

This simulates the Cloudflare Workers runtime locally.

---

## 6. Production Secrets Management

### Setting Production Secrets

Use the Wrangler CLI to set secrets for production:

```bash
# Set a secret (you'll be prompted for the value)
npx wrangler secret put SECRET_NAME

# Example: Set Sentry DSN for server-side
npx wrangler secret put SENTRY_DSN
```

### Viewing Secrets

```bash
# List all secrets (names only, not values)
npx wrangler secret list
```

### Deleting Secrets

```bash
npx wrangler secret delete SECRET_NAME
```

**Note**: Secrets are encrypted at rest and never exposed in logs or the Cloudflare dashboard.

---

## 7. Manual Deployment

To deploy manually (without CI/CD):

```bash
bun run deploy
```

You'll be prompted to authenticate if not already logged in.

---

## 8. Automated Deployment (CI/CD)

Once GitHub secrets are configured:

1. Push to the `main` branch
2. GitHub Actions automatically builds and deploys
3. Check the **Actions** tab for deployment status

---

## Common Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start local development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build locally |
| `bun run deploy` | Deploy to Cloudflare Workers |
| `bun run check` | Run Biome linting and formatting |

---

## Troubleshooting

### "Authentication required" error

```bash
npx wrangler login
```

### Build fails with Node.js API error

Ensure `wrangler.jsonc` has `nodejs_compat` flag:

```jsonc
"compatibility_flags": ["nodejs_compat"]
```

### Environment variable not available

- **Client-side**: Must be prefixed with `VITE_` and set at build time
- **Server-side**: Use `wrangler secret put <NAME>` for production

### Deployment times out in CI

Check GitHub Actions logs. Increase `timeout-minutes` in workflow if needed.

---

## Next Steps

1. ✅ Configure GitHub secrets
2. ✅ Test local preview
3. ✅ Push to main and verify deployment
4. ⬜ Set up custom domain (optional)
5. ⬜ Configure additional environment variables as needed
