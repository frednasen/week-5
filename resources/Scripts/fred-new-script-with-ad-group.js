// Script to extract ad group performance data
// This script queries ad group performance metrics for the last 30 days

// Add your Google Sheet URL here
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1l_bp46x6Efadivzts2BQMpiZ7dbjnN-s3X6xBWd327k/edit?usp=sharing';

const QUERY = `
SELECT
    ad_group.id,
    ad_group.name,
    campaign.name,
    segments.date,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.conversions_value
FROM ad_group
WHERE segments.date DURING LAST_30_DAYS
    AND ad_group.status = 'ENABLED'
ORDER BY segments.date DESC, metrics.cost_micros DESC
`;

function main() {
    // Create or open spreadsheet
    let ss;
    if (!SHEET_URL) {
        ss = SpreadsheetApp.create("Ad Group Performance Report - Daily");
        Logger.log("No SHEET_URL found, created new sheet: " + ss.getUrl());
    } else {
        try {
            ss = SpreadsheetApp.openByUrl(SHEET_URL);
        } catch (e) {
            Logger.log("Error opening sheet: " + e);
            return;
        }
    }
    
    const sheet = ss.getActiveSheet();
    
    // Set up headers
    const headers = [
        'Date',
        'Ad Group ID',
        'Ad Group Name',
        'Campaign Name',
        'Impressions',
        'Clicks',
        'Cost',
        'Conversions',
        'Conversion Value',
        'CPC',
        'CTR',
        'Conv. Rate',
        'CPA',
        'ROAS',
        'AOV'
    ];
    
    // Write headers to sheet
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Execute the query
    const rows = AdsApp.search(QUERY);
    
    // Log the first row structure for debugging
    if (rows.hasNext()) {
        const firstRow = rows.next();
        Logger.log("Sample row structure: " + JSON.stringify(firstRow));
    }
    
    // Reset the iterator by creating a new query
    const rowsForProcessing = AdsApp.search(QUERY);
    
    // Prepare data array for bulk writing
    const data = [];
    let count = 0;
    
    while (rowsForProcessing.hasNext()) {
        try {
            const row = rowsForProcessing.next();
            
            // Access metrics with proper nesting and type conversion
            const metrics = row.metrics || {};
            const impressions = Number(metrics.impressions) || 0;
            const clicks = Number(metrics.clicks) || 0;
            const costMicros = Number(metrics.costMicros) || 0;
            const cost = costMicros / 1000000; // Convert micros to actual currency
            const conversions = Number(metrics.conversions) || 0;
            const conversionValue = Number(metrics.conversionsValue) || 0;
            
            // Calculate additional metrics
            const cpc = clicks > 0 ? cost / clicks : 0;
            const ctr = impressions > 0 ? clicks / impressions : 0;
            const convRate = clicks > 0 ? conversions / clicks : 0;
            const cpa = conversions > 0 ? cost / conversions : 0;
            const roas = cost > 0 ? conversionValue / cost : 0;
            const aov = conversions > 0 ? conversionValue / conversions : 0;
            
            // Format date from YYYYMMDD to YYYY-MM-DD
            const dateStr = row.segments.date;
            const formattedDate = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            
            // Add row to data array
            data.push([
                formattedDate,
                row.adGroup.id,
                row.adGroup.name,
                row.campaign.name,
                impressions,
                clicks,
                cost,
                conversions,
                conversionValue,
                cpc,
                ctr,
                convRate,
                cpa,
                roas,
                aov
            ]);
            
            count++;
            
            // Log first 10 results for verification
            if (count <= 10) {
                Logger.log(`\nDate: ${formattedDate}`);
                Logger.log(`Ad Group: ${row.adGroup.name}`);
                Logger.log(`Campaign: ${row.campaign.name}`);
                Logger.log(`Impressions: ${impressions}`);
                Logger.log(`Clicks: ${clicks}`);
                Logger.log(`Cost: $${cost.toFixed(2)}`);
                Logger.log(`Conversions: ${conversions}`);
                Logger.log(`Conversion Value: $${conversionValue.toFixed(2)}`);
                Logger.log("------------------------");
            }
            
        } catch (e) {
            Logger.log("Error processing row: " + e);
            continue;
        }
    }
    
    // Write all data to sheet in one operation
    if (data.length > 0) {
        sheet.getRange(2, 1, data.length, headers.length).setValues(data);
    }
    
    // Log the spreadsheet URL
    Logger.log(`\nSpreadsheet URL: ${ss.getUrl()}`);
    Logger.log(`Total rows processed: ${count}`);
}
