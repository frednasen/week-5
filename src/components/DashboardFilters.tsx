'use client'

import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { CampaignSelect } from "@/components/CampaignSelect"
import type { Campaign } from "@/lib/types"
import { DateRange } from "react-day-picker"
import { useState } from "react"
import { format, startOfToday, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

interface DashboardFiltersProps {
  onCampaignNameChange: (name: string) => void
  onDateRangeChange: (range: DateRange | undefined) => void
  dateRange: DateRange | undefined
  campaigns: Campaign[]
  selectedCampaignId: string
  onSelectCampaign: (id: string) => void
}

const quickSelects = [
  { label: 'Today', getRange: () => ({ from: startOfToday(), to: startOfToday() }) },
  { label: 'Yesterday', getRange: () => {
      const y = subDays(startOfToday(), 1); return { from: y, to: y };
    }
  },
  { label: 'Last 7 days', getRange: () => ({ from: subDays(startOfToday(), 6), to: startOfToday() }) },
  { label: 'Last 30 days', getRange: () => ({ from: subDays(startOfToday(), 29), to: startOfToday() }) },
  { label: 'This month', getRange: () => ({ from: startOfMonth(startOfToday()), to: endOfMonth(startOfToday()) }) },
  { label: 'Last month', getRange: () => {
      const lastMonth = subMonths(startOfMonth(startOfToday()), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
  },
]

export function DashboardFilters({ onCampaignNameChange, onDateRangeChange, dateRange }: DashboardFiltersProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(dateRange)

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedRange(range)
    onDateRangeChange(range)
  }

  const handleQuickSelect = (range: DateRange) => {
    setSelectedRange(range)
    onDateRangeChange(range)
  }

  const handleClear = () => {
    setSelectedRange(undefined)
    onDateRangeChange(undefined)
  }

  const rangeLabel = selectedRange?.from && selectedRange?.to
    ? `${format(selectedRange.from, 'MMM dd, yyyy')} - ${format(selectedRange.to, 'MMM dd, yyyy')}`
    : selectedRange?.from
      ? `${format(selectedRange.from, 'MMM dd, yyyy')}`
      : 'Select date range'

  return (
    <Card className="p-1 mb-4 max-w-7xl ml-0">
      <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
        {/* Left: Campaign Filters */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold mb-1 ml-1">Campaign Filter</div>
          <Input
            placeholder="Enter campaign name or keyword to filter"
            onChange={(e) => onCampaignNameChange(e.target.value)}
            className="w-full h-8 text-sm"
          />
        </div>
        {/* Right: Date Range Picker (Calendar) */}
        <div className="w-full md:w-auto flex flex-col items-end md:items-end">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center w-full px-2 py-1 border rounded bg-muted text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                type="button"
              >
                {rangeLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 mt-1 right-0 ml-auto">
              <div className="flex flex-row gap-2">
                {/* Quick Select Buttons */}
                <div className="flex flex-col gap-0.5 p-1 border-r bg-background">
                  {quickSelects.map(q => (
                    <button
                      key={q.label}
                      onClick={() => handleQuickSelect(q.getRange())}
                      className="px-1.5 py-0.5 border rounded text-xs bg-background hover:bg-accent"
                    >
                      {q.label}
                    </button>
                  ))}
                  <button onClick={handleClear} className="mt-1 text-xs text-muted-foreground hover:underline">Clear</button>
                </div>
                {/* Calendar */}
                <div className="p-1">
                  <Calendar
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleDateSelect}
                    numberOfMonths={2}
                    className="rounded-md border shadow-sm"
                    defaultMonth={selectedRange?.from || new Date()}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </Card>
  )
} 