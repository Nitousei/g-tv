"use client"

import * as React from "react"
import { Square, Film } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageWithLoadingProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    containerClassName?: string
}

export function ImageWithLoading({
    src,
    alt,
    className,
    containerClassName,
    ...props
}: ImageWithLoadingProps) {
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState(false)

    return (
        <div className={cn("relative w-full h-full bg-muted", containerClassName)}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-card/10 backdrop-blur-[1px]">
                    <Square className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            {!error ? (
                <img
                    src={src}
                    alt={alt}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-500",
                        isLoading ? "opacity-0" : "opacity-100",
                        className
                    )}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false)
                        setError(true)
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    {...props}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Film className="h-8 w-8 text-muted-foreground/30" />
                </div>
            )}
        </div>
    )
}
