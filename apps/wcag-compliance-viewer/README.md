# WCAG Compliance Viewer

The WCAG Compliance Viewer is a local-only reporting tool for generating, viewing, exporting, and slicing the SLFCP WCAG A/AA conformance assessment.

It combines:

- The VPAT/WCAG source template at `docs/wcag-source.docx`
- Static monorepo source scanning
- Playwright runtime evidence from the frontend/backend
- AI-assisted criterion applicability classification and WCAG row assessment
- A static React/Chakra viewer for reading the generated report

The app lives at:

```text
apps/wcag-compliance-viewer
```

## Quick Start

From the monorepo root:

```sh
pnpm wcag
```

`pnpm wcag` runs setup diagnostics, report generation, fresh coverage review, and then opens the viewer.

`pnpm wcag:viewer` opens the existing viewer when it is already running, or starts the local viewer on the stable WCAG viewer port.

If no generated assessment exists yet, the viewer opens with placeholder data and tells you to run generation.

## Required Files

The generator expects the WCAG/VPAT source document at:

```text
docs/wcag-source.docx
```

Generated artifacts are written to:

```text
docs/wcag-a-aa-conformance-assessment.md
apps/wcag-compliance-viewer/src/generated/wcagAssessment.json
apps/wcag-compliance-viewer/src/generated/wcagRuntimeEvidence.json
```

These files are intentionally ignored by git because they are local generated artifacts.

## Environment Setup

Create:

```text
apps/wcag-compliance-viewer/.env
```

Use the template:

```sh
cp apps/wcag-compliance-viewer/.env.example apps/wcag-compliance-viewer/.env
```

Set:

```sh
OPENAI_API_KEY=your-key
```

Do not commit `.env`.

## Main Commands

Run these from the monorepo root.

```sh
pnpm wcag
```

Runs the full local workflow: setup diagnostics, report generation, fresh coverage review, and viewer launch.

```sh
pnpm wcag:check
```

Runs setup diagnostics, report generation, and fresh coverage review without launching the viewer.

```sh
pnpm wcag:review-coverage
```

Builds a reachable whole-app workflow inventory, compares it with generated runtime evidence, and also recommends WCAG tester updates for changed app surfaces against `dev`.

```sh
pnpm wcag:doctor
```

Checks the local WCAG setup, including the source `.docx`, generated artifacts, Playwright installation, and configured frontend/backend targets.

```sh
pnpm wcag:generate
```

Generates the markdown report, viewer JSON, and runtime evidence JSON.
Generation first asks AI which WCAG criteria apply to the reachable app surface, then grades only applicable criteria.

```sh
pnpm wcag:viewer
```

Opens the WCAG viewer if it is already running, or starts it on `http://localhost:7357/`.

Advanced commands live on the app package:

```sh
pnpm --filter wcag-compliance-viewer generate -- --runtime-only
pnpm --filter wcag-compliance-viewer filter-assessment -- 4.1.x
pnpm --filter wcag-compliance-viewer export -- status=does-not-support --format md
pnpm --filter wcag-compliance-viewer build
pnpm --filter wcag-compliance-viewer playwright:install
```

## Full Developer Workflow

The usual feature-branch flow is:

```sh
pnpm wcag
```

Expanded, that runs:

```sh
pnpm wcag:doctor
pnpm wcag:generate
pnpm wcag:review-coverage
pnpm wcag:viewer
```

Use `pnpm wcag:check` when you want the same validation and generation flow without launching the viewer.

Use the app-level runtime-only command when tuning browser coverage before spending on AI batches:

```sh
pnpm --filter wcag-compliance-viewer generate -- --runtime-only
```

## Generation Workflow

`pnpm wcag:generate` does the following:

1. Loads `apps/wcag-compliance-viewer/.env`.
2. Parses `docs/wcag-source.docx`.
3. Matches known WCAG Level A and AA criteria from the source document.
4. Indexes monorepo source files for AI context.
5. Starts or connects to the configured frontend/backend runtime.
6. Uses Playwright to collect runtime evidence from configured routes and role workflows.
7. Sends criteria batches to the configured OpenAI model.
8. Validates reproduction guidance.
9. Writes markdown, viewer JSON, and runtime evidence JSON.

The AI checkpoint cache is intentionally disabled. Every generation run audits all criteria batches fresh from the current source and runtime evidence.

Use this when you only want to confirm Playwright/browser coverage:

```sh
pnpm --filter wcag-compliance-viewer generate -- --runtime-only
```

## Playwright Runtime Evidence

Runtime evidence is controlled by `.env` variables.

Common settings:

```sh
WCAG_PLAYWRIGHT_ENABLED=true
WCAG_PLAYWRIGHT_BASE_URL=http://localhost:5173
WCAG_PLAYWRIGHT_BACKEND_BASE_URL=http://localhost:3000
# Optional: add extra routes beyond routes discovered from apps/frontend/src/App.tsx.
# WCAG_PLAYWRIGHT_ROUTES=/,/dashboard,/view-requests,/create-request,/help,/common-conditions
WCAG_PLAYWRIGHT_WORKFLOWS_ENABLED=true
WCAG_PLAYWRIGHT_WORKFLOW_USERS=ntia_dev,commercial_dev,federal_navy
```

The generator indexes frontend source through the active app/router graph, starting at `apps/frontend/src/App.tsx`. Unused frontend components are excluded from static and AI evidence, so the report reflects the rendered application surface rather than every file in the repo.

By default, the generator can start the frontend/backend if they are not already running:

```sh
WCAG_PLAYWRIGHT_AUTOSTART_FRONTEND=true
WCAG_PLAYWRIGHT_AUTOSTART_BACKEND=true
```

If you already have the app running, set `WCAG_PLAYWRIGHT_BASE_URL` and `WCAG_PLAYWRIGHT_BACKEND_BASE_URL` to the running services.

## Mock Authentication

The runtime pass can force mock auth so it can inspect authenticated routes locally:

```sh
WCAG_PLAYWRIGHT_FORCE_MOCK_AUTH=true
WCAG_PLAYWRIGHT_LOGIN_USER=ntia_dev
```

Available named users are listed in `.env.example`, including:

```text
ntia_dev
commercial_dev
federal_navy
federal_nasa
spacex_user
```

Use multiple roles in one run:

```sh
WCAG_PLAYWRIGHT_WORKFLOW_USERS=ntia_dev,commercial_dev,federal_navy
```

## AI Configuration

Common AI settings:

```sh
WCAG_AI_MODEL=gpt-5
WCAG_AI_BATCH_SIZE=4
WCAG_AI_MAX_FILES=18
WCAG_AI_MAX_CHARS_PER_FILE=12000
WCAG_AI_MAX_RETRIES=3
WCAG_AI_RETRY_BASE_DELAY_MS=5000
```

Larger batches and file limits provide more context but increase prompt size, runtime, and API cost.

## Branch Coverage Review

Use the coverage reviewer when you want to know whether the WCAG tester itself needs updates. In the full `pnpm wcag` workflow it runs after report generation so it can compare reachable app surfaces against fresh Playwright runtime evidence.

```sh
pnpm wcag:review-coverage
```

By default this compares against `dev`. You can override the base branch when needed:

```sh
pnpm wcag:review-coverage -- base=origin/dev
```

The reviewer is deterministic and does not call OpenAI. It checks:

- The reachable frontend graph starting from the real app entry.
- Whole-app routes, workflow surfaces, and missing Playwright probes based on current runtime evidence.
- Added, removed, and changed app source files.
- New or changed routes that may need router-discovered runtime coverage, optional `WCAG_PLAYWRIGHT_ROUTES`, or workflow coverage.
- Changed forms, modals, tables, charts, uploads, status messages, keyboard handlers, and responsive/style surfaces.
- Generated assessment file references that now point to deleted or changed files.
- Likely WCAG criteria affected by each changed surface.

It writes:

```text
apps/wcag-compliance-viewer/src/generated/wcagTesterCoverageReview.json
docs/wcag-tester-coverage-review.md
```

Both artifacts are ignored by git.

Useful options:

```sh
pnpm wcag:review-coverage
pnpm wcag:review-coverage -- --base origin/dev --fail-on-broken
pnpm wcag:review-coverage -- --base dev --no-untracked
pnpm wcag:review-coverage -- --json /tmp/wcag-review.json
pnpm wcag:review-coverage -- --markdown /tmp/wcag-review.md
```

Recommended branch workflow:

```sh
pnpm wcag
```

Use `pnpm wcag:review-coverage` by itself when you only want the deterministic tester inventory. Use `pnpm wcag` when you want that inventory compared against freshly regenerated runtime evidence.

## Viewing The Report Locally

Start the viewer:

```sh
pnpm wcag:viewer
```

The viewer command is idempotent:

- If `http://localhost:7357/` is already serving the WCAG viewer, the command reuses that server and opens the existing URL.
- If the port is free, it starts Vite on that exact port.
- If the port is used by something else, it fails instead of silently starting another viewer on a different port.

Override the port only when needed:

```sh
WCAG_VIEWER_PORT=7358 pnpm wcag:viewer
```

The viewer renders:

- Level A and Level AA tables
- Conformance badges
- Filter controls
- Search
- Expandable details
- Ordered verification/reproduction steps
- Expandable relevant-file trees
- Formatted inline code for routes, files, components, HTML tags, and attributes
- Report metadata and stale-report warnings

## Interpreting Results

This tool is an accessibility audit accelerator, not a formal certification by itself.

Conformance levels mean:

