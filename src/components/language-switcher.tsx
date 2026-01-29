"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"

export default function LanguageSwitcher() {
    const t = useTranslations("Language")
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = React.useTransition()

    const handleChange = (nextLocale: "en" | "zh") => {
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale })
        })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isPending}>
                    <Languages className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Switch language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleChange("en")}>
                    {t("en")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleChange("zh")}>
                    {t("zh")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
