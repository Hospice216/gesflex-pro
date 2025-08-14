import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

// ✅ NOUVEAU : Système de validation des formulaires

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
  message?: string
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule
}

export interface ValidationResult {
  isValid: boolean
  errors: { [fieldName: string]: string }
  touched: { [fieldName: string]: boolean }
}

export interface FormValidatorProps {
  rules: ValidationRules
  initialValues?: { [key: string]: any }
  onSubmit?: (values: any, isValid: boolean) => void
  children: (props: FormValidatorRenderProps) => React.ReactNode
}

export interface FormValidatorRenderProps {
  values: { [key: string]: any }
  errors: { [fieldName: string]: string }
  touched: { [fieldName: string]: boolean }
  isValid: boolean
  handleChange: (fieldName: string, value: any) => void
  handleBlur: (fieldName: string) => void
  handleSubmit: () => void
  resetForm: () => void
  setFieldValue: (fieldName: string, value: any) => void
  setFieldError: (fieldName: string, error: string) => void
}

export function FormValidator({ 
  rules, 
  initialValues = {}, 
  onSubmit,
  children 
}: FormValidatorProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<{ [fieldName: string]: string }>({})
  const [touched, setTouched] = useState<{ [fieldName: string]: boolean }>({})

  // Validation d'un champ spécifique
  const validateField = (fieldName: string, value: any): string => {
    const rule = rules[fieldName]
    if (!rule) return ''

    // Validation required
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rule.message || `${fieldName} est requis`
    }

    // Validation minLength
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `${fieldName} doit contenir au moins ${rule.minLength} caractères`
    }

    // Validation maxLength
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `${fieldName} doit contenir au maximum ${rule.maxLength} caractères`
    }

    // Validation pattern
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || `${fieldName} n'est pas au bon format`
    }

    // Validation custom
    if (rule.custom) {
      const customResult = rule.custom(value)
      if (typeof customResult === 'string') {
        return customResult
      }
      if (!customResult) {
        return rule.message || `${fieldName} n'est pas valide`
      }
    }

    return ''
  }

  // Validation de tous les champs
  const validateAll = (): { [fieldName: string]: string } => {
    const newErrors: { [fieldName: string]: string } = {}
    
    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName])
      if (error) {
        newErrors[fieldName] = error
      }
    })

    setErrors(newErrors)
    return newErrors
  }

  // Gestion du changement de valeur
  const handleChange = (fieldName: string, value: any) => {
    const newValues = { ...values, [fieldName]: value }
    setValues(newValues)

    // Validation en temps réel si le champ a été touché
    if (touched[fieldName]) {
      const error = validateField(fieldName, value)
      setErrors(prev => ({ ...prev, [fieldName]: error }))
    }
  }

  // Gestion de la perte de focus
  const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
    
    const error = validateField(fieldName, values[fieldName])
    setErrors(prev => ({ ...prev, [fieldName]: error }))
  }

  // Gestion de la soumission
  const handleSubmit = () => {
    const newErrors = validateAll()
    const isValid = Object.keys(newErrors).length === 0

    // Marquer tous les champs comme touchés
    const newTouched: { [fieldName: string]: boolean } = {}
    Object.keys(rules).forEach(fieldName => {
      newTouched[fieldName] = true
    })
    setTouched(newTouched)

    if (onSubmit) {
      onSubmit(values, isValid)
    }
  }

  // Réinitialisation du formulaire
  const resetForm = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  // Définir la valeur d'un champ
  const setFieldValue = (fieldName: string, value: any) => {
    handleChange(fieldName, value)
  }

  // Définir l'erreur d'un champ
  const setFieldError = (fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }))
  }

  // Calculer si le formulaire est valide
  const isValid = Object.keys(errors).length === 0 && Object.keys(touched).length > 0

  const renderProps: FormValidatorRenderProps = {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError
  }

  return <>{children(renderProps)}</>
}

// Composant de champ de formulaire avec validation
interface FormFieldProps {
  name: string
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
  value: any
  error?: string
  touched?: boolean
  onChange: (value: any) => void
  onBlur: () => void
  required?: boolean
  disabled?: boolean
  className?: string
}

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  options = [],
  value,
  error,
  touched,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  className = ''
}: FormFieldProps) {
  const hasError = touched && error
  const isValid = touched && !error && value

  const getInputElement = () => {
    const commonProps = {
      id: name,
      name,
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        onChange(e.target.value)
      },
      onBlur,
      placeholder,
      disabled,
      className: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
        hasError 
          ? 'border-destructive focus:border-destructive' 
          : isValid 
            ? 'border-green-500 focus:border-green-500' 
            : 'border-input focus:border-primary'
      } ${className}`
    }

    switch (type) {
      case 'textarea':
        return <textarea {...commonProps} rows={4} />
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Sélectionner...</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      default:
        return <input {...commonProps} type={type} />
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      
      {getInputElement()}
      
      {/* Indicateur de statut */}
      <div className="flex items-center gap-2">
        {hasError && (
          <div className="flex items-center gap-1 text-destructive text-sm">
            <XCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {isValid && (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Valide
          </div>
        )}
        
        {touched && !error && !value && (
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <AlertCircle className="w-4 h-4" />
            Requis
          </div>
        )}
      </div>
    </div>
  )
}

// Composant de bouton de soumission avec état de chargement
interface SubmitButtonProps {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  onClick?: () => void
}

export function SubmitButton({
  children,
  loading = false,
  disabled = false,
  variant = 'default',
  size = 'default',
  className = '',
  onClick
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === 'default' ? 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/20' :
        variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive/20' :
        variant === 'outline' ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-primary/20' :
        variant === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary/20' :
        variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground focus:ring-primary/20' :
        'text-primary underline-offset-4 hover:underline focus:ring-primary/20'
      } ${
        size === 'sm' ? 'text-sm px-3 py-1.5' :
        size === 'lg' ? 'text-lg px-6 py-3' :
        size === 'icon' ? 'w-10 h-10 p-0' :
        'text-base px-4 py-2'
      } ${className}`}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
