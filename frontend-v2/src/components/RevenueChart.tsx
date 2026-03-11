"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart"

interface RevenuePoint {
  time: string
  amount: number
}

interface RevenueChartProps {
  data: RevenuePoint[]
  title?: string
  description?: string
  total?: number
}

export function RevenueChart({ data, title = "Evoluție Încasări", description = "Suma cumulată pe parcursul zilei", total }: RevenueChartProps) {
  const config: ChartConfig = {
    amount: {
      label: "RON",
      color: "hsl(var(--primary))",
    },
  }

  // Ensure high contrast for the line and area
  const chartColor = "#0ea5e9" // sky-500

  return (
    <Card className="w-full bg-white/70 backdrop-blur-xl border-white shadow-xl shadow-sky-900/5 rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black text-slate-800 tracking-tight">{title}</CardTitle>
            <CardDescription className="text-slate-500 font-medium">{description}</CardDescription>
          </div>
          {total !== undefined && (
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Azi</div>
              <div className="text-2xl font-black text-sky-600">{total.toFixed(0)} <span className="text-sm font-bold opacity-50 italic">RON</span></div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
          <AreaChart
            data={data}
            margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fontWeight: 800, fill: '#64748b' }}
              tickMargin={12}
              interval={3} // Show a label every 2 hours (0, 2, 4...)
              minTickGap={10}
            />
            <YAxis
              hide={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }}
              domain={[0, 'auto']}
              width={45}
              tickFormatter={(val) => `${val}`}
            />
            <ChartTooltip
              cursor={true}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-sky-100 flex flex-col gap-1 min-w-[120px]">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ora {payload[0].payload.time}</div>
                      <div className="text-xl font-black text-sky-600 leading-none">
                        {payload[0].value} <span className="text-[10px] italic opacity-70">RON</span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="stepAfter"
              dataKey="amount"
              stroke={chartColor}
              strokeWidth={5}
              fill="url(#fillAmount)"
              fillOpacity={1}
              stackId="a"
              animationDuration={1000}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
