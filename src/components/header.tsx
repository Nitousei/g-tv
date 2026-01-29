'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import LanguageSwitcher from './language-switcher';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

export default function Header() {
    const t = useTranslations('HomePage');
    const tLogin = useTranslations('Login');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

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

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between mx-auto px-4">
                <div className="flex items-center gap-6">
                    <h1 className="flex items-center space-x-2 text-lg font-bold">
                        {t('title')}
                    </h1>
                    <nav className="flex items-center space-x-4 text-sm font-medium">
                        <Link href={`/${locale}/search`} className="transition-colors hover:text-foreground/80 text-foreground/60">
                            首页
                        </Link>
                        <Link href={`/${locale}/room`} className="transition-colors hover:text-foreground/80 text-foreground/60">
                            放映厅
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <LanguageSwitcher />
                    {showLogout && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="h-4 w-4 mr-1" />
                            退出
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
