/**
 * PM2 ecosystem config to run API and frontend as managed processes.
 * Use `pm2 start ecosystem.config.cjs --env production` to start.
 */
const { resolve } = require('path');

module.exports = {
  apps: [
    {
      name: 'caoa-venda-cantada-api',
      script: 'pnpm',
      args: '--filter caoa-venda-cantada-api start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'caoa-venda-cantada-web',
      script: 'node',
      args: 'frontend/server.mjs',
      cwd: resolve(__dirname, 'frontend'),
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
