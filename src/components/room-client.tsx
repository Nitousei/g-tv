'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoPlayer } from '@/components/video-player';
import { VideoSelector } from '@/components/video-selector';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Play, LogOut, Film } from 'lucide-react';
import { toast } from 'sonner';
import Player from 'xgplayer';

interface User {
    id: number;
    username: string;
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

interface Episode {
    name: string;
    url: string;
    index: number;
}

interface RoomClientProps {
    roomCode: string;
    currentUser: { id: number; username: string };
}

export function RoomClient({ roomCode, currentUser }: RoomClientProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [followHost, setFollowHost] = useState(true);
    const [player, setPlayer] = useState<Player | null>(null);
    const playerRef = useRef<Player | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const lastSyncTime = useRef(0);

    const isHost = roomState?.hostId === currentUser.id;
    const isCreate = searchParams.get('create') === 'true';

    // 解析播放地址
    const getPlayUrl = (video: any, epIndex: number = 0) => {
        if (!video || !video.vod_play_url) return '';
        const sources = video.vod_play_url.split('$$$');
        // 取第一个播放源
        const eps = sources[0].split('#');
        if (epIndex >= eps.length) return '';
        const parts = eps[epIndex].split('$');
        return parts[1] || parts[0];
    };

    // 获取选集列表
    const getEpisodeList = (video: any): Episode[] => {
        if (!video || !video.vod_play_url) return [];
        const sources = video.vod_play_url.split('$$$');
        const eps = sources[0].split('#');
        return eps.map((ep: string, index: number) => {
            const parts = ep.split('$');
            return {
                name: parts[0],
                url: parts[1] || parts[0],
                index
            };
        });
    };

    // 初始化 Socket
    useEffect(() => {
        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            newSocket.emit('join-room', {
                roomCode,
                user: { id: currentUser.id, name: currentUser.username },
                create: isCreate
            });
        });

        newSocket.on('error', (msg: string) => {
            toast.error("加入失败", {
                description: msg
            });
            // 延迟跳转回大厅
            setTimeout(() => {
                router.push('/zh/room');
            }, 2000);
        });

        newSocket.on('room-update', (data: { members: User[], roomState: RoomState }) => {
            setMembers(data.members);
            setRoomState(data.roomState);
        });

        newSocket.on('request-sync', ({ requesterId }) => {
            if (playerRef.current) {
                newSocket.emit('respond-sync', {
                    requesterId,
                    state: {
                        currentTime: playerRef.current.currentTime,
                        isPlaying: !playerRef.current.paused,
                        currentVideo: roomState?.currentVideo // Ensure video is sent
                    }
                });
            }
        });

        newSocket.on('sync-video', (state: RoomState) => {
            setRoomState(prev => (prev ? { ...prev, ...state } : state));
        });

        newSocket.on('system-message', (msg: string) => {
            toast(msg);
        });

        return () => {
            newSocket.emit('leave-room', { roomCode, userId: currentUser.id });
            newSocket.disconnect();
        };
    }, [roomCode, currentUser, isCreate, router]); // Remove toast from dependency

    // 视频同步逻辑 (接收端)
    useEffect(() => {
        if (!player || !roomState || isHost || !followHost) return;

        const { isPlaying, currentTime } = roomState;
        const targetTime = currentTime;

        // 状态同步
        if (Math.abs(player.currentTime - targetTime) > 2) {
            console.log('Sync seeking to', targetTime);
            player.seek(targetTime);
        }

        if (isPlaying && player.paused) {
            player.play();
        } else if (!isPlaying && !player.paused) {
            player.pause();
        }
    }, [roomState, player, isHost, followHost]);

    // 播放器事件监听 (发送端 - Host)
    useEffect(() => {
        if (!player || !socket || !isHost) return;

        const handleUpdate = () => {
            const now = Date.now();
            if (now - lastSyncTime.current > 1000) {
                socket.emit('sync-video', {
                    roomCode,
                    state: {
                        currentTime: player.currentTime,
                        isPlaying: !player.paused
                    }
                });
                lastSyncTime.current = now;
            }
        };

        const handleStateChange = () => {
            socket.emit('sync-video', {
                roomCode,
                state: {
                    currentTime: player.currentTime,
                    isPlaying: !player.paused
                }
            });
        };

        player.on('timeupdate', handleUpdate);
        player.on('play', handleStateChange);
        player.on('pause', handleStateChange);
        player.on('seeking', handleStateChange);

        return () => {
            player.off('timeupdate', handleUpdate);
            player.off('play', handleStateChange);
            player.off('pause', handleStateChange);
            player.off('seeking', handleStateChange);
        };
    }, [player, socket, isHost, roomCode]);

    // 选择视频
    const handleSelectVideo = (video: any) => {
        if (!socket) return;
        socket.emit('sync-video', {
            roomCode,
            state: {
                currentVideo: video,
                currentEpisodeIndex: 0,
                currentTime: 0,
                isPlaying: true
            }
        });
    };

    return (
        <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" /> 房间: {roomCode}
                </h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="sync-mode">跟随进度</Label>
                        <Switch
                            id="sync-mode"
                            checked={followHost}
                            onCheckedChange={setFollowHost}
                            disabled={isHost}
                        />
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => router.push('/zh/room')}>
                        <LogOut className="w-4 h-4 mr-2" /> 退出
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                    {roomState?.currentVideo ? (
                        <div className="space-y-4">
                            <div className="overflow-visible rounded-lg border bg-black aspect-video">
                                <VideoPlayer
                                    url={getPlayUrl(roomState.currentVideo, roomState.currentEpisodeIndex)}
                                    poster={roomState.currentVideo.vod_pic}
                                    onInit={(p) => {
                                        setPlayer(p);
                                        playerRef.current = p;
                                    }}
                                />
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold">{roomState.currentVideo.vod_name}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        正在播放: {getEpisodeList(roomState.currentVideo)[roomState.currentEpisodeIndex]?.name || '第 1 集'}
                                    </p>
                                </div>
                                {isHost && (
                                    <div className="max-w-[200px]">
                                        <ClientVideoSelector onSelect={handleSelectVideo} />
                                    </div>
                                )}
                            </div>

                            {/* Episode List */}
                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm font-medium">选集</CardTitle>
                                </CardHeader>
                                <CardContent className="py-3 max-h-[300px] overflow-y-auto">
                                    <div className="flex flex-wrap gap-2">
                                        {getEpisodeList(roomState.currentVideo).map((ep: Episode) => (
                                            <Button
                                                key={ep.index}
                                                variant={roomState.currentEpisodeIndex === ep.index ? "default" : "outline"}
                                                size="sm"
                                                className="min-w-[60px]"
                                                onClick={() => {
                                                    if (!isHost || !socket) return;
                                                    socket.emit('sync-video', {
                                                        roomCode,
                                                        state: {
                                                            currentEpisodeIndex: ep.index,
                                                            currentTime: 0,
                                                            isPlaying: true
                                                        }
                                                    });
                                                }}
                                                disabled={!isHost}
                                            >
                                                {ep.name}
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="aspect-video bg-muted flex flex-col items-center justify-center rounded-lg border-2 border-dashed">
                                <Film className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                                <p className="text-muted-foreground">等待房主选择影片...</p>
                            </div>
                            {isHost && (
                                <ClientVideoSelector onSelect={handleSelectVideo} />
                            )}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 xl:col-span-3 space-y-4 sm:space-y-6">
                    <Card className="h-fit">
                        <CardHeader className="py-3 sm:py-4">
                            <CardTitle className="text-base sm:text-lg">在线成员 ({members.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
                            <ul className="space-y-2">
                                {members.map(user => (
                                    <li key={user.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                {user.username.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="truncate font-medium">{user.username}</span>
                                        </div>
                                        {roomState?.hostId === user.id && (
                                            <Badge variant="secondary" className="scale-90 flex-shrink-0">房主</Badge>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ClientVideoSelector({ onSelect }: { onSelect: (v: any) => void }) {
    return (
        <VideoSelector
            onSelect={onSelect}
            trigger={
                <Button className="w-full">
                    <Play className="w-4 h-4 mr-2" /> 选择/切换影片
                </Button>
            }
        />
    )
}
