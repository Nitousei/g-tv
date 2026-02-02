import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// POST: Save History
const historySchema = z.object({
    videoId: z.string(),
    videoName: z.string(),
    cover: z.string().optional(),
    progress: z.number(),
    duration: z.number(),
});

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ message: "未登录" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const result = historySchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: "输入无效", errors: result.error.flatten() },
                { status: 400 }
            );
        }

        const { videoId, videoName, cover, progress, duration } = result.data;

        const history = await prisma.history.upsert({
            where: {
                userId_videoId: {
                    userId: session.userId,
                    videoId: videoId,
                }
            },
            update: {
                progress,
                duration,
                videoName, // Update name/cover in case it changed
                cover,
                updatedAt: new Date(),
            },
            create: {
                userId: session.userId,
                videoId,
                videoName,
                cover,
                progress,
                duration,
            }
        });

        return NextResponse.json({ message: "记录成功", history });

    } catch (error) {
        console.error("Save history error:", error);
        return NextResponse.json(
            { message: "保存失败" },
            { status: 500 }
        );
    }
}

// GET: Get History List
export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ message: "未登录" }, { status: 401 });
    }

    try {
        const history = await prisma.history.findMany({
            where: { userId: session.userId },
            orderBy: { updatedAt: 'desc' },
            take: 50, // Limit to last 50 items
        });

        return NextResponse.json(history);

    } catch (error) {
        console.error("Get history error:", error);
        return NextResponse.json(
            { message: "获取失败" },
            { status: 500 }
        );
    }
}
