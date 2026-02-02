import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { message: "未登录" },
            { status: 401 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            createdAt: true,
        }
    });

    if (!user) {
        return NextResponse.json(
            { message: "用户不存在" },
            { status: 404 }
        );
    }

    return NextResponse.json({ user });
}
