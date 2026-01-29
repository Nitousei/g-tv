import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';

// 使用独立的 Redis 实例，避免与 Next.js 混用造成连接问题（虽然 ioredis 支持共享，但为了稳定性分开实例化）
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*", // 允许所有来源，生产环境应限制
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

interface User {
    id: number;
    username: string;
    socketId: string;
}

interface RoomState {
    hostId: number;
    currentVideo: any; // 存储当前播放的视频信息
    currentEpisodeIndex: number; // 当前播放的集数索引
    isPlaying: boolean;
    currentTime: number;
    lastUpdate: number;
}

// 房间键名辅助函数
const getKey = {
    room: (code: string) => `room:${code}`,
    members: (code: string) => `room:${code}:members`,
};

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 加入房间
    socket.on('join-room', async ({ roomCode, user, create }: { roomCode: string, user: { id: number, name: string }, create?: boolean }) => {

        // 检查房间是否存在
        const roomExists = await redis.exists(getKey.room(roomCode));

        if (!create && !roomExists) {
            socket.emit('error', '房间不存在');
            return;
        }

        socket.join(roomCode);

        // 获取房间当前成员
        const membersJson = await redis.lrange(getKey.members(roomCode), 0, -1);
        let members: User[] = membersJson.map(m => JSON.parse(m));

        // 检查用户是否已在房间（避免重复添加）
        const existingMemberIndex = members.findIndex(m => m.id === user.id);
        if (existingMemberIndex === -1) {
            const newUser = { id: user.id, username: user.name, socketId: socket.id };
            members.push(newUser);
            await redis.rpush(getKey.members(roomCode), JSON.stringify(newUser));
        } else {
            // 更新 socketId
            members[existingMemberIndex].socketId = socket.id;
            await redis.lset(getKey.members(roomCode), existingMemberIndex, JSON.stringify(members[existingMemberIndex]));
        }

        // 确定 Host
        // 如果是第一个人，或者是 Host
        let hostId = -1;
        const roomStateJson = await redis.get(getKey.room(roomCode));
        let roomState: RoomState | null = roomStateJson ? JSON.parse(roomStateJson) : null;

        if (!roomState) {
            // 新房间
            hostId = user.id;
            roomState = {
                hostId,
                currentVideo: null,
                currentEpisodeIndex: 0,
                isPlaying: false,
                currentTime: 0,
                lastUpdate: Date.now()
            };
            await redis.set(getKey.room(roomCode), JSON.stringify(roomState), 'EX', 24 * 60 * 60); // 24小时过期
        } else {
            hostId = roomState.hostId;
            // 如果 Host 不在成员列表中（异常情况），重置 Host
            if (!members.find(m => m.id === hostId)) {
                hostId = members[0].id;
                roomState.hostId = hostId;
                await redis.set(getKey.room(roomCode), JSON.stringify(roomState));
            }
        }

        // 广播房间信息
        io.to(roomCode).emit('room-update', {
            members: members,
            hostId: hostId,
            roomState: roomState
        });

        // 只有在加入时，如果是普通成员，请求同步
        if (hostId !== user.id) {
            // 通知 Host 发送当前状态
            // Find host socket
            const hostMember = members.find(m => m.id === hostId);
            if (hostMember) {
                io.to(hostMember.socketId).emit('request-sync', { requesterId: socket.id });
            }
        }
    });

    // 离开房间
    socket.on('leave-room', async ({ roomCode, userId }) => {
        await handleLeave(roomCode, userId, socket);
    });

    // 断开连接
    socket.on('disconnect', async () => {
        // 找到该 socket 所在的房间
        // 这是一个低效的操作，实际中可能将 socketId -> room 映射存入 Redis
        // 这里简单遍历（假设 scale 不大）或者客户端显式 leave
        // 为了健壮性，我们应该在 socket 对象上存储 roomCode
        // 但 socket.io 的 rooms 包含所有房间
        // socket.rooms 是 Set
        // 我们可以遍历所有房间键并在 Redis 中查找 socketId? 太慢。
        // 简化：目前只能依靠客户端显式 leave，或者
        // 实现一个 socketId -> roomCode 的 Map 在内存中?
        // 或者是 Redis。
        // 更好的方式：join 时 socket.data.roomCode = roomCode
    });

    // 收到同步数据（Host 发送）
    socket.on('sync-video', async ({ roomCode, state }) => {
        // 更新 Redis
        const roomStateJson = await redis.get(getKey.room(roomCode));
        if (roomStateJson) {
            const current = JSON.parse(roomStateJson);
            const newState = { ...current, ...state, lastUpdate: Date.now() };
            await redis.set(getKey.room(roomCode), JSON.stringify(newState));

            // 广播给房间内所有人（除了发送者? 或者所有人）
            // 广播给房间内所有人（包括发送者，这样Host也能收到状态更新从而切换界面）
            io.to(roomCode).emit('sync-video', newState);
        }
    });

    // 特定用户请求 Host 同步的回应
    socket.on('respond-sync', ({ requesterId, state }) => {
        io.to(requesterId).emit('sync-video', state);
    });

    // Helper: 处理离开
    async function handleLeave(roomCode: string, userId: number, socket: any) {
        socket.leave(roomCode);

        const membersJson = await redis.lrange(getKey.members(roomCode), 0, -1);
        let members: User[] = membersJson.map(m => JSON.parse(m));

        const index = members.findIndex(m => m.id === userId);
        if (index !== -1) {
            // 从 Redis 移除
            // lrem 只能按值移除，由于 socketId 可能变，我们最好重写 list
            // 简单点：filter 后 delete key 再 rpush 所有（并发不安全，但简单）
            // 或者用 lrem 如果保证 JSON 字符串完全一致
            // 这里我们用 filter + 重写
            members = members.filter(m => m.id !== userId);
            await redis.del(getKey.members(roomCode));
            if (members.length > 0) {
                const pipeline = redis.pipeline();
                members.forEach(m => pipeline.rpush(getKey.members(roomCode), JSON.stringify(m)));
                await pipeline.exec();
            }
        }

        if (members.length === 0) {
            // 房间空了，删除
            await redis.del(getKey.room(roomCode));
        } else {
            // 检查 Host
            const roomStateJson = await redis.get(getKey.room(roomCode));
            if (roomStateJson) {
                let roomState = JSON.parse(roomStateJson);
                if (roomState.hostId === userId) {
                    // Host 离开了，移交给下一个人 (members[0])
                    roomState.hostId = members[0].id;
                    await redis.set(getKey.room(roomCode), JSON.stringify(roomState));
                    io.to(roomCode).emit('system-message', `房主已离开，${members[0].username} 成为新房主`);
                }

                // 广播更新
                io.to(roomCode).emit('room-update', {
                    members: members,
                    hostId: roomState.hostId,
                    roomState: roomState
                });
            }
        }
    }
});

httpServer.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
});
