"use client"

import { useEffect, useRef } from 'react'
import Player from 'xgplayer'
import HlsPlugin from 'xgplayer-hls'
import 'xgplayer/dist/index.min.css'

interface VideoPlayerProps {
    url: string
    poster?: string
    title?: string
    onInit?: (player: Player) => void
}

export function VideoPlayer({ url, poster, title, onInit }: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<Player | null>(null)

    useEffect(() => {
        if (!containerRef.current || !url) return

        // 清理旧的播放器实例
        if (playerRef.current) {
            playerRef.current.destroy()
            playerRef.current = null
        }

        // 判断视频类型
        const isHls = url.includes('.m3u8')

        const plugins = isHls ? [HlsPlugin] : []

        playerRef.current = new Player({
            el: containerRef.current,
            url: url,
            poster: poster,
            autoplay: false,  // 手动控制播放
            width: '100%',
            height: '100%',
            playsinline: true,
            plugins: plugins,
            lang: 'zh-cn',
            volume: 0.8,
            // 皮肤配置
            commonStyle: {
                playedColor: '#3b82f6', // primary color
                progressColor: '#3b82f6',
            },
            // 控制栏配置
            controls: true,
            // 进度条配置 (强制开启)
            progress: true,
            // 快捷键
            keyShortcut: true,
            // 画中画
            pip: true,
            // 迷你播放器
            miniplayer: false,
            // 倍速播放
            playbackRate: [0.5, 0.75, 1, 1.25, 1.5, 2],
        })

        // 尝试带声音自动播放，如果被阻止则静音后重试
        const tryAutoplay = async () => {
            if (!playerRef.current) return
            try {
                await playerRef.current.play()
                console.log('[Player] Autoplay with sound succeeded')
            } catch (e) {
                console.log('[Player] Autoplay with sound blocked, trying muted...')
                if (playerRef.current) {
                    playerRef.current.muted = true
                    try {
                        await playerRef.current.play()
                        console.log('[Player] Muted autoplay succeeded')
                    } catch (e2) {
                        console.log('[Player] All autoplay attempts failed')
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
        <div className="w-full aspect-video bg-black rounded-lg overflow-visible relative">
            <div
                ref={containerRef}
                className="w-full h-full"
            />
        </div>
    )
}
