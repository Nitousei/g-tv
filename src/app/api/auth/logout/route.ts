import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
    await deleteSession();
    return NextResponse.json({ message: "退出登录成功" });
}
