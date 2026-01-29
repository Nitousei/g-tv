'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    type_name: string
    vod_remarks: string
    vod_play_from: string
    vod_play_url: string
}

interface VideoSelectorProps {
    onSelect: (video: any) => void;
    trigger?: React.ReactNode;
}

export function VideoSelector({ onSelect, trigger }: VideoSelectorProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [sites, setSites] = useState<CollectionSite[]>([]);
    const [activeSite, setActiveSite] = useState<CollectionSite | null>(null);
    const [results, setResults] = useState<VodItem[]>([]);
    const [loading, setLoading] = useState(false);

    // 加载采集站
    useEffect(() => {
        if (open && sites.length === 0) {
            fetch('/api/sites')
                .then(res => res.json())
                .then(data => {
                    setSites(data.sites);
                    if (data.sites.length > 0) setActiveSite(data.sites[0]);
                });
        }
    }, [open]);

    const handleSearch = async () => {
        if (!activeSite || !query) return;
        setLoading(true);
        try {
            const apiUrl = `${activeSite.apiUrl}?ac=list&wd=${encodeURIComponent(query)}`;
            const res = await fetch(`/api/proxy?url=${encodeURIComponent(apiUrl)}`);
            const data = await res.json();
            setResults(data.list || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVideo = async (vodId: number) => {
        if (!activeSite) return;
        setLoading(true);
        try {
            const apiUrl = `${activeSite.apiUrl}?ac=detail&ids=${vodId}`;
            const res = await fetch(`/api/proxy?url=${encodeURIComponent(apiUrl)}`);
            const data = await res.json();
            if (data.list && data.list.length > 0) {
                const detail = data.list[0];
                onSelect({ ...detail, site: activeSite.apiUrl });
                setOpen(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button>选择影片</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>选择影片</DialogTitle>
                </DialogHeader>
                <div className="flex gap-2">
                    <Select
                        value={activeSite?.id?.toString() || ""}
                        onValueChange={(val) => setActiveSite(sites.find(s => s.id.toString() === val) || null)}
                        disabled={sites.length === 0}
                    >
                        <SelectTrigger className="w-[180px] h-10">
                            <SelectValue placeholder={sites.length === 0 ? "加载中..." : "选择源站"} />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                            {sites.map(site => (
                                <SelectItem key={site.id} value={site.id.toString()}>
                                    {site.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="搜索关键词..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="flex-1 h-10"
                    />
                    <Button onClick={handleSearch} disabled={loading || !query} className="h-10">
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[300px] mt-4 pr-2">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
                        {results.map(vod => (
                            <Card
                                key={vod.vod_id}
                                className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                onClick={() => handleSelectVideo(vod.vod_id)}
                            >
                                <div className="aspect-[2/3] bg-muted relative">
                                    {vod.vod_pic ? (
                                        <img
                                            src={vod.vod_pic}
                                            alt={vod.vod_name}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Film className="h-8 w-8 text-muted-foreground/30" />
                                        </div>
                                    )}
                                    {/* Remarks Badge */}
                                    {vod.vod_remarks && (
                                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium leading-none">
                                            {vod.vod_remarks}
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-1.5">
                                    <h4 className="font-medium truncate text-[12px] leading-tight mb-0.5" title={vod.vod_name}>
                                        {vod.vod_name}
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground truncate opacity-80">
                                        {vod.vod_year || ''} {vod.type_name ? `· ${vod.type_name}` : ''}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {!loading && results.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">
                            <Film className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">{query.trim() ? "暂无结果" : "请输入关键词搜索"}</p>
                        </div>
                    )}
                    {loading && results.length === 0 && (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
