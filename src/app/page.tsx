// src/app/page.tsx

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { getCampaigns } from '@/lib/sheetsData'
import type { AdMetric, DailyMetrics, TabData } from '@/lib/types'
import { calculateDailyMetrics } from '@/lib/metrics'
import { MetricCard } from '@/components/MetricCard'
import { MetricsChart } from '@/components/MetricsChart'
import { CampaignSelect } from '@/components/CampaignSelect'
import { formatCurrency, formatPercent, formatConversions } from '@/lib/utils'
import { COLORS } from '@/lib/config'
import { DashboardFilters } from '@/components/DashboardFilters'
import { DateRange } from "react-day-picker"

type DisplayMetric = 'impr' | 'clicks' | 'CTR' | 'CPC' | 'cost' |
    'conv' | 'CvR' | 'CPA' | 'value' | 'ROAS'

const metricConfig = {
    impr: { label: 'Impressions', format: (v: number) => v.toLocaleString(), row: 1, variant: 'performance' },
    clicks: { label: 'Clicks', format: (v: number) => v.toLocaleString(), row: 1, variant: 'performance' },
    CTR: { label: 'CTR', format: formatPercent, row: 2, variant: 'performance' },
    CPC: { label: 'CPC', format: (v: number, currency: string) => formatCurrency(v, currency), row: 2, variant: 'performance' },
    cost: { label: 'Cost', format: (v: number, currency: string) => formatCurrency(v, currency), row: 1, variant: 'cost' },
    conv: { label: 'Conv', format: formatConversions, row: 1, variant: 'conversion' },
    CvR: { label: 'Conv Rate', format: formatPercent, row: 2, variant: 'conversion' },
    CPA: { label: 'CPA', format: (v: number, currency: string) => formatCurrency(v, currency), row: 2, variant: 'cost' },
    value: { label: 'Value', format: (v: number, currency: string) => formatCurrency(v, currency), row: 1, variant: 'conversion' },
    ROAS: { label: 'ROAS', format: (v: number) => v.toFixed(2) + 'x', row: 2, variant: 'conversion' }
} as const

const aggregateMetricsByDate = (data: AdMetric[]): AdMetric[] => {
    const metricsByDate = data.reduce((acc, metric) => {
        const date = metric.date
        if (!acc[date]) {
            acc[date] = {
                campaign: 'All Campaigns',
                campaignId: '',
                date,
                impr: 0,
                clicks: 0,
                cost: 0,
                conv: 0,
                value: 0,
            }
        }
        acc[date].impr += metric.impr
        acc[date].clicks += metric.clicks
        acc[date].cost += metric.cost
        acc[date].conv += metric.conv
        acc[date].value += metric.value
        return acc
    }, {} as Record<string, AdMetric>)

    return Object.values(metricsByDate).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )
}

// Helper to aggregate metrics by date (and campaign if selected)
function aggregateByDate(metrics: AdMetric[]): AdMetric[] {
    const byDate: Record<string, AdMetric> = {};
    for (const m of metrics) {
        const key = m.date.slice(0, 10); // YYYY-MM-DD
        if (!byDate[key]) {
            byDate[key] = { ...m };
        } else {
            byDate[key].impr += m.impr;
            byDate[key].clicks += m.clicks;
            byDate[key].cost += m.cost;
            byDate[key].conv += m.conv;
            byDate[key].value += m.value;
        }
    }
    return Object.values(byDate);
}

