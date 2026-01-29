'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Plus, LogIn, Loader2, Square } from 'lucide-react';
import Header from '@/components/header';
import { toast } from 'sonner';

export function RoomLobby() {
    const t = useTranslations('Room');
    const locale = useLocale();
    const router = useRouter();
    const [roomCode, setRoomCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

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
            <Header />
            <div className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center relative">
                <Card className="w-full max-w-md bg-card border border-border">
                    <CardHeader className="text-center pt-8 pb-2">
                        <div className="mx-auto w-12 h-12 bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight text-card-foreground">
                            {t('title') || '一同观看'}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-1">
                            {t('desc') || '创建或加入房间，与好友同步观看影片'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder={t('enterCode') || '输入4位房间号'}
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        className="text-center text-lg font-mono tracking-widest h-11 bg-background border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                        maxLength={4}
                                    />
                                </div>
                                <Button
                                    onClick={handleJoinRoom}
                                    disabled={roomCode.length !== 4 || isJoining}
                                    className="h-11 px-6 font-medium shadow-none hover:opacity-90 transition-all flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    {isJoining ? <Square className="animate-spin h-4 w-4" /> : (
                                        <>
                                            <LogIn className="h-4 w-4 mr-2" />
                                            {t('join') || '加入'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                                <span className="bg-card px-3 text-muted-foreground">
                                    {t('or') || '或者'}
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full h-11 border-border hover:bg-muted/50 hover:border-primary/50 transition-all text-sm font-medium text-muted-foreground hover:text-primary"
                            onClick={handleCreateRoom}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('create') || '创建新房间'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
