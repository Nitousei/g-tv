"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, Search, Film, Play, Square } from 'lucide-react'
import { ImageWithLoading } from '@/components/ui/image-with-loading'
import Link from 'next/link'
import Header from '@/components/header'

interface CollectionSite {
    id: number
    name: string
    apiUrl: string
}

interface VodItem {
    vod_id: number
    vod_name: string
    vod_pic: string
    vod_year: string
    vod_remarks: string
    type_name: string
}

interface CMSResponse {
    code: number
    msg: string
    page: number
    pagecount: number
    limit: number
    total: number
    list: VodItem[]
}

export default function SearchPage() {
    const t = useTranslations('Search')
    const locale = useLocale()
    const [query, setQuery] = useState('')
    const [sites, setSites] = useState<CollectionSite[]>([])
    const [activeSite, setActiveSite] = useState<CollectionSite | null>(null)
    const [results, setResults] = useState<VodItem[]>([])
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [isRestored, setIsRestored] = useState(false)
    const observerTarget = useRef<HTMLDivElement>(null)

    // 从 sessionStorage 恢复搜索状态
    useEffect(() => {
        const savedState = sessionStorage.getItem('searchState')
        if (savedState) {
            try {
                const state = JSON.parse(savedState)
                setQuery(state.query || '')
                setResults(state.results || [])
                setPage(state.page || 1)
                setHasMore(state.hasMore ?? true)
                setIsRestored(true)
            } catch (e) {
                console.error('Failed to restore search state:', e)
            }
        }
    }, [])

    // 保存搜索状态到 sessionStorage
    useEffect(() => {
        if (results.length > 0) {
            const state = { query, results, page, hasMore }
            sessionStorage.setItem('searchState', JSON.stringify(state))
        }
    }, [query, results, page, hasMore])

    // 从 API 加载采集站
    useEffect(() => {
        async function fetchSites() {
            try {
                const res = await fetch('/api/sites')
                if (res.ok) {
                    const data = await res.json()
                    setSites(data.sites)

                    // 恢复之前选择的采集站
                    const savedSiteId = sessionStorage.getItem('activeSiteId')
                    if (savedSiteId) {
                        const savedSite = data.sites.find((s: CollectionSite) => s.id.toString() === savedSiteId)
                        if (savedSite) {
                            setActiveSite(savedSite)
                            return
                        }
                    }

                    if (data.sites.length > 0) {
                        setActiveSite(data.sites[0])
                    }
                }
            } catch (error) {
                console.error('Failed to fetch sites:', error)
            }
        }
        fetchSites()
    }, [])

    // 保存选中的采集站
    useEffect(() => {
        if (activeSite) {
            sessionStorage.setItem('activeSiteId', activeSite.id.toString())
        }
    }, [activeSite])

    // 搜索函数
    const searchVod = useCallback(async (keyword: string, pageNum: number, append: boolean = false) => {
        if (!activeSite || !keyword.trim()) return

        if (pageNum === 1) {
            setIsSearching(true)
        } else {
            setIsLoading(true)
        }

        try {
            // 苹果CMS API 格式: ?ac=list&wd=关键词&pg=页码
            const apiUrl = `${activeSite.apiUrl}?ac=list&wd=${encodeURIComponent(keyword)}&pg=${pageNum}`

            // 使用代理 API 避免 CORS 问题
            const res = await fetch(`/api/proxy?url=${encodeURIComponent(apiUrl)}`)

            if (!res.ok) throw new Error('Failed to fetch')

            const data: CMSResponse = await res.json()
            const items = data.list || []

            // 先显示结果
            if (append) {
                setResults(prev => [...prev, ...items])
            } else {
                setResults(items)
            }

            setHasMore(pageNum < data.pagecount)
            setPage(pageNum)

            // 异步加载缺失的 TMDB 图片（不阻塞主流程）
            const itemsNeedPoster = items.filter(item => !item.vod_pic)
            if (itemsNeedPoster.length > 0) {
                // 异步更新图片
                itemsNeedPoster.forEach(async (item) => {
                    try {
                        const tmdbRes = await fetch(`/api/tmdb/search?query=${encodeURIComponent(item.vod_name)}`)
                        if (tmdbRes.ok) {
                            const tmdbData = await tmdbRes.json()
                            if (tmdbData.found && tmdbData.poster) {
                                // 更新对应项目的图片
                                setResults(prev => prev.map(v =>
                                    v.vod_id === item.vod_id ? { ...v, vod_pic: tmdbData.poster } : v
                                ))
                            }
                        }
                    } catch (e) {
                        // 忽略 TMDB 错误
                    }
                })
            }
        } catch (error) {
            console.error('Search error:', error)
            if (!append) {
                setResults([])
            }
            setHasMore(false)
        } finally {
            setIsSearching(false)
            setIsLoading(false)
        }
    }, [activeSite])

    // 点击搜索按钮
    const handleSearch = () => {
        if (!query.trim()) return
        setResults([])
        setPage(1)
        setHasMore(true)
        searchVod(query, 1, false)
    }

    // 回车搜索
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    // Intersection Observer for infinite scroll
    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const [target] = entries
        if (target.isIntersecting && hasMore && !isLoading && !isSearching && query.trim()) {
            searchVod(query, page + 1, true)
        }
    }, [hasMore, isLoading, isSearching, query, page, searchVod])

    useEffect(() => {
        const element = observerTarget.current
        if (!element) return

        const observer = new IntersectionObserver(handleObserver, {
            threshold: 0.1,
        })

        observer.observe(element)
        return () => observer.disconnect()
    }, [handleObserver])

    return (
        <div className="min-h-screen bg-background bg-grid flex flex-col font-sans text-foreground">
            {/* Header */}
            <Header />

            {/* Content */}
            <div className="flex-1 container mx-auto px-4 py-8 space-y-8">
                {/* 搜索框 + 资源站选择 */}
                <div className="max-w-4xl mx-auto bg-card p-3 border border-border sticky top-20 z-40">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* 资源站下拉框 */}
                        <Select
                            value={activeSite?.id?.toString() || ''}
                            onValueChange={(value: string) => {
                                const site = sites.find(s => s.id.toString() === value)
                                if (site) setActiveSite(site)
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] h-11 bg-background border-border focus:ring-2 focus:ring-primary/20 font-medium text-card-foreground">
                                <SelectValue placeholder="选择资源站" />
                            </SelectTrigger>
                            <SelectContent className="border-border shadow-md">
                                {sites.map((site) => (
                                    <SelectItem key={site.id} value={site.id.toString()} className="cursor-pointer font-medium focus:text-primary focus:bg-primary/10">
                                        {site.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* 搜索输入框 */}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                type="search"
                                placeholder={t('placeholder')}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-11 h-11 text-base bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                            />
                        </div>
                        <Button
                            size="lg"
                            onClick={handleSearch}
                            disabled={isSearching || !query.trim()}
                            className="h-11 px-6 font-semibold shadow-none transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {isSearching ? (
                                <Square className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-2" />
                                    {t('searchBtn') || '搜索'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Results Container */}
                <div className="relative z-10 w-full min-h-[400px]">
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-12 h-12 bg-card border border-border flex items-center justify-center">
                                <Square className="h-6 w-6 animate-spin text-primary" />
                            </div>
                            <p className="text-muted-foreground font-medium text-sm">正在检索数据...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <div className="w-20 h-20 bg-muted/50 flex items-center justify-center mb-6 border border-border">
                                <Film className="h-10 w-10 opacity-30" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-1">
                                {query.trim() ? '未找到相关内容' : '准备好开始了吗？'}
                            </h3>
                            <p className="max-w-[280px] text-center text-sm text-muted-foreground">
                                {query.trim() ? t('noResults') : t('startSearch')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-in fade-in duration-500">
                            {/* Results Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6">
                                {results.map((vod) => (
                                    <Link
                                        key={`${activeSite?.id}-${vod.vod_id}`}
                                        href={`/${locale}/watch/${vod.vod_id}?site=${encodeURIComponent(activeSite?.apiUrl || '')}`}
                                        className="group block"
                                    >
                                        <Card className="overflow-hidden border border-border bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50">
                                            <div className="aspect-[2/3] bg-muted relative overflow-hidden">
                                                {vod.vod_pic ? (
                                                    <ImageWithLoading
                                                        src={vod.vod_pic}
                                                        alt={vod.vod_name}
                                                        className="transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                                        <Film className="h-8 w-8 text-muted-foreground/30" />
                                                    </div>
                                                )}

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                    <div className="bg-background/90 p-2 backdrop-blur-sm">
                                                        <Play className="h-5 w-5 text-primary fill-current" />
                                                    </div>
                                                </div>

                                                {/* Remarks Badge */}
                                                {vod.vod_remarks && (
                                                    <div className="absolute top-2 right-2 bg-black/60 text-white px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-md">
                                                        {vod.vod_remarks}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <h3 className="font-bold truncate text-sm text-card-foreground group-hover:text-primary transition-colors">
                                                    {vod.vod_name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="bg-muted text-muted-foreground px-1.5 text-[10px] font-medium border border-border">
                                                        {vod.vod_year || 'N/A'}
                                                    </span>
                                                    <span className="truncate text-xs text-muted-foreground">{vod.type_name || '未分类'}</span>
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {/* Loading More Indicator */}
                            <div ref={observerTarget} className="py-8 flex justify-center border-t border-border border-dashed">
                                {isLoading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                        <Square className="h-4 w-4 animate-spin text-primary" />
                                        <span>加载更多...</span>
                                    </div>
                                )}
                                {!hasMore && results.length > 0 && (
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">End of Results</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
