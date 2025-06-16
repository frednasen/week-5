const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1QwJKNyJ4oZgj4vXo24NMa8rvEG8O_TyvrFu8kEWQ6Nw/edit?gid=0#gid=0';
const BRANDED_TAB = 'Shopping Branded';
const NON_BRANDED_TAB = 'Shopping Non-Branded';

const QUERY = `
SELECT 
    search_term_view.search_term,
    campaign.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.conversions_value
FROM search_term_view
WHERE segments.date DURING LAST_30_DAYS
    AND campaign.advertising_channel_type = "SHOPPING"
    AND campaign.name LIKE "%Standard Shopping%"
`;

function main() {
    // Open the spreadsheet
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    
    // Create or get sheets
    const brandedSheet = ss.getSheetByName(BRANDED_TAB) || ss.insertSheet(BRANDED_TAB);
    const nonBrandedSheet = ss.getSheetByName(NON_BRANDED_TAB) || ss.insertSheet(NON_BRANDED_TAB);
    
    // Clear existing content
    brandedSheet.clear();
    nonBrandedSheet.clear();
    
    // Get the data for sample row
    const sampleRows = AdsApp.search(QUERY);
    
    // Process and organize the data
    const brandedData = [];
    const nonBrandedData = [];
    
    // Log first row structure for debugging
    if (sampleRows.hasNext()) {
        const sampleRow = sampleRows.next();
        Logger.log("Sample row structure: " + JSON.stringify(sampleRow));
    }
    
    // Get the data for processing
    const rows = AdsApp.search(QUERY);
    
    while (rows.hasNext()) {
        try {
            const row = rows.next();
            const campaignName = row.campaign.name;
            const searchTerm = row.searchTermView.searchTerm;
            
            // Get metrics
            const metrics = row.metrics || {};
            const impressions = Number(metrics.impressions) || 0;
            const clicks = Number(metrics.clicks) || 0;
            const costMicros = Number(metrics.costMicros) || 0;
            const conversions = Number(metrics.conversions) || 0;
            const conversionValue = Number(metrics.conversionsValue) || 0;
            
            // Calculate derived metrics
            const cost = costMicros / 1000000;
            const cpc = clicks > 0 ? cost / clicks : 0;
            
            const dataRow = [
                searchTerm,
                impressions,
                clicks,
                cost,
                cpc,
                conversions,
                conversionValue
            ];
            
            // Sort into branded or non-branded based on campaign name
            if (campaignName.toLowerCase().includes('non')) {
                nonBrandedData.push(dataRow);
            } else {
                brandedData.push(dataRow);
            }
            
        } catch (e) {
            Logger.log("Error processing row: " + e);
            continue;
        }
    }
    
    // Prepare headers
    const header = ['Search Term', 'Impressions', 'Clicks', 'Cost', 'CPC', 'Conversions', 'Conversion Value'];
    
    // Process Branded Data
    const brandedAllData = [
        header,
        ...brandedData.sort((a, b) => b[2] - a[2])
    ];
    
    // Process Non-Branded Data
    const nonBrandedAllData = [
        header,
        ...nonBrandedData.sort((a, b) => b[2] - a[2])
    ];
    
    // Write to sheets
    if (brandedData.length > 0) {
        brandedSheet.getRange(1, 1, brandedAllData.length, 7).setValues(brandedAllData);
        brandedSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    }
    
    if (nonBrandedData.length > 0) {
        nonBrandedSheet.getRange(1, 1, nonBrandedAllData.length, 7).setValues(nonBrandedAllData);
        nonBrandedSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    }
    
    // Auto-resize columns for both sheets
    brandedSheet.autoResizeColumns(1, 7);
    nonBrandedSheet.autoResizeColumns(1, 7);
    
    // Add summary information
    const brandedSummary = [
        ['Branded Campaign Summary'],
        ['Total Search Terms', brandedData.length],
        ['Total Impressions', brandedData.reduce((sum, row) => sum + row[1], 0)],
        ['Total Clicks', brandedData.reduce((sum, row) => sum + row[2], 0)],
        ['Total Cost', brandedData.reduce((sum, row) => sum + row[3], 0)],
        ['Total Conversions', brandedData.reduce((sum, row) => sum + row[5], 0)],
        ['Total Conversion Value', brandedData.reduce((sum, row) => sum + row[6], 0)]
    ];
    
    const nonBrandedSummary = [
        ['Non-Branded Campaign Summary'],
        ['Total Search Terms', nonBrandedData.length],
        ['Total Impressions', nonBrandedData.reduce((sum, row) => sum + row[1], 0)],
        ['Total Clicks', nonBrandedData.reduce((sum, row) => sum + row[2], 0)],
        ['Total Cost', nonBrandedData.reduce((sum, row) => sum + row[3], 0)],
        ['Total Conversions', nonBrandedData.reduce((sum, row) => sum + row[5], 0)],
        ['Total Conversion Value', nonBrandedData.reduce((sum, row) => sum + row[6], 0)]
    ];
    
    // Write summaries
    if (brandedData.length > 0) {
        brandedSheet.getRange(brandedAllData.length + 2, 1, brandedSummary.length, 2).setValues(brandedSummary);
        brandedSheet.getRange(brandedAllData.length + 2, 1, 1, 2).merge();
        brandedSheet.getRange(brandedAllData.length + 2, 1).setFontWeight('bold');
    }
    
    if (nonBrandedData.length > 0) {
        nonBrandedSheet.getRange(nonBrandedAllData.length + 2, 1, nonBrandedSummary.length, 2).setValues(nonBrandedSummary);
        nonBrandedSheet.getRange(nonBrandedAllData.length + 2, 1, 1, 2).merge();
        nonBrandedSheet.getRange(nonBrandedAllData.length + 2, 1).setFontWeight('bold');
    }
} 