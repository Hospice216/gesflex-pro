import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Line } from 'recharts'
import { useCurrency } from '@/hooks/useCurrency'

interface StoreData {
  name: string
  sales: number
  revenue: number
  avgTicket: number
  growth: number
}

interface StoreChartProps {
  data: StoreData[]
  title: string
  type?: 'bar' | 'radar' | 'composed'
}

export function StoreChart({ data, title, type = 'bar' }: StoreChartProps) {
  const { formatAmount } = useCurrency()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-primary">
            Ventes: {data.sales}
          </p>
          <p className="text-success">
            CA: {formatAmount(data.revenue)}
          </p>
          <p className="text-warning">
            Panier moyen: {formatCurrency(data.avgTicket)}
          </p>
          <p className={`${data.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
            Croissance: {data.growth >= 0 ? '+' : ''}{data.growth}%
          </p>
        </div>
      )
    }
    return null
  }

  if (type === 'radar') {
    return (
      <div className="w-full h-80">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Radar
              name="Performance"
              dataKey="revenue"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'composed') {
    return (
      <div className="w-full h-80">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
              yAxisId="left"
            tickFormatter={(value) => (value as number).toLocaleString()}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
              yAxisId="right"
              orientation="right"
               tickFormatter={(value) => formatAmount(value as number)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="sales" 
              fill="#10b981" 
              yAxisId="left"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              strokeWidth={2}
              yAxisId="right"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="w-full h-80">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="name" 
            className="text-xs"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatAmount(value as number)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="revenue" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
} 