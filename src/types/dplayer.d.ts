declare module 'dplayer' {
    interface DPlayerOptions {
        container: HTMLElement
        autoplay?: boolean
        theme?: string
        loop?: boolean
        screenshot?: boolean
        hotkey?: boolean
        preload?: 'none' | 'metadata' | 'auto'
        volume?: number
        playbackSpeed?: number[]
        video: {
            url: string
            pic?: string
            type?: string
            customType?: Record<string, (video: HTMLVideoElement, player: DPlayer) => void>
        }
    }

    export default class DPlayer {
        constructor(options: DPlayerOptions)
        play(): void
        pause(): void
        seek(time: number): void
        toggle(): void
        on(event: string, handler: () => void): void
        switchVideo(video: { url: string; pic?: string; type?: string }): void
        destroy(): void
        video: HTMLVideoElement

        static readonly version: string
    }
}
