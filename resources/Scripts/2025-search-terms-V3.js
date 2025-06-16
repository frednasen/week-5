const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HJSnSyLR0XZMy7YAf5WPcLWnYZ-gzf0jbF6qaPKeZMI/edit?gid=186605690#gid=186605690';

const OVERVIEW_TAB = 'Overview';
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
    AND campaign.advertising_channel_type = "SEARCH"
  ORDER BY metrics.cost_micros DESC
`;

// Add date range parameters
const DATE_RANGE = {
  startDate: new Date(new Date().setDate(new Date().getDate() - 60)),
  endDate: new Date()
};

function main() {
  const sheet = getOrCreateSheet();
  const rows = AdsApp.search(QUERY, DATE_RANGE);
  const data = processRows(rows);
  
  // Create overview tab with all data
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  formatSheet(sheet);
  
  // Create separate tabs for each campaign
  createCampaignTabs(data);
}

function getOrCreateSheet() {
  let ss;
  if (!SHEET_URL) {
    ss = SpreadsheetApp.create("Search Terms Report");
    Logger.log("No SHEET_URL found, so this sheet was created: " + ss.getUrl());
  } else {
    ss = SpreadsheetApp.openByUrl(SHEET_URL);
  }
  
  // Create or get overview tab
  let sheet = ss.getSheetByName(OVERVIEW_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(OVERVIEW_TAB);
  }
  return sheet;
}

function processRows(rows) {
  const data = [];
  const headers = ["Search Term", "Campaign Name", "Impressions", "Clicks", "CPC", "Cost", "Conversions", "Conversion Value"];
  data.push(headers);
  while (rows.hasNext()) {
    const row = rows.next();
    const searchTerm = row.searchTermView ? row.searchTermView.searchTerm : 'N/A';
    const campaignName = row.campaign ? row.campaign.name : 'N/A';
    const impressions = Number(row.metrics.impressions) || 0;
    const clicks = Number(row.metrics.clicks) || 0;
    const costMicros = Number(row.metrics.costMicros) || 0;
    const conversions = Number(row.metrics.conversions) || 0;
    const conversionValue = Number(row.metrics.conversionsValue) || 0;
    const cost = costMicros / 1000000;
    const cpc = clicks > 0 ? cost / clicks : 0;
    data.push([searchTerm, campaignName, impressions, clicks, cpc, cost, conversions, conversionValue]);
  }
  return data;
}

function formatSheet(sheet) {
  const costRange = sheet.getRange(2, 6, sheet.getLastRow() - 1, 1);
  costRange.setNumberFormat('€#,##0.00');
  const cpcRange = sheet.getRange(2, 5, sheet.getLastRow() - 1, 1);
  cpcRange.setNumberFormat('€#,##0.00');
}

function createCampaignTabs(data) {
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  const headers = data[0];
  
  // Get unique campaign names (skip header row)
  const campaignNames = [...new Set(data.slice(1).map(row => row[1]))];
  
  // Create a tab for each campaign
  campaignNames.forEach(campaignName => {
    // Skip if campaign name is N/A
    if (campaignName === 'N/A') return;
    
    // Create or get campaign tab
    let campaignSheet = ss.getSheetByName(campaignName);
    if (!campaignSheet) {
      campaignSheet = ss.insertSheet(campaignName);
    } else {
      campaignSheet.clear();
    }
    
    // Filter data for this campaign
    const campaignData = data.filter(row => row[1] === campaignName);
    
    // Add data to campaign tab
    campaignSheet.getRange(1, 1, campaignData.length, headers.length).setValues(campaignData);
    
    // Format the campaign tab
    formatSheet(campaignSheet);
  });
} 