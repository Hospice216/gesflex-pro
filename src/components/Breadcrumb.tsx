import React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const navigate = useNavigate()

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/dashboard')}
        className="h-6 px-2 text-muted-foreground hover:text-foreground"
      >
        <Home className="h-3 w-3" />
      </Button>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4" />
          {item.path ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate(item.path!)}
              className="h-6 px-2 text-muted-foreground hover:text-foreground"
            >
              {item.icon && <item.icon className="h-3 w-3 mr-1" />}
              {item.label}
            </Button>
          ) : (
            <span className="px-2 text-foreground font-medium">
              {item.icon && <item.icon className="h-3 w-3 mr-1 inline" />}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
