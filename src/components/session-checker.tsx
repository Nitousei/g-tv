'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function SessionChecker() {
    const router = useRouter();

    useEffect(() => {
        // 每 3 秒检查一次会话状态
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/auth/check-session');
                const data = await res.json();

                if (!data.valid && data.reason === 'logged_in_elsewhere') {
                    clearInterval(interval);
                    toast.error("登录已失效", {
                        description: "您的账号已在其他设备登录，当前会话已被踢出。",
                    });
                    // 清除本地可能存在的某些状态
                    sessionStorage.clear();
                    // 跳转到首页
                    router.push('/zh?error=logged_in_elsewhere');
                }
            } catch (error) {
                // 忽略网络错误
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [router]);

    return null;
}
