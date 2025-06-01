'use client'

import { useState, useMemo } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { DateRange } from 'react-day-picker'
import { CampaignFilter } from '@/components/CampaignFilter'
import { DashboardFilters } from '@/components/DashboardFilters'
import { MetricCard } from '@/components/MetricCard'
import { MetricsChart } from '@/components/MetricsChart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatPercent, formatConversions } from '@/lib/utils'
import { COLORS } from '@/lib/config'

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

function DashboardLayout({ children, error }: { children: React.ReactNode, error?: string }) {
    return (
        <div className="container mx-auto px-4 py-12 mt-16">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Ad Groups</h1>
            </div>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {children}
        </div>
    )
}

export default function AdGroupsPage() {
    const { settings, fetchedData, dataError, isDataLoading, campaigns } = useSettings()
    const [selectedMetrics, setSelectedMetrics] = useState<[DisplayMetric, DisplayMetric]>(['cost', 'value'])
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
    const [campaignNameFilter, setCampaignNameFilter] = useState('')
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
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

    // Filter ad groups based on selected campaign
    const filteredAdGroups = useMemo(() => {
        if (!fetchedData?.adGroups) return [];
        if (selectedCampaignId) {
            return fetchedData.adGroups.filter(group => group.campaignId === selectedCampaignId);
        }
        return fetchedData.adGroups;
    }, [fetchedData?.adGroups, selectedCampaignId]);

    // Calculate daily metrics for the chart
    const filteredDailyMetrics = useMemo(() => {
        if (!fetchedData?.daily) return [];
        let metrics = fetchedData.daily;
        if (selectedCampaignId) {
            metrics = metrics.filter(m => m.campaignId === selectedCampaignId);
        }
        return metrics;
    }, [fetchedData?.daily, selectedCampaignId]);

    // Calculate totals for metric cards
    const totals = useMemo(() => {
        if (filteredAdGroups.length === 0) return null;

        const sums = filteredAdGroups.reduce((acc, group) => ({
            impr: acc.impr + group.impr,
            clicks: acc.clicks + group.clicks,
            cost: acc.cost + group.cost,
            conv: acc.conv + group.conv,
            value: acc.value + group.value,
        }), {
            impr: 0, clicks: 0, cost: 0, conv: 0, value: 0,
        });

        return {
            ...sums,
            CTR: (sums.impr ? (sums.clicks / sums.impr) * 100 : 0),
            CPC: (sums.clicks ? sums.cost / sums.clicks : 0),
            CvR: (sums.clicks ? (sums.conv / sums.clicks) * 100 : 0),
            CPA: (sums.conv ? sums.cost / sums.conv : 0),
            ROAS: (sums.cost ? sums.value / sums.cost : 0),
        };
    }, [filteredAdGroups]);

    const handleMetricClick = (metric: DisplayMetric) => {
        setSelectedMetrics(prev => [prev[1], metric]);
    };

    if (isDataLoading) return <DashboardLayout>Loading...</DashboardLayout>
    if (!settings.sheetUrl) return <DashboardLayout>Please configure your Google Sheet URL in settings</DashboardLayout>
    if (dataError) return <DashboardLayout error={'Failed to load data. Please check your Sheet URL.'}><></></DashboardLayout>
    if (!totals) return <DashboardLayout>No data found</DashboardLayout>

    return (
        <DashboardLayout error={dataError ? 'Failed to load data. Please check your Sheet URL.' : undefined}>
            <div className="space-y-6">
                <DashboardFilters 
                    onCampaignNameChange={setCampaignNameFilter}
                    onDateRangeChange={setDateRange}
                    dateRange={dateRange}
                    campaigns={filteredCampaigns}
                    selectedCampaignId={selectedCampaignId}
                    onSelectCampaign={setSelectedCampaignId}
                />

                {[1, 2].map(row => (
                    <div key={row} className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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

                <CampaignFilter
                    campaigns={filteredCampaigns}
                    selectedId={selectedCampaignId}
                    onSelect={setSelectedCampaignId}
                    onFilterChange={setCampaignNameFilter}
                    filterValue={campaignNameFilter}
                />

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campaign</TableHead>
                                <TableHead>Ad Group</TableHead>
                                <TableHead className="text-right">Impr.</TableHead>
                                <TableHead className="text-right">Clicks</TableHead>
                                <TableHead className="text-right">CTR</TableHead>
                                <TableHead className="text-right">CPC</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead className="text-right">Conv.</TableHead>
                                <TableHead className="text-right">Conv. Rate</TableHead>
                                <TableHead className="text-right">CPA</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead className="text-right">ROAS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAdGroups.map((group) => (
                                <TableRow key={group.campaignId + group.adGroupId}>
                                    <TableCell>{group.campaign}</TableCell>
                                    <TableCell>{group.adGroup}</TableCell>
                                    <TableCell className="text-right">{group.impr.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{group.clicks.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{formatPercent(group.ctr)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(group.cpc, settings.currency)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(group.cost, settings.currency)}</TableCell>
                                    <TableCell className="text-right">{formatConversions(group.conv)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(group.convRate)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(group.cpa, settings.currency)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(group.value, settings.currency)}</TableCell>
                                    <TableCell className="text-right">{group.roas.toFixed(2)}x</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DashboardLayout>
    )
} 