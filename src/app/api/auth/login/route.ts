import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createSession } from '@/lib/auth';

const prisma = new PrismaClient();

const loginSchema = z.object({
    username: z.string().min(1, "用户名不能为空"),
    password: z.string().min(1, "密码不能为空"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Zod Validation
        const result = loginSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { message: "输入无效", errors: result.error.flatten() },
                { status: 400 }
            );
        }

        const { username, password } = result.data;

        // 2. Database Check (Plain text as requested)
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user || user.password !== password) {
            return NextResponse.json(
                { message: "用户名或密码错误" },
                { status: 401 }
            );
        }

        // 3. Create Session (Set Cookie)
        await createSession(user.id, user.username);

        // Login successful
        return NextResponse.json({
            message: "登录成功",
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { message: "服务器内部错误" },
            { status: 500 }
        );
    }
}

