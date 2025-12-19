# Sentry Setup for Cloudflare Workers

This guide explains how to configure Sentry for error tracking in production.

## Overview

Sentry is used for error tracking in both client-side and server-side code. For server-side functions (like weather API calls), Sentry needs to be initialized with a DSN available at runtime.

## Setup Steps

### 1. Get Your Sentry DSN

1. Go to your Sentry project: https://sentry.io/settings/
2. Navigate to **Projects** → Your Project → **Client Keys (DSN)**
3. Copy your DSN (it looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 2. Set Up for Production (Cloudflare Workers)

Set the Sentry DSN as a Cloudflare secret. This makes it available at runtime for server-side code:

```bash
npx wrangler secret put SENTRY_DSN
```

When prompted, paste your Sentry DSN.

**Note**: You can also use `VITE_SENTRY_DSN` if you prefer, but `SENTRY_DSN` is recommended for server-side runtime access.

### 3. Set Up for Local Development

Create a `.dev.vars` file in the project root (it's gitignored):

```bash
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars` and add your Sentry DSN:

```bash
# Server-side DSN (for local dev)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Client-side DSN (build-time, embedded in bundle)
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### 4. Verify Setup

After deploying, check your Cloudflare Workers logs or Sentry dashboard:

1. **Check Cloudflare Logs**: Look for the warning "Sentry DSN not found" - if you see this, the DSN isn't configured correctly
2. **Check Sentry Dashboard**: After triggering an error (like the weather API failing), you should see events appear in Sentry

### 5. Testing

To test that Sentry is working:

1. Deploy your changes
2. Trigger a weather API call (generate a briefing)
3. Check your Sentry dashboard for any errors or events
4. Look for events with tags like `weather_api: "open_meteo"`

## Troubleshooting

### No events appearing in Sentry

1. **Check DSN is set**: Run `npx wrangler secret list` and verify `SENTRY_DSN` is listed
2. **Check initialization**: Look for console warnings about "Sentry DSN not found" in Cloudflare logs
3. **Verify DSN format**: Make sure the DSN starts with `https://` and is the full URL

### Events appear but no server-side errors

- Server-side Sentry initialization happens automatically when server functions run
- Make sure you're calling functions that use `ensureSentryInitialized()` (weather API, AI briefing)
- Check that errors are actually occurring (not just returning null gracefully)

## Environment Variables Summary

| Variable | Purpose | Where Set | When Available |
|----------|---------|-----------|----------------|
| `SENTRY_DSN` | Server-side runtime | Cloudflare secret / `.dev.vars` | Runtime (server functions) |
| `VITE_SENTRY_DSN` | Client-side build-time | Cloudflare secret / `.dev.vars` | Build-time (embedded in bundle) |

For server-side error tracking, `SENTRY_DSN` is preferred as it's available at runtime.
