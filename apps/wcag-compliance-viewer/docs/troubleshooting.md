# WCAG Viewer Troubleshooting

## Missing OpenAI Key

If generation fails with an API key error, confirm `apps/wcag-compliance-viewer/.env`
contains:

```sh
OPENAI_API_KEY=...
```

## Playwright Browser Missing

Install Chromium:

```sh
pnpm --filter wcag-compliance-viewer playwright:install
```

## Frontend Or Backend Not Reachable

Check:

```sh
WCAG_PLAYWRIGHT_BASE_URL
WCAG_PLAYWRIGHT_BACKEND_BASE_URL
```

If you do not want the generator to start services automatically, set:

```sh
WCAG_PLAYWRIGHT_AUTOSTART_FRONTEND=false
WCAG_PLAYWRIGHT_AUTOSTART_BACKEND=false
```

Run the setup doctor for a consolidated status check:

```sh
pnpm wcag:doctor
```

## pnpm Registry Verification Issues

If `pnpm` attempts to verify or switch package-manager versions and network access
is unavailable, run the underlying Node script directly:

```sh
node apps/wcag-compliance-viewer/scripts/filter-wcag-assessment.mjs 4.1.x
```

For generation, prefer the root script when `pnpm` is available:

```sh
pnpm wcag:generate
```

## Offline HTML Shows CORS Or Module Errors

Rebuild the viewer:

```sh
pnpm --filter wcag-compliance-viewer build
```

Then open the newly generated:

```text
apps/wcag-compliance-viewer/dist/index.html
```

The build should inline JS/CSS into the HTML.
