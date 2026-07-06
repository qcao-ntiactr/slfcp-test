# Use Node.js 24 with Debian Slim
FROM node:24-slim

# -----------------------------
# OS-level setup - Run as root
# -----------------------------
# Update standard libraries
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@latest

# Disable Corepack (CRITICAL)
RUN corepack disable

RUN npm install -g pnpm@10.28.2

# Configure pnpm global bin dir
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN mkdir -p /pnpm

# Install PM2 globally
RUN pnpm add -g pm2

# Create non-root user
RUN groupadd --system appuser && useradd --system --gid appuser --create-home --shell /usr/sbin/nologin appuser

# Fix ownership for runtime
RUN chown -R appuser:appuser /pnpm

WORKDIR /app

# Ensure appuser owns the working directory
RUN chown -R appuser:appuser /app

# Copy dependency manifests first (cache-friendly)
COPY --chown=appuser:appuser package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=appuser:appuser apps/backend/package.json apps/backend/
COPY --chown=appuser:appuser packages/emailer/package.json packages/emailer/
COPY --chown=appuser:appuser packages/logger/package.json packages/logger/
COPY --chown=appuser:appuser packages/normalize-markdown/package.json packages/normalize-markdown/
COPY --chown=appuser:appuser packages/utils/package.json packages/utils/
COPY --chown=appuser:appuser packages/validation/package.json packages/validation/

# -----------------------------
# Run as appuser
# -----------------------------
USER appuser

# Use build arguments
ARG DATABASE_URL
ARG ENTRY_MIGR_LABEL

# Set them as environment variables inside the container
ENV DATABASE_URL="${DATABASE_URL}"
ENV ENTRY_MIGR_LABEL="${ENTRY_MIGR_LABEL}"

# Prisma environment variables to prevent engine download issues
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING="1"
ENV PRISMA_CLI_QUERY_ENGINE_TYPE="library"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE="true"
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL="true"

# Disable prompting
ENV CI=true

# Install dependencies as appuser
RUN pnpm install --filter '@slfcp/backend...' --no-frozen-lockfile

# Copy rest of the source
COPY --chown=appuser:appuser . .

# Entrypoint
COPY --chown=appuser:appuser apps/backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Build backend
WORKDIR /app/apps/backend

# Initialize Prisma Client
RUN pnpm exec prisma generate

# Build workspace dependencies and backend
RUN pnpm --filter '@slfcp/backend...' build

# Expose the port (change if needed)
EXPOSE 3000

# Change working directory to the backend app
WORKDIR /app

# Use the entrypoint script.
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
