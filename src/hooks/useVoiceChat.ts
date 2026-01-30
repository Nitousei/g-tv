'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface VoicePeer {
    id: number;
    username: string;
    socketId: string;
    connection: RTCPeerConnection;
    audioElement?: HTMLAudioElement;
    isMuted: boolean;
    volume: number;
}

interface VoiceState {
    isVoiceEnabled: boolean;
    isMicMuted: boolean;
    voiceMembers: Map<string, { id: number; username: string; isMuted: boolean }>;
}

interface UseVoiceChatProps {
    socket: Socket | null;
    roomCode: string;
    currentUser: { id: number; username: string };
}

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export function useVoiceChat({ socket, roomCode, currentUser }: UseVoiceChatProps) {
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [voiceMembers, setVoiceMembers] = useState<Map<string, { id: number; username: string; isMuted: boolean }>>(new Map());

    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Map<string, VoicePeer>>(new Map());
    const audioContainerRef = useRef<HTMLDivElement | null>(null);

    // 创建音频容器
    useEffect(() => {
        if (typeof window !== 'undefined' && !audioContainerRef.current) {
            const container = document.createElement('div');
            container.id = 'voice-audio-container';
            container.style.display = 'none';
            document.body.appendChild(container);
            audioContainerRef.current = container;
        }
        return () => {
            if (audioContainerRef.current) {
                audioContainerRef.current.remove();
            }
        };
    }, []);

    // 创建 PeerConnection
    const createPeerConnection = useCallback((targetSocketId: string, targetUserId: number, targetUsername: string) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // 添加本地音频轨道
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // 处理 ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('voice-ice-candidate', {
                    roomCode,
                    targetSocketId,
                    candidate: event.candidate,
                });
            }
        };

        // 处理远程音频流
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            audio.id = `audio-${targetSocketId}`;

            // 默认音量
            audio.volume = 1.0;

            if (audioContainerRef.current) {
                audioContainerRef.current.appendChild(audio);
            }

            // 更新 peer 引用
            const peer = peersRef.current.get(targetSocketId);
            if (peer) {
                peer.audioElement = audio;
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[Voice] Connection state with ${targetUsername}: ${pc.connectionState}`);
        };

        const peer: VoicePeer = {
            id: targetUserId,
            username: targetUsername,
            socketId: targetSocketId,
            connection: pc,
            isMuted: false,
            volume: 1.0,
        };

        peersRef.current.set(targetSocketId, peer);
        return pc;
    }, [socket, roomCode]);

    // 加入语音
    const joinVoice = useCallback(async () => {
        if (!socket) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            setIsVoiceEnabled(true);

            // 通知服务器加入语音
            socket.emit('voice-join', {
                roomCode,
                user: { id: currentUser.id, username: currentUser.username },
            });

            console.log('[Voice] Joined voice channel');
        } catch (error: any) {
            console.error('[Voice] Failed to get microphone:', error);

            // 根据错误类型提供更友好的提示
            let message = '无法获取麦克风';
            if (error.name === 'NotFoundError') {
                message = '未找到麦克风设备，请连接麦克风后重试';
            } else if (error.name === 'NotAllowedError') {
                message = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风';
            } else if (error.name === 'NotReadableError') {
                message = '麦克风被其他应用占用';
            }

            throw new Error(message);
        }
    }, [socket, roomCode, currentUser]);

    // 离开语音
    const leaveVoice = useCallback(() => {
        if (!socket) return;

        // 停止本地音频
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // 关闭所有连接
        peersRef.current.forEach((peer) => {
            peer.connection.close();
            if (peer.audioElement) {
                peer.audioElement.remove();
            }
        });
        peersRef.current.clear();

        setIsVoiceEnabled(false);
        socket.emit('voice-leave', { roomCode, userId: currentUser.id });

        console.log('[Voice] Left voice channel');
    }, [socket, roomCode, currentUser]);

    // 切换麦克风静音
    const toggleMic = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicMuted(!audioTrack.enabled);

                // 广播静音状态
                socket?.emit('voice-mute', {
                    roomCode,
                    userId: currentUser.id,
                    isMuted: !audioTrack.enabled,
                });
            }
        }
    }, [socket, roomCode, currentUser]);

    // 静音/取消静音其他成员
    const muteUser = useCallback((socketId: string, muted: boolean) => {
        const peer = peersRef.current.get(socketId);
        if (peer?.audioElement) {
            peer.audioElement.muted = muted;
            peer.isMuted = muted;
            // 更新 peers map 触发重渲染
            peersRef.current.set(socketId, { ...peer });
        }
    }, []);

    // 设置用户音量
    const setUserVolume = useCallback((socketId: string, volume: number) => {
        const peer = peersRef.current.get(socketId);
        if (peer?.audioElement) {
            peer.audioElement.volume = Math.max(0, Math.min(1, volume));
            peer.volume = volume;
        }
    }, []);

    // Socket 事件处理
    useEffect(() => {
        if (!socket) return;

        // 新成员加入语音 - 作为接收方
        socket.on('voice-user-joined', async ({ user, socketId }: { user: { id: number; username: string }, socketId: string }) => {
            console.log('[Voice] User joined:', user.username);

            // 更新语音成员列表
            setVoiceMembers(prev => {
                const newMap = new Map(prev);
                newMap.set(socketId, { ...user, isMuted: false });
                return newMap;
            });

            // 如果我们已经在语音中，创建连接并发送 offer
            if (isVoiceEnabled && localStreamRef.current) {
                const pc = createPeerConnection(socketId, user.id, user.username);

                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    socket.emit('voice-offer', {
                        roomCode,
                        targetSocketId: socketId,
                        offer,
                        from: { id: currentUser.id, username: currentUser.username },
                    });
                } catch (error) {
                    console.error('[Voice] Failed to create offer:', error);
                }
            }
        });

        // 收到 offer
        socket.on('voice-offer', async ({ offer, fromSocketId, from }: { offer: RTCSessionDescriptionInit, fromSocketId: string, from: { id: number; username: string } }) => {
            console.log('[Voice] Received offer from:', from.username);

            if (!isVoiceEnabled) return;

            const pc = createPeerConnection(fromSocketId, from.id, from.username);

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('voice-answer', {
                    roomCode,
                    targetSocketId: fromSocketId,
                    answer,
                });
            } catch (error) {
                console.error('[Voice] Failed to handle offer:', error);
            }
        });

        // 收到 answer
        socket.on('voice-answer', async ({ answer, fromSocketId }: { answer: RTCSessionDescriptionInit, fromSocketId: string }) => {
            console.log('[Voice] Received answer from:', fromSocketId);

            const peer = peersRef.current.get(fromSocketId);
            if (peer) {
                try {
                    await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (error) {
                    console.error('[Voice] Failed to set remote description:', error);
                }
            }
        });

        // 收到 ICE candidate
        socket.on('voice-ice-candidate', async ({ candidate, fromSocketId }: { candidate: RTCIceCandidateInit, fromSocketId: string }) => {
            const peer = peersRef.current.get(fromSocketId);
            if (peer) {
                try {
                    await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (error) {
                    console.error('[Voice] Failed to add ICE candidate:', error);
                }
            }
        });

        // 用户离开语音
        socket.on('voice-user-left', ({ socketId }: { socketId: string }) => {
            console.log('[Voice] User left:', socketId);

            setVoiceMembers(prev => {
                const newMap = new Map(prev);
                newMap.delete(socketId);
                return newMap;
            });

            const peer = peersRef.current.get(socketId);
            if (peer) {
                peer.connection.close();
                if (peer.audioElement) {
                    peer.audioElement.remove();
                }
                peersRef.current.delete(socketId);
            }
        });

        // 用户静音状态变化
        socket.on('voice-mute-changed', ({ socketId, isMuted }: { socketId: string, isMuted: boolean }) => {
            setVoiceMembers(prev => {
                const newMap = new Map(prev);
                const member = newMap.get(socketId);
                if (member) {
                    newMap.set(socketId, { ...member, isMuted });
                }
                return newMap;
            });
        });

        // 获取当前语音成员列表
        socket.on('voice-members', ({ members }: { members: Array<{ socketId: string; user: { id: number; username: string }; isMuted: boolean }> }) => {
            const newMap = new Map<string, { id: number; username: string; isMuted: boolean }>();
            members.forEach(m => {
                newMap.set(m.socketId, { id: m.user.id, username: m.user.username, isMuted: m.isMuted });
            });
            setVoiceMembers(newMap);
        });

        return () => {
            socket.off('voice-user-joined');
            socket.off('voice-offer');
            socket.off('voice-answer');
            socket.off('voice-ice-candidate');
            socket.off('voice-user-left');
            socket.off('voice-mute-changed');
            socket.off('voice-members');
        };
    }, [socket, isVoiceEnabled, createPeerConnection, roomCode, currentUser]);

    // 清理
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            peersRef.current.forEach((peer) => {
                peer.connection.close();
            });
        };
    }, []);

    return {
        isVoiceEnabled,
        isMicMuted,
        voiceMembers,
        joinVoice,
        leaveVoice,
        toggleMic,
        muteUser,
        setUserVolume,
        peers: peersRef.current,
    };
}
