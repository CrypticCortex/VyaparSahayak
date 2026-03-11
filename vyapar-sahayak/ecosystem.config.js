module.exports = {
  apps: [
    {
      name: "vyapar-sahayak",
      cwd: "/home/ec2-user/app/vyapar-sahayak",
      script: "npm",
      args: "start",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1500M",
    },
  ],
};
