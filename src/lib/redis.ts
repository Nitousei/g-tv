import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// 创建 Redis 客户端单例
const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis = globalForRedis.redis ?? new Redis(REDIS_URL);

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}

// Session 相关的 Redis 操作
export const sessionKeys = {
    userSession: (userId: number) => `session:${userId}`,
};

// 房间相关的 Redis 操作
export const roomKeys = {
    room: (code: string) => `room:${code}`,
    roomMembers: (code: string) => `room:${code}:members`,
};

export default redis;
