import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ exists: false, message: 'Missing code' }, { status: 400 });
    }

    try {
        // 使用 socket-server 中定义的同样的 key 规则
        // socket-server: `room:${code}`
        const exists = await redis.exists(`room:${code}`);

        return NextResponse.json({ exists: exists === 1 });
    } catch (error) {
        console.error('Room check error:', error);
        return NextResponse.json({ exists: false }, { status: 500 });
    }
}
