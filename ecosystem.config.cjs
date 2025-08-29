module.exports = {
  apps: [{
    name: 'gpt-crawler-server',
    script: './dist/src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      API_PORT: 3000,
      API_HOST: '0.0.0.0'
    }
  }]
};