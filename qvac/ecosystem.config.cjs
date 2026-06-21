const path = require('path');
const ROOT = __dirname;

const base = {
  watch: false,
  autorestart: true,
  max_restarts: 10,
  restart_delay: 3000,
  kill_timeout: 15000,
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true,
  time: true,
};

module.exports = {
  apps: [
    {
      ...base,
      name: 'qvac-node',
      script: path.join(ROOT, 'src/index.js'),
      cwd: ROOT,
      max_memory_restart: '4G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3002,
        ORCHESTRATOR_ROLE: process.env.ORCHESTRATOR_ROLE || 'commander',
        COMMANDER_URL: process.env.COMMANDER_URL || '',
        ORCHESTRATOR_TAGS: process.env.ORCHESTRATOR_TAGS || 'collaborative,ai-generated',
      },
      error_file: path.join(ROOT, 'logs/error.log'),
      out_file:   path.join(ROOT, 'logs/out.log'),
    },
  ],
};
