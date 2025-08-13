import { Loader2, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingState({ 
  icon: Icon = Loader2, 
  title = "Chargement...", 
  description,
  size = "md",
  className 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 text-center",
      className
    )}>
      <Icon className={cn(
        "animate-spin text-muted-foreground mb-3",
        sizeClasses[size]
      )} />
      <h3 className="text-sm font-medium text-foreground mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

export function LoadingSpinner({ size = "md", className }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }

  return (
    <Loader2 className={cn(
      "animate-spin text-muted-foreground",
      sizeClasses[size],
      className
    )} />
  )
} 