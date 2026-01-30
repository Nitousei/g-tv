// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: "g-tv", // Next.js 主应用
            script: "node_modules/next/dist/bin/next",
            args: "start",
            cwd: "./",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
                PORT: 3000,
            }
        },
        {
            name: "g-tv-socket", // Socket 服务器
            script: "dist/socket-server.js",
            cwd: "./",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "production",
            }
        }
    ]
};