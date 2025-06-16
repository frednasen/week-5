// Configuration variables
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HJSnSyLR0XZMy7YAf5WPcLWnYZ-gzf0jbF6qaPKeZMI/edit?gid=638259660#gid=638259660';
const OPENAI_MODEL = 'gpt-4o-mini';

function main() {
  try {
    // 1. Fetch search terms from Google Sheet
    const searchTerms = getSearchTerms();
    
    // 2. Classify search terms using OpenAI
    const classifiedTerms = classifyWithOpenAI(searchTerms);
    
    // 3. Write results to Google Sheet
    writeToSheet(searchTerms, classifiedTerms);
    
    // 4. Log summary
    Logger.log('Classification complete. Processed ' + searchTerms.length + ' search terms.');
  } catch (error) {
    Logger.log('Error: ' + error);
  }
}

function getSearchTerms() {
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL);
  const range = sheet.getRangeByName('topTerms');
  return range.getValues().flat();
}

function classifyWithOpenAI(searchTerms) {
  const apiKey = getApiKey();
  const url = 'https://api.openai.com/v1/engines/' + OPENAI_MODEL + '/completions';
  const headers = {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  };
  const prompt = createPrompt(searchTerms);
  const payload = JSON.stringify({
    prompt: prompt,
    max_tokens: 60
  });
  const options = {
    method: 'post',
    headers: headers,
    payload: payload
  };
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  return json.choices[0].text.trim().split('\n');
}

function getApiKey() {
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL);
  const range = sheet.getRangeByName('openaiApiKey');
  const apiKey = range.getValue();
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please add it to the sheet.');
  }
  return apiKey;
}

function createPrompt(searchTerms) {
  let prompt = 'Classify the following search terms into categories: INFORMATIONAL, COMMERCIAL, LOCAL, GEOGRAPHICAL, QUESTION, OTHER.\n';
  searchTerms.forEach(term => {
    prompt += `Term: "${term}"\n`;
  });
  prompt += 'Provide the classification for each term.\n';
  return prompt;
}

function writeToSheet(searchTerms, classifiedTerms) {
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL);
  let resultsSheet = sheet.getSheetByName('Results');
  if (!resultsSheet) {
    resultsSheet = sheet.insertSheet('Results');
  }
  resultsSheet.clear();
  const data = classifiedTerms.map((classification, index) => [searchTerms[index], classification]);
  resultsSheet.getRange(1, 1, data.length, 2).setValues(data);
}
