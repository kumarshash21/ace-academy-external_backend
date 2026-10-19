// pm2 process definition. Start with: npm run pm2:start (after `npm run build`).
// cwd must be this folder so dotenv finds .env.
module.exports = {
  apps: [
    {
      name: "ace-academy-api",
      script: "dist/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
e