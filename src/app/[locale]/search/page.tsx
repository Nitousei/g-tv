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
import { Loader2, Search, Film } from 'lucide-react'
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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <Header />

            {/* Content */}
            <div className="container mx-auto px-4 py-6">
                {/* 搜索框 + 资源站选择 */}
                <div className="max-w-3xl mx-auto flex gap-2 mb-6">
                    {/* 资源站下拉框 */}
                    <Select
                        value={activeSite?.id?.toString() || ''}
                        onValueChange={(value: string) => {
                            const site = sites.find(s => s.id.toString() === value)
                            if (site) setActiveSite(site)
                        }}
                    >
                        <SelectTrigger className="w-[140px] h-12">
                            <SelectValue placeholder="选择资源站" />
                        </SelectTrigger>
                        <SelectContent>
                            {sites.map((site) => (
                                <SelectItem key={site.id} value={site.id.toString()}>
                                    {site.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* 搜索输入框 */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('placeholder')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="pl-10 h-12 text-lg"
                        />
                    </div>
                    <Button
                        size="lg"
                        onClick={handleSearch}
                        disabled={isSearching || !query.trim()}
                        className="h-12 px-6"
                    >
                        {isSearching ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            t('searchBtn') || '搜索'
                        )}
                    </Button>
                </div>

                {/* Results */}
                {isSearching ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <Film className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>{query.trim() ? t('noResults') : t('startSearch')}</p>
                    </div>
                ) : (
                    <>
                        {/* Results Grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                            {results.map((vod) => (
                                <Link
                                    key={`${activeSite?.id}-${vod.vod_id}`}
                                    href={`/${locale}/watch/${vod.vod_id}?site=${encodeURIComponent(activeSite?.apiUrl || '')}`}
                                >
                                    <Card className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                        <div className="aspect-[2/3] bg-muted relative">
                                            {vod.vod_pic ? (
                                                <img
                                                    src={vod.vod_pic}
                                                    alt={vod.vod_name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Film className="h-12 w-12 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            {/* Remarks Badge */}
                                            {vod.vod_remarks && (
                                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium">
                                                    {vod.vod_remarks}
                                                </div>
                                            )}
                                        </div>
                                        <CardContent className="p-2">
                                            <h3 className="font-medium truncate text-sm">{vod.vod_name}</h3>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {vod.vod_year || ''} {vod.type_name ? `· ${vod.type_name}` : ''}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>

                        {/* Loading More Indicator */}
                        <div ref={observerTarget} className="py-8 flex justify-center">
                            {isLoading && (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            )}
                            {!hasMore && results.length > 0 && (
                                <p className="text-muted-foreground text-sm">{t('noMore')}</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
