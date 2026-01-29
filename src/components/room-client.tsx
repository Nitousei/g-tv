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
            setRoomState(prev => {
                if (state.currentVideo && prev?.currentVideo?.vod_id !== state.currentVideo.vod_id) {
                    toast.info(`房主切换了视频: ${state.currentVideo.vod_name}`);
                }
                return prev ? { ...prev, ...state } : state;
            });
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

        // 乐观更新：本地立即更新状态，不必等待服务器广播
        // 这样可以解决服务器广播可能有延迟，或者广播机制有问题导致房主收不到更新的问题
        setRoomState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentVideo: video,
                currentEpisodeIndex: 0,
                currentTime: 0,
                isPlaying: true,
                lastUpdate: Date.now()
            }
        });

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
        <div className="min-h-screen bg-background bg-grid font-sans text-foreground pb-20">
            <div className="container mx-auto p-4 lg:p-6 space-y-6">
                {/* Top Status Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-muted px-3 py-1.5 flex items-center gap-2 border border-border">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Room Code</span>
                            <span className="text-lg font-mono font-bold text-primary tracking-widest">{roomCode}</span>
                        </div>
                        <Badge variant="outline" className={`h-8 px-3 ${socket?.connected ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-red-500/10 text-red-600 border-red-200'}`}>
                            {socket?.connected ? 'LIVE' : 'OFFLINE'}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 border border-primary/20">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-card-foreground">
                                {isHost ? '我是房主' : '跟随观看'}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {isHost ? '控制播放进度' : '同步房主画面'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto sm:ml-0">
                        {!isHost && (
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 border border-border">
                                <Switch
                                    id="follow-mode"
                                    checked={followHost}
                                    onCheckedChange={setFollowHost}
                                />
                                <Label htmlFor="follow-mode" className="text-xs font-medium cursor-pointer text-muted-foreground">
                                    {followHost ? '已同步' : '暂停同步'}
                                </Label>
                            </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => router.push('/zh/room')} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Area: Player & Episodes */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                        {roomState?.currentVideo ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Player Container */}
                                <div className="group relative overflow-hidden border border-border bg-black aspect-video ring-4 ring-card-foreground/5">
                                    <VideoPlayer
                                        key={roomState.currentVideo?.vod_id}
                                        url={getPlayUrl(roomState.currentVideo, roomState.currentEpisodeIndex)}
                                        poster={roomState.currentVideo.vod_pic}
                                        onInit={(p) => {
                                            setPlayer(p);
                                            playerRef.current = p;
                                        }}
                                    />
                                </div>

                                {/* Video Info & Selector */}
                                <div className="flex flex-col md:flex-row justify-between items-start gap-6 bg-card p-5 border border-border">
                                    <div>
                                        <h1 className="text-2xl font-bold tracking-tight text-card-foreground mb-2">
                                            {roomState.currentVideo.vod_name}
                                        </h1>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="font-mono">
                                                EP {roomState.currentEpisodeIndex + 1}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {roomState.currentVideo.type_name}
                                            </span>
                                        </div>
                                    </div>

                                    {isHost && (
                                        <div className="w-full md:w-[200px]">
                                            <ClientVideoSelector onSelect={handleSelectVideo} />
                                        </div>
                                    )}
                                </div>

                                {/* Episode List */}
                                <Card className="border border-border bg-card">
                                    <CardHeader className="pb-3 border-b border-border bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Film className="h-4 w-4 text-primary" />
                                                <CardTitle className="text-base font-bold text-card-foreground">选集播放</CardTitle>
                                            </div>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                Total {getEpisodeList(roomState.currentVideo)?.length || 0}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6 max-h-[300px] overflow-y-auto scrollbar-hide">
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
                                            {getEpisodeList(roomState.currentVideo).map((ep: Episode, index: number) => (
                                                <Button
                                                    key={index}
                                                    variant={roomState.currentEpisodeIndex === index ? "default" : "outline"}
                                                    size="sm"
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
                                                    className={`w-full font-mono text-xs transition-all ${roomState.currentEpisodeIndex === index
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                                                        }`}
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
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                <div className="aspect-video bg-card border border-border flex flex-col items-center justify-center relative p-8 text-center pattern-grid-lg">
                                    <div className="w-20 h-20 bg-muted/50 flex items-center justify-center mb-6 border border-border">
                                        <Film className="h-10 w-10 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-xl font-bold text-card-foreground mb-2">等待播放内容</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                                        {isHost ? '请使用上方搜索栏查找影片，或直接粘贴视频链接开始' : '房主尚未选择播放内容，请稍候...'}
                                    </p>
                                    {isHost && (
                                        <div className="flex justify-center">
                                            <div className="w-full max-w-sm">
                                                <ClientVideoSelector onSelect={handleSelectVideo} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar: Members */}
                    <div className="lg:col-span-4 xl:col-span-3">
                        <Card className="h-full border border-border bg-card sticky top-8 flex flex-col">
                            <CardHeader className="py-4 border-b border-border bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-card-foreground">
                                        <Users className="h-4 w-4 text-primary" />
                                        在线成员
                                    </CardTitle>
                                    <Badge variant="secondary" className="bg-background border-border text-muted-foreground font-mono text-xs">
                                        {members.length}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
                                <div className="divide-y divide-border">
                                    {members.map((member) => (
                                        <div key={member.id} className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                                            <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold border ${roomState?.hostId === member.id ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                                {member.username.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium truncate text-card-foreground">
                                                        {member.username} {member.id === currentUser.id && '(我)'}
                                                    </p>
                                                    {roomState?.hostId === member.id && (
                                                        <Badge variant="outline" className="text-[10px] px-1 h-4 border-primary/30 text-primary">HOST</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
                                                    <p className="text-xs text-muted-foreground">Watching</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <div className="p-3 border-t border-border bg-muted/30 text-center">
                                <p className="text-[10px] text-muted-foreground font-mono">SYNC STATUS: STABLE</p>
                            </div>
                        </Card>
                    </div>
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
