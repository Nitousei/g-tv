'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import LanguageSwitcher from './language-switcher';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Menu, X, User as UserIcon, History, Settings } from 'lucide-react';

export default function Header({ user: initialUser }: { user?: { username: string; nickname?: string | null; avatar?: string | null } | null }) {
    const t = useTranslations('HomePage');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState(initialUser || null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Sync with initialUser prop changes (if any)
    useEffect(() => {
        if (initialUser !== undefined) {
            setUser(initialUser);
        }
    }, [initialUser]);

    // Check login status (Client-side fallback/update)
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                return null;
            })
            .then(data => {
                if (data && data.user) {
                    setUser(data.user);
                } else {
                    // Only unset if we confirm no user, but be careful overriding SSR data if fetch fails
                    // For now, if API says no user, we trust it.
                    // setUser(null); 
                }
            })
            .catch(() => { /* consistency check failed, keep current state */ });
    }, [pathname]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            // Clear all client-side cache as requested
            sessionStorage.clear();
            localStorage.clear();

            setUser(null);
            router.push(`/${locale}`);
            router.refresh();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const UserAvatar = () => (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
            {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
            ) : (
                <span className="text-sm font-bold text-primary">{user?.nickname?.[0] || user?.username?.[0]?.toUpperCase()}</span>
            )}
        </div>
    );

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
            <div className="container flex h-14 items-center justify-between mx-auto px-4">
                <div className="flex items-center gap-8">
                    <h1 className="flex items-center space-x-2 text-xl font-bold tracking-tight text-foreground">
                        <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><polyline points="9 17 9 12 13 12 13 17" /><polyline points="9 7 9 7" /><polyline points="13 7 13 7" /></svg>
                        </span>
                        {t('title')}
                    </h1>
                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                        <Link href={`/${locale}`} className="transition-colors hover:text-primary text-muted-foreground flex items-center gap-2">
                            首页
                        </Link>
                        <Link href={`/${locale}/search`} className="transition-colors hover:text-primary text-muted-foreground flex items-center gap-2">
                            看剧
                        </Link>
                        <Link href={`/${locale}/room`} className="transition-colors hover:text-primary text-muted-foreground flex items-center gap-2">
                            放映厅
                        </Link>
                    </nav>
                </div>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden p-2 text-muted-foreground" onClick={toggleMenu}>
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-3">
                    <div className="h-4 w-px bg-border mx-2" />
                    <ThemeToggle />
                    <LanguageSwitcher />

                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-auto gap-2 px-2 hover:bg-muted ml-2">
                                    <UserAvatar />
                                    <span className="text-sm font-medium">{user.nickname || user.username}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.nickname || user.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground">@{user.username}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/${locale}/profile`)}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>个人资料</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/${locale}/profile`)}>
                                    <History className="mr-2 h-4 w-4" />
                                    <span>播放历史</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>退出登录</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        // If checking auth or not logged in, we might want a login button or valid placeholder?
                        // But the requirement says "Show avatar... if logged in". 
                        // For now strictly following "if user exists".
                        null
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-border bg-background absolute w-full left-0 animate-in slide-in-from-top-2">
                    <div className="flex flex-col p-4 space-y-4">
                        <Link
                            href={`/${locale}`}
                            className="flex items-center px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            首页
                        </Link>
                        <Link
                            href={`/${locale}/search`}
                            className="flex items-center px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            看剧
                        </Link>
                        <Link
                            href={`/${locale}/room`}
                            className="flex items-center px-4 py-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            放映厅
                        </Link>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-2">
                            <span className="text-sm text-muted-foreground">设置</span>
                            <div className="flex gap-2">
                                <ThemeToggle />
                                <LanguageSwitcher />
                            </div>
                        </div>
                        {user && (
                            <>
                                <Link
                                    href={`/${locale}/profile`}
                                    className="flex items-center px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <UserIcon className="h-4 w-4 mr-2" />
                                    个人资料
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                    className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-4"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    退出
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
