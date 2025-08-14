import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// ✅ NOUVEAU : Composants de chargement réutilisables

// Skeleton pour les cartes de statistiques
export function StatsCardSkeleton() {
  return (
    <Card className="bg-gradient-card border shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-5" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

// Grille de cartes de statistiques en chargement
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <StatsCardSkeleton key={index} />
      ))}
    </div>
  )
}

// Skeleton pour les tableaux
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* En-têtes */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-24" />
        ))}
      </div>
      
      {/* Lignes */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-20" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Skeleton pour les cartes de contenu
export function ContentCardSkeleton() {
  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Grille de cartes de contenu en chargement
export function ContentGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <ContentCardSkeleton key={index} />
      ))}
    </div>
  )
}

// Skeleton pour le tableau de bord complet
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsGridSkeleton />
      
      {/* Stock Status Card */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardHeader>
      </Card>
      
      {/* Content Grid */}
      <ContentGridSkeleton />
    </div>
  )
}

// Skeleton pour les pages de liste
export function ListPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
      
      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton rows={8} columns={6} />
        </CardContent>
      </Card>
    </div>
  )
}

// Skeleton pour les modales
export function ModalSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      
      {/* Form Fields */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// Composant de chargement avec spinner
export function LoadingSpinner({ 
  size = 'default', 
  text = 'Chargement...',
  className = ''
}: {
  size?: 'sm' | 'default' | 'lg'
  text?: string
  className?: string
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-2 border-primary border-t-transparent rounded-full animate-spin mb-2`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}

// Composant de chargement avec barre de progression
export function LoadingBar({ 
  progress = 0, 
  text = 'Chargement...',
  className = ''
}: {
  progress?: number
  text?: string
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
    </div>
  )
}

// Composant de chargement avec dots animés
export function LoadingDots({ 
  text = 'Chargement',
  className = ''
}: {
  text?: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground">{text}</span>
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: `${index * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  )
}
