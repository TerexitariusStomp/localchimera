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
    },
    {
      name: 'joplin-wiki',
      script: '/home/user/otterwiki-repo/joplin_wiki_server_v2.py',
      cwd: '/home/user/otterwiki-repo',
      interpreter: '/usr/bin/python3',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: { PYTHONUNBUFFERED: '1' },
      error_file: '/home/user/otterwiki-repo/logs/wiki-error.log',
      out_file: '/home/user/otterwiki-repo/logs/wiki-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true
    }
  ]
};
