import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// Redis key helpers (must match server.ts)
const getKey = {
    room: (code: string) => `room:${code}`,
    members: (code: string) => `room:${code}:members`,
    activeRooms: 'active_rooms'
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        const roomCodes = await redis.smembers(getKey.activeRooms);
        const allRooms = [];

        for (const code of roomCodes) {
            const roomStateJson = await redis.get(getKey.room(code));
            const membersLen = await redis.llen(getKey.members(code));

            if (roomStateJson) {
                const roomState = JSON.parse(roomStateJson);
                // Get host name
                const membersJson = await redis.lrange(getKey.members(code), 0, -1);
                // Safe parse members
                const members = membersJson.map(m => {
                    try {
                        return JSON.parse(m);
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);

                const host = members.find((m: any) => m.id === roomState.hostId);

                allRooms.push({
                    roomCode: code,
                    hostName: host?.username || 'Unknown',
                    memberCount: membersLen,
                    videoName: roomState.currentVideo?.vod_name || roomState.currentVideo?.name || 'Nothing playing',
                    isPlaying: roomState.isPlaying
                });
            } else {
                // Determine if we should clean up... maybe leave that to the socket server to avoid race conditions,
                // or just ignore here.
            }
        }

        // Sort by member count desc
        allRooms.sort((a, b) => b.memberCount - a.memberCount);

        // Paginate
        const total = allRooms.length;
        const pagedRooms = allRooms.slice(offset, offset + limit);
        const hasMore = offset + limit < total;

        return NextResponse.json({
            rooms: pagedRooms,
            page,
            hasMore,
            total
        });

    } catch (error) {
        console.error('Error fetching room list:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
