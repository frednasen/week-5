import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  isSelected?: boolean
  onClick?: () => void
  variant?: 'default' | 'cost' | 'performance' | 'conversion'
}

export function MetricCard({ label, value, isSelected, onClick, variant = 'default' }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 cursor-pointer transition-all",
        isSelected ? "border-primary shadow-md" : "border-border hover:border-primary/50",
        variant === 'cost' && "bg-red-50 border-red-200 hover:border-red-300",
        variant === 'performance' && "bg-green-50 border-green-200 hover:border-green-300",
        variant === 'conversion' && "bg-yellow-50 border-yellow-200 hover:border-yellow-300"
      )}
      onClick={onClick}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  )
} 