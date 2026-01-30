import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { redis, sessionKeys } from './redis';

const SECRET_KEY = new TextEncoder().encode(
    process.env.AUTH_SECRET || 'your-secret-key-min-32-chars-long!'
);

const COOKIE_NAME = 'auth-token';

export interface SessionPayload {
    userId: number;
    username: string;
    sessionId: string;
    expiresAt: Date;
}

export async function createSession(userId: number, username: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const sessionId = uuidv4();

    // 存入 Redis，记录当前有效的 sessionId
    // 过期时间设为 7 天
    await redis.set(
        sessionKeys.userSession(userId),
        sessionId,
        'EX',
        7 * 24 * 60 * 60
    );

    const token = await new SignJWT({ userId, username, sessionId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(SECRET_KEY);

    const cookieStore = await cookies();
    // 注意：secure: true 只能在 HTTPS 下使用
    // 如果用 IP 地址直接访问（HTTP），需要设置 secure: false，否则 cookie 不会被保存
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: false, // 如果部署了 HTTPS 可以改回 process.env.NODE_ENV === 'production'
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    });

    return token;
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return {
            userId: payload.userId as number,
            username: payload.username as string,
            sessionId: payload.sessionId as string,
            expiresAt: new Date((payload.exp as number) * 1000),
        };
    } catch {
        return null;
    }
}

export async function deleteSession() {
    const cookieStore = await cookies();
    // 登出时也可以清除 Redis，但为了容错（比如多端登录逻辑），
    // 严格来说这里应该只清除当前 Session，如果 Redis 中存的正是这个 Session 才删。
    // 简化起见，直接清除 Cookie。Redis 会自然过期或被新登录覆盖。
    cookieStore.delete(COOKIE_NAME);
}

