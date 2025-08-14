import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'

interface StoreSelectorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function StoreSelector({ 
  value, 
  onValueChange, 
  placeholder = "Sélectionner un magasin",
  className 
}: StoreSelectorProps) {
  const { userProfile } = useAuth()

  // Valeurs par défaut pour la sélection
  const defaultStores = [
    { value: 'all', label: 'Tous les magasins' },
    { value: 'current', label: 'Mon magasin principal' }
  ]

  // Si l'utilisateur a un magasin assigné, l'ajouter à la liste
  const availableStores = userProfile?.store_id 
    ? [
        ...defaultStores,
        { value: userProfile.store_id, label: 'Magasin assigné' }
      ]
    : defaultStores

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {availableStores.map((store) => (
          <SelectItem key={store.value} value={store.value}>
            {store.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
