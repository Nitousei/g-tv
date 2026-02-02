"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { authService, LoginParams } from "@/services/auth.service"

import { toast } from "sonner"

export function LoginDialog() {
    const [open, setOpen] = useState(false)
    const [isRegister, setIsRegister] = useState(false)
    const t = useTranslations('Login')
    const router = useRouter()
    const locale = useLocale()

    const formSchema = z.object({
        username: z.string().min(1, {
            message: t('usernameRequired'),
        }),
        password: z.string().min(1, {
            message: t('passwordRequired'),
        }),
        confirmPassword: z.string().optional(),
    }).refine((data) => {
        if (isRegister) {
            return data.password === data.confirmPassword
        }
        return true
    }, {
        message: "两次输入的密码不一致", // TODO: i18n
        path: ["confirmPassword"],
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            confirmPassword: "",
        },
    })

    const loginMutation = useMutation({
        mutationFn: (data: LoginParams) => authService.login(data),
        onSuccess: () => {
            setOpen(false)
            toast.success(t('success'))

            // Clear cache and full reload as requested
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = `/${locale}/search`;
        },
        onError: (error: any) => {
            console.error(error)
            toast.error(t('failed'), {
                description: error.message || t('error'),
            })
        }
    })

    const registerMutation = useMutation({
        mutationFn: (data: any) => authService.register(data),
        onSuccess: () => {
            setOpen(false)
            toast.success("注册成功")

            // Clear cache and full reload
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = `/${locale}/search`
        },
        onError: (error: any) => {
            console.error(error)
            toast.error("注册失败", {
                description: error.message || t('error'),
            })
        }
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (isRegister) {
            registerMutation.mutate(values)
        } else {
            loginMutation.mutate(values)
        }
    }

    const toggleMode = () => {
        setIsRegister(!isRegister)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="px-8">
                    {t('title')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isRegister ? "注册" : t('title')}</DialogTitle>
                    <DialogDescription>
                        {isRegister ? "创建一个新账号" : t('desc')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('username')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="admin" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('password')}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {isRegister && (
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>确认密码</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <DialogFooter className="flex-col gap-2 sm:gap-0">
                            <div className="flex w-full justify-between items-center">
                                <Button variant="link" type="button" onClick={toggleMode} className="px-0">
                                    {isRegister ? "已有账号？去登录" : "没有账号？去注册"}
                                </Button>
                                <Button type="submit" disabled={loginMutation.isPending || registerMutation.isPending}>
                                    {loginMutation.isPending || registerMutation.isPending ? "请稍候..." : (isRegister ? "注册" : t('title'))}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
