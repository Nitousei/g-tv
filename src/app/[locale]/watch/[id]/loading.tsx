import { Square } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Square className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
}
