"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col md:flex-row gap-4 p-4">
            <div>
              <div className="mb-2 font-medium">Quick Select</div>
              <div className="flex flex-col gap-2">
                <Button variant="ghost" onClick={() => onChange({ from: new Date(), to: new Date() })}>Today</Button>
                <Button variant="ghost" onClick={() => {
                  const yesterday = addDays(new Date(), -1)
                  onChange({ from: yesterday, to: yesterday })
                }}>Yesterday</Button>
                <Button variant="ghost" onClick={() => onChange({ from: addDays(new Date(), -6), to: new Date() })}>Last 7 days</Button>
                <Button variant="ghost" onClick={() => onChange({ from: addDays(new Date(), -29), to: new Date() })}>Last 30 days</Button>
                <Button variant="ghost" onClick={() => {
                  const now = new Date()
                  onChange({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: now })
                }}>This month</Button>
                <Button variant="ghost" onClick={() => {
                  const now = new Date()
                  onChange({ from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) })
                }}>Last month</Button>
              </div>
            </div>
            <div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value?.from}
                selected={value}
                onSelect={onChange}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 