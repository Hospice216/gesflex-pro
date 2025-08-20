import React from 'react'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface QuickActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  className?: string
}

export default function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  className = ''
}: QuickActionButtonProps) {
  return (
    <Button 
      onClick={onClick} 
      variant={variant}
      className={`gap-2 ${className}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Button>
  )
}
