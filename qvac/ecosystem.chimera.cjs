module.exports = {
  apps: [
    {
      name: 'qvac-node',
      cwd: __dirname,
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        MACHINE_OWNER_EVM: '0x40fC1634DdF154234F4D0dE046d8443998d013a3',
        APP_ID: 'protocol-default',
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
