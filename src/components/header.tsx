'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import LanguageSwitcher from './language-switcher';
import { Button } from './ui/button';
import { LogOut, Menu, X } from 'lucide-react';

export default function Header() {
    const t = useTranslations('HomePage');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // 判断是否在需要显示退出按钮的页面
    const showLogout = pathname.includes('/search') || pathname.includes('/watch');

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push(`/${locale}`);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

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
                        <Link href={`/${locale}/search`} className="transition-colors hover:text-primary text-muted-foreground flex items-center gap-2">
                            首页
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
                    {showLogout && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOut className="h-4 w-4 mr-1" />
                            退出
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-border bg-background absolute w-full left-0 animate-in slide-in-from-top-2">
                    <div className="flex flex-col p-4 space-y-4">
                        <Link
                            href={`/${locale}/search`}
                            className="flex items-center px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            首页
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
                        {showLogout && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-4"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                退出
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
