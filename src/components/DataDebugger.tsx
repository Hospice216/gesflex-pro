import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bug, AlertTriangle, CheckCircle } from 'lucide-react'

interface DataDebuggerProps {
  data: any
  title?: string
}

export default function DataDebugger({ data, title = "Debug des Données" }: DataDebuggerProps) {
  const analyzeData = (obj: any, path: string = ''): Array<{ path: string; type: string; value: any; status: 'valid' | 'warning' | 'error' }> => {
    const results: Array<{ path: string; type: string; value: any; status: 'valid' | 'warning' | 'error' }> = []
    
    if (obj === null) {
      results.push({ path, type: 'null', value: obj, status: 'warning' })
    } else if (obj === undefined) {
      results.push({ path, type: 'undefined', value: obj, status: 'error' })
    } else if (typeof obj === 'string') {
      results.push({ 
        path, 
        type: 'string', 
        value: obj, 
        status: obj.length > 0 ? 'valid' : 'warning' 
      })
    } else if (typeof obj === 'number') {
      results.push({ 
        path, 
        type: 'number', 
        value: obj, 
        status: isNaN(obj) ? 'error' : 'valid' 
      })
    } else if (typeof obj === 'boolean') {
      results.push({ path, type: 'boolean', value: obj, status: 'valid' })
    } else if (Array.isArray(obj)) {
      results.push({ 
        path, 
        type: 'array', 
        value: `[${obj.length} éléments]`, 
        status: obj.length > 0 ? 'valid' : 'warning' 
      })
      // Analyser les premiers éléments du tableau
      obj.slice(0, 3).forEach((item, index) => {
        results.push(...analyzeData(item, `${path}[${index}]`))
      })
    } else if (typeof obj === 'object') {
      results.push({ 
        path, 
        type: 'object', 
        value: `{${Object.keys(obj).length} propriétés}`, 
        status: Object.keys(obj).length > 0 ? 'valid' : 'warning' 
      })
      // Analyser les propriétés de l'objet
      Object.entries(obj).forEach(([key, value]) => {
        results.push(...analyzeData(value, path ? `${path}.${key}` : key))
      })
    } else {
      results.push({ path, type: typeof obj, value: obj, status: 'warning' })
    }
    
    return results
  }

  const analysis = analyzeData(data)

  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
    }
  }

  const getStatusBadge = (status: 'valid' | 'warning' | 'error') => {
    return (
      <Badge variant={status === 'valid' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
        {status === 'valid' ? '✅ OK' : status === 'warning' ? '⚠️ Attention' : '❌ Erreur'}
      </Badge>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Total des propriétés analysées:</strong> {analysis.length}
          </div>
          <div>
            <strong>Propriétés valides:</strong> {analysis.filter(a => a.status === 'valid').length}
          </div>
          <div>
            <strong>Problèmes détectés:</strong> {analysis.filter(a => a.status !== 'valid').length}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Analyse détaillée :</h4>
          {analysis.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <div className="font-mono text-sm">{item.path || 'root'}</div>
                  <div className="text-xs text-muted-foreground">
                    Type: {item.type} | Valeur: {JSON.stringify(item.value).substring(0, 100)}
                  </div>
                </div>
              </div>
              {getStatusBadge(item.status)}
            </div>
          ))}
        </div>

        {analysis.some(a => a.status === 'error') && (
          <div className="p-4 bg-red-50 rounded-lg">
            <h5 className="font-medium text-red-900 mb-2">Problèmes critiques détectés :</h5>
            <ul className="text-sm text-red-800 space-y-1">
              {analysis.filter(a => a.status === 'error').map((item, index) => (
                <li key={index}>• {item.path || 'root'}: {item.type} - {JSON.stringify(item.value)}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.some(a => a.status === 'warning') && (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-2">Avertissements détectés :</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              {analysis.filter(a => a.status === 'warning').map((item, index) => (
                <li key={index}>• {item.path || 'root'}: {item.type} - {JSON.stringify(item.value)}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
