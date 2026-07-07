# SLFCP Local Development Environment

This folder runs the external services the app expects, without running the frontend or backend themselves in Docker.

It provides:

- PostgreSQL for Prisma
- Azurite for Azure Blob Storage
- MailHog for SMTP capture
- A local Node API that replaces the deployed Azure Logic App workflow endpoint

## Start The Suite

From the repository root:

```sh
pnpm dev:env
```

Equivalent direct command:

```sh
docker compose -f apps/dev-env/docker-compose.yml up -d --build
```

## Backend Setup

Copy the backend env example:

```sh
cp apps/dev-env/backend.local.env.example apps/backend/.env
```

Then prepare the database:

```sh
pnpm --filter @slfcp/backend prisma:generate
pnpm --filter @slfcp/backend prisma:migrate:deploy
pnpm --filter @slfcp/backend seed
```

Start the backend:

```sh
pnpm dev:backend
```

## Frontend Setup

Copy the frontend env example:

```sh
cp apps/dev-env/frontend.local.env.example apps/frontend/.env.local
```

Start the frontend:

```sh
pnpm dev:frontend
```

## Local Service URLs

- Backend API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Postgres: `localhost:5432`, database/user/password all `slfcp`
- Azurite Blob endpoint: `http://127.0.0.1:10000/slfcpdev`
- MailHog web UI: `http://localhost:8025`
- Local workflow API: `http://localhost:7071/api/workflow`

## Workflow API

The backend posts this shape:

```json
{
  "current_status": "UNDER_NTIA_INITIAL_REVIEW",
  "action": "approve"
}
```

The local workflow service returns:

```json
{
  "status": "UNDER_FEDERAL_AGENCIES_REVIEW"
}
```

Supported transitions:

| Current status | Action | Next status |
| --- | --- | --- |
| `SUBMITTED` | empty or `submit` | `UNDER_NTIA_INITIAL_REVIEW` |
| `UNDER_NTIA_INITIAL_REVIEW` | `approve` | `UNDER_FEDERAL_AGENCIES_REVIEW` |
| `UNDER_NTIA_INITIAL_REVIEW` | `request_revisions` | `UNDER_INITIAL_REVISION_PER_NTIA` |
| `UNDER_INITIAL_REVISION_PER_NTIA` | `resubmit` | `UNDER_NTIA_INITIAL_REVIEW` |
| `UNDER_FEDERAL_AGENCIES_REVIEW` | `concur` | `UNDER_NTIA_FINAL_REVIEW` |
| `UNDER_FEDERAL_AGENCIES_REVIEW` | `concur_with_conditions` | `UNDER_NTIA_FINAL_REVIEW` |
| `UNDER_FEDERAL_AGENCIES_REVIEW` | `not_concur` | `UNDER_NTIA_FINAL_REVIEW` |
| `UNDER_FEDERAL_AGENCIES_REVIEW` | `auto_approve` | `UNDER_NTIA_FINAL_REVIEW` |
| `UNDER_NTIA_FINAL_REVIEW` | `approve` | `APPROVED` |
| `UNDER_NTIA_FINAL_REVIEW` | `approve_with_conditions` | `APPROVED_WITH_CONDITIONS` |
| `UNDER_NTIA_FINAL_REVIEW` | `finalize_denial` | `DENIED` |
| `UNDER_NTIA_FINAL_REVIEW` | `request_revisions` | `UNDER_FINAL_REVISION_PER_NTIA` |
| `UNDER_FINAL_REVISION_PER_NTIA` | `resubmit` | `UNDER_NTIA_FINAL_REVIEW` |

Terminal statuses return themselves: `APPROVED`, `APPROVED_WITH_CONDITIONS`, and `DENIED`.

## Useful Commands

```sh
pnpm dev:env:logs
pnpm dev:env:down
pnpm dev:env:reset
```
