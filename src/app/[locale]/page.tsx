"use client"

import { useState, useEffect } from 'react';
import { TypeAnimation } from 'react-type-animation';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { LoginDialog } from '@/components/login-dialog';
import { io, Socket } from 'socket.io-client';
import { Users, Play, MonitorPlay } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RoomInfo {
  roomCode: string;
  hostName: string;
  memberCount: number;
  videoName: string;
  isPlaying: boolean;
}

export default function Home() {
  const t = useTranslations('HomePage');
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeRooms, setActiveRooms] = useState<RoomInfo[]>([]);
  const [user, setUser] = useState<{ username: string; nickname?: string; avatar?: string } | null>(null);
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    // Check auth
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && data.user) setUser(data.user);
      })
      .catch(err => console.error(err));

    const socket: Socket = io({
      path: '/socket.io',
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to lobby');
      socket.emit('join-lobby');
    });

    socket.on('online-count', (count: number) => {
      setOnlineCount(count);
    });

    socket.on('lobby-update', (data: { rooms: RoomInfo[], onlineCount: number }) => {
      setActiveRooms(data.rooms);
      setOnlineCount(data.onlineCount);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-20">
        <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">

          {/* Online Count Badge */}
          <div className="inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted/80">
            <Users className="mr-2 h-4 w-4 text-primary" />
            <span className="text-muted-foreground mr-1">当前在线:</span>
            <span className="font-bold text-foreground">{onlineCount}</span>
            <span className="ml-1 text-muted-foreground">人</span>
          </div>

          <TypeAnimation
            sequence={[
              '欢迎来到老乡TV',
              2000,
              '和好友一起看电影',
              2000,
              '海量高清影视资源',
              2000,
              '实时语音 边看边聊',
              2000,
            ]}
            wrapper="h1"
            speed={50}
            style={{ fontSize: '2em', display: 'inline-block' }}
            repeat={Infinity}
            className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-foreground"
          />
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            {t('heroSubtitle')}
          </p>
          <div className="space-x-4">
            {user ? (
              <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-500">
                <div className="flex items-center gap-3 bg-muted/50 pl-2 pr-6 py-2 rounded-full border border-border">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/20">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-primary">{user.nickname?.[0] || user.username[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground">欢迎回来</span>
                    <span className="font-semibold">{user.nickname || user.username}</span>
                  </div>
                </div>
              </div>
            ) : (
              <LoginDialog />
            )}
          </div>
        </div>
      </section>

      {/* Active Rooms Section */}
      <section className="py-8 md:py-12 lg:py-24">
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <MonitorPlay className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">正在放映</h2>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground hidden sm:block">
                {activeRooms.length} 个房间正在观看
              </p>
              <Button variant="ghost" className="text-sm text-primary hover:text-primary/80" onClick={() => router.push(`/${locale}/room`)}>
                查看全部 &rarr;
              </Button>
            </div>
          </div>

          {activeRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Play className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">暂无活跃房间</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                当前没有人在放映厅。您可以创建一个房间，邀请朋友一起来看！
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeRooms
                .sort((a, b) => b.memberCount - a.memberCount)
                .slice(0, 6)
                .map((room) => (
                  <Card
                    key={room.roomCode}
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
                ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
