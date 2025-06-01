import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Campaign } from "@/lib/types"

interface CampaignFilterProps {
    campaigns: Campaign[]
    selectedId: string
    onSelect: (id: string) => void
    onFilterChange: (value: string) => void
    filterValue: string
}

export function CampaignFilter({
    campaigns,
    selectedId,
    onSelect,
    onFilterChange,
    filterValue
}: CampaignFilterProps) {
    return (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-end gap-4">
                <div className="flex-1">
                    <Label htmlFor="campaign-filter" className="text-sm font-medium">Campaign Filter</Label>
                    <Input
                        id="campaign-filter"
                        placeholder="Filter campaigns..."
                        value={filterValue}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="mt-1"
                    />
                </div>
                <div className="flex-1">
                    <Label htmlFor="campaign-select" className="text-sm font-medium">Select Campaign</Label>
                    <select
                        id="campaign-select"
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                        value={selectedId}
                        onChange={(e) => onSelect(e.target.value)}
                    >
                        <option value="">All Campaigns</option>
                        {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
} 