export default function DashboardPage() {
    const { settings, fetchedData, dataError, isDataLoading, campaigns } = useSettings()
    const [selectedMetrics, setSelectedMetrics] = useState<[DisplayMetric, DisplayMetric]>(['conv', 'value'])
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
    const [campaignNameFilter, setCampaignNameFilter] = useState('')
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

    // Filter campaigns based on name
    const filteredCampaigns = useMemo(() => {
        if (!campaigns) return [];
        const words = campaignNameFilter
            .toLowerCase()
            .split(' ')
            .filter(Boolean);
        if (words.length === 0) return campaigns;
        return campaigns.filter(campaign =>
            words.every(word => campaign.name.toLowerCase().includes(word))
        );
    }, [campaigns, campaignNameFilter]);

    // Determine which campaigns to filter by
    const filteredCampaignIds = useMemo(() => {
        if (selectedCampaignId) return [selectedCampaignId];
        return filteredCampaigns.map(c => c.id);
    }, [selectedCampaignId, filteredCampaigns]);

    const campaignFilteredMetrics = filteredCampaignIds.length > 0
        ? (fetchedData?.daily || []).filter(d => filteredCampaignIds.includes(d.campaignId))
        : (fetchedData?.daily || []);

    const aggregatedMetrics = aggregateByDate(campaignFilteredMetrics);

    const dailyMetrics = calculateDailyMetrics(aggregatedMetrics);

    // Filter dailyMetrics by date range
    const filteredDailyMetrics = useMemo(() => {
        if (!dateRange?.from && !dateRange?.to) return dailyMetrics
        return dailyMetrics.filter(metric => {
            const metricDateStr = metric.date.slice(0, 10)
            const fromStr = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : undefined
            const toStr = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : undefined
            if (fromStr && toStr) {
                return metricDateStr >= fromStr && metricDateStr <= toStr
            } else if (fromStr) {
                return metricDateStr === fromStr
            } else if (toStr) {
                return metricDateStr === toStr
            }
            return true
        })
    }, [dailyMetrics, dateRange])

    const calculateTotals = () => {
        if (filteredDailyMetrics.length === 0) return null

        const sums = filteredDailyMetrics.reduce((acc, d) => ({
            impr: acc.impr + d.impr,
            clicks: acc.clicks + d.clicks,
            cost: acc.cost + d.cost,
            conv: acc.conv + d.conv,
            value: acc.value + d.value,
        }), {
            impr: 0, clicks: 0, cost: 0, conv: 0, value: 0,
        })

        return {
            ...sums,
            CTR: (sums.impr ? (sums.clicks / sums.impr) * 100 : 0),
            CPC: (sums.clicks ? sums.cost / sums.clicks : 0),
            CvR: (sums.clicks ? (sums.conv / sums.clicks) * 100 : 0),
            CPA: (sums.conv ? sums.cost / sums.conv : 0),
            ROAS: (sums.cost ? sums.value / sums.cost : 0),
        }
    }

    const handleMetricClick = (metric: DisplayMetric) => {
        setSelectedMetrics(prev => [prev[1], metric])
    }

    const handleCampaignNameFilterChange = (value: string) => {
        setCampaignNameFilter(value)
        setSelectedCampaignId('')
    }

    if (isDataLoading) return <DashboardLayout>Loading...</DashboardLayout>
    if (!settings.sheetUrl) return <DashboardLayout>Please configure your Google Sheet URL in settings</DashboardLayout>
    if (dataError) return <DashboardLayout error={'Failed to load data. Please check your Sheet URL.'}><></></DashboardLayout>
    if (dailyMetrics.length === 0 && !isDataLoading) return <DashboardLayout>No data found</DashboardLayout>

    const totals = calculateTotals()
    if (!totals) return null

    return (
        <DashboardLayout error={dataError ? 'Failed to load data. Please check your Sheet URL.' : undefined}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Filters */}
                    <div className="lg:col-span-1">
                        <DashboardFilters 
                            onCampaignNameChange={handleCampaignNameFilterChange}
                            onDateRangeChange={setDateRange}
                            dateRange={dateRange}
                            campaigns={filteredCampaigns}
                            selectedCampaignId={selectedCampaignId}
                            onSelectCampaign={setSelectedCampaignId}
                        />
                    </div>

                    {/* Right Column: Metrics and Charts */}
                    <div className="lg:col-span-2">
                        {[1, 2].map(row => (
                            <div key={row} className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
                                {Object.entries(metricConfig)
                                    .filter(([_, config]) => config.row === row)
                                    .map(([key, config]) => (
                                        <MetricCard
                                            key={key}
                                            label={config.label}
                                            value={config.format(totals[key as DisplayMetric], settings.currency)}
                                            isSelected={selectedMetrics.includes(key as DisplayMetric)}
                                            onClick={() => handleMetricClick(key as DisplayMetric)}
                                            variant={config.variant}
                                        />
                                    ))}
                            </div>
                        ))}

                        <MetricsChart
                            data={filteredDailyMetrics}
                            metric1={{
                                key: selectedMetrics[0],
                                label: metricConfig[selectedMetrics[0]].label,
                                color: COLORS.primary,
                                format: (v: number) => metricConfig[selectedMetrics[0]].format(v, settings.currency)
                            }}
                            metric2={{
                                key: selectedMetrics[1],
                                label: metricConfig[selectedMetrics[1]].label,
                                color: COLORS.secondary,
                                format: (v: number) => metricConfig[selectedMetrics[1]].format(v, settings.currency)
                            }}
                        />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

function DashboardLayout({ children, error }: { children: React.ReactNode, error?: string }) {
    return (
        <div className="container mx-auto px-4 py-12 mt-16">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Build the Agent - Participant Starter Agent</h1>
            </div>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {children}
        </div>
    )
}