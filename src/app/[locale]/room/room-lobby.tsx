'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Plus, LogIn } from 'lucide-react';
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
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <div className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                            <Users className="h-6 w-6" />
                            {t('title') || '一同观看'}
                        </CardTitle>
                        <CardDescription>
                            {t('desc') || '创建或加入房间，与好友同步观看影片'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex space-x-2">
                                <Input
                                    placeholder={t('enterCode') || '输入4位房间号'}
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    className="text-center text-lg tracking-widest h-12"
                                    maxLength={4}
                                />
                                <Button
                                    onClick={handleJoinRoom}
                                    disabled={roomCode.length !== 4 || isJoining}
                                    className="h-12 px-6"
                                >
                                    <LogIn className="h-4 w-4 mr-2" />
                                    {t('join') || '加入'}
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    {t('or') || '或者'}
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full py-6"
                            onClick={handleCreateRoom}
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            {t('create') || '创建新房间'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
