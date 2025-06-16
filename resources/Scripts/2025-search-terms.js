const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HJSnSyLR0XZMy7YAf5WPcLWnYZ-gzf0jbF6qaPKeZMI/edit?gid=186605690#gid=186605690'; // if a url isn't provided, create one & log the url to the console

const TAB = 'Search Terms';

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

function main() {
  const sheet = getOrCreateSheet();
  const rows = AdsApp.search(QUERY);
  const data = processRows(rows);
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  formatSheet(sheet);
}

function getOrCreateSheet() {
  let ss;
  if (!SHEET_URL) {
    ss = SpreadsheetApp.create("Search Terms Report");
    Logger.log("No SHEET_URL found, so this sheet was created: " + ss.getUrl());
  } else {
    ss = SpreadsheetApp.openByUrl(SHEET_URL);
  }
  let sheet = ss.getSheetByName(TAB);
  if (!sheet) {
    sheet = ss.insertSheet(TAB);
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
  const costRange = sheet.getRange(2, 6, sheet.getLastRow() - 1, 1); // Assuming 'Cost' is now the 6th column
  costRange.setNumberFormat('€#,##0.00');
  const cpcRange = sheet.getRange(2, 5, sheet.getLastRow() - 1, 1); // Assuming 'CPC' is now the 5th column
  cpcRange.setNumberFormat('€#,##0.00');
}
