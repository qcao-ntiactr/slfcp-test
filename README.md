# Space Launch Frequency Coordination Portal

## Overview

The Space Launch Frequency Coordination Portal (SLFCP) is a web application designed to streamline the frequency coordination process for space launches. This repository uses a monorepo structure that hosts multiple applications and shared packages, managed using `pnpm` for efficient package management and dependency handling.

## Key Features

- Frequency request submission and management
- Federal agency review workflow
- Approval, concurrence, and denial processes
- Automated notifications and reminders
- Secure authentication with Entra ID

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Microsoft Entra ID (formerly Azure AD)
- **Storage**: Azure Blob Storage
- **Testing**: Vitest, Playwright
- **Process Management**: PM2 (via ecosystem.config.cjs)

## Project Structure

```
├── apps/                      # Application code
│   ├── backend/               # Backend API service
│   │   ├── api/               # API implementation
│   │   │   ├── open_api_specs/# OpenAPI specification
│   │   │   ├── src/           # Source code
│   │   │   └── test/          # API tests
│   │   ├── prisma/            # Database schema and migrations
│   │   │   ├── migrations/    # Database migrations
│   │   │   ├── schema.prisma  # Prisma schema
│   │   │   └── seeds/         # Database seed scripts
│   │   └── scripts/           # Backend utility scripts
│   └── frontend/              # Frontend application
│       ├── playwright-tests/  # UI automation tests
│       ├── public/            # Static assets
│       └── src/               # Source code
│           ├── api/           # API client
│           ├── components/    # React components
│           ├── context/       # React context providers
│           ├── hooks/         # Custom React hooks
│           └── pages/         # Page components
├── packages/                  # Shared packages
│   ├── logger/                # Logging utilities
│   ├── utils/                 # Common utilities
│   └── validation/            # Validation schemas
├── scripts/                   # Project-wide scripts
├── logs/                      # Application logs (not versioned)
└── ecosystem.config.cjs       # PM2 process configuration
```

This monorepo structure allows for code sharing between applications while maintaining separation of concerns.

## Requirements

- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- [pnpm](https://pnpm.io/) (Package manager)
- [PostgreSQL](https://www.postgresql.org/) (Database)
- [Git](https://git-scm.com/) (Version control)

## Getting Started

### Install Dependencies

First, ensure `pnpm` is installed globally:

```sh
npm install -g pnpm
```

Then, install project dependencies:

```sh
pnpm install
```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://username:password@localhost:5432/slfcp
AZURE_BLOB_STORAGE_CONNECTION_STRING=your_connection_string
CONTAINER_NAME=your_container_name
```

Additional environment variables may be required for authentication and other services.

### Database Setup with Prisma

Prisma is the ORM used for database management:

1. Generate Prisma client:
   ```sh
   pnpm --filter @slfcp/backend prisma:generate
   ```

2. Run database migrations:
   ```sh
   pnpm --filter @slfcp/backend prisma:migrate:dev
   ```

3. Seed the database with test data (optional):
   ```sh
   pnpm --filter @slfcp/backend seed
   ```

## Development Workflow

### Running the Backend

```sh
# From root directory
pnpm dev:backend

# Or from backend directory
cd apps/backend
pnpm dev
```

### Running the Frontend

```sh
# From root directory
pnpm dev:frontend

# Or from frontend directory
cd apps/frontend
pnpm dev
```

### Building for Production

```sh
# Build all packages and applications
pnpm build

# Start the backend in production mode
pnpm start:backend
```

## Deployment

The application can be deployed using PM2 process manager with the included configuration:

```sh
# Install PM2 globally
npm install -g pm2

# Start all services defined in ecosystem.config.cjs
pm2 start ecosystem.config.cjs
```

The ecosystem configuration includes:
- API server
- Automated request migration service
- Federal agency reminder service

## Testing

This project uses Vitest for testing:

```sh
# Run unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run system tests
pnpm test:system
```

## Frontend Automation

Playwright is used for automating UI testing and development workflows:

```sh
cd apps/frontend/playwright-tests
npm install
npx playwright install
export BASE_URL="https://slfcpdev.ntia.gov"  # Or your local development URL
pnpm run menu
```

This will display a menu of available automation scripts.

## Code Quality

```sh
# Run linting
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Check formatting
pnpm format:check

# Fix formatting issues
pnpm format
```

## Documentation

Additional documentation is available in the repository:
- `docs/AUTHENTICATION_GUIDE.md` - Detailed authentication flow and configuration
- `IMPLEMENTATION_SUMMARY_OPTION2.md` - Cross-domain refresh token implementation via Authorization headers
- `docs/LOGGING_ENHANCEMENT_SUMMARY.md` - Logging system enhancements
- `apps/wcag-compliance-viewer/README.md` - WCAG report generation, viewer, offline export, and filtered JSON artifact workflow

## Logging

Application logs are stored in the `logs/` directory. This directory is not version-controlled and needs to be created manually.

## Contributing

1. Create a feature branch from the main branch
2. Make your changes
3. Run tests and ensure code quality checks pass
4. Submit a pull request

## License

ISC License
