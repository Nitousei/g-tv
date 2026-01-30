// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: "g-tv",
            script: "dist/server.js",
            cwd: "./",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
                PORT: 3000,
            }
        }
    ]
};