- `Supports`: the generated evidence did not identify a violation for this criterion.
- `Mostly Supports`: the app appears broadly compliant, but the row includes a narrow limitation or caveat.
- `Partially Supports`: one or more concrete violations were identified, but the criterion is not entirely unsupported across the app.
- `Does Not Support`: the criterion is broadly unmet for the assessed functionality.
- `Needs Verification`: the automated source/runtime evidence is still insufficient for a confident conclusion.
- `Not Applicable`: no applicable content or functionality was identified for that criterion.

Rows with violations include exact reproduction guidance. `Needs Verification` rows intentionally omit reproduction steps because the workflow has not proven a concrete violation yet.

Lower `Needs Verification` counts by adding route/workflow coverage, increasing criterion-specific runtime assertions, or running manual checks and encoding the result into the generator evidence.

## Static Offline Build

Create a static build:

```sh
pnpm --filter wcag-compliance-viewer build
```

Regenerate first when needed:

```sh
pnpm wcag:generate
pnpm --filter wcag-compliance-viewer build
```

The build output is:

```text
apps/wcag-compliance-viewer/dist
```

The build script runs:

```sh
vite build && node scripts/inline-dist-assets.mjs
```

`inline-dist-assets.mjs` embeds the generated JS and CSS directly into `dist/index.html` and also writes a named copy at `dist/wcag-compliance-viewer.html`. This is necessary because many browsers block external module scripts loaded from `file://`.

To share the report offline, send:

```text
apps/wcag-compliance-viewer/dist/wcag-compliance-viewer.html
```

That file is self-contained and can be opened directly from disk.

On every merge to `dev`, `.github/workflows/wcag-audit-dev.yaml` runs `pnpm wcag:check`, generates filtered JSON assessments for `Needs Verification`, `Partially Supports`, and `Does Not Support`, builds this offline viewer, and uploads the report files plus `dist/wcag-compliance-viewer.html` as a GitHub Actions artifact named `wcag-audit-<commit-sha>`.

## Filtering Assessment JSON

Use the filter script when you need a smaller JSON artifact for specific criteria or conformance states.

```sh
pnpm --filter wcag-compliance-viewer filter-assessment -- <filters>
```

Examples:

```sh
pnpm --filter wcag-compliance-viewer filter-assessment -- 4.x.x
pnpm --filter wcag-compliance-viewer filter-assessment -- 4.1.x
pnpm --filter wcag-compliance-viewer filter-assessment -- 4.1.2
pnpm --filter wcag-compliance-viewer filter-assessment -- criteria=4.1.x status=needs-verification
pnpm --filter wcag-compliance-viewer filter-assessment -- --conformance "Needs Verification"
pnpm --filter wcag-compliance-viewer filter-assessment -- 4.x.x --conformance "Partially Supports"
pnpm --filter wcag-compliance-viewer filter-assessment -- --level AA
```

Filter behavior:

- Criteria filters are ORed together.
- Conformance filters are ORed together.
- WCAG level filters are ORed together.
- Different filter types are ANDed together.

So this command:

```sh
pnpm --filter wcag-compliance-viewer filter-assessment -- 4.x.x --conformance "Partially Supports"
```

means:

```text
criteria starts with 4.*.* AND conformance is Partially Supports
```

Filtered artifacts are written to:

```text
apps/wcag-compliance-viewer/src/generated/wcagAssessment.filtered-*.json
```

These files are ignored by git.

## Exporting Assessment Data

Use exports when someone needs a smaller artifact outside the interactive viewer.

```sh
pnpm --filter wcag-compliance-viewer export -- <filters> --format <json|md|csv|html>
```

Examples:

```sh
pnpm --filter wcag-compliance-viewer export -- status=does-not-support --format md
pnpm --filter wcag-compliance-viewer export -- 4.x.x status=partially-supports format=csv
pnpm --filter wcag-compliance-viewer export -- level=AA format=html
pnpm --filter wcag-compliance-viewer export -- needs-verification
```

Exports are written to:

```text
apps/wcag-compliance-viewer/src/generated/wcagAssessment.export-*.*
```

These files are ignored by git.

## Output Shape

Filtered assessment JSON preserves the same top-level shape as `wcagAssessment.json`, including:

```text
generatedAt
source
aiAudit
runtimeEvidence
summary
tables
```

Filtered files also include:

```text
filteredFrom
filters
```

`summary` is recalculated for the filtered rows.

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) for setup, Playwright,
OpenAI key, pnpm, and offline-build recovery notes.

## Development Notes

- Keep generated artifacts out of git.
- Keep `.env` out of git.
- Update `.env.example` when adding new supported settings.
- The generator does not reuse AI checkpoint rows; expect every full generation to rerun all AI batches.
- Use `node --check scripts/generate-wcag-report.mjs` and `pnpm --filter wcag-compliance-viewer build` after script/viewer changes.
