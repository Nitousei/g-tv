"use client"

import { useEffect, useRef } from 'react'
import DPlayer from 'dplayer'
import Hls from 'hls.js'

interface VideoPlayerProps {
    url: string
    poster?: string
    title?: string
    onInit?: (player: DPlayer) => void
}

export function VideoPlayer({ url, poster, title, onInit }: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<DPlayer | null>(null)

    useEffect(() => {
        if (!containerRef.current || !url) return

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
                    customHls: function (video: HTMLVideoElement, player: DPlayer) {
                        const hls = new Hls()
                        hls.loadSource(video.src)
                        hls.attachMedia(video)
                    },
                } : undefined,
            },
        }

        playerRef.current = new DPlayer(options)

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

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy()
                playerRef.current = null
            }
        }
    }, [url, poster])

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
