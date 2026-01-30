import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { ThemeProvider } from '../../components/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from "@/components/ui/sonner"
import "../globals.css";
import { SessionChecker } from '@/components/session-checker';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

export const metadata = {
    title: '老乡TV',
    description: '和好友一起看电影',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: '老乡TV',
    },
    formatDetection: {
        telephone: false,
    },
    themeColor: '#000000',
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
        viewportFit: 'cover',
    },
    icons: {
        icon: '/icons/icon-192x192.png',
        apple: '/icons/apple-touch-icon.png',
    },
};

export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Ensure that the incoming `locale` is valid
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    // Providing all messages to the client
    // side is the easiest way to get started
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
                <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
                <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black" />
                <meta name="apple-mobile-web-app-title" content="老乡TV" />
                <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className="font-sans antialiased">
                <NextIntlClientProvider messages={messages}>
                    <QueryProvider>
                        <ThemeProvider
                            attribute="class"
                            defaultTheme="system"
                            enableSystem
                            disableTransitionOnChange
                        >
                            {children}
                            <SessionChecker />
                            <ServiceWorkerRegistration />
                            <Toaster />
                        </ThemeProvider>
                    </QueryProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
