'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import type { SearchTermMetric, TabData } from '@/lib/types'
import { calculateAllSearchTermMetrics, type CalculatedSearchTermMetric } from '@/lib/metrics'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SortField = keyof CalculatedSearchTermMetric
type SortDirection = 'asc' | 'desc'

export default function TermsPage() {
    const { settings, fetchedData, dataError, isDataLoading } = useSettings()
    const [sortField, setSortField] = useState<SortField>('cost')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [campaignFilter, setCampaignFilter] = useState('')
    const [rowsPerPage, setRowsPerPage] = useState(50)
    const [page, setPage] = useState(0)

    // --- Hooks called unconditionally at the top --- 
    const searchTermsRaw = useMemo(() => (fetchedData?.searchTerms || []) as SearchTermMetric[], [fetchedData]);

    // Calculate derived metrics for all terms using useMemo
    const calculatedSearchTerms = useMemo(() => {
        return calculateAllSearchTermMetrics(searchTermsRaw)
    }, [searchTermsRaw])

    // Filter by campaign name (multi-keyword AND)
    const filteredTerms = useMemo(() => {
        if (!campaignFilter.trim()) return calculatedSearchTerms
        const words = campaignFilter.toLowerCase().split(' ').filter(Boolean)
        return calculatedSearchTerms.filter(term =>
            words.every(word => term.campaign.toLowerCase().includes(word))
        )
    }, [calculatedSearchTerms, campaignFilter])

    // Sort data (now using calculated terms)
    const sortedTerms = useMemo(() => {
        return [...filteredTerms].sort((a, b) => {
            const aVal = a[sortField]
            const bVal = b[sortField]
            // Handle potential string sorting for non-numeric fields if necessary
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return aVal.localeCompare(bVal) * (sortDirection === 'asc' ? 1 : -1);
            }
            return (Number(aVal) - Number(bVal)) * (sortDirection === 'asc' ? 1 : -1)
        })
    }, [filteredTerms, sortField, sortDirection])
    // --- End of unconditional hooks ---

    // Pagination logic
    const totalRows = sortedTerms.length
    const totalPages = Math.ceil(totalRows / rowsPerPage)
    const pagedTerms = sortedTerms.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

    // Reset to first page if filter or rowsPerPage changes
    useEffect(() => { setPage(0) }, [campaignFilter, rowsPerPage])

    // Handle loading and error states *after* hooks
    if (dataError) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-4">Error loading data</div>
            </div>
        )
    }

    if (isDataLoading) {
        return <div className="p-8 text-center">Loading...</div>
    }

    const handleSort = (field: SortField) => {
        const isStringField = ['searchTerm', 'campaign', 'adGroup', 'keywordText'].includes(field);
        const defaultDirection = isStringField ? 'asc' : 'desc';

        if (field === sortField) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection(defaultDirection)
        }
    }

    const SortButton = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
        <Button
            variant="ghost"
            onClick={() => handleSort(field)}
            className="h-8 px-2 lg:px-3"
        >
            {children}
            {sortField === field && (
                <span className="ml-2">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
            )}
        </Button>
    )

    return (
        <div className="container mx-auto px-4 py-12 mt-16">
            <h1 className="text-3xl font-bold mb-12 text-gray-900">Search Terms</h1>

            <div className="flex items-center mb-4 gap-4">
                <Input
                    placeholder="Filter by campaign name..."
                    value={campaignFilter}
                    onChange={e => setCampaignFilter(e.target.value)}
                    className="w-80"
                />
                <div className="flex items-center gap-2">
                    <span className="text-sm">Rows per page:</span>
                    <select
                        value={rowsPerPage}
                        onChange={e => setRowsPerPage(Number(e.target.value))}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                    </select>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">
                                <SortButton field="searchTerm">Search Term</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="keywordText">Keyword</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="campaign">Campaign</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="adGroup">Ad Group</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="impr">Impr</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="clicks">Clicks</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="cost">Cost</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="conv">Conv</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="value">Value</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="CTR">CTR</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="CPC">CPC</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="CvR">CvR</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="CPA">CPA</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="ROAS">ROAS</SortButton>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pagedTerms.map((term, i) => (
                            <TableRow key={`${term.searchTerm}-${term.campaign}-${term.adGroup}-${i}-${term.keywordText}`}>
                                <TableCell className="font-medium">{term.searchTerm}</TableCell>
                                <TableCell>{term.keywordText || '-'}</TableCell>
                                <TableCell>{term.campaign}</TableCell>
                                <TableCell>{term.adGroup}</TableCell>
                                <TableCell className="text-right">{formatNumber(term.impr)}</TableCell>
                                <TableCell className="text-right">{formatNumber(term.clicks)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(term.cost, settings.currency)}</TableCell>
                                <TableCell className="text-right">{formatNumber(term.conv)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(term.value, settings.currency)}</TableCell>
                                <TableCell className="text-right">{formatPercent(term.CTR)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(term.CPC, settings.currency)}</TableCell>
                                <TableCell className="text-right">{formatPercent(term.CvR)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(term.CPA, settings.currency)}</TableCell>
                                <TableCell className="text-right">
                                    {(term.ROAS && isFinite(term.ROAS)) ? `${term.ROAS.toFixed(2)}x` : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                    Showing {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, totalRows)} of {totalRows} terms
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(0)}
                        disabled={page === 0}
                        className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                    >First</button>
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                    >Previous</button>
                    <span className="px-2 py-1 text-sm">Page {page + 1} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                    >Next</button>
                    <button
                        onClick={() => setPage(totalPages - 1)}
                        disabled={page >= totalPages - 1}
                        className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                    >Last</button>
                </div>
            </div>
        </div>
    )
} 