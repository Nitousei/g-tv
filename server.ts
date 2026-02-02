import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import Redis from 'ioredis';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Types
interface User {
    id: number;
    username: string;
    nickname?: string;
    avatar?: string;
    socketId: string;
}

interface RoomState {
    hostId: number;
    currentVideo: any;
    currentEpisodeIndex: number;
    isPlaying: boolean;
    currentTime: number;
    lastUpdate: number;
}

// Redis key helpers
const getKey = {
    room: (code: string) => `room:${code}`,
    members: (code: string) => `room:${code}:members`,
    activeRooms: 'active_rooms'
};



app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO on the same server
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        path: '/socket.io'
    });

    // 用于存储语音成员状态的内存 Map
    const voiceRooms = new Map<string, Map<string, { user: { id: number; username: string }; isMuted: boolean }>>();

    // Helper: Broadcast lobby state
    async function broadcastLobbyState() {
        const roomCodes = await redis.smembers(getKey.activeRooms);
        const roomsData = [];
        const onlineCount = io.engine.clientsCount;

        for (const code of roomCodes) {
            const roomStateJson = await redis.get(getKey.room(code));
            const membersLen = await redis.llen(getKey.members(code));

            if (roomStateJson) {
                const roomState = JSON.parse(roomStateJson);
                console.log(`[LobbyBroadcast] Room ${code} Current Video:`, JSON.stringify(roomState.currentVideo));
                // Get host name
                const membersJson = await redis.lrange(getKey.members(code), 0, -1);
                const members = membersJson.map(m => JSON.parse(m));
                const host = members.find(m => m.id === roomState.hostId);

                roomsData.push({
                    roomCode: code,
                    hostName: host?.username || 'Unknown',
                    memberCount: membersLen,
                    videoName: roomState.currentVideo?.vod_name || roomState.currentVideo?.name || 'Nothing playing',
                    isPlaying: roomState.isPlaying
                });
            } else {
                // Clean up stale room key
                await redis.srem(getKey.activeRooms, code);
            }
        }

        io.to('lobby').emit('lobby-update', {
            rooms: roomsData,
            onlineCount
        });
    }

    // Socket.IO event handlers
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Broadcast online count on connect
        io.to('lobby').emit('online-count', io.engine.clientsCount);

        // Join Lobby
        socket.on('join-lobby', async () => {
            socket.join('lobby');
            await broadcastLobbyState();
        });

        // Join room
        socket.on('join-room', async ({ roomCode, user, create }: { roomCode: string, user: { id: number, name: string, nickname?: string, avatar?: string }, create?: boolean }) => {
            console.log(`[JOIN] Room: ${roomCode}, User: ${user.id} (${user.name}), Create: ${create}, Socket: ${socket.id}`);

            const roomExists = await redis.exists(getKey.room(roomCode));

            if (!create && !roomExists) {
                console.log(`[JOIN] Room ${roomCode} not found`);
                socket.emit('error', '房间不存在');
                return;
            }

            socket.join(roomCode);
            // If currently in lobby, leave lobby to stop receiving full updates? 
            // Optional, but keeping them might be useful for notifications. 
            // For now, let's keep them in lobby or not concern ourselves too much.

            const membersJson = await redis.lrange(getKey.members(roomCode), 0, -1);

            let members: User[] = [];
            try {
                members = membersJson.map(m => JSON.parse(m));
            } catch (e) {
                console.error(`[JOIN] Error parsing members:`, e);
            }

            const existingMemberIndex = members.findIndex(m => Number(m.id) === Number(user.id));

            if (existingMemberIndex === -1) {
                const newUser = {
                    id: user.id,
                    username: user.name,
                    nickname: user.nickname,
                    avatar: user.avatar,
                    socketId: socket.id
                };
                members.push(newUser);
                await redis.rpush(getKey.members(roomCode), JSON.stringify(newUser));
                console.log(`[JOIN] Added new user ${user.id}`);
            } else {
                members[existingMemberIndex].socketId = socket.id;
                await redis.lset(getKey.members(roomCode), existingMemberIndex, JSON.stringify(members[existingMemberIndex]));
                console.log(`[JOIN] Updated socket for user ${user.id}`);
            }

            let hostId = -1;
            const roomStateJson = await redis.get(getKey.room(roomCode));
            let roomState: RoomState | null = roomStateJson ? JSON.parse(roomStateJson) : null;

            if (!roomState) {
                hostId = user.id;
                roomState = {
                    hostId,
                    currentVideo: null,
                    currentEpisodeIndex: 0,
                    isPlaying: false,
                    currentTime: 0,
                    lastUpdate: Date.now()
                };
                await redis.set(getKey.room(roomCode), JSON.stringify(roomState), 'EX', 24 * 60 * 60);
                await redis.sadd(getKey.activeRooms, roomCode); // Track active room
                console.log(`[JOIN] Created new room state with host ${hostId}`);
            } else {
                hostId = roomState.hostId;
                if (!members.find(m => m.id === hostId)) {
                    console.log(`[JOIN] Host ${hostId} not in members. Resetting to ${members[0].id}`);
                    hostId = members[0].id;
                    roomState.hostId = hostId;
                    await redis.set(getKey.room(roomCode), JSON.stringify(roomState));
                }
            }

            console.log(`[JOIN] Emitting room-update. Members: ${members.length}, Host: ${hostId}`);

            io.to(roomCode).emit('room-update', {
                members: members,
                hostId: hostId,
                roomState: roomState
            });

            if (hostId !== user.id) {
                const hostMember = members.find(m => m.id === hostId);
                if (hostMember) {
                    io.to(hostMember.socketId).emit('request-sync', { requesterId: socket.id });
                }
            }

            // Broadcast update to lobby
            broadcastLobbyState();
        });

        // Leave room
        socket.on('leave-room', async ({ roomCode, userId }) => {
            await handleLeave(roomCode, userId, socket, io);
        });

        // Disconnect - 清理所有房间中该 socket 对应的成员
        socket.on('disconnect', async () => {
            console.log('Client disconnected:', socket.id);

            // Broadcast online count
            io.to('lobby').emit('online-count', io.engine.clientsCount);

            // 获取该 socket 加入的所有房间
            const rooms = Array.from(socket.rooms).filter(room => room !== socket.id && room !== 'lobby');

            for (const roomCode of rooms) {
                try {
                    // 从 Redis 获取该房间的成员
                    const membersJson = await redis.lrange(getKey.members(roomCode), 0, -1);
                    let members: User[] = membersJson.map(m => JSON.parse(m));

                    // 查找通过 socketId 断开连接的成员
                    const disconnectedMember = members.find(m => m.socketId === socket.id);

                    if (disconnectedMember) {
                        console.log(`[DISCONNECT] Removing member ${disconnectedMember.username} from room ${roomCode}`);

                        // 从成员列表中移除
                        members = members.filter(m => m.socketId !== socket.id);

                        // 更新 Redis
                        await redis.del(getKey.members(roomCode));
                        if (members.length > 0) {
                            const pipeline = redis.pipeline();
                            members.forEach(m => pipeline.rpush(getKey.members(roomCode), JSON.stringify(m)));
                            await pipeline.exec();
                        }

                        // 如果房间没人了，删除房间
                        if (members.length === 0) {
                            await redis.del(getKey.room(roomCode));
                            await redis.srem(getKey.activeRooms, roomCode); // Clean up active room
                            console.log(`[DISCONNECT] Room ${roomCode} is empty, deleted`);
                        } else {
                            // 检查是否是房主离开
                            const roomStateJson = await redis.get(getKey.room(roomCode));
                            if (roomStateJson) {
                                let roomState = JSON.parse(roomStateJson);
                                if (roomState.hostId === disconnectedMember.id) {
                                    roomState.hostId = members[0].id;
                                    await redis.set(getKey.room(roomCode), JSON.stringify(roomState));
                                    io.to(roomCode).emit('system-message', `房主已离开，${members[0].username} 成为新房主`);
                                }

                                // 通知其他成员更新成员列表
                                io.to(roomCode).emit('room-update', {
                                    members: members,
                                    hostId: roomState.hostId,
                                    roomState: roomState
                                });
                            }
                        }

                        // Update voice presence
                        const voiceRoom = voiceRooms.get(roomCode);
                        if (voiceRoom) {
                            voiceRoom.delete(socket.id);
                            io.to(roomCode).emit('voice-status-update', {
                                voiceMembers: Array.from(voiceRoom.entries()).map(([sid, data]) => ({
                                    socketId: sid,
                                    userId: data.user.id,
                                    username: data.user.username,
                                    isMuted: data.isMuted,
                                })),
                            });
                        }

                        broadcastLobbyState();
                    }
                } catch (error) {
                    console.error(`[DISCONNECT] Error processing room ${roomCode}:`, error);
                }
            }
        });

        // Sync video (from host)
        socket.on('sync-video', async ({ roomCode, state }) => {
            const roomStateJson = await redis.get(getKey.room(roomCode));
            if (roomStateJson) {
                const current = JSON.parse(roomStateJson);
                const newState = { ...current, ...state, lastUpdate: Date.now() };
                await redis.set(getKey.room(roomCode), JSON.stringify(newState));
                socket.to(roomCode).emit('sync-video', newState);

                // If video or playing state changed, might want to update lobby
                const oldName = current.currentVideo?.vod_name || current.currentVideo?.name;
                const newName = state.currentVideo?.vod_name || state.currentVideo?.name;

                if (oldName !== newName || current.isPlaying !== state.isPlaying) {
                    broadcastLobbyState();
                }
            }
        });

        // Respond sync
        socket.on('respond-sync', ({ requesterId, state }) => {
            io.to(requesterId).emit('sync-video', state);
        });

        // ========== Voice Chat Events ==========

        // 加入语音
        socket.on('voice-join', ({ roomCode, user }: { roomCode: string; user: { id: number; username: string } }) => {
            console.log(`[Voice] ${user.username} joined voice in room ${roomCode}`);

            if (!voiceRooms.has(roomCode)) {
                voiceRooms.set(roomCode, new Map());
            }
            const roomVoice = voiceRooms.get(roomCode)!;

            // 通知房间内其他语音成员
            roomVoice.forEach((member, socketId) => {
                io.to(socketId).emit('voice-user-joined', { user, socketId: socket.id });
            });

            // 发送当前语音成员列表给新加入者
            const members = Array.from(roomVoice.entries()).map(([sid, data]) => ({
                socketId: sid,
                user: data.user,
                isMuted: data.isMuted,
            }));
            socket.emit('voice-members', { members });

            // 添加到语音房间
            roomVoice.set(socket.id, { user, isMuted: false });

            // 广播给整个房间（包括非语音成员）更新语音状态
            io.to(roomCode).emit('voice-status-update', {
                voiceMembers: Array.from(roomVoice.entries()).map(([sid, data]) => ({
                    socketId: sid,
                    userId: data.user.id,
                    username: data.user.username,
                    isMuted: data.isMuted,
                })),
            });
        });

        // 离开语音
        socket.on('voice-leave', ({ roomCode, userId }: { roomCode: string; userId: number }) => {
            console.log(`[Voice] User ${userId} left voice in room ${roomCode}`);

            const roomVoice = voiceRooms.get(roomCode);
            if (roomVoice) {
                roomVoice.delete(socket.id);

                // 通知其他语音成员
                roomVoice.forEach((_, socketId) => {
                    io.to(socketId).emit('voice-user-left', { socketId: socket.id });
                });

                // 广播更新
                io.to(roomCode).emit('voice-status-update', {
                    voiceMembers: Array.from(roomVoice.entries()).map(([sid, data]) => ({
                        socketId: sid,
                        userId: data.user.id,
                        username: data.user.username,
                        isMuted: data.isMuted,
                    })),
                });
            }
        });

        // WebRTC Offer
        socket.on('voice-offer', ({ roomCode, targetSocketId, offer, from }) => {
            io.to(targetSocketId).emit('voice-offer', {
                offer,
                fromSocketId: socket.id,
                from,
            });
        });

        // WebRTC Answer
        socket.on('voice-answer', ({ roomCode, targetSocketId, answer }) => {
            io.to(targetSocketId).emit('voice-answer', {
                answer,
                fromSocketId: socket.id,
            });
        });

        // ICE Candidate
        socket.on('voice-ice-candidate', ({ roomCode, targetSocketId, candidate }) => {
            io.to(targetSocketId).emit('voice-ice-candidate', {
                candidate,
                fromSocketId: socket.id,
            });
        });

        // 静音状态变化
        socket.on('voice-mute', ({ roomCode, userId, isMuted }: { roomCode: string; userId: number; isMuted: boolean }) => {
            const roomVoice = voiceRooms.get(roomCode);
            if (roomVoice) {
                const member = roomVoice.get(socket.id);
                if (member) {
                    member.isMuted = isMuted;

                    // 广播静音状态给所有语音成员
                    roomVoice.forEach((_, socketId) => {
                        if (socketId !== socket.id) {
                            io.to(socketId).emit('voice-mute-changed', { socketId: socket.id, isMuted });
                        }
                    });

                    // 广播给整个房间
                    io.to(roomCode).emit('voice-status-update', {
                        voiceMembers: Array.from(roomVoice.entries()).map(([sid, data]) => ({
                            socketId: sid,
                            userId: data.user.id,
                            username: data.user.username,
                            isMuted: data.isMuted,
                        })),
                    });
                }
            }
        });
    });

    // Helper: handle leave
    async function handleLeave(roomCode: string, userId: number, socket: any, io: Server) {
        socket.leave(roomCode);

        const membersJson = await redis.lrange(getKey.members(roomCode), 0, -1);
        let members: User[] = membersJson.map(m => JSON.parse(m));

        const index = members.findIndex(m => m.id === userId);
        if (index !== -1) {
            members = members.filter(m => m.id !== userId);
            await redis.del(getKey.members(roomCode));
            if (members.length > 0) {
                const pipeline = redis.pipeline();
                members.forEach(m => pipeline.rpush(getKey.members(roomCode), JSON.stringify(m)));
                await pipeline.exec();
            }
        }

        if (members.length === 0) {
            await redis.del(getKey.room(roomCode));
            await redis.srem(getKey.activeRooms, roomCode); // Clean up active room
            console.log(`[LEAVE] Room ${roomCode} is empty, deleted`);
        } else {
            const roomStateJson = await redis.get(getKey.room(roomCode));
            if (roomStateJson) {
                let roomState = JSON.parse(roomStateJson);
                if (roomState.hostId === userId) {
                    roomState.hostId = members[0].id;
                    await redis.set(getKey.room(roomCode), JSON.stringify(roomState));
                    io.to(roomCode).emit('system-message', `房主已离开，${members[0].username} 成为新房主`);
                }

                io.to(roomCode).emit('room-update', {
                    members: members,
                    hostId: roomState.hostId,
                    roomState: roomState
                });
            }
        }
        broadcastLobbyState();
    }

    httpServer.listen(port, () => {
        console.log(`> Server ready on http://${hostname}:${port}`);
        console.log(`> Socket.IO integrated on the same port`);
    });
});
