import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { redis, sessionKeys } from '@/lib/redis';

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ valid: false, reason: 'no_session' });
    }

    try {
        const currentSessionId = await redis.get(sessionKeys.userSession(session.userId));

        // 如果 Redis 中没有记录（可能过期或Redis重启），或者记录的 ID 与当前不同
        if (!currentSessionId || currentSessionId !== session.sessionId) {
            return NextResponse.json({
                valid: false,
                reason: 'logged_in_elsewhere' // 账号在其他地方登录
            });
        }

        return NextResponse.json({ valid: true });
    } catch (error) {
        console.error('Session check error:', error);
        // Redis 错误时暂且认为有效，避免误踢
        return NextResponse.json({ valid: true });
    }
}
