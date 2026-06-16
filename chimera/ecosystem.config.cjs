const path = require('path');
const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'qvac-node',
      script: path.join(ROOT, 'src/index.js'),
      cwd: ROOT,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '4G',
      kill_timeout: 15000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: path.join(ROOT, 'logs/error.log'),
      out_file: path.join(ROOT, 'logs/out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true
    }
  ]
};
