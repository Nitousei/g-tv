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
    const t = useTranslations('Login')
    const tHome = useTranslations('HomePage') // For the trigger button text if needed
    const router = useRouter()
    const locale = useLocale()

    const formSchema = z.object({
        username: z.string().min(1, {
            message: t('usernameRequired'),
        }),
        password: z.string().min(1, {
            message: t('passwordRequired'),
        }),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    })

    const loginMutation = useMutation({
        mutationFn: (data: LoginParams) => authService.login(data),
        onSuccess: () => {
            setOpen(false)
            toast.success(t('success'))
            router.refresh() // 刷新服务器状态，确保 cookie 被识别
            router.push(`/${locale}/search`)
        },
        onError: (error: any) => {
            console.error(error)
            toast.error(t('failed'), {
                description: error.message || t('error'),
            })
        }
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        loginMutation.mutate(values)
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
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('desc')}
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
                        <DialogFooter>
                            <Button type="submit" disabled={loginMutation.isPending}>
                                {loginMutation.isPending ? t('loggingIn') : t('title')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
