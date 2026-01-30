// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: "g-tv", // 项目名称（和服务器PM2项目名一致）
            script: "node_modules/next/dist/bin/next", // Next.js启动文件
            args: "start", // 启动参数（生产模式）
            cwd: "./", // 项目根目录
            instances: 1, // 启动实例数（本地1个即可）
            autorestart: true, // 进程崩溃自动重启
            watch: false, // 本地生产模式关闭监听（避免修改代码自动重启）
            max_memory_restart: "1G", // 内存占用超过1G自动重启
            env: {
                NODE_ENV: "production", // 生产环境
                PORT: 3000, // 端口号
            }
        }
    ]
};