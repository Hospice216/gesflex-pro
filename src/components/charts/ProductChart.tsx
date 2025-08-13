import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useCurrency } from '@/hooks/useCurrency'

interface ProductData {
  name: string
  quantity: number
  revenue: number
  margin: number
}

interface ProductChartProps {
  data: ProductData[]
  title: string
  type?: 'bar' | 'pie'
  dataKey?: 'quantity' | 'revenue' | 'margin'
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

export function ProductChart({ data, title, type = 'bar', dataKey = 'revenue' }: ProductChartProps) {
  const { formatAmount } = useCurrency()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-primary">
            Quantité: {data.quantity}
          </p>
          <p className="text-success">
            CA: {formatAmount(data.revenue)}
          </p>
          <p className="text-warning">
            Marge: {data.margin}%
          </p>
        </div>
      )
    }
    return null
  }

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary">
            {dataKey === 'quantity' ? 'Quantité' : dataKey === 'revenue' ? 'CA' : 'Marge'}: {dataKey === 'revenue' ? formatAmount(data[dataKey]) : data[dataKey]}
          </p>
        </div>
      )
    }
    return null
  }

  if (type === 'pie') {
    return (
      <div className="w-full h-80">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
            <Legend />
          </PieChart>
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
            tickFormatter={(value) => dataKey === 'revenue' ? formatAmount(value as number) : (value as number).toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey={dataKey} 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
} 