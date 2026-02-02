"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { request } from "@/lib/http"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Header from '@/components/header';
import { toast } from "sonner"
import { Loader2, Play, Clock, User, History as HistoryIcon } from "lucide-react"

interface UserProfile {
    id: number
    username: string
    nickname: string | null
    avatar: string | null
    createdAt: string
}

interface HistoryItem {
    id: number
    videoId: string
    videoName: string
    cover: string | null
    progress: number
    duration: number
    updatedAt: string
}

export default function ProfilePage() {
    const t = useTranslations('Profile') // Assuming we will add this later or use generic keys
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile')

    // --- Profile Data ---
    const { data: user, isLoading: userLoading, refetch: refetchUser } = useQuery({
        queryKey: ['profile'],
        queryFn: () => request<{ user: UserProfile }>('/api/auth/me').then(res => res.user)
    })

    // --- History Data ---
    const { data: historyList, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
        queryKey: ['history'],
        queryFn: () => request<HistoryItem[]>('/api/user/history'),
        enabled: activeTab === 'history'
    })

    // --- Tab Switch ---
    useEffect(() => {
        if (activeTab === 'history') {
            refetchHistory()
        }
    }, [activeTab, refetchHistory])

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto py-10 px-4 max-w-5xl">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar / Navigation */}
                    <aside className="w-full md:w-64 shrink-0 space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="h-12 w-12 rounded-full overflow-hidden bg-background border">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-primary text-primary-foreground">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold truncate">{user?.nickname || user?.username || "Guest"}</p>
                                <p className="text-xs text-muted-foreground truncate">ID: {user?.id}</p>
                            </div>
                        </div>

                        <nav className="flex flex-col gap-2">
                            <Button
                                variant={activeTab === 'profile' ? "secondary" : "ghost"}
                                className="justify-start"
                                onClick={() => setActiveTab('profile')}
                            >
                                <User className="mr-2 h-4 w-4" />
                                个人资料
                            </Button>
                            <Button
                                variant={activeTab === 'history' ? "secondary" : "ghost"}
                                className="justify-start"
                                onClick={() => setActiveTab('history')}
                            >
                                <HistoryIcon className="mr-2 h-4 w-4" />
                                播放历史
                            </Button>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-h-[500px]">
                        {activeTab === 'profile' && (
                            <ProfileSettings user={user} isLoading={userLoading} onUpdate={refetchUser} />
                        )}
                        {activeTab === 'history' && (
                            <HistoryList list={historyList} isLoading={historyLoading} />
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}

function ProfileSettings({ user, isLoading, onUpdate }: { user?: UserProfile, isLoading: boolean, onUpdate: () => void }) {
    const [nickname, setNickname] = useState("")
    const [avatar, setAvatar] = useState("")
    const [isUploading, setIsUploading] = useState(false)

    // Password Section
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    useEffect(() => {
        if (user) {
            setNickname(user.nickname || "")
            setAvatar(user.avatar || "")
        }
    }, [user])

    const updateProfileMutation = useMutation({
        mutationFn: (data: any) => request('/api/user/profile', { method: 'PUT', data }),
        onSuccess: () => {
            toast.success("保存成功")
            onUpdate()
            setOldPassword("")
            setNewPassword("")
            setConfirmPassword("")
        },
        onError: (err: any) => toast.error(err.message || "保存失败")
    })

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            if (data.success) {
                setAvatar(data.url);
                toast.success("头像上传成功，别忘了点击保存");
            }
        } catch (error) {
            console.error(error);
            toast.error("上传图片失败");
        } finally {
            setIsUploading(false);
        }
    };

    const handleInfoSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateProfileMutation.mutate({ nickname, avatar })
    }

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            toast.error("两次新密码输入不一致")
            return
        }
        updateProfileMutation.mutate({ password: oldPassword, newPassword })
    }

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>基本信息</CardTitle>
                    <CardDescription>更新您的头像和昵称</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleInfoSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>昵称</Label>
                            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="怎么称呼您？" />
                        </div>
                        <div className="space-y-2">
                            <Label>头像 URL</Label>
                            <div className="flex gap-4">
                                <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." className="flex-1" />
                                <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden border bg-muted">
                                    {avatar && <img src={avatar} alt="Preview" className="h-full w-full object-cover" />}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">支持图片链接，推荐使用 DiceBear 等服务生成。</p>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={updateProfileMutation.isPending}>
                                {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                保存信息
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>安全设置</CardTitle>
                    <CardDescription>修改您的登录密码</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>当前密码</Label>
                            <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>新密码</Label>
                                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>确认新密码</Label>
                                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={!oldPassword || !newPassword || updateProfileMutation.isPending}>
                                {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                修改密码
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

function HistoryList({ list, isLoading }: { list?: HistoryItem[], isLoading: boolean }) {
    const router = useRouter()
    const locale = useLocale()

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>

    if (!list || list.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-muted-foreground border border-dashed rounded-lg">
                <HistoryIcon className="h-10 w-10 mb-2 opacity-20" />
                <p>暂无观看记录</p>
                <Button variant="link" onClick={() => router.push(`/${locale}/search`)}>去看看有什么好片</Button>
            </div>
        )
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {list.map(item => {
                const percent = item.duration > 0 ? Math.min(100, Math.round((item.progress / item.duration) * 100)) : 0
                return (
                    <Card key={item.id} className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => router.push(`/${locale}/watch/${item.videoId}?t=${item.progress}`)}> {/* Assuming zh locale for now or handling redirects */}
                        <div className="aspect-[2/3] relative bg-black/20">
                            {item.cover ? (
                                <img src={item.cover} alt={item.videoName} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                                    No Image
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="fill-white text-white h-10 w-10" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1 rounded">
                                {percent}%
                            </div>
                        </div>
                        <CardContent className="p-3">
                            <h3 className="font-semibold truncate text-sm" title={item.videoName}>{item.videoName}</h3>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(item.progress)} / {formatTime(item.duration)}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
