module.exports = {
  apps: [
    {
      name: 'API',
      script: 'dist/api/src/server.js',
      cwd: './apps/backend',
      interpreter: 'node',
    },
    {
      name: 'Auto migrate unreviewed requests',
      script:
        'dist/scripts/moveOldNTIAReviewRequestsToFederalAgencies/src/index.js',
      cwd: './apps/backend',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'Reminder to Federals Agencies',
      script: 'dist/scripts/remindersToFederalAgencies/src/index.js',
      cwd: './apps/backend',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
