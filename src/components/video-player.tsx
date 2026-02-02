"use client"

import { useEffect, useRef, useState } from 'react'

interface VideoPlayerProps {
    url: string
    poster?: string
    title?: string
    startTime?: number
    onInit?: (player: any) => void
    onProgress?: (state: { playedSeconds: number, loadedSeconds: number, totalSeconds: number }) => void
}

export function VideoPlayer({ url, poster, title, startTime, onInit, onProgress }: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (!isClient || !containerRef.current || !url) return

        const initPlayer = async () => {
            // 动态导入 DPlayer 和 Hls，只在客户端执行
            const [DPlayerModule, HlsModule] = await Promise.all([
                import('dplayer'),
                import('hls.js')
            ])
            const DPlayer = DPlayerModule.default
            const Hls = HlsModule.default

            // 清理旧的播放器实例
            if (playerRef.current) {
                playerRef.current.destroy()
                playerRef.current = null
            }

            // 判断视频类型
            const isHls = url.includes('.m3u8')

            const options: any = {
                container: containerRef.current,
                autoplay: false,
                theme: '#3b82f6', // primary color
                loop: false,
                lang: 'zh-cn',
                screenshot: false,
                hotkey: true,
                preload: 'auto',
                volume: 0.8,
                playbackSpeed: [0.5, 0.75, 1, 1.25, 1.5, 2],
                video: {
                    url: url,
                    pic: poster,
                    type: isHls ? 'customHls' : 'auto',
                    customType: isHls ? {
                        customHls: function (video: HTMLVideoElement, player: any) {
                            const hls = new Hls()
                            hls.loadSource(video.src)
                            hls.attachMedia(video)
                        },
                    } : undefined,
                },
            }

            playerRef.current = new DPlayer(options)

            // Seek to start time if provided
            if (startTime && startTime > 0) {
                playerRef.current.seek(startTime)
            }

            // Bind progress event
            if (onProgress) {
                playerRef.current.on('timeupdate', () => {
                    if (playerRef.current && playerRef.current.video) {
                        const playedSeconds = playerRef.current.video.currentTime;
                        const totalSeconds = playerRef.current.video.duration || 0;
                        // For buffer, DPlayer doesn't expose it directly in event, but HTMLVideoElement does
                        const buffered = playerRef.current.video.buffered;
                        let loadedSeconds = 0;
                        if (buffered.length > 0) {
                            loadedSeconds = buffered.end(buffered.length - 1);
                        }

                        onProgress({
                            playedSeconds,
                            loadedSeconds,
                            totalSeconds
                        });
                    }
                });
            }

            // 尝试带声音自动播放，如果被阻止则静音后重试
            const tryAutoplay = async () => {
                if (!playerRef.current) return
                try {
                    await playerRef.current.play()
                    console.log('[DPlayer] Autoplay with sound succeeded')
                } catch (e) {
                    console.log('[DPlayer] Autoplay with sound blocked, trying muted...')
                    if (playerRef.current) {
                        playerRef.current.video.muted = true
                        try {
                            await playerRef.current.play()
                            console.log('[DPlayer] Muted autoplay succeeded')
                        } catch (e2) {
                            console.log('[DPlayer] All autoplay attempts failed')
                        }
                    }
                }
            }
            tryAutoplay()

            if (onInit && playerRef.current) {
                onInit(playerRef.current)
            }
        }

        initPlayer()

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy()
                playerRef.current = null
            }
        }
    }, [isClient, url, poster]) // Re-init if these change. startTime is initial only, so not a dep.

    return (
        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
            <div
                ref={containerRef}
                className="w-full h-full dplayer-container"
            />
            <style jsx global>{`
                .dplayer-container .dplayer {
                    width: 100% !important;
                    height: 100% !important;
                }
                .dplayer-container .dplayer-video-wrap {
                    width: 100%;
                    height: 100%;
                }
            `}</style>
        </div>
    )
}
