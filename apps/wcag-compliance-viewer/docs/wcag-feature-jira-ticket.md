# JIRA Ticket

## Title

Build local WCAG A/AA compliance generator, runtime workflow coverage reviewer, and readable report viewer

## Description

Create a local-only WCAG compliance tooling experience for the monorepo that can generate an A/AA conformance assessment from the WCAG/VPAT source document, inspect reachable application code, collect Playwright runtime evidence, and render the resulting report in a readable local viewer.

The workflow should be developer-friendly from the monorepo root, support environment-driven OpenAI and Playwright configuration, avoid committing generated assessment artifacts, and provide a deterministic coverage review that identifies reachable routes, workflow surfaces, and missing Playwright probes.

The viewer should focus on report readability: searchable/filterable criteria tables, expandable details, clean formatting for code/routes/files, collapsible reproduction violations, and readable relevant-file directory trees.

## Acceptance Criteria

### Local WCAG App

- Given the monorepo is checked out locally, when a developer inspects `apps/wcag-compliance-viewer`, then a local WCAG viewer app exists with scripts for generation, review, export, build, and viewing.

### Full Root Workflow

- Given the required WCAG environment variables are configured, when a developer runs `pnpm wcag`, then the workflow runs setup diagnostics, generates a fresh report, reviews workflow coverage against the newly generated runtime evidence, and opens the viewer.
- Given a developer wants validation without launching the browser, when they run `pnpm wcag:check`, then the same diagnostic, generation, and coverage-review flow runs without opening the viewer.

### Report Generation

- Given a configured WCAG `.docx` source file exists, when a developer runs `pnpm wcag:generate`, then the script parses the source criteria, determines which A/AA criteria apply to the reachable app, grades applicable criteria, and writes markdown and JSON report artifacts.
- Given the frontend contains unused components that are not reachable from the app entry/router, when the generator scans the codebase, then those unused components are not treated as evidence for the application assessment.
- Given the frontend and backend are available, when Playwright runtime collection runs, then route, role, axe, heading, landmark, focus, form, target-size, status, and interaction evidence are collected where available.

### Coverage Review

- Given generated runtime evidence exists, when `pnpm wcag:review-coverage` runs, then it builds a reachable whole-app workflow inventory and compares that inventory against the current runtime evidence.
- Given reachable app surfaces include uncovered forms, tables, charts/SVGs, uploads, rich text editors, route/page checks, or other testable workflows, when coverage review runs, then it emits grouped missing workflow probes with relevant routes, files, likely criteria, reasons, and recommended probe steps.
- Given source files changed on the branch, when coverage review runs, then it identifies accessibility-relevant changed surfaces, route coverage gaps, and stale generated assessment references.

### Viewer Experience

- Given generated assessment JSON exists, when the viewer opens, then A and AA criteria render in readable searchable/filterable tables with aligned row details.
- Given a row includes one or more concrete violations, when a user expands details, then reproduction guidance appears in collapsible violation containers.
- Given a row is fully compliant, not applicable, or otherwise does not contain a concrete violation, when a user expands details, then unnecessary reproduction-violation UI is not shown.
- Given a row is marked `Needs Verification`, when a user expands details, then reproduction steps are not shown unless a concrete violation is present.
- Given details contain routes, file names, component names, HTML tags, or HTML attributes, when the viewer renders them, then those references appear in code styling where appropriate.
- Given relevant files are present, when a user views row details, then files are displayed as an expandable text-based directory tree.

### Artifacts And Documentation

- Given reports, runtime evidence, filtered/exported outputs, dist builds, local env files, or OS metadata are generated locally, when git status is checked, then those local artifacts are ignored and are not required to be committed.
- Given a developer needs to use or maintain the WCAG tooling, when they read the documentation, then setup, environment variables, scripts, generation flow, coverage review, viewer usage, offline export, filtering/exporting, and troubleshooting are documented.
- Given new or refactored files are introduced for this feature, when code is reviewed, then newly introduced modules follow the readability guideline of staying under 500 lines where practical.
- Given dependencies are installed, when `pnpm --filter wcag-compliance-viewer build` runs, then the viewer builds successfully.
