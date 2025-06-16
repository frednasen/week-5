'use client'

import './ui/calendar.css'
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { CampaignSelect } from "@/components/CampaignSelect"
import type { Campaign } from "@/lib/types"
import { DateRange } from "react-day-picker"
import { useState } from "react"
import { format, startOfToday, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"

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

export function DashboardFilters({ onCampaignNameChange, onDateRangeChange, dateRange, campaigns, selectedCampaignId, onSelectCampaign }: DashboardFiltersProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(dateRange)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedRange(range)
    onDateRangeChange(range)
    setIsPopoverOpen(false)
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
    <div className="space-y-4">
      {/* Campaign Filter and Select Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <div className="text-base font-semibold mb-2">Campaign Filter</div>
            <Input
              placeholder="Enter campaign name or keyword to filter"
              onChange={(e) => onCampaignNameChange(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <CampaignSelect
              campaigns={campaigns}
              selectedId={selectedCampaignId}
              onSelect={onSelectCampaign}
            />
          </div>
        </div>
      </Card>

      {/* Calendar Button and Popover (custom, not using Popover component) */}
      <div>
        <div className="relative inline-block">
          <button
            className="flex items-center justify-center px-4 py-2 border rounded bg-muted text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
            type="button"
            onClick={() => setIsPopoverOpen((open) => !open)}
          >
            {rangeLabel}
          </button>
          {isPopoverOpen && (
            <div className="w-auto p-0 mt-1 z-[9999] absolute">
              <div style={{ maxWidth: 340 }}>
                <Calendar
                  mode="range"
                  selected={selectedRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  className="rounded-md border shadow-sm dashboard-calendar-compact"
                  defaultMonth={selectedRange?.from || new Date()}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 