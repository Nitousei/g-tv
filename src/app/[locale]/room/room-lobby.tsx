'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, LogIn, Loader2, Square, Play, MonitorPlay } from 'lucide-react';
import Header from '@/components/header';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface RoomInfo {
    roomCode: string;
    hostName: string;
    memberCount: number;
    videoName: string;
    isPlaying: boolean;
}

export function RoomLobby() {
    const t = useTranslations('Room');
    const locale = useLocale();
    const router = useRouter();
    const [roomCode, setRoomCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

    // Room List State
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);

    // Infinite Scroll Observer
    const observer = useRef<IntersectionObserver | null>(null);
    const lastRoomElementRef = useCallback((node: HTMLDivElement) => {
        if (isLoadingRooms) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoadingRooms, hasMore]);


    const fetchRooms = async (pageNum: number) => {
        setIsLoadingRooms(true);
        try {
            const res = await fetch(`/api/room/list?page=${pageNum}&limit=12`);
            if (res.ok) {
                const data = await res.json();
                setRooms(prev => pageNum === 1 ? data.rooms : [...prev, ...data.rooms]);
                setHasMore(data.hasMore);
            }
        } catch (error) {
            console.error("Failed to fetch rooms", error);
        } finally {
            setIsLoadingRooms(false);
        }
    };

    useEffect(() => {
        fetchRooms(page);
    }, [page]);

    // Pull to refresh (reload first page)
    const handleRefresh = () => {
        setPage(1);
        fetchRooms(1);
    };

    const handleCreateRoom = () => {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        router.push(`/${locale}/room/${code}?create=true`);
    };

    const handleJoinRoom = async () => {
        if (roomCode.length !== 4) return;
        setIsJoining(true);

        try {
            const res = await fetch(`/api/room/check?code=${roomCode}`);
            const data = await res.json();

            if (data.exists) {
                router.push(`/${locale}/room/${roomCode}`);
                setIsJoinDialogOpen(false); // Close dialog on successful join
            } else {
                toast.error('加入失败', {
                    description: '房间不存在'
                });
                setIsJoining(false);
            }
        } catch (e) {
            toast.error('网络错误，请重试');
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-background bg-grid flex flex-col font-sans text-foreground">
            <div className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center">

                {/* Room List Section */}
                <div className="w-full max-w-7xl px-4 md:px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                        <div className="flex flex-col items-start gap-2">
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                放映大厅
                            </h2>
                            <p className="text-muted-foreground">
                                发现正在放映的房间，或创建属于你的私人影院
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Button variant="outline" onClick={handleRefresh} disabled={isLoadingRooms} className="gap-2">
                                <Play className="h-4 w-4 rotate-90" /> 刷新
                            </Button>

                            <div className="h-6 w-px bg-border mx-2 hidden md:block" />

                            {/* Create Room */}
                            <Button onClick={handleCreateRoom} className="gap-2 shadow-lg shadow-primary/20 flex-1 md:flex-none">
                                <Plus className="h-4 w-4" />
                                创建房间
                            </Button>

                            {/* Join Room Dialog */}
                            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" className="gap-2 flex-1 md:flex-none">
                                        <LogIn className="h-4 w-4" />
                                        加入房间
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>加入放映厅</DialogTitle>
                                        <DialogDescription>
                                            请输入4位数字房间号加入朋友的房间
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-6 flex justify-center">
                                        <div className="relative">
                                            <Input
                                                placeholder="0000"
                                                value={roomCode}
                                                onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                className="text-center text-4xl font-mono tracking-[1em] h-20 w-64 bg-muted/50 border-2 border-primary/20 focus:border-primary focus:ring-0 rounded-xl transition-all"
                                                maxLength={4}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <Button variant="ghost" onClick={() => setIsJoinDialogOpen(false)}>取消</Button>
                                        <Button onClick={handleJoinRoom} disabled={roomCode.length !== 4 || isJoining} className="min-w-[80px]">
                                            {isJoining ? <Loader2 className="animate-spin h-4 w-4" /> : "进入房间"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {rooms.map((room, index) => (
                            <div
                                key={room.roomCode}
                                ref={rooms.length === index + 1 ? lastRoomElementRef : undefined}
                            >
                                <RoomCard room={room} locale={locale} router={router} />
                            </div>
                        ))}
                    </div>

                    {isLoadingRooms && (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    )}

                    {!isLoadingRooms && rooms.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted-foreground/25 p-16 text-center bg-muted/5">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-6 group-hover:scale-110 transition-transform">
                                <MonitorPlay className="h-12 w-12 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">暂无活跃房间</h3>
                            <p className="text-muted-foreground max-w-md mb-8">
                                现在大厅空空如也，正好是您展示品味的好机会。创建一个房间，邀请朋友一起来看！
                            </p>
                            <Button onClick={handleCreateRoom} size="lg" className="shadow-xl shadow-primary/20">
                                <Plus className="h-5 w-5 mr-2" />
                                创建第一个房间
                            </Button>
                        </div>
                    )}

                    {!hasMore && rooms.length > 0 && (
                        <div className="text-center py-12">
                            <span className="text-sm text-muted-foreground bg-muted px-4 py-1 rounded-full">
                                到底啦，没有更多房间了
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RoomCard({ room, locale, router }: { room: RoomInfo, locale: string, router: any }) {
    return (
        <Card
            className="group relative overflow-hidden border-muted/60 bg-gradient-to-br from-background via-muted/20 to-muted/40 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer"
            onClick={() => router.push(`/${locale}/room/${room.roomCode}`)}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <CardHeader className="pb-3 relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <Badge
                        variant={room.isPlaying ? "default" : "secondary"}
                        className={`uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 ${room.isPlaying ? 'shadow-[0_0_10px_rgba(var(--primary),0.5)]' : ''}`}
                    >
                        {room.isPlaying ? "PLAYING" : "WAITING"}
                    </Badge>
                    <div className="flex items-start gap-1 text-xs font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded-md backdrop-blur-sm">
                        <span className="text-primary">#</span>{room.roomCode}
                    </div>
                </div>
                <CardTitle className="text-lg leading-tight line-clamp-2 h-14 flex items-center text-balance">
                    {room.videoName}
                </CardTitle>
            </CardHeader>

            <CardContent className="relative z-10">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {room.hostName.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[80px]">{room.hostName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full">
                        <Users className="h-3 w-3" />
                        <span className="font-medium text-foreground">{room.memberCount}</span>
                    </div>
                </div>

                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <Button className="w-full h-8 text-xs bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20">
                        点击加入
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
