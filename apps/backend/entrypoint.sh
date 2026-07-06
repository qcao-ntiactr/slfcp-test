#!/bin/sh

cd apps/backend

if [ "$ENTRY_MIGR_LABEL" = "reset" ]; then
  pnpm prisma:migrate:reset --force
else
  pnpm prisma:migrate:${ENTRY_MIGR_LABEL:-deploy}
fi

pnpm prisma:migrate:status

# Run health check before starting the application
echo "Running connection health check..."
if ! pnpm check-connections; then
  echo "❌ Connection health check failed. Aborting startup."
  exit 1
fi
echo "✅ Connection health check passed."

cd /app

pm2 delete all
pm2 start ecosystem.config.cjs
pm2 log