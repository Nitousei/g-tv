'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function SessionChecker() {
    const router = useRouter();

    useEffect(() => {
        // 每 5 秒检查一次会话状态
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/auth/check-session');
                const data = await res.json();

                if (!data.valid && data.reason === 'logged_in_elsewhere') {
                    clearInterval(interval);
                    toast.error("Session Expired", {
                        description: "Your account is logged in on another device.",
                    });
                    // 清除本地可能存在的某些状态
                    sessionStorage.clear();
                    // 跳转到登录页
                    router.push('/zh?error=logged_in_elsewhere'); // 默认跳中文首页或检测语言
                }
            } catch (error) {
                // 忽略网络错误
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [router, toast]);

    return null;
}
