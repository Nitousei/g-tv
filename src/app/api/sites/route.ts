import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const sites = await prisma.collectionSite.findMany({
            where: { enabled: true },
            orderBy: { id: 'asc' },
        });

        return NextResponse.json({ sites });
    } catch (error) {
        console.error('Failed to fetch collection sites:', error);
        return NextResponse.json(
            { message: '获取采集站列表失败' },
            { status: 500 }
        );
    }
}
