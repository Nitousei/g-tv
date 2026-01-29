import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RoomLobby } from './room-lobby';

export default async function RoomPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params;
    const session = await getSession();

    if (!session) {
        redirect(`/${locale}?login=true`);
    }

    return <RoomLobby />;
}
