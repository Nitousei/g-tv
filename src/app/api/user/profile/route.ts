import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const updateProfileSchema = z.object({
    nickname: z.string().max(20).optional(),
    avatar: z.string().url().optional(),
    password: z.string().min(6).optional(),
    newPassword: z.string().min(6).optional(),
});

export async function PUT(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ message: "未登录" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const result = updateProfileSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: "输入无效", errors: result.error.flatten() },
                { status: 400 }
            );
        }

        const { nickname, avatar, password, newPassword } = result.data;
        const updateData: any = {};

        if (nickname !== undefined) updateData.nickname = nickname;
        if (avatar !== undefined) updateData.avatar = avatar;

        if (newPassword) {
            if (!password) {
                return NextResponse.json({ message: "修改密码需要提供旧密码" }, { status: 400 });
            }
            // Verify old password
            const user = await prisma.user.findUnique({
                where: { id: session.userId },
            });

            if (!user || user.password !== password) {
                return NextResponse.json({ message: "旧密码错误" }, { status: 400 });
            }
            updateData.password = newPassword;
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true,
            }
        });

        return NextResponse.json({ message: "更新成功", user: updatedUser });

    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json(
            { message: "更新失败" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ message: "未登录" }, { status: 401 });
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
        return NextResponse.json({ message: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json(user);
}
