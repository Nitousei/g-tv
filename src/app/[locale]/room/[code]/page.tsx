import { getSession } from '@/lib/auth';
import { RoomClient } from '@/components/room-client';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import prisma from '@/lib/db';

export default async function RoomPage({
    params
}: {
    params: Promise<{ locale: string; code: string }>
}) {
    const { locale, code } = await params;
    const session = await getSession();

    if (!session) {
        redirect(`/${locale}?login=true`);
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true, nickname: true, avatar: true }
    });

    if (!user) {
        redirect(`/${locale}?login=true`);
    }

    return (
        <div className="min-h-screen bg-background">
            <RoomClient
                roomCode={code}
                currentUser={user}
            />
        </div>
    )
}
