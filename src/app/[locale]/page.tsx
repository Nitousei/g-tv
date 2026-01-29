"use client"

import { TypeAnimation } from 'react-type-animation';
import { useTranslations } from 'next-intl';
import Header from '@/components/header';
import { LoginDialog } from '@/components/login-dialog';

export default function Home() {
  const t = useTranslations('HomePage');

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center rounded-lg bg-muted px-3 py-1 text-sm font-medium">
            {t('newRelease')}
          </div>
          <TypeAnimation
            sequence={[
              '欢迎来到老乡TV',
              2000,
              '和好友一起看电影',
              2000,
              '海量高清影视资源',
              2000,
              '实时语音 边看边聊',
              2000,
            ]}
            wrapper="h1"
            speed={50}
            style={{ fontSize: '2em', display: 'inline-block' }}
            repeat={Infinity}
            className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-foreground"
          />
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            {t('heroSubtitle')}
          </p>
          <div className="space-x-4">
            <LoginDialog />
          </div>
        </div>
      </section>
    </div>
  )
}
