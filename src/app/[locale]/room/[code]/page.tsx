import { getSession } from '@/lib/auth';
import { RoomClient } from '@/components/room-client';
import { redirect } from 'next/navigation';
import Header from '@/components/header';

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

    return (
        <div className="min-h-screen bg-background">
            <RoomClient
                roomCode={code}
                currentUser={{ id: session.userId, username: session.username }}
            />
        </div>
    )
}
