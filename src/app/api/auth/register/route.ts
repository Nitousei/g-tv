import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createSession } from '@/lib/auth';

const prisma = new PrismaClient();

const registerSchema = z.object({
    username: z.string().min(1, "用户名不能为空").max(20, "用户名不能超过20个字符"),
    password: z.string().min(6, "密码至少6个字符"),
    confirmPassword: z.string().min(6, "密码至少6个字符"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Zod Validation
        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { message: "输入无效", errors: result.error.flatten() },
                { status: 400 }
            );
        }

        const { username, password } = result.data;

        // 2. Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "用户名已存在" },
                { status: 409 }
            );
        }

        // 3. Create User
        // Note: Storing password as plain text as requested/consistent with existing login
        const user = await prisma.user.create({
            data: {
                username,
                password,
                nickname: username, // Default nickname to username
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, // Default avatar
            },
        });

        // 4. Create Session (Set Cookie) and Auto Login
        await createSession(user.id, user.username);

        return NextResponse.json({
            message: "注册成功",
            user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar }
        }, { status: 201 });

    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json(
            { message: "服务器内部错误" },
            { status: 500 }
        );
    }
}
