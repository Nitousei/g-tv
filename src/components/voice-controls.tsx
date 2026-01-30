'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Settings2 } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface VoiceControlsProps {
    isVoiceEnabled: boolean;
    isMicMuted: boolean;
    onJoinVoice: () => Promise<void>;
    onLeaveVoice: () => void;
    onToggleMic: () => void;
}

export function VoiceControls({
    isVoiceEnabled,
    isMicMuted,
    onJoinVoice,
    onLeaveVoice,
    onToggleMic,
}: VoiceControlsProps) {
    const [isJoining, setIsJoining] = useState(false);

    const handleJoinVoice = async () => {
        setIsJoining(true);
        try {
            await onJoinVoice();
            toast.success('已加入语音');
        } catch (error: any) {
            console.error('Failed to join voice:', error);
            toast.error('加入语音失败', {
                description: error.message || '请检查麦克风权限',
            });
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {isVoiceEnabled ? (
                <>
                    {/* 麦克风控制 */}
                    <Button
                        variant={isMicMuted ? "destructive" : "outline"}
                        size="icon"
                        onClick={onToggleMic}
                        className="h-8 w-8"
                        title={isMicMuted ? "取消静音" : "静音麦克风"}
                    >
                        {isMicMuted ? (
                            <MicOff className="h-4 w-4" />
                        ) : (
                            <Mic className="h-4 w-4" />
                        )}
                    </Button>

                    {/* 挂断 */}
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={onLeaveVoice}
                        className="h-8 w-8"
                        title="退出语音"
                    >
                        <PhoneOff className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleJoinVoice}
                    disabled={isJoining}
                    className="gap-2"
                >
                    <Phone className="h-4 w-4" />
                    {isJoining ? '连接中...' : '加入语音'}
                </Button>
            )}
        </div>
    );
}

interface VoiceMemberIndicatorProps {
    isInVoice: boolean;
    isMuted: boolean;
}

export function VoiceMemberIndicator({ isInVoice, isMuted }: VoiceMemberIndicatorProps) {
    if (!isInVoice) return null;

    return (
        <div className="flex items-center gap-1" title={isMuted ? "已静音" : "语音中"}>
            {isMuted ? (
                <MicOff className="h-3 w-3 text-destructive" />
            ) : (
                <Mic className="h-3 w-3 text-green-500 animate-pulse" />
            )}
        </div>
    );
}

interface MemberVolumeControlProps {
    socketId: string;
    username: string;
    isMuted: boolean;
    volume: number;
    onMuteUser: (socketId: string, muted: boolean) => void;
    onSetVolume: (socketId: string, volume: number) => void;
}

export function MemberVolumeControl({
    socketId,
    username,
    isMuted,
    volume,
    onMuteUser,
    onSetVolume,
}: MemberVolumeControlProps) {
    const [localVolume, setLocalVolume] = useState(volume * 100);
    const [localMuted, setLocalMuted] = useState(isMuted);

    const handleMute = () => {
        const newMuted = !localMuted;
        setLocalMuted(newMuted);
        onMuteUser(socketId, newMuted);
    };

    const handleVolumeChange = (val: number) => {
        setLocalVolume(val);
        onSetVolume(socketId, val / 100);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-muted"
                    title={`${username} 的语音设置`}
                >
                    {localMuted ? (
                        <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end" side="left">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{username}</span>
                        </div>
                        <Button
                            variant={localMuted ? "destructive" : "ghost"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleMute}
                            title={localMuted ? "取消静音" : "静音"}
                        >
                            {localMuted ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>音量</span>
                            <span className="font-mono">{Math.round(localVolume)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={localVolume}
                            onChange={(e) => handleVolumeChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
                            disabled={localMuted}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>0%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
