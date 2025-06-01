import { Campaign } from '@/lib/types'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { formatCurrency } from '@/lib/utils'

interface CampaignSelectProps {
  campaigns: Campaign[]
  selectedId?: string
  onSelect: (id: string) => void
}

export function CampaignSelect({ campaigns, selectedId, onSelect }: CampaignSelectProps) {
  const { settings } = useSettings()

  const isLoading = campaigns === undefined
  const noResults = campaigns && campaigns.length === 0

  // Determine if a filter is applied
  const filterText = typeof window !== 'undefined' ? (document.getElementById('campaign-filter-input') as HTMLInputElement)?.value : ''
  const hasFilter = filterText && filterText.trim().length > 0

  return (
    <div className="mb-8">
      <label htmlFor="campaign" className="block text-lg font-semibold text-gray-900 mb-3">
        Select Campaign
      </label>
      <select
        id="campaign"
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="block w-full px-4 py-3 text-base rounded-lg border border-gray-200 bg-white shadow-sm 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          hover:border-gray-300 transition-colors"
      >
        {/* All (filtered by ...) option if filter is applied and there are matches */}
        {hasFilter && campaigns.length > 0 && (
          <option value="">All (filtered by "{filterText}") Campaigns</option>
        )}
        {/* Default All Campaigns option if no filter */}
        {!hasFilter && <option value="">All Campaigns</option>}
        {isLoading && <option disabled>Loading...</option>}
        {noResults && <option disabled>No campaigns found</option>}
        {!isLoading && !noResults && campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name} ({formatCurrency(campaign.totalCost, settings.currency)})
          </option>
        ))}
      </select>
    </div>
  )
} 