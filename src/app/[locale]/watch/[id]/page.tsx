"use client"

import { useState, useEffect, use } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VideoPlayer } from '@/components/video-player'
import { Loader2, ArrowLeft, Play, Square } from 'lucide-react'
import Link from 'next/link'

interface VodDetail {
    vod_id: number
    vod_name: string
    vod_pic: string
    vod_year: string
    vod_area: string
    vod_lang: string
    vod_actor: string
    vod_director: string
    vod_content: string
    vod_play_from: string
    vod_play_url: string
    type_name: string
}

interface Episode {
    name: string
    url: string
}

interface PlaySource {
    name: string
    episodes: Episode[]
}

export default function WatchPage({
    params
}: {
    params: Promise<{ locale: string; id: string }>
}) {
    const { locale, id } = use(params)
    const searchParams = useSearchParams()
    const siteUrl = searchParams.get('site') || ''
    const t = useTranslations('Watch')

    const [detail, setDetail] = useState<VodDetail | null>(null)
    const [playSources, setPlaySources] = useState<PlaySource[]>([])
    const [activeSource, setActiveSource] = useState(0)
    const [activeEpisode, setActiveEpisode] = useState(0)
    const [currentPlayUrl, setCurrentPlayUrl] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    // 解析播放地址
    const parsePlayUrl = (playFrom: string, playUrl: string): PlaySource[] => {
        if (!playFrom || !playUrl) return []

        const sources = playFrom.split('$$$')
        const urlGroups = playUrl.split('$$$')

        return sources.map((sourceName, index) => {
            const urlStr = urlGroups[index] || ''
            const episodes = urlStr.split('#').map(ep => {
                const [name, url] = ep.split('$')
                return { name: name || '播放', url: url || '' }
            }).filter(ep => ep.url)

            return { name: sourceName, episodes }
        }).filter(source => source.episodes.length > 0)
    }

    // 获取影片详情
    useEffect(() => {
        async function fetchDetail() {
            if (!siteUrl || !id) return

            setIsLoading(true)
            try {
                const apiUrl = `${siteUrl}?ac=detail&ids=${id}`
                const res = await fetch(`/api/proxy?url=${encodeURIComponent(apiUrl)}`)

                if (!res.ok) throw new Error('Failed to fetch')

                const data = await res.json()
                if (data.list && data.list.length > 0) {
                    const vod = data.list[0]
                    setDetail(vod)

                    const sources = parsePlayUrl(vod.vod_play_from, vod.vod_play_url)
                    setPlaySources(sources)

                    if (sources.length > 0 && sources[0].episodes.length > 0) {
                        setCurrentPlayUrl(sources[0].episodes[0].url)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch detail:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchDetail()
    }, [siteUrl, id])

    // 切换集数
    const handleEpisodeClick = (sourceIndex: number, episodeIndex: number) => {
        setActiveSource(sourceIndex)
        setActiveEpisode(episodeIndex)
        setCurrentPlayUrl(playSources[sourceIndex].episodes[episodeIndex].url)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Square className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!detail) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">{t('notFound')}</p>
                <Link href={`/${locale}/search`}>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('backToSearch')}
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 py-3 flex items-center gap-4">
                    <Link href={`/${locale}/search`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="font-semibold truncate">{detail.vod_name}</h1>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Player Section */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Video Player */}
                        {currentPlayUrl ? (
                            <VideoPlayer
                                url={currentPlayUrl}
                                poster={detail.vod_pic}
                                title={detail.vod_name}
                            />
                        ) : (
                            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center text-white/50">
                                {t('selectEpisode')}
                            </div>
                        )}

                        {/* Video Info */}
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <h2 className="text-xl font-bold">{detail.vod_name}</h2>
                                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                    {detail.vod_year && <span>{detail.vod_year}</span>}
                                    {detail.type_name && <span>· {detail.type_name}</span>}
                                    {detail.vod_area && <span>· {detail.vod_area}</span>}
                                    {detail.vod_lang && <span>· {detail.vod_lang}</span>}
                                </div>
                                {detail.vod_actor && (
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">{t('actors')}: </span>
                                        {detail.vod_actor}
                                    </p>
                                )}
                                {detail.vod_director && (
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">{t('director')}: </span>
                                        {detail.vod_director}
                                    </p>
                                )}
                                {detail.vod_content && (
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {detail.vod_content.replace(/<[^>]+>/g, '')}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Episodes Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">{t('episodes')}</h3>

                        {/* Source Tabs */}
                        {playSources.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {playSources.map((source, index) => (
                                    <Button
                                        key={index}
                                        variant={activeSource === index ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                            setActiveSource(index)
                                            setActiveEpisode(0)
                                            if (source.episodes.length > 0) {
                                                setCurrentPlayUrl(source.episodes[0].url)
                                            }
                                        }}
                                        className="whitespace-nowrap"
                                    >
                                        {source.name}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {/* Episode Grid */}
                        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
                            {playSources[activeSource]?.episodes.map((episode, index) => (
                                <Button
                                    key={index}
                                    variant={activeEpisode === index && activeSource === activeSource ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleEpisodeClick(activeSource, index)}
                                    className="truncate"
                                >
                                    {episode.name}
                                </Button>
                            ))}
                        </div>

                        {playSources.length === 0 && (
                            <p className="text-muted-foreground text-sm">{t('noEpisodes')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
