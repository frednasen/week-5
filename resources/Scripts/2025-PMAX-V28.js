// v82.3 - fixed geo, fixed search cat & title terms ngrams. also v82 adding city & region. added placements report
// wiki with instructions -> https://pmax.super.site/
// template sheet to copy -> https://docs.google.com/spreadsheets/d/1G7hY4h1405DTblkEA17v9QY9zYAGfZWszRhNEKHsREQ/copy 


const SHEET_URL  = 'https://docs.google.com/spreadsheets/d/1DdE0rVCvFHLiGIOdFp_FGIzShqE3ExSoa08abqTdAYU/edit?usp=sharing'        // create a copy of the template above first

const CLIENTCODE = ''        // this string will be added to your sheet name to make sheet management easier. It doesn't affect the running of the script at all.



// advanced setting
// please ONLY change this if you've read the docs on UpdateMode: https://pmax.super.site/individual-account-pmax-insights-script/updatemode-from-v76-onwards
// remember to remove your url & add the new url above in SHEET_URL after your old sheet has been updated - check the logs for the new URL
const OLD_SHEET_TO_COPY_SETTINGS_FROM___YES_IVE_READ_THE_DOCS = '';       // enter the URL of the sheet to update between single quotes (data will be copied to the new version for you)






// please don't change any code below this line, thanks! ——————————————————————————————————————————————————————————————————————————————



const OTHER_SETTINGS = {
    scriptVersion: 'v82.3',
    minLpImpr: 50,
    weeklyDays: 366,
    errorCol: 12,
    comingFrom: 'single',
    mccTimezone: AdsApp.currentAccount().getTimeZone(),
    updateMode: (typeof OLD_SHEET_TO_COPY_SETTINGS_FROM___YES_IVE_READ_THE_DOCS !== 'undefined' && OLD_SHEET_TO_COPY_SETTINGS_FROM___YES_IVE_READ_THE_DOCS !== '') && (typeof SHEET_URL === 'undefined' || SHEET_URL === ''),
    defaultSettings: { numberOfDays: 30, tCost: 10, tRoas: 4, minPlaceImpr: 5, brandTerm: '', accountType: false },
    urls: {
        clientNew: typeof SHEET_URL !== 'undefined' ? SHEET_URL : '',
        clientOld: typeof OLD_SHEET_TO_COPY_SETTINGS_FROM___YES_IVE_READ_THE_DOCS !== 'undefined' ? OLD_SHEET_TO_COPY_SETTINGS_FROM___YES_IVE_READ_THE_DOCS : '',
        template:   'https://docs.google.com/spreadsheets/d/1G7hY4h1405DTblkEA17v9QY9zYAGfZWszRhNEKHsREQ/', // please don't change these URLs
        backup:     'https://docs.google.com/spreadsheets/d/1G7hY4h1405DTblkEA17v9QY9zYAGfZWszRhNEKHsREQ/',
        aiTemplate: 'https://docs.google.com/spreadsheets/d/1Lduw-ZhKcNUPN4CN2iqU3v_rU-PeXq_wXNy2MnJulM4/',
    },
};

function main() {

    let clientSettings = { whispererUrl: '', brandTerm: '', accountType: 'ecommerce' };
    let sheetUrl = typeof SHEET_URL !== 'undefined' ? SHEET_URL : '';
    let clientCode = CLIENTCODE;
    let mcc = OTHER_SETTINGS;

    Logger.log('Starting the PMax Insights script.');

    let { ss, s, start, ident, updated } = configureScript(sheetUrl, clientCode, clientSettings, mcc);
    if (updated) {
        Logger.log('Remember to turn Update mode OFF by setting the OLD_SHEET_TO_COPY_SETTINGS_FROM___YES_IVE_READ_THE_DOCS variable to an empty string (""). \nUpdate completed. Script execution halted.');
        return;
    }
    s.timezone = AdsApp.currentAccount().getTimeZone();
    let mainDateRange = prepareDateRange(s);
    let elements = defineElements(s);
    let queries = buildQueries(elements, s, mainDateRange);
    let data = getData(queries, s);

    if (data === null) {
        clientSettings.message = 'No eligible PMax campaigns found in this account.';
        return clientSettings;
    }

    let { dAssets, dAGData, dTotal, dSummary, terms, totalTerms, sNgrams, tNgrams, geo, location, placements, idCount } = processAndAggData(data, ss, s, mainDateRange);
    writeAllDataToSheets(ss, { dAssets, dAGData, dTotal, dSummary, terms, totalTerms, sNgrams, tNgrams, geo, location, placements, idCount, ...data });
    processAdvancedSettings(ss, s, queries);
    let { whispererUrl, lastRunAIDate } = processAISheet(ss, s, ident, s.aiRunAt, mcc, start);
    adjustSheetVisibilityBasedOnAccountType(ss, s);
    log(ss, start, s, ident);

    /*
    // MCC snippet 
    // Check if campaignData is empty, which means no eligible PMax campaigns were found
    if (typeof dTotal === 'undefined' || dTotal.length === 0) {
        Logger.log('No eligible PMax/Shopping campaigns found.');
        clientSettings.message = 'No eligible PMax/Shopping campaigns found.';
        return clientSettings;
    }
    clientSettings.totalData = dTotal;

    if (!clientSettings.totalData) {
        Logger.log('No data - returning.');
        return clientSettings;
    }
    if (clientSettings.totalData) {
        clientSettings.clientUrl = ss.getUrl() || 'no url';
        clientSettings.whispererUrl = whispererUrl || 'no whisperer url';
        clientSettings.lastRunAIDate = lastRunAIDate || 'no last run date';
        ss.getSheetByName('MCC Script').hideSheet();
        ss.getSheetByName('Save $100').hideSheet();
        return clientSettings;
    } else {
        clientSettings.message = 'No eligible campaigns found.';
        return clientSettings;
    }
    */


} // end func

//#region AI functions -------------------------------------------------------------------------
function processAISheet(ss, s, clientCode, aiRunAt, mcc, start) {

    let whispererUrl = s.whispererUrl;
    let aiTemplate = s.aiTemplate;

    // start whisperer main

    let lastRunAIDate = '';

    try {
        let start = new Date();
        Logger.log('Processing AI sheet.');

        if (!whispererUrl) {
            Logger.log('No AI sheet URL found. Creating one from template.')
            let aiSheet = safeOpenAndShareSpreadsheet(aiTemplate, true, `${clientCode} - AI Whisperer ${mcc.scriptVersion} - MikeRhodes.com.au (c)`);
            whispererUrl = aiSheet.getUrl();
            Logger.log(`New ${mcc.scriptVersion} of AI Whisperer sheet created: ${whispererUrl}`);
        }

        let aiSheet = safeOpenAndShareSpreadsheet(whispererUrl);
        updateCrossReferences(ss, aiSheet, whispererUrl);

        if (aiRunAt === 99) {
            Logger.log(`AI Run At Day is set to 'Never', so skipping AI section. Alter settings in the sheet to change this.`);
            lastRunAIDate = 'AI Run At Day is set to Never';
            return { whispererUrl, lastRunAIDate };
        } else if (mcc.mccDay !== aiRunAt && aiRunAt !== -1) {
            Logger.log(`AI Run At Day is not today. Not Processing AI section.`);
            lastRunAIDate = 'AI Run At Day is not today';
            return { whispererUrl, lastRunAIDate };
        }

        let aiSet = getSettingsFromAISheet(aiSheet);
        aiSet = enrichSettings(aiSet, whispererUrl, s, ss, aiSheet);

        let reportsToGenerate = getReportsToGenerate(aiSet);

        if (!reportsToGenerate.length) {
            Logger.log('No reports to generate. Exiting AI section.');
            lastRunAIDate = 'No reports to generate.'; // return useful message for MCC sheet
            return { whispererUrl, lastRunAIDate };
        }

        if (!aiSet.apiKey && !aiSet.anth_apikey) {
            Logger.log('No API keys found. Exiting AI section.');
            lastRunAIDate = 'No API keys found.'; // return useful message for MCC sheet
            return { whispererUrl, lastRunAIDate };
        }

        let { endpoint, headers, model } = initializeModel(aiSet);
        aiSet.modelOut = model;

        processReports(reportsToGenerate, aiSet, endpoint, headers, model, aiSheet, mcc);

        Logger.log('Finished AI Process. Total duration: ' + ((new Date() - start) / 1000).toFixed(0) + ' seconds');
        Logger.log('Total cost: ' + aiSet.totalCost.toFixed(2) + '\n');

        lastRunAIDate = Utilities.formatDate(new Date(), mcc.mccTimezone, "MMMM-dd HH:mm");
    } catch (error) {
        Logger.log('An error occurred: ' + error.toString());
        lastRunAIDate = 'Error occurred: ' + error.toString();
    }

    return { whispererUrl, lastRunAIDate };

    // helper funcs for AI stuff - inside processAISheet/main

    function logAndReturn(aiRunAt, whispererUrl, lastRunAIDate) {
        if (aiRunAt === 99) {
            Logger.log(`AI Run At Day is set to 'Never', so skipping AI section. Check settings on MCC sheet to change this.`);
        } else {
            Logger.log(`AI Run At Day is not today. Not Processing AI section.`);
        }
        return { whispererUrl, lastRunAIDate };
    }

    function updateCrossReferences(mainSheet, aiSheet, whispererUrl) {
        mainSheet.getRangeByName('whispererUrl').setValue(whispererUrl);
        aiSheet.getRangeByName('pmaxUrl').setValue(mainSheet.getUrl());
    }

    function getAISheet(whispererUrl, aiTemplate, clientCode, scriptVersion) {
        let aiSheet;
        if (whispererUrl) {
            aiSheet = safeOpenAndShareSpreadsheet(whispererUrl);
        } else {
            aiSheet = safeOpenAndShareSpreadsheet(aiTemplate, true, `${clientCode} - AI Whisperer ${scriptVersion} - MikeRhodes.com.au (c)`);
            Logger.log(`New ${scriptVersion} of AI Whisperer sheet created: ${aiSheet.getUrl()}`);
        }
        return aiSheet;
    }

    function enrichSettings(aiSet, whispererUrl, s, ss, aiSheet) {
        let enrichedSettings = {
            ...aiSet,
            whispererUrl,
            ident: s.ident,
            timezone: s.timezone,
            totalCost: 0
        };

        if (ss) {
            aiSheet.getRangeByName('pmaxUrl').setValue(ss.getUrl());
            ss.getRangeByName('whispererUrl').setValue(whispererUrl);
        } else {
            aiSheet.getSheetByName('Get the PMax Script').showSheet();

            if (!enrichedSettings.pmaxUrl) {
                Logger.log('A Pmax Insights URL should be added to the Whisperer Sheet for best results.');
                Logger.log('Note: Without a valid Pmax Insights URL, you\'ll only be able to use the \'myData\' option.');
                enrichedSettings.myDataOnly = true;
            }
        }
        return enrichedSettings;
    }

    function processReports(reportsToGenerate, aiSet, endpoint, headers, model, aiSheet, mcc) {
        for (let report of reportsToGenerate) {
            let startLoop = new Date();
            let data = getDataForReport(report, aiSet.pmaxUrl, aiSet, mcc);
            if (data === 'No data available for this report.') {
                Logger.log('No data available for ' + report + '.\nCheck the settings in the PMax Insights Sheet.');
                continue;
            }
            let { prompt, suffix, usage } = getPrompt(report, data, aiSet);
            let initialPrompt = suffix + prompt + '\n' + usage + '\n' + data;
            let { response, cost } = getReponseAndCost(initialPrompt, endpoint, headers, model, 'report generation');
            aiSet.cost = cost;
            let audio = aiSet.useVoice ? textToSpeechOpenAI(response, report, aiSet) : null;

            // if using expert mode, check if using expert prompt & rewrite whichever prompt used after eval, then run expert prompt on data
            if (aiSet.expertMode) {
                Logger.log('-- Using expert mode for ' + report);
                let { rewriteResponse, expertResponse, expertCost } = runExpertMode(aiSet, report, data, prompt, suffix, usage, response, endpoint, headers, model);
                aiSet.expertCost = expertCost;
                outputToSheet(aiSheet, expertResponse, report, audio, aiSet, model, rewriteResponse, expertCost);
            } else {
                outputToSheet(aiSheet, response, report, audio, aiSet, model);
            }

            if (aiSet.useEmail) {
                sendEmail(aiSet.email, report, response, aiSet.useVoice, audio);
            }

            let endLoop = new Date();
            let aiReportDuration = (endLoop - startLoop) / 1000;
            logAI(aiSheet, report, aiReportDuration, aiSet);
        } // loop through reports
    }

    function runExpertMode(aiSet, report, data, prompt, suffix, usage, response, endpoint, headers, model) {
        model = aiSet.llm === 'openai' ? 'gpt-4o-2024-08-06' : 'claude-3-5-sonnet-20240620'; // use best available model with valid API key

        // 3 stages: evaluate output, rewrite, run expert prompt
        let evalPrompt = aiSet.p_evalOutput + '\n\n Original prompt:\n' + suffix + prompt + '\n' + usage + '\n\n Original data:\n' + data + '\n\n Original response:\n' + response;
        let { response: evalResponse, cost: evalCost } = getReponseAndCost(evalPrompt, endpoint, headers, model, 'evaluation');

        // rewrite original prompt
        let rewritePrompt = aiSet.p_expertMode + '\n\n Original prompt:\n' + prompt + '\n\n' + evalResponse;
        let { response: rewriteResponse, cost: rewriteCost } = getReponseAndCost(rewritePrompt, endpoint, headers, model, 'prompt rewrite');

        // run using expert prompt to get better output
        let expertPrompt = rewriteResponse + '\n\n Original prompt:\n' + suffix + prompt + '\n' + usage + '\n\n' + data;
        let { response: expertResponse, cost: eCost } = getReponseAndCost(expertPrompt, endpoint, headers, model, 'creation of better report');

        let expertCost = (parseFloat(evalCost) + parseFloat(rewriteCost) + parseFloat(eCost));
        return { rewriteResponse, expertResponse, expertCost };
    }

    function getSettingsFromAISheet(aiSheet) {
        Logger.log('Getting settings from AI sheet');
        let settingsKeys = [
            // main settings
            'llm', 'model', 'apiKey', 'anth_apikey', 'pmaxUrl', 'lang', 'expertMode', 'whoFor',
            'useVoice', 'voice', 'folder', 'useEmail', 'email', 'maxResults',
            // prompts
            'p_productTitles', 'p_landingPages', 'p_changeHistory', 'p_searchCategories',
            'p_productMatrix', 'p_nGrams', 'p_nGramsSearch', 'p_asset', 'p_placement', 'p_myData',
            'p_internal', 'p_client', 'p_expertMode', 'p_evalOutput',
            // responses
            'r_productTitles', 'r_landingPages', 'r_changeHistory', 'r_searchCategories',
            'r_productMatrix', 'r_nGrams', 'r_nGramsSearch', 'r_asset', 'r_placement', 'r_myData',
            // expert mode prompts
            'e_productTitles', 'e_landingPages', 'e_changeHistory', 'e_searchCategories',
            'e_productMatrix', 'e_nGrams', 'e_nGramsSearch', 'e_asset',
            // expert mode 'use'
            'use_productTitles', 'use_landingPages', 'use_changeHistory', 'use_searchCategories',
            'use_productMatrix', 'use_nGrams', 'use_nGramsSearch', 'use_asset'
        ];

        let settings = {};
        settingsKeys.forEach(key => {
            settings[key] = aiSheet.getRange(key).getValue();
        });

        // if no apiKey or anth_apikey found in aiSheet, then use mcc keys & write values to sheet
        if (!settings.apiKey && mcc.apikey) {
            settings.apiKey = mcc.apikey;
            aiSheet.getRangeByName('apiKey').setValue(mcc.apikey);
            Logger.log(`No API Key found in AI Sheet, using MCC API Key`);
        }
        if (!settings.anth_apikey && mcc.anth_apikey) {
            settings.anth_apikey = mcc.anth_apikey;
            aiSheet.getRangeByName('anth_apikey').setValue(mcc.anth_apikey);
            Logger.log(`No Anthropic API Key found in AI Sheet, using MCC API Key`);
        }

        return settings;
    }

    function initializeModel(aiSet) {
        Logger.log('Initializing language model.');
        let endpoint, headers, model;
        if (aiSet.llm === 'openai') {
            if (!aiSet.apiKey) {
                console.error('Please enter your OpenAI API key in the Settings tab.');
                throw new Error('Error: OpenAI API key not found.');
            }
            endpoint = 'https://api.openai.com/v1/chat/completions';
            headers = { "Authorization": `Bearer ${aiSet.apiKey}`, "Content-Type": "application/json" };
            model = aiSet.model === 'better' ? 'gpt-4o-2024-08-06' : 'gpt-4o-mini';
        } else if (aiSet.llm === 'anthropic') {
            if (!aiSet.anth_apikey) {
                console.error('Please enter your Anthropic API key in the Settings tab.');
                throw new Error('Error: Anthropic API key not found.');
            }
            endpoint = 'https://api.anthropic.com/v1/messages';
            headers = { "x-api-key": aiSet.anth_apikey, "Content-Type": "application/json", "anthropic-version": "2023-06-01" };
            model = aiSet.model === 'better' ? 'claude-3-5-sonnet-20240620' : 'claude-3-haiku-20240307'; // changed aug 2024, no longer using opus3
        } else {
            console.error('Invalid model indicator. Please choose between "openai" and "anthropic".');
            throw new Error('Error: Invalid model indicator provided.');
        }
        return { endpoint, headers, model };
    }

    function getReponseAndCost(prompt, endpoint, headers, model, stage) {
        if (prompt === "No data available for this report.") {
            return { response: prompt, tokenUsage: 0 };
        }

        // Setup payload based on the model and prompt
        let payload = {
            model: model,
            messages: [{ "role": "user", "content": prompt }],
            ...(model.includes('claude') && { "max_tokens": 1000 })  // Example of conditionally adding properties
        };

        let { response, inputTokens, outputTokens } = genericAPICall(endpoint, headers, payload, stage);
        let cost = calculateCost(inputTokens, outputTokens, model);

        return { response, cost };
    }

    function genericAPICall(endpoint, headers, payload, stage) {
        Logger.log(`Making API call for ${stage}.`);
        let httpOptions = {
            "method": "POST",
            "muteHttpExceptions": true,
            "headers": headers,
            "payload": JSON.stringify(payload)
        };

        let attempts = 0;
        let response;
        do {
            response = UrlFetchApp.fetch(endpoint, httpOptions);
            if (response.getResponseCode() === 200) {
                break;
            }
            Utilities.sleep(2000 * attempts); // Exponential backoff
            attempts++;
        } while (attempts < 3);

        let responseCode = response.getResponseCode();
        let responseContent = response.getContentText();

        if (responseCode !== 200) {
            Logger.log(`API request failed with status ${responseCode}. Use my free scripts to test your API key: https://github.com/mikerhodesideas/free`);
            try {
                let errorResponse = JSON.parse(responseContent);
                Logger.log(`Error details: ${JSON.stringify(errorResponse.error.message)}`);
                return { response: `Error: ${errorResponse.error.message}`, inputTokens: 0, outputTokens: 0 };
            } catch (e) {
                Logger.log('Error parsing API error response.');
                return { response: 'Error: Failed to parse the API error response.', inputTokens: 0, outputTokens: 0 };
            }
        }

        let responseJson = JSON.parse(response.getContentText());
        let inputTokens;
        let outputTokens;

        if (endpoint.includes('openai.com')) {
            return { response: responseJson.choices[0].message.content, inputTokens: responseJson.usage.prompt_tokens, outputTokens: responseJson.usage.completion_tokens };
        } else if (endpoint.includes('anthropic.com')) {
            return { response: responseJson.content[0].text, inputTokens: responseJson.usage.input_tokens, outputTokens: responseJson.usage.output_tokens };
        }
    }

    function outputToSheet(aiSheet, output, report, audioUrl, aiSet, model, eResponse, eCost) {
        let sheet = aiSheet.getSheetByName('Output');
        let timestamp = Utilities.formatDate(new Date(), aiSet.timezone, "MMMM-dd HH:mm");
        let data = [[report, output, aiSet.cost, eCost ? eCost : 'n/a', model, audioUrl, timestamp]];
        sheet.insertRowBefore(2); // Insert a new row at position 2
        sheet.getRange(2, 1, 1, data[0].length).setValues(data); // Insert the new data at the new row 2

        if (eResponse && eCost) { // expert mode output
            let expertRangeName = 'e_' + report;
            let expertRange = aiSheet.getRangeByName(expertRangeName);
            if (expertRange) {
                expertRange.setValue(eResponse);
            } else {
                Logger.log('Named range not found for expert response: ' + expertRangeName);
            }
        }
    }

    function getReportsToGenerate(s) {
        let reports = [];
        for (let key in s) {
            // Check if key is a string and starts with 'r_' and value is true
            if (typeof key === 'string' && key.startsWith('r_') && s[key] === true) {
                let reportName = key.slice(2);
                if (reportName) { // ensure we have a non-empty string after removing prefix
                    reports.push(reportName);
                }
            }
        }
        return reports;
    }

    function getDataForReport(r, u, s) {
        Logger.log('#\nGetting data for ' + r);
        // pass to cleanData the column to sort by
        switch (r) {
            case 'productTitles':
                return getDataFromSheet(s, u, 'pTitle', 'A:F', 3); // sort by cost
            case 'landingPages':
                return getDataFromSheet(s, u, 'paths', 'A:L', 1); // sort by impr & limit to 200 rows
            case 'changeHistory':
                return getDataFromSheet(s, u, 'changeData', 'B:K', -1); // limit to 200 rows, no sorting
            case 'searchCategories':
                return getDataFromSheet(s, u, 'Categories', 'C4:J', 0);
            case 'productMatrix':
                return getDataFromSheet(s, u, 'Title', 'L2:T10', 0); // Product Matrix
            case 'nGrams':
                return getDataFromSheet(s, u, 'tNgrams', 'A1:K', 1); // product title nGrams - already sorted by cost
            case 'nGramsSearch':
                return getDataFromSheet(s, u, 'sNgrams', 'A:I', 1); // search category Ngrams - already sorted by impr
            case 'asset':
                return getDataFromSheet(s, u, 'asset', 'B:P', 6); // sort by cost (col H as A not imported)
            case 'placement':
                return getDataFromSheet(s, u, 'placement', 'A:F', 2); // sort by impr 
            case 'myData':
                return getMyData();
            default:
                Logger.log('Invalid report name');
                return null;
        }
    }

    function getDataFromSheet(s, aiSheet, tabName, range, col) {
        try {
            let sheet = safeOpenAndShareSpreadsheet(aiSheet).getSheetByName(tabName);
            if (!sheet) {
                throw new Error(`Sheet ${tabName} not found in the spreadsheet.`);
            }

            let data = sheet.getRange(range).getValues().filter(row => row.some(cell => !!cell));
            if (data.length === 0 || data.length === 1) {
                throw new Error(`No data available for this report.`);
            }

            // Apply sorting and limiting logic based on col: 0 - all data; -1 limit to maxResults no sorting; else sort by col num & limit to maxResults
            if (col === 0) {
                data = data;
            } else if (col === -1) {
                data = data.slice(0, s.maxResults + 1); // account for header row
            } else {
                data = data.sort((a, b) => {
                    let valA = parseFloat(a[col]), valB = parseFloat(b[col]);
                    return valB - valA; // Sorting in descending order
                }).slice(0, s.maxResults + 1);
            }

            // Format data to string
            let formattedData = data.map(row => {
                return row.map(cell => {
                    return !isNaN(Number(cell)) ? Number(cell).toFixed(2) : cell;
                }).join(',');
            }).join('\n');
            return formattedData;
        } catch (error) {
            Logger.log(`Error in getting data from ${tabName} tab: ${error}`);
            return "No data available for this report.";
        }
    }

    function getMyData() {
        try {
            let sheet = safeOpenAndShareSpreadsheet(SHEET_URL).getSheetByName('myData');
            let lastRow = sheet.getLastRow();
            let lastColumn = sheet.getLastColumn();
            let range = sheet.getRange(1, 1, lastRow, lastColumn);
            let values = range.getValues();
            let filteredData = values.filter(row => row.some(cell => !!cell));
            let formattedData = filteredData.map(row => {
                return row.map(cell => {
                    if (!isNaN(Number(cell))) {
                        return Number(cell).toFixed(2);
                    } else {
                        return cell;
                    }
                }).join(',');
            }).join('\n');
            return formattedData;
        } catch (error) {
            Logger.log(`Error in fetching data from myData tab: ${error}`);
            return null;
        }
    }

    function textToSpeechOpenAI(text, report, aiSet) {
        Logger.log('Converting audio version of report');

        // check if no data & if that's the case, return early with message
        if (!text || text === "No data available for this report.") {
            return text;
        }

        let maxLength = 4000;
        if (text.length > maxLength) {
            Logger.log('Output is too long to use for Whisperer - proceeding with just the first 4000 characters');
        }
        text = text.length > maxLength ? text.substring(0, maxLength) : text;

        let apiUrl = 'https://api.openai.com/v1/audio/speech'; // Endpoint for OpenAI TTS

        let payload = JSON.stringify({
            model: "tts-1",
            voice: aiSet.voice,
            input: text
        });

        let options = {
            method: 'post',
            contentType: 'application/json',
            payload: payload,
            headers: {
                'Authorization': 'Bearer ' + aiSet.apiKey
            },
            muteHttpExceptions: true // To handle HTTP errors gracefully
        };

        // Make the API request
        let response = UrlFetchApp.fetch(apiUrl, options);

        let contentType = response.getHeaders()['Content-Type'];

        if (contentType.includes('audio/mpeg')) {
            try {
                // Attempt to access the folder by ID
                let f = DriveApp.getFolderById(aiSet.folder);

                // If successful, proceed with saving the file
                let blob = response.getBlob();
                // Create short timestamp for file name
                let timeStamp = Utilities.formatDate(new Date(), aiSet.timezone, "MMMdd_HHmm");
                let fileInFolder = f.createFile(blob.setName(report + ' ' + timeStamp + ".mp3"));
                let fileUrl = fileInFolder.getUrl();
                Logger.log('Audio file saved in folder: ' + fileUrl);

                return fileUrl;
            } catch (e) {
                // Handle the case where the folder does not exist
                Logger.log('Couldn\'t save audio file. Folder does not exist or access denied. Folder ID: ' + aiSet.folder);
                return null;
            }
        } else {
            // Handle unexpected content types
            Logger.log('OpenAI Text-To-Speech is having issues right now, please try again later!');
        }
    }

    function getPrompt(report, data, aiSet) {
        if (data === "No data available for this report.") {
            return data;
        }

        let promptRangeName = 'p_' + report;
        let useExpertPrompt = aiSet['use_' + report];
        let expertPromptRangeName = 'e_' + report;

        let prompt;
        try {
            let aiSheet = safeOpenAndShareSpreadsheet(aiSet.whispererUrl);

            // Get the original prompt
            let promptRange = aiSheet.getRangeByName(promptRangeName);
            if (!promptRange) {
                throw new Error(`Named range ${promptRangeName} not found`);
            }
            prompt = promptRange.getValue();

            // Check for expert prompt
            if (aiSet.expertMode && useExpertPrompt) {
                let expertPromptRange = aiSheet.getRangeByName(expertPromptRangeName);
                if (expertPromptRange) {
                    let expertPrompt = expertPromptRange.getValue();
                    if (expertPrompt && expertPrompt.trim() !== '') {
                        Logger.log(`As requested, using expert prompt for ${report}`);
                        prompt = expertPrompt;
                        // Update original prompt and clear expert prompt
                        promptRange.setValue(expertPrompt);
                        expertPromptRange.clearContent();
                        aiSheet.getRangeByName('use_' + report).setValue(false);
                        aiSet['use_' + report] = false;
                    }
                }
            }
        } catch (error) {
            Logger.log(`Error retrieving prompt for ${report}: ${error.message}`);
            prompt = "Please analyze the provided data and give insights.";
        }

        let suffix = `
        You are an expert at analyzing google ads data & providing actionable insights.
        Give all answers in the ${aiSet.lang} language. Do not use any currency symbols or currency conversion.
        Just output the numbers in the way they are. Do not round them. Provide text output, no charts.
        `;

        let usage = aiSet.whoFor === 'internal use' ? aiSet['p_internal'] : aiSet['p_client'];

        return { prompt, suffix, usage };
    }

    function logAI(ss, r, dur, aiSet) {
        let reportCost = parseFloat(aiSet.cost) + (aiSet.expertMode ? parseFloat(aiSet.expertCost) : 0);
        aiSet.totalCost += reportCost;
        let logMessage = `${r} report created in: ${dur.toFixed(0)} seconds, using ${aiSet.modelOut}, at a cost of ${aiSet.cost}`;
        logMessage += aiSet.expertMode ? ` plus ${aiSet.expertCost} for expert mode` : '';
        Logger.log(logMessage);
        let newRow = [new Date(), dur, r, aiSet.lang, aiSet.useVoice, aiSet.voice, aiSet.useEmail, aiSet.llm, aiSet.modelOut, reportCost, aiSet.ident];
        try {
            let logUrl = ss.getRangeByName('u').getValue();
            [safeOpenAndShareSpreadsheet(logUrl), ss].map(s => s.getSheetByName('log')).forEach(sheet => sheet.appendRow(newRow));
        } catch (e) {
            Logger.log('Error logging to log sheet: ' + e);
        }
    }

    function sendEmail(e, r, o, useVoice, audioUrl) {
        // check if no data present & exit early with message if that's the case
        if (o === "No data available for this report.") {
            return o;
        }
        let subject = 'Insights Created using the PMax Whisperer Script';
        let body = 'Hey<br>Your ' + r + ' insights are ready.<br>'
        if (useVoice === true && audioUrl) {
            let fileName = audioUrl.split('/').pop();
            body += '<br>Audio file: <a href="' + audioUrl + '">' + fileName + '</a>';
        }
        body += '\n' + o;

        // Sending the email
        try {
            if (e && e.includes('@')) {
                MailApp.sendEmail({
                    to: e,
                    subject: subject,
                    htmlBody: body
                });
                Logger.log('Email sent to: ' + e);
            } else {
                Logger.log('Invalid email address: ' + e);
            }
        }
        catch (e) {
            Logger.log('Error sending email: ' + e);
        }
    }

    function calculateCost(inputTokens, outputTokens, model) {
        const PRICING = {
            'gpt-3.5-turbo': { inputCostPerMToken: 0.5, outputCostPerMToken: 1.5 }, // not used
            'gpt-4-turbo': { inputCostPerMToken: 10, outputCostPerMToken: 30 }, // not used
            'gpt-4o-mini': { inputCostPerMToken: 0.15, outputCostPerMToken: 0.6 },
            'gpt-4o': { inputCostPerMToken: 5, outputCostPerMToken: 15 },
            'gpt-4o-2024-08-06': { inputCostPerMToken: 2.5, outputCostPerMToken: 10 }, // updated aug 9 2024
            'claude-3-haiku-20240307': { inputCostPerMToken: 0.25, outputCostPerMToken: 1.25 },
            'claude-3-5-sonnet-20240620': { inputCostPerMToken: 3, outputCostPerMToken: 15 },
            'claude-3-opus-20240229': { inputCostPerMToken: 15, outputCostPerMToken: 75 },
            'gemini-1.5-pro': { inputCostPerMToken: 3.5, outputCostPerMToken: 10.5 },
            'gemini-1.5-flash': { inputCostPerMToken: 0.35, outputCostPerMToken: 1.05 }
        };
        // Directly access pricing for the model
        let modelPricing = PRICING[model] || { inputCostPerMToken: 1, outputCostPerMToken: 10 };
        if (!PRICING[model]) {
            Logger.log(`Default pricing of $1/m input and $10/m output used as no pricing found for model: ${model}`);
        }

        let inputCost = inputTokens * (modelPricing.inputCostPerMToken / 1e6);
        let outputCost = outputTokens * (modelPricing.outputCostPerMToken / 1e6);
        let totalCost = inputCost + outputCost;

        return totalCost.toFixed(2);
    }

    function safeOpenAndShareSpreadsheet(url, setAccess = false, newName = null) {
        try {
            // Basic validation
            if (!url) {
                console.error(`URL is empty or undefined: ${url}`);
                return null;
            }

            // Type checking and format validation
            if (typeof url !== 'string') {
                console.error(`Invalid URL type - expected string but got ${typeof url}`);
                return null;
            }

            // Validate Google Sheets URL format
            if (!url.includes('docs.google.com/spreadsheets/d/')) {
                console.error(`Invalid Google Sheets URL format: ${url}`);
                return null;
            }

            // Try to open the spreadsheet
            let ss;
            try {
                ss = SpreadsheetApp.openByUrl(url);
            } catch (error) {
                Logger.log(`Error opening spreadsheet: ${error.message}`);
                Logger.log(`Settings were: ${url}, ${setAccess}, ${newName}`);
                return null;
            }

            // Handle copy if newName is provided
            if (newName) {
                try {
                    ss = ss.copy(newName);
                } catch (error) {
                    Logger.log(`Error copying spreadsheet: ${error.message}`);
                    return null;
                }
            }

            // Handle sharing settings if required
            if (setAccess) {
                try {
                    let file = DriveApp.getFileById(ss.getId());

                    // Try ANYONE_WITH_LINK first
                    try {
                        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
                        Logger.log("Sharing set to ANYONE_WITH_LINK");
                    } catch (error) {
                        Logger.log("ANYONE_WITH_LINK failed, trying DOMAIN_WITH_LINK");

                        // If ANYONE_WITH_LINK fails, try DOMAIN_WITH_LINK
                        try {
                            file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);
                            Logger.log("Sharing set to DOMAIN_WITH_LINK");
                        } catch (error) {
                            Logger.log("DOMAIN_WITH_LINK failed, setting to PRIVATE");

                            // If all else fails, set to PRIVATE
                            try {
                                file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.EDIT);
                                Logger.log("Sharing set to PRIVATE");
                            } catch (error) {
                                Logger.log(`Failed to set any sharing permissions: ${error.message}`);
                            }
                        }
                    }
                } catch (error) {
                    Logger.log(`Error setting file permissions: ${error.message}`);
                    // Continue even if sharing fails - the sheet is still usable
                }
            }

            return ss;

        } catch (error) {
            // Catch any other unexpected errors
            console.error(`Unexpected error in safeOpenAndShareSpreadsheet: ${error.message}`);
            Logger.log(`Full error details: ${error.stack}`);
            return null;
        }
    }
}
//#endregion

//#region rest of pmax script -------------------------------------------------------------------------
function processAdvancedSettings(ss, s, q) {
    // For pTitleCampaign, pTitleID, paths handle preserving the last column
    const clearSheetExceptLastColumn = (sheetName) => {
        const sheet = ss.getSheetByName(sheetName);
        const lastColumn = sheet.getMaxColumns();
        const rangeToClear = sheet.getRange(2, 1, sheet.getMaxRows() - 1, lastColumn - 1);
        rangeToClear.clearContent();
    };

    // For other tabs - General function to clear data
    const clearSheet = (sheetName) => {
        const sheet = ss.getSheetByName(sheetName);
        sheet.clearContents(); // This clears the entire sheet, but not formats and values
    };

    // Handling turnonTitleCampaign
    if (s.turnonTitleCampaign) {
        let titleCampaignData = fetchProductData(q.productQuery, s.tCost, s.tRoas, 'pTitleCampaign');
        outputDataToSheet(ss, 'pTitleCampaign', titleCampaignData, 'notLast');
        ss.getSheetByName('TitleCampaign').showSheet();
    } else {
        clearSheetExceptLastColumn('pTitleCampaign');
        ss.getSheetByName('pTitleCampaign').hideSheet();
    }

    // Handling turnonTitleID
    if (s.turnonTitleID) {
        let titleIDData = fetchProductData(q.productQuery, s.tCost, s.tRoas, 'pTitleID');
        outputDataToSheet(ss, 'pTitleID', titleIDData, 'notLast');
        ss.getSheetByName('Title&ID').showSheet();
    } else {
        clearSheetExceptLastColumn('pTitleID');
        ss.getSheetByName('pTitleID').hideSheet();
    }

    // Handling turnonIDChannel
    if (s.turnonIDChannel) {
        let idChannelData = fetchProductData(q.productQuery, s.tCost, s.tRoas, 'idChannel');
        outputDataToSheet(ss, 'idChannel', idChannelData, 'clear');
        ss.getSheetByName('idChannel').showSheet();
    } else {
        clearSheet('idChannel');
        ss.getSheetByName('idChannel').hideSheet();
    }


    // Handling turnonGeo
    if (s.turnonGeo) {
        //Logger.log('Processing geo performance data');
        let geoPerformanceData = fetchData(q.geoPerformanceQuery);
        let locationData = fetchData(q.locationDataQuery);

        let geo = processGeoPerformanceData(geoPerformanceData, locationData, ss);
        outputDataToSheet(ss, 'geo_locations', geo.locations, 'clear');
        outputDataToSheet(ss, 'geo_campaigns', geo.campaigns, 'clear');
        ss.getSheetByName('Geo').showSheet();
    } else {
        clearSheet('geo_locations');
        clearSheet('geo_campaigns');
        ss.getSheetByName('geo_locations').hideSheet();
        ss.getSheetByName('geo_campaigns').hideSheet();
        ss.getSheetByName('Geo').hideSheet();
    }

    // Handling turnonChange
    if (s.turnonChange) {
        let changeData = fetchData(q.changeQuery);
        outputDataToSheet(ss, 'changeData', changeData, 'clear');
        ss.getSheetByName('changeData').showSheet();
    } else {
        clearSheet('changeData');
        ss.getSheetByName('changeData').hideSheet();
    }

    // Handling turnonLP - landing page data - keep last column (flag for Pages)
    if (s.turnonLP) {
        let lpData = fetchData(q.lpQuery);
        aggLPData(lpData, ss, s, 'paths');
        ss.getSheetByName('Pages').showSheet();
    } else {
        try {
            clearSheetExceptLastColumn('paths');
            ss.getSheetByName('Pages').hideSheet();
            ss.getSheetByName('paths').hideSheet();
        } catch (error) {
            Logger.log('Error: The paths tab is not in your sheet. Please update to the latest template. You need v70 or later. ' + error);
        }
    }
}

function configureScript(sheetUrl, clientCode, clientSettings, mcc) {
    let start = new Date();
    let s, ss;
    let updated = false;
    let accountName = AdsApp.currentAccount().getName();
    let ident = clientCode || accountName;
    if (mcc.comingFrom === 'single') {
        let accDate = new Date().toLocaleString('en-US', { timeZone: mcc.mccTimezone });
        mcc.mccDay = new Date(accDate).getDay();
    }
    if (mcc.updateMode) {
        updated = handleUpdateMode(sheetUrl, ident, mcc);
        return { updated };
    } else {
        // Use mcc.urls.clientNew if available, otherwise fall back to sheetUrl
        ss = handleNormalMode(mcc.urls.clientNew || sheetUrl, ident, mcc);
    }

    // Update AI run at & account type. Create default settings and update variables
    updateRunAI(ss, clientSettings.aiRunAt, mcc.comingFrom);
    updateAccountType(ss, clientSettings.accountType);
    let defaultSettings = createDefaultSettings(clientSettings, mcc);
    s = updateVariablesFromSheet(ss, mcc.scriptVersion, defaultSettings);
    s.ident = ident;
    s.minLpImpr = mcc.minLpImpr;

    // Log settings and check version
    logSettings(s, ss);
    checkVersion(mcc.scriptVersion, s.sheetVersion, ss, mcc.urls.template);
    hideDefaultTabs(ss);

    return { ss, s, start, ident, updated };
}

function updateRunAI(ss, aiRunAt, comingFrom) {
    if (ss && aiRunAt && comingFrom === 'mcc') {
        let convertedAiRunAt = aiRunAt;
        if (typeof aiRunAt === 'number') {
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            if (aiRunAt === -1) {
                convertedAiRunAt = 'next script run';
            } else if (aiRunAt === 99) {
                convertedAiRunAt = 'never';
            } else if (aiRunAt >= 0 && aiRunAt <= 6) {
                convertedAiRunAt = dayNames[aiRunAt];
            }
        }
        aiRunAt = convertedAiRunAt;
        try {
            let aiRunAtRange = ss.getRangeByName('aiRunAt');
            aiRunAtRange.setValue(aiRunAt);
            Logger.log('Update AI sheet day: MCC setting for this client is ' + aiRunAt + ', so setting client sheet to ' + aiRunAt);
        } catch (error) {
            Logger.log('Error: Unable to update the aiRunAt range. ' + error);
        }
    }
}

function updateAccountType(ss, accountType) {
    if (ss && accountType === 'leadgen') {
        try {
            let accountTypeRange = ss.getRange('accountType');
            accountTypeRange.setValue('leadgen');
            Logger.log('Account type in MCC was leadgen, setting client sheet to leadgen');
        } catch (error) {
            Logger.log('Error: Unable to update the accountType range. ' + error);
        }
    }
}

function handleUpdateMode(sheetUrl, ident, mcc) {
    if (mcc.urls.clientOld) {
        Logger.log('Update mode is ON for single account. Updating sheets...');
        let oldSheet = safeOpenAndShareSpreadsheet(mcc.urls.clientOld);
        let whispererOldUrl;

        if (oldSheet) {
            try {
                let whispererRange = oldSheet.getRangeByName('whispererUrl');
                whispererOldUrl = whispererRange ? whispererRange.getValue() : null;
            } catch (e) {
                Logger.log('Error retrieving whispererUrl from old sheet: ' + e.message);
                whispererOldUrl = null;
            }
        } else {
            Logger.log('Could not open old client sheet.');
            whispererOldUrl = null;
        }

        let { clientSheet, whispererSheet } = handleClientSheetUpdate(
            ident,
            mcc.urls.clientOld,
            whispererOldUrl,
            mcc
        );

        updateCrossReferences(clientSheet, whispererSheet);

        Logger.log(`****    Update process completed. Please copy the new sheet url into script, 
        remove the old url from SHEET_TO_UPDATE and then run the script again.
        New client sheet URL: ${clientSheet.getUrl()}
        New whisper sheet URL: ${whispererSheet.getUrl()}
        `);
    }
    return true;
}

function handleNormalMode(sheetUrl, ident, mcc) {
    let ss;
    if (sheetUrl) {
        ss = safeOpenAndShareSpreadsheet(sheetUrl);
    } else {
        ss = safeOpenAndShareSpreadsheet(mcc.urls.template, true, `${ident} ${mcc.scriptVersion} - PMax Insights - (c) MikeRhodes.com.au `);
        Logger.log('****\nCreated new sheet for: ' + ident + '\nURL is ' + ss.getUrl() +
            '\nRemember to add this URL to the top of your script before next run.\n****');
    }
    return ss;
}

function createDefaultSettings(clientSettings, mcc) {
    return {
        numberOfDays: mcc.defaultSettings.numberOfDays,
        tCost: mcc.defaultSettings.tCost,
        tRoas: mcc.defaultSettings.tRoas,
        brandTerm: clientSettings.brandTerm,
        accountType: clientSettings.accountType,
        aiTemplate: mcc.urls.aiTemplate,
        whispererUrl: clientSettings.whispererUrl,

        // Additional settings from 'Settings' and 'Advanced' sheets
        aiRunAt: 1, // default to monday
        fromDate: undefined,
        toDate: undefined,
        lotsProducts: 0,
        campFilter: '',
        turnonLP: false,
        turnonPlace: true,
        turnonGeo: false,
        turnonChange: false,
        turnonAISheet: true,
        turnonTitleCampaign: false,
        turnonTitleID: false,
        turnonIDChannel: false,
        sheetVersion: '',
        scriptVersion: mcc.scriptVersion,
        levenshtein: 2
    };
}

function logSettings(s, ss) {
    s = s || {};
    let logSettings = { ...s };
    delete logSettings.levenshtein;
    delete logSettings.inputTokens;
    delete logSettings.outputTokens;
    delete logSettings.themes;
    logSettings.apiKey = s.apiKey ? s.apiKey.slice(0, 10) + '...' : '';
    logSettings.anth_apikey = s.anth_apikey ? s.anth_apikey.slice(0, 10) + '...' : '';
    logSettings.groq_apiKey = s.groq_apiKey ? s.groq_apiKey.slice(0, 10) + '...' : '';
    logSettings.aiTemplate = s.aiTemplate && s.aiTemplate.includes('/d/') ? s.aiTemplate.split('/d/')[1].slice(0, 5) + '...' : '';
    logSettings.whispererUrl = s.whispererUrl && s.whispererUrl.includes('/d/') ? s.whispererUrl.split('/d/')[1].slice(0, 5) + '...' : '';
    logSettings.ssUrl = ss.getUrl();
    Logger.log('Settings: ' + JSON.stringify(logSettings));
}

function hideDefaultTabs(ss) {
    try {
        ss.getSheetByName('AI').hideSheet();
        ss.getSheetByName('TitleCampaign').hideSheet();
        ss.getSheetByName('Title&ID').hideSheet();
        ss.getSheetByName('idChannel').hideSheet();
        ss.getSheetByName('placement').hideSheet();
        ss.getSheetByName('changeData').hideSheet();
        ss.getSheetByName('paths').hideSheet();
        ss.getSheetByName('asset').hideSheet();
        ss.getSheetByName('geo_locations').hideSheet();
        ss.getSheetByName('geo_campaigns').hideSheet();
    } catch (e) {
        console.error('Error hiding default tabs:', e.message);
    }
}

function updateVariablesFromSheet(ss, version, defaultSettings) {

    let updatedSettings = { ...defaultSettings };

    const allRangeNames = [
        'numberOfDays', 'tCost', 'tRoas', 'brandTerm', 'accountType', 'aiRunAt', 'minPlaceImpr',
        'fromDate', 'toDate', 'lotsProducts', 'turnonTitleID', 'turnonIDChannel', 'turnonTitleCampaign',
        'campFilter', 'turnonLP', 'turnonPlace', 'turnonGeo', 'turnonChange', 'turnonAISheet', 'sheetVersion', 'whispererUrl'
    ];

    try {
        allRangeNames.forEach(rangeName => {
            try {
                const range = ss.getRangeByName(rangeName);
                if (range) {
                    let value = range.getDisplayValue().trim();
                    if (value !== '') {
                        if (['fromDate', 'toDate'].includes(rangeName)) {
                            updatedSettings[rangeName] = /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value : updatedSettings[rangeName];
                        } else if (rangeName.startsWith('turnon')) {
                            updatedSettings[rangeName] = value.toLowerCase() === 'true';
                        } else if (['numberOfDays', 'tCost', 'tRoas', 'lotsProducts'].includes(rangeName)) {
                            updatedSettings[rangeName] = isNaN(value) ? updatedSettings[rangeName] : Number(value);
                        } else {
                            updatedSettings[rangeName] = value;
                        }
                    }
                }
            } catch (e) {
                console.warn(`Named range ${rangeName} not found or error occurred. Using default value.`);
            }
        });
        updatedSettings.aiRunAt = convertAIRunAt(updatedSettings.aiRunAt);
        return updatedSettings;

    } catch (e) {
        console.error("Error in 'updateVariablesFromSheet': ", e);
        return updatedSettings;
    }
}

function convertAIRunAt(aiRunAt) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    if (typeof aiRunAt == 'string' && aiRunAt) {
        aiRunAt = aiRunAt.toLowerCase();
        if (aiRunAt === 'next script run') {
            return -1;
        } else if (aiRunAt === 'never') {
            return 99;
        } else if (dayNames.includes(aiRunAt)) {
            return dayNames.indexOf(aiRunAt);
        } else {
            let dayOfWeek = new Date(aiRunAt).getDay();
            return dayOfWeek;
        }
    } else {
        return -1;
    }
}

function prepareDateRange(s) {
    // Check if fromDate and toDate are defined before using them
    let dateSwitch = s.fromDate !== undefined && s.toDate !== undefined ? 1 : 0;
    let today = new Date(), yesterday = new Date(), startDate = new Date();
    yesterday.setDate(today.getDate() - 1);
    startDate.setDate(today.getDate() - s.numberOfDays);
    // format the dates to be used in the queries
    let fYesterday = Utilities.formatDate(yesterday, s.timezone, 'yyyy-MM-dd');
    let fStartDate = Utilities.formatDate(startDate, s.timezone, 'yyyy-MM-dd');
    let fFromDate = dateSwitch ? formatDateLiteral(s.fromDate) : undefined;
    let fToDate = dateSwitch ? formatDateLiteral(s.toDate) : undefined;
    // set range for the queries - if switch is 1 use the from/to dates
    let mainDateRange = dateSwitch ? `segments.date BETWEEN "${fFromDate}" AND "${fToDate}"` : `segments.date BETWEEN "${fStartDate}" AND "${fYesterday}"`;

    return mainDateRange;
}

function defineElements(s) {
    return {
        impr: ' metrics.impressions ', // metrics
        clicks: ' metrics.clicks ',
        cost: ' metrics.cost_micros ',
        engage: ' metrics.engagements ',
        inter: ' metrics.interactions ',
        conv: ' metrics.conversions ',
        value: ' metrics.conversions_value ',
        allConv: ' metrics.all_conversions ',
        allValue: ' metrics.all_conversions_value ',
        views: ' metrics.video_views ',
        cpv: ' metrics.average_cpv ',
        eventTypes: ' metrics.interaction_event_types ',
        segDate: ' segments.date ', // segments
        prodTitle: ' segments.product_title ',
        prodID: ' segments.product_item_id ',
        aIdCamp: ' segments.asset_interaction_target.asset ',
        interAsset: ' segments.asset_interaction_target.interaction_on_this_asset ',
        campName: ' campaign.name ', // campaign
        campId: ' campaign.id ',
        chType: ' campaign.advertising_channel_type ',
        campUrlOptOut: ' campaign.url_expansion_opt_out ',
        lpResName: ' landing_page_view.resource_name ', // landing page
        lpUnexpUrl: ' landing_page_view.unexpanded_final_url ',
        aIdAsset: ' asset.resource_name ', // asset
        aId: ' asset.id ',
        assetSource: ' asset.source ',
        assetName: ' asset.name ',
        assetText: ' asset.text_asset.text ',
        adUrl: ' asset.image_asset.full_size.url ',
        imgHeight: ' asset.image_asset.full_size.height_pixels ',
        imgWidth: ' asset.image_asset.full_size.width_pixels ',
        imgMime: ' asset.image_asset.mime_type ',
        ytTitle: ' asset.youtube_video_asset.youtube_video_title ',
        ytId: ' asset.youtube_video_asset.youtube_video_id ',
        agId: ' asset_group.id ', // asset group
        assetFtype: ' asset_group_asset.field_type ',
        adPmaxPerf: ' asset_group_asset.performance_label ',
        agStrength: ' asset_group.ad_strength ',
        agStatus: ' asset_group.status ',
        agPrimary: ' asset_group.primary_status ',
        asgName: ' asset_group.name ',
        lgType: ' asset_group_listing_group_filter.type ',
        placement: ' detail_placement_view.group_placement_target_url ', // placement
        placeType: ' detail_placement_view.placement_type ',
        chgDateTime: ' change_event.change_date_time ', // change event
        chgResType: ' change_event.change_resource_type ',
        chgFields: ' change_event.changed_fields ',
        clientTyp: ' change_event.client_type ',
        feed: ' change_event.feed ',
        feedItm: ' change_event.feed_item ',
        newRes: ' change_event.new_resource ',
        oldRes: ' change_event.old_resource ',
        resChgOp: ' change_event.resource_change_operation ',
        resName: ' change_event.resource_name ',
        userEmail: ' change_event.user_email ',

        // New elements for geo performance
        geoViewName: ' geographic_view.resource_name ',
        geoLocationType: ' geographic_view.location_type ',
        geoCountryId: ' geographic_view.country_criterion_id ',
        geoTargetCity: ' segments.geo_target_city ',
        geoTargetRegion: ' segments.geo_target_region ',
        geoTargetState: ' segments.geo_target_state ',

        // New elements for location data
        geoTargetTypePos: ' campaign.geo_target_type_setting.positive_geo_target_type ',
        geoTargetTypeNeg: ' campaign.geo_target_type_setting.negative_geo_target_type ',

        // New elements for placements
        pmaxPlacementName: ' performance_max_placement_view.display_name ',
        pmaxPlacement: ' performance_max_placement_view.placement ',
        pmaxPlacementType: ' performance_max_placement_view.placement_type ',
        pmaxPlacementResource: ' performance_max_placement_view.resource_name ',
        pmaxPlacementUrl: ' performance_max_placement_view.target_url ',

        pMaxOnly: ' AND campaign.advertising_channel_type = "PERFORMANCE_MAX" ', // WHERE
        pMaxShop: ' AND campaign.advertising_channel_type IN ("SHOPPING","PERFORMANCE_MAX") ',
        campLike: ` AND campaign.name LIKE "%${s.campFilter}%" `,
        agFilter: ' AND asset_group_listing_group_filter.type != "SUBDIVISION" ',
        notInter: ' AND segments.asset_interaction_target.interaction_on_this_asset != "TRUE" ',
        impr0: ' AND metrics.impressions > 0 ',
        cost0: ' AND metrics.cost_micros > 0 ',
        order: ' ORDER BY campaign.name ',
    };
}

function buildQueries(e, s, date) {
    let queries = {};

    queries.assetGroupAssetQuery = 'SELECT ' + [e.campName, e.asgName, e.agId, e.aIdAsset, e.assetFtype, e.campId, e.adPmaxPerf].join(',') +
        ' FROM asset_group_asset ' +
        ' WHERE asset_group_asset.field_type NOT IN ( "BUSINESS_NAME", "CALL_TO_ACTION_SELECTION")' + e.pMaxShop + e.campLike; // remove "HEADLINE", "DESCRIPTION", "LONG_HEADLINE", "LOGO", "LANDSCAPE_LOGO",

    queries.displayVideoQuery = 'SELECT ' + [e.segDate, e.campName, e.aIdCamp, e.cost, e.conv, e.value, e.views, e.cpv, e.impr, e.clicks, e.chType, e.interAsset, e.campId].join(',') +
        ' FROM campaign  WHERE ' + date + e.pMaxShop + e.campLike + e.notInter + e.order;

    queries.assetGroupQuery = 'SELECT ' + [e.segDate, e.campName, e.asgName, e.agStrength, e.agStatus, e.lgType, e.impr, e.clicks, e.cost, e.conv, e.value].join(',') +
        ' FROM asset_group_product_group_view WHERE ' + date + e.agFilter + e.campLike;

    queries.campaignQuery = 'SELECT ' + [e.segDate, e.campName, e.cost, e.conv, e.value, e.views, e.cpv, e.impr, e.clicks, e.chType, e.campId].join(',') +
        ' FROM campaign WHERE ' + date + e.pMaxShop + e.campLike + e.order;

    queries.assetQuery = 'SELECT ' + [e.aIdAsset, e.assetSource, e.ytTitle, e.ytId, e.assetName, e.adUrl, e.assetText, e.imgHeight, e.imgWidth, e.imgMime].join(',') +
        ' FROM asset '

    queries.assetGroupMetricsQuery = 'SELECT ' + [e.campName, e.asgName, e.cost, e.conv, e.value, e.impr, e.clicks, e.agPrimary, e.agStatus].join(',') +
        ' FROM asset_group WHERE ' + date + e.impr0;

    queries.changeQuery = 'SELECT ' + [e.campName, e.userEmail, e.chgDateTime, e.chgResType, e.chgFields, e.clientTyp, e.feed, e.feedItm, e.newRes, e.oldRes, e.resChgOp].join(',') +
        ' FROM change_event ' +
        ' WHERE change_event.change_date_time DURING LAST_14_DAYS ' + e.pMaxShop + e.campLike +
        ' ORDER BY change_event.change_date_time DESC ' +
        ' LIMIT 9999';

    queries.lpQuery = 'SELECT ' + [e.lpUnexpUrl, e.impr, e.clicks, e.cost, e.conv, e.value, e.chType].join(',') +
        ' FROM landing_page_view WHERE ' + date + e.pMaxOnly + ' ORDER BY metrics.impressions DESC';

    queries.placeQuery = 'SELECT ' + [e.campName, e.placement, e.placeType, e.impr, e.inter, e.views, e.cost, e.conv, e.value].join(',') +
        ' FROM detail_placement_view WHERE ' + date + e.pMaxShop + e.campLike + ' ORDER BY metrics.impressions DESC ';

    queries.productQuery = 'SELECT ' + [e.prodTitle, e.prodID, e.cost, e.conv, e.value, e.impr, e.clicks, e.campName, e.chType].join(',') +
        ' FROM shopping_performance_view WHERE metrics.impressions > 0 AND ' + date + e.pMaxShop + e.campLike;
    // Modify the productQuery based on the value of lotsProducts
    switch (s.lotsProducts) {
        case 1:
            queries.productQuery += ' AND metrics.cost_micros > 0';
            break;
        case 2:
            queries.productQuery += ' AND metrics.conversions > 0';
            break;
    }

    queries.geoPerformanceQuery = 'SELECT ' + [e.geoLocationType, e.geoCountryId, e.geoTargetState, e.geoTargetRegion, e.geoTargetCity,
    e.campName, e.campId, e.impr, e.clicks, e.cost, e.conv, e.value, e.chType].join(',') +
        ' FROM geographic_view WHERE ' + date + e.pMaxOnly + e.cost0;

    queries.locationDataQuery = 'SELECT ' + [e.campName, e.campId, e.geoTargetTypePos, e.geoTargetTypeNeg, e.impr, e.clicks, e.cost, e.conv, e.value].join(',') +
        ' FROM campaign WHERE ' + date + e.pMaxOnly + e.impr0;

    queries.pmaxPlacementQuery = 'SELECT ' + [e.pmaxPlacementName, e.pmaxPlacement, e.pmaxPlacementType, e.pmaxPlacementResource, e.pmaxPlacementUrl, e.campName, e.impr].join(',') +
        ' FROM performance_max_placement_view WHERE ' + date + e.impr0;

    return queries;
}
//#endregion

//#region prep output
function getData(q, s) {
    let campaignData = fetchData(q.campaignQuery);
    if (campaignData.length === 0) {
        Logger.log('No eligible PMax campaigns found. Exiting script.');
        return null; // Return null to indicate no eligible campaigns were found
    }
    findTopCampaign(campaignData, s);

    Logger.log('Fetching campaign data. This may take a few moments.');

    let assetGroupAssetData = fetchData(q.assetGroupAssetQuery);
    let displayVideoData = fetchData(q.displayVideoQuery);
    let assetGroupData = fetchData(q.assetGroupQuery);
    let assetData = fetchData(q.assetQuery);
    let assetGroupNewData = fetchData(q.assetGroupMetricsQuery);
    let idAccData = fetchProductData(q.productQuery, s.tCost, s.tRoas, 'idAccount');
    let titleAccountData = fetchProductData(q.productQuery, s.tCost, s.tRoas, 'pTitle');
    let idCountData = fetchProductData(q.productQuery, s.tCost, s.tRoas, 'idCount');
    let pmaxPlacementData = fetchData(q.pmaxPlacementQuery); 

    return {
        campaignData: campaignData || [],
        assetGroupAssetData: assetGroupAssetData || [],
        displayVideoData: displayVideoData || [],
        assetGroupData: assetGroupData || [],
        assetData: assetData || [],
        assetGroupNewData: assetGroupNewData || [],
        idAccData: idAccData || [],
        titleAccountData: titleAccountData || [],
        idCountData: idCountData || [],
        pmaxPlacementData: pmaxPlacementData || []
    };
}

function findTopCampaign(campaignData, s) {
    // find the campaign with the highest cost
    let topCampaign = campaignData.reduce((maxCostCampaign, currentCampaign) => {
        let currentCost = parseInt(currentCampaign['metrics.costMicros'], 10);
        let maxCost = parseInt(maxCostCampaign['metrics.costMicros'], 10);
        return currentCost > maxCost ? currentCampaign : maxCostCampaign;
    });
    s.topCampaign = topCampaign['campaign.name'];
}

function processAndAggData(data, ss, s, mainDateRange) {
    Logger.log('Starting data processing.');

    // Extract marketing assets & de-dupe
    let { displayAssetData, videoAssetData, headlineAssetData, descriptionAssetData, longHeadlineAssetData, logoAssetData } = extractAndFilterData(data);

    // Process and aggregate data
    const processAndAggregate = (dataset, type) => {
        let aggregated = aggregateDataByDateAndCampaign(dataset);
        let metrics = aggregateMetricsByAsset(dataset);
        let enriched = enrichAssetMetrics(metrics, data.assetData, type);
        return { aggregated, metrics, enriched };
    };

    let displayData = processAndAggregate(displayAssetData, 'display');
    let videoData = processAndAggregate(videoAssetData, 'video');
    let headlineData = processAndAggregate(headlineAssetData, 'headline');
    let descriptionData = processAndAggregate(descriptionAssetData, 'description');
    let longHeadlineData = processAndAggregate(longHeadlineAssetData, 'long_headline');
    let logoData = processAndAggregate(logoAssetData, 'logo');

    // Process campaign and asset group data
    let processedCampData = processData(data.campaignData);
    let processedAssetGroupData = processData(data.assetGroupData);
    let dAGData = tidyAssetGroupData(data.assetGroupNewData);

    // Combine all non-search metrics, calc 'search' & process summary
    let nonSearchData = [...displayData.aggregated, ...videoData.aggregated, ...processedAssetGroupData];
    let searchResults = getSearchResults(processedCampData, nonSearchData);
    let dTotal = processTotalData(processedCampData, processedAssetGroupData, displayData.aggregated, videoData.aggregated, searchResults);
    let dSummary = processSummaryData(processedCampData, processedAssetGroupData, displayData.aggregated, videoData.aggregated, searchResults);

    // Merge assets with details
    let dAssets = mergeAssetsWithDetails(
        displayData.metrics, displayData.enriched,
        videoData.metrics, videoData.enriched,
        headlineData.metrics, headlineData.enriched,
        descriptionData.metrics, descriptionData.enriched,
        longHeadlineData.metrics, longHeadlineData.enriched,
        logoData.metrics, logoData.enriched
    );

    // Extract terms and n-grams
    let terms = extractSearchCats(ss, mainDateRange, s);
    let totalTerms = aggregateTerms(terms, ss);
    let sNgrams = extractSearchNgrams(s, terms, 'search');
    let tNgrams = extractTitleNgrams(s, data.titleAccountData, 'title');
    let placements = processPmaxPlacementData(data.pmaxPlacementData, s);
    let idCount = processIdCountData(data.idCountData);

    // Return all data
    return {
        dAssets,
        dAGData,
        dTotal,
        dSummary,
        terms,
        totalTerms,
        sNgrams,
        tNgrams,
        placements,
        idCount
    }
}

function writeAllDataToSheets(ss, data) {
    Logger.log('Writing data to sheets.');

    let writeOperations = [

        { sheetName: 'asset', data: data.dAssets, outputType: 'clear' },
        { sheetName: 'totals', data: data.dTotal, outputType: 'clear' },
        { sheetName: 'summary', data: data.dSummary, outputType: 'clear' },
        { sheetName: 'groups', data: data.dAGData, outputType: 'clear' },
        { sheetName: 'pTitle', data: data.titleAccountData, outputType: 'clear' },
        { sheetName: 'ID', data: data.idAccData, outputType: 'clear' },
        { sheetName: 'terms', data: data.terms, outputType: 'clear' },
        { sheetName: 'totalTerms', data: data.totalTerms, outputType: 'clear' },
        { sheetName: 'tNgrams', data: data.tNgrams, outputType: 'clear' },
        { sheetName: 'sNgrams', data: data.sNgrams, outputType: 'clear' },
        { sheetName: 'placement', data: data.placements, outputType: 'clear' },
        { sheetName: 'idCount', data: data.idCount, outputType: 'clear' }

    ];

    let batchOperations = [];

    writeOperations.forEach(operation => {
        let { sheetName, data, outputType } = operation;
        let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

        if (sheet.getMaxRows() > 1) {
            if (outputType === 'notLast') {
                sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getMaxColumns()).clearContent();
            } else if (outputType === 'clear') {
                sheet.clearContents();
            }
        }

        if (data && data.length > 0) {
            let outputData = prepareOutputData(data, outputType);
            let numRows = outputData.length;
            let numColumns = outputData[0].length;
            batchOperations.push({ sheet, numRows, numColumns, outputData });
        }
    });

    batchOperations.forEach(({ sheet, numRows, numColumns, outputData }) => {
        try {
            let range = sheet.getRange(1, 1, numRows, numColumns);
            range.setValues(outputData);
        } catch (e) {
            console.error(`Error writing to ${sheet.getName()}: ${e.message}`);
            console.error(`Data structure: ${JSON.stringify(outputData.slice(0, 2))}`);
        }
    });

    SpreadsheetApp.flush();
    Logger.log('Data writing to sheets completed.');
}

function prepareOutputData(data) {
    if (!Array.isArray(data)) {
        Logger.log('Warning: Data is expected to be an array, but received an object.');
        return []; // Return an empty array to avoid issues
    }

    if (data.length === 0) {
        return []; // Return an empty array if data is empty
    }

    if (Array.isArray(data[0])) {
        // Data is already an array of arrays
        return data;
    } else {
        // Data is an array of objects
        let headers = Object.keys(data[0]);
        let values = data.map(row => headers.map(header => row[header] !== null && row[header] !== undefined ? row[header] : ""));
        return [headers].concat(values);
    }
}

function outputDataToSheet(ss, sheetName, data, outputType) {
    let startTime = new Date();

    // Create or access the sheet
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    // Check if data is undefined or empty, and if so, log the issue and return
    if (!data || data.length === 0) {
        Logger.log('Maybe try a different date range. Currently, there is no data to write to ' + sheetName);
        if (outputType === 'notLast') {
            sheet.getRange(2, 1, sheet.getMaxRows(), sheet.getMaxColumns() - 1).clearContent();
        } else if (outputType === 'clear') {
            sheet.clearContents();
        }
        return;
    }

    // Determine the number of columns in the data
    let numberOfColumns = Array.isArray(data[0]) ? data[0].length : Object.keys(data[0]).length;

    // Clear the dynamic range based on the data length
    sheet.getRange(1, 1, sheet.getMaxRows(), numberOfColumns).clearContent();

    // Prepare the output data
    let outputData;
    if (!Array.isArray(data[0])) {
        let headers = Object.keys(data[0]);
        let values = data.map(row => headers.map(header => row[header] ?? ""));
        outputData = [headers].concat(values);
    } else {
        outputData = data;
    }

    // Write all data to the sheet
    sheet.getRange(1, 1, outputData.length, outputData[0].length).setValues(outputData);

}

function extractSearchCats(ss, mainDateRange, s) {
    let campaignIdsQuery = AdsApp.report(`
    SELECT campaign.id, campaign.name, metrics.clicks, 
    metrics.impressions, metrics.conversions, metrics.conversions_value
    FROM campaign 
    WHERE campaign.status != 'REMOVED' 
    AND campaign.advertising_channel_type = "PERFORMANCE_MAX" 
    AND metrics.impressions > 0 AND ${mainDateRange} 
    ORDER BY metrics.conversions DESC `
    );

    let rows = campaignIdsQuery.rows();
    let allSearchTerms = [['Campaign Name', 'Campaign ID', 'Category Label', 'Clicks', 'Impr', 'Conv', 'Value', 'Bucket', 'Distance']];

    while (rows.hasNext()) {
        let row = rows.next();
        let campaignName = row['campaign.name'];
        let campaignId = row['campaign.id'];

        let query = AdsApp.report(` 
        SELECT campaign_search_term_insight.category_label, metrics.clicks, 
        metrics.impressions, metrics.conversions, metrics.conversions_value  
        FROM campaign_search_term_insight 
        WHERE ${mainDateRange}
        AND campaign_search_term_insight.campaign_id = ${campaignId} 
        ORDER BY metrics.impressions DESC `
        );

        let searchTermRows = query.rows();
        while (searchTermRows.hasNext()) {
            let row = searchTermRows.next();
            let term = (row['campaign_search_term_insight.category_label'] || 'blank').toLowerCase();
            let { bucket, distance } = determineBucketAndDistance(term, s.brandTerm, s.levenshtein);
            term = cleanNGram(term);
            allSearchTerms.push([campaignName, campaignId,
                term,
                row['metrics.clicks'],
                row['metrics.impressions'],
                row['metrics.conversions'],
                row['metrics.conversions_value'],
                bucket,
                distance]);
        }
    }

    return allSearchTerms;
}

function aggregateTerms(searchTerms, ss) {
    let aggregated = {}; // { term: { clicks: 0, impr: 0, conv: 0, value: 0, bucket: '', distance: 0 }, ... }

    for (let i = 1; i < searchTerms.length; i++) { // Start from 1 to skip headers
        let term = searchTerms[i][2] || 'blank'; // Use 'blank' for empty search terms

        if (!aggregated[term]) {
            aggregated[term] = {
                clicks: 0,
                impr: 0,
                conv: 0,
                value: 0,
                bucket: searchTerms[i][7],  // Assuming bucket is in the 8th position of your array
                distance: searchTerms[i][8]  // Assuming distance is in the 9th position of your array
            };
        }

        aggregated[term].clicks += Number(searchTerms[i][3]);
        aggregated[term].impr += Number(searchTerms[i][4]);
        aggregated[term].conv += Number(searchTerms[i][5]);
        aggregated[term].value += Number(searchTerms[i][6]);
        // Assuming that the bucket and distance are the same for all instances of a term,
        // we don't aggregate them but just take the value from the first instance.
    }

    let totalTerms = [['Category Label', 'Clicks', 'Impr', 'Conv', 'Value', 'Bucket', 'Distance']]; // Header row
    for (let term in aggregated) {
        totalTerms.push([
            term,
            aggregated[term].clicks,
            aggregated[term].impr,
            aggregated[term].conv,
            aggregated[term].value,
            aggregated[term].bucket,  // Adding bucket to output
            aggregated[term].distance  // Adding distance to output
        ]);
    }

    let header = totalTerms.shift(); // Remove the header before sorting
    // Sort by impressions descending
    totalTerms.sort((a, b) => b[2] - a[2]);
    totalTerms.unshift(header); // Prepend the header back to the top

    return totalTerms;

}

function extractSearchNgrams(s, data, type) {
    let nGrams = {};

    data.slice(1).forEach(row => {
        let term = type === 'search' ? row[2] : (row['Product Title'] ? row['Product Title'].toLowerCase() : '');
        let terms = term.split(' ');
        terms.forEach((nGram) => {
            nGram = nGram || 'blank';
            nGram = cleanNGram(nGram);
            if (!nGrams[nGram]) {
                nGrams[nGram] = {
                    nGram: nGram,
                    impr: 0,
                    clicks: 0,
                    conv: 0,
                    value: 0,
                    cost: type === 'title' ? 0 : undefined
                };
            }
            nGrams[nGram].impr += type === 'search' ? Number(row[4]) : row['Impr'];
            nGrams[nGram].clicks += type === 'search' ? Number(row[3]) : row['Clicks'];
            nGrams[nGram].conv += type === 'search' ? Number(row[5]) : row['Conv'];
            nGrams[nGram].value += type === 'search' ? Number(row[6]) : row['Value'];
            if (type === 'title') {
                nGrams[nGram].cost += row['Cost'];
            }
        });
    });

    let allNGrams = type === 'search'
        ? [['nGram', 'Impr', 'Clicks', 'Conv', 'Value', 'CTR', 'CvR', 'AOV', 'Bucket']]
        : [['nGram', 'Impr', 'Clicks', 'Cost', 'Conv', 'Value', 'CTR', 'CvR', 'AOV', 'ROAS', 'Bucket']];

    let nGramsList = Object.values(nGrams);

    let totalClicks = nGramsList.reduce((sum, i) => sum + i.clicks, 0);
    let totalConversions = nGramsList.reduce((sum, i) => sum + i.conv, 0);

    let percentile80Clicks = 0.8 * totalClicks;
    let percentile80Conversions = 0.8 * totalConversions;

    let cumulativeClicks = 0;
    let cumulativeConversions = 0;
    let clicks80Percentile = 0;
    let conv80Percentile = 0;

    nGramsList.sort((a, b) => b.clicks - a.clicks);
    for (let i of nGramsList) {
        cumulativeClicks += i.clicks;
        if (cumulativeClicks <= percentile80Clicks) {
            clicks80Percentile = i.clicks;
        } else {
            break;
        }
    }

    nGramsList.sort((a, b) => b.conv - a.conv);
    for (let i of nGramsList) {
        cumulativeConversions += i.conv;
        if (cumulativeConversions <= percentile80Conversions) {
            conv80Percentile = i.conv;
        } else {
            break;
        }
    }

    for (let term in nGrams) {
        let item = nGrams[term];
        item.CTR = item.impr > 0 ? item.clicks / item.impr : 0;
        item.CvR = item.clicks > 0 ? item.conv / item.clicks : 0;
        item.AOV = item.conv > 0 ? item.value / item.conv : 0;

        if (item.clicks === 0) {
            item.bucket = 'zombie';
        } else if (item.conv === 0) {
            item.bucket = 'zeroconv';
        } else if (item.clicks < clicks80Percentile) {
            item.bucket = item.conv < conv80Percentile ? 'Lclicks_Lconv' : 'Lclicks_Hconv';
        } else {
            item.bucket = item.conv < conv80Percentile ? 'Hclicks_Lconv' : 'Hclicks_Hconv';
        }

        if (type === 'title') {
            item.ROAS = item.cost > 0 ? item.value / item.cost : 0;
            allNGrams.push([item.nGram, item.impr, item.clicks, item.cost, item.conv, item.value, item.CTR, item.CvR, item.AOV, item.ROAS, item.bucket]);
        } else {
            allNGrams.push([item.nGram, item.impr, item.clicks, item.conv, item.value, item.CTR, item.CvR, item.AOV, item.bucket]);
        }
    }

    allNGrams.sort((a, b) => {
        if (a[0] === 'nGram') return -1;
        if (b[0] === 'nGram') return 1;
        return type === 'search' ? b[1] - a[1] : b[3] - a[3]; // Sort by Clicks for search and Cost for title
    });

    let brandTerm = s.brandTerm.includes(',') ? s.brandTerm.split(/[ ,]+/).map(i => i.toLowerCase()) : s.brandTerm.split(' ').map(i => i.toLowerCase());
    allNGrams = allNGrams.filter(i => !brandTerm.includes(i[0]) && i[0] !== 'blank');

    return allNGrams;
}

function extractTitleNgrams(s, data, type) {
    let nGrams = {};

    data.slice(1).forEach(row => {
        let term = type === 'search' ? row[2] : (row['Product Title'] ? row['Product Title'].toLowerCase() : '');
        let terms = term.split(' ');

        terms.forEach((nGram) => {
            nGram = nGram || 'blank';
            nGram = cleanNGram(nGram);
            if (!nGrams[nGram]) {
                nGrams[nGram] = {
                    nGram: nGram,
                    impr: 0,
                    clicks: 0,
                    conv: 0,
                    value: 0,
                    cost: type === 'title' ? 0 : undefined
                };
            }
            nGrams[nGram].impr += type === 'search' ? Number(row[4]) : row['Impr'];
            nGrams[nGram].clicks += type === 'search' ? Number(row[3]) : row['Clicks'];
            nGrams[nGram].conv += type === 'search' ? Number(row[5]) : row['Conv'];
            nGrams[nGram].value += type === 'search' ? Number(row[6]) : row['Value'];
            if (type === 'title') {
                nGrams[nGram].cost += row['Cost'];
            }
        });
    });

    let allNGrams = type === 'search'
        ? [['nGram', 'Impr', 'Clicks', 'Conv', 'Value', 'CTR', 'CvR', 'AOV', 'Bucket']]
        : [['nGram', 'Impr', 'Clicks', 'Cost', 'Conv', 'Value', 'CTR', 'CvR', 'AOV', 'ROAS', 'Bucket']];

    for (let term in nGrams) {
        let i = nGrams[term];
        i.CTR = i.impr > 0 ? i.clicks / i.impr : 0;
        i.CvR = i.clicks > 0 ? i.conv / i.clicks : 0;
        i.AOV = i.conv > 0 ? i.value / i.conv : 0;
        if (type === 'title') {
            i.ROAS = i.cost > 0 ? i.value / i.cost : 0;
            i.bucket = determineBucket(i.cost, i.conv, i.ROAS, (s.tCost * 10), (s.tRoas * 2));
        }
        if (type === 'search') {
            i.bucket = determineSearchBucket(i.impr, i.clicks, i.conv, i.value);
        }
        allNGrams.push(type === 'search'
            ? [i.nGram, i.impr, i.clicks, i.conv, i.value, i.CTR, i.CvR, i.AOV, i.bucket]
            : [i.nGram, i.impr, i.clicks, i.cost, i.conv, i.value, i.CTR, i.CvR, i.AOV, i.ROAS, i.bucket]
        );
    }

    allNGrams.sort((a, b) => {
        if (a[0] === 'nGram') return -1;
        if (b[0] === 'nGram') return 1;
        return type === 'search' ? b[2] - a[2] : b[3] - a[3]; // Sort by Impr for search and Cost for title
    });

    let brandTerm = s.brandTerm.includes(',') ? s.brandTerm.split(/[ ,]+/).map(i => i.toLowerCase()) : s.brandTerm.split(' ').map(i => i.toLowerCase());
    allNGrams = allNGrams.filter(i => !brandTerm.includes(i[0]) && i[0] !== 'blank' && i[0] !== '');

    return allNGrams;
}

function adjustSheetVisibilityBasedOnAccountType(ss, s) {
    Logger.log('Adjusting visible tabs based on account type.');
    try {
        let leadgenSheets = ['Account.', 'Campaign.', 'Categories.', 'Asset Groups.']; // no alt tab for Assets or Pages yet
        let ecommerceSheets = ['Account', 'Campaign', 'Categories', 'Title', 'nGram', 'Comp', 'ID', 'Asset Groups'];

        // Determine which sheets to show/hide based on account type
        let sheetsToShow = s.accountType === 'leadgen' ? leadgenSheets : ecommerceSheets;
        let sheetsToHide = s.accountType === 'leadgen' ? ecommerceSheets : leadgenSheets;

        // Show and hide sheets accordingly
        sheetsToShow.forEach(sheetName => ss.getSheetByName(sheetName)?.showSheet());
        sheetsToHide.forEach(sheetName => ss.getSheetByName(sheetName)?.hideSheet());

        // Adjusting rows visibility in 'Advanced' tab based on account type
        let advancedSheet = ss.getSheetByName('Advanced');
        if (s.accountType === 'leadgen') {
            advancedSheet.hideRows(12, 6); // Hides rows 12 to 17
            advancedSheet.hideRows(26, 5); // Hides rows 26 to 30
        } else {
            advancedSheet.showRows(12, 6); // Shows rows 12 to 17
            advancedSheet.showRows(26, 5); // Shows rows 26 to 30
        }

        // set the selectedCampaign named range = to s.topCampaign (Campaign & Campaign. tabs)
        ss.getRangeByName('selectedCampaign').setValue(s.topCampaign);
        ss.getRangeByName('selectedCampaign.').setValue(s.topCampaign);
    } catch (error) {
        console.error('Error adjusting sheet visibility:', error.message);
    }
}

function formatDateLiteral(dateString) {
    // Use a regular expression to extract date parts & regex to rearange them
    let dateParts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateParts) {
        throw new Error('Date format is not valid. Expected format dd/mm/yyyy.');
    }
    let formattedDate = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
    return formattedDate;
}

function checkVersion(userScriptVersion, userSheetVersion, ss, template) {
    let CONTROL_SHEET = 'https://docs.google.com/spreadsheets/d/16W7nqAGg7LbqykOCdwsGLB93BMUWvU9ZjlVprIPZBtg/' // used to find latest version
    let controlSheet = safeOpenAndShareSpreadsheet(CONTROL_SHEET);
    // get value of named ranges currentScriptVersion & currentSheetVersion
    let latestScriptVersion, latestSheetVersion;
    try {
        latestScriptVersion = controlSheet.getRangeByName('latestScriptVersion').getValue();
        latestSheetVersion = controlSheet.getRangeByName('latestSheetVersion').getValue();
    } catch (e) {
        console.error(`Error fetching current script/sheet version: ${e.message}`);
    }

    // Display messages based on version comparison & write them to userMessage in the main ss
    let userMessage = '';
    let userMessageRange;
    
    try {
        userMessageRange = ss.getRangeByName('userMessage');
    } catch (e) {
        Logger.log("Warning: Named range 'userMessage' not found in the spreadsheet");
    }

    if (userScriptVersion !== latestScriptVersion || userSheetVersion !== latestSheetVersion) {
        if (userScriptVersion !== latestScriptVersion) {
            userMessage = "Time to update your script. You are using: " + userScriptVersion + ", Latest version is: " + latestScriptVersion + " from here: https://mikerhodes.circle.so/c/script/";
        }
        if (userSheetVersion !== latestSheetVersion) {
            userMessage = "Time to update your sheet. You are using: " + userSheetVersion + ", Latest version is: " + latestSheetVersion;
        }
    } else {
        userMessage = "Great work! You're using the latest versions. Script: " + userScriptVersion + ", Sheet: " + userSheetVersion;
    }
    
    if (userMessageRange) {
        userMessageRange.setValue(userMessage);
    }
    Logger.log(userMessage);
}

function flattenObject(ob) {
    let toReturn = {};
    let stack = [{ obj: ob, prefix: '' }];

    while (stack.length > 0) {
        let { obj, prefix } = stack.pop();
        for (let i in obj) {
            if (obj.hasOwnProperty(i)) {
                let key = prefix ? prefix + '.' + i : i;
                if (typeof obj[i] === 'object' && obj[i] !== null) {
                    stack.push({ obj: obj[i], prefix: key });
                } else {
                    toReturn[key] = obj[i];
                }
            }
        }
    }

    return toReturn;
}

function fetchData(q) {
    try {
        let data = [];
        let iterator = AdsApp.search(q, { 'apiVersion': 'v18' });
        while (iterator.hasNext()) {
            let row = flattenObject(iterator.next());
            data.push(row); // Flatten the row data
        }
        return data;
    } catch (error) {
        Logger.log(`Error fetching data for query: ${q}`);
        Logger.log(`Error message: ${error.message}`);
        return null; // Return null to indicate that the data fetch failed
    }
}
//#endregion

//#region data processing
function processIdCountData(rawData) {
    const headers = ['Product Title', 'ID', 'inBoth', 'countPmax', 'countShop', 'costPmax', 'costShop'];

    // Transform the data into rows
    const processedRows = rawData.map(item => ({
        'Product Title': item['Product Title'] || '',  // Changed to match the format
        'ID': item.ID || '',
        'inBoth': item.inBoth || 0,
        'countPmax': item.countPmax || 0,
        'countShop': item.countShop || 0,
        'costPmax': item.costPmax || 0,
        'costShop': item.costShop || 0
    }));

    // Sort rows - first by inBoth (1 first), then by costPmax
    const sortedRows = processedRows.sort((a, b) => {
        // First sort by inBoth (1 first)
        if (b.inBoth !== a.inBoth) {
            return b.inBoth - a.inBoth;
        }
        // Then sort by costPmax within each inBoth group
        return b.costPmax - a.costPmax;
    });

    // Convert to array format
    const rows = sortedRows.map(item => [
        item['Product Title'],
        item.ID,
        item.inBoth,
        item.countPmax,
        item.countShop,
        item.costPmax.toFixed(2),
        item.costShop.toFixed(2)
    ]);

    return [headers, ...rows];
}

function processGeoPerformanceData(geoData, locationData, ss) {
    if (!geoData?.length) return {
        locations: [['No data available']],
        campaigns: [['No data available']]
    };

    // Initialize base structures
    const campaignSettings = new Map(locationData.map(row => 
        [row['campaign.name'], row['campaign.geoTargetTypeSetting.positiveGeoTargetType']]
    ));

    const locationMap = new Map(
        ss.getSheetByName('map')?.getRange('A:C')
            .getValues()
            .filter(([id, name, type]) => id && name && type)
            .map(([id, name, type]) => [`geoTargetConstants/${id.toString()}`, { name, type }]) || []
    );

    // Helper function to create empty stat object
    const createEmptyStat = (type = null) => ({
        costP: 0, costI: 0, convP: 0, convI: 0, valueP: 0, valueI: 0, 
        ...(type && { type })
    });

    // Stats storage
    const stats = {
        country: new Map(),
        campaign: new Map(),
        region: new Map(),
        city: new Map()
    };

    // Campaign location tracking
    const campaignLocationCosts = new Map();

    // Helper function to update stats
    const updateStats = (map, key, metrics, isPresence, type = null) => {
        if (!map.has(key)) {
            map.set(key, createEmptyStat(type));
        }
        const stat = map.get(key);
        const suffix = isPresence ? 'P' : 'I';
        Object.entries(metrics).forEach(([metric, value]) => {
            stat[metric + suffix] += value;
        });
    };

    // Process each row of data
    geoData.forEach(row => {
        const isPresence = row['geographicView.locationType'] === 'LOCATION_OF_PRESENCE';
        const metrics = {
            cost: (parseInt(row['metrics.costMicros']) || 0) / 1e6,
            conv: parseFloat(row['metrics.conversions']) || 0,
            value: parseFloat(row['metrics.conversionsValue']) || 0
        };

        const campaignName = row['campaign.name'];

        // Process geographical data
        const geoTypes = [
            {
                type: 'country',
                id: row['geographicView.countryCriterionId'],
                prefix: 'geoTargetConstants/',
                validType: 'Country'
            },
            {
                type: 'region',
                id: row['segments.geoTargetRegion'] || row['segments.geoTargetState'],
                prefix: '',
                validType: ['Region', 'State']
            },
            {
                type: 'city',
                id: row['segments.geoTargetCity'],
                prefix: '',
                validType: 'City'
            }
        ];

        geoTypes.forEach(({ type, id, prefix, validType }) => {
            if (id) {
                const mapped = locationMap.get(`${prefix}${id}`);
                const isValidType = Array.isArray(validType) 
                    ? validType.includes(mapped?.type)
                    : mapped?.type === validType;

                if (mapped && isValidType) {
                    updateStats(stats[type], mapped.name, metrics, isPresence, mapped.type);

                    // Track country costs for campaigns
                    if (type === 'country') {
                        if (!campaignLocationCosts.has(campaignName)) {
                            campaignLocationCosts.set(campaignName, new Map());
                        }
                        const locationCosts = campaignLocationCosts.get(campaignName);
                        locationCosts.set(mapped.name, 
                            (locationCosts.get(mapped.name) || 0) + metrics.cost);
                    }
                }
            }
        });

        // Process campaign stats
        updateStats(stats.campaign, campaignName, metrics, isPresence);
    });

    // Processing helper functions
    const getTopLocation = (campaignName) => {
        const locationCosts = campaignLocationCosts.get(campaignName);
        if (!locationCosts) return { location: 'Unknown', percentage: '0' };

        const totalCost = Array.from(locationCosts.values()).reduce((a, b) => a + b, 0);
        const [topLocation, topCost] = Array.from(locationCosts.entries())
            .reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);

        return {
            location: topLocation,
            percentage: totalCost > 0 ? (topCost / totalCost * 100).toFixed(0) : '0'
        };
    };

    const formatStats = (stat) => [
        ...['costP', 'costI', 'convP', 'convI', 'valueP', 'valueI'].map(h => stat[h].toFixed(2)),
        (stat.costP > 0 ? stat.valueP / stat.costP : 0).toFixed(2),
        (stat.costI > 0 ? stat.valueI / stat.costI : 0).toFixed(2)
    ];

    // Create output rows with headers
    const headers = ['costP', 'costI', 'convP', 'convI', 'valueP', 'valueI', 'roasP', 'roasI'];
    
    const createRows = (map, includeSettings = false) => {
        const rows = Array.from(map, ([key, data]) => {
            const row = [key, ...formatStats(data)];
            
            if (includeSettings) {
                const setting = campaignSettings.get(key);
                row.push(setting === 'PRESENCE' ? 'ok' : 
                        setting === 'PRESENCE_OR_INTEREST' ? 'review' : 'unknown');
                const { location, percentage } = getTopLocation(key);
                row.push(location, `${percentage}%`);
            }

            if (data.type) row.push(data.type);
            return row;
        }).sort((a, b) => (parseFloat(b[1]) + parseFloat(b[2])) - (parseFloat(a[1]) + parseFloat(a[2])));

        const nameHeader = includeSettings ? 'Campaign' : 'Location';
        const extraHeaders = includeSettings ? 
            ['Setting', 'Top Location', 'Top Location %'] : ['Type'];
        return [[nameHeader, ...headers, ...extraHeaders], ...rows];
    };

    return {
        locations: [
            ['Location', ...headers, 'Type'],  // header row
            ...createRows(stats.country).slice(1),  // skip header
            ...createRows(stats.region).slice(1),   // skip header
            ...createRows(stats.city).slice(1)      // skip header
        ],
        campaigns: createRows(stats.campaign, true)
    };
}

function processPmaxPlacementData(data, s) {
    if (!data || data.length === 0) {
        Logger.log('No PMax placement data available.');
        return [['No data available']];
    }

    let minPlaceImpr = s.minPlaceImpr;
    
    // Calculate total impressions across all campaigns
    const totalImpressions = data.reduce((sum, row) => sum + (Number(row['metrics.impressions']) || 0), 0);
    
    // Initialize the aggregated data object using placement as the key
    const aggregatedData = new Map();
    
    // Aggregate ALL data first, without any filtering
    data.forEach(row => {
        const key = JSON.stringify({
            displayName: row['performanceMaxPlacementView.displayName'],
            placement: row['performanceMaxPlacementView.placement'],
            type: row['performanceMaxPlacementView.placementType'],
            targetUrl: row['performanceMaxPlacementView.targetUrl']
        });

        if (!aggregatedData.has(key)) {
            aggregatedData.set(key, {
                displayName: row['performanceMaxPlacementView.displayName'],
                placement: row['performanceMaxPlacementView.placement'],
                type: row['performanceMaxPlacementView.placementType'],
                targetUrl: row['performanceMaxPlacementView.placementType'] === 'GOOGLE_PRODUCTS' ? 
                    'Google Owned & Operated' : 
                    row['performanceMaxPlacementView.displayName'] === 'Video no longer available' ?
                        'Video no longer available' : row['performanceMaxPlacementView.targetUrl'],
                impressions: 0
            });
        }

        // Add impressions to the aggregate
        aggregatedData.get(key).impressions += Number(row['metrics.impressions']) || 0;
    });

    // Convert aggregated data to array format, filtering out low-impression placements
    let processedData = []
    const headers = [['Display Name', 'Placement', 'Type', 'Target URL', 'Campaign', 'Impressions']];
    
    // Only output aggregated rows that meet the threshold
    for (const placementData of aggregatedData.values()) {
        if (placementData.impressions >= minPlaceImpr) {
            processedData.push([
                placementData.displayName,
                placementData.placement,
                placementData.type,
                placementData.targetUrl,
                'All Campaigns',
                placementData.impressions
            ]);
        }
    }

    // First sort the aggregated data (All Campaigns) by impressions descending
    const aggregatedLength = processedData.length;
    processedData.sort((a, b) => b[5] - a[5]);

    // Add individual campaign data that meets the threshold
    data.forEach(row => {
        const impressions = parseInt(row['metrics.impressions']) || 0;
        if (impressions >= minPlaceImpr) {
            const targetUrl = row['performanceMaxPlacementView.placementType'] === 'GOOGLE_PRODUCTS' ? 
                'Google Owned & Operated' : 
                row['performanceMaxPlacementView.displayName'] === 'Video no longer available' ?
                    'Video no longer available' : row['performanceMaxPlacementView.targetUrl'];
                    
            processedData.push([
                row['performanceMaxPlacementView.displayName'],
                row['performanceMaxPlacementView.placement'],
                row['performanceMaxPlacementView.placementType'],
                targetUrl,
                row['campaign.name'],
                impressions
            ]);
        }
    });

    // Now sort everything after the aggregated data by campaign name first, then impressions
    const campaignData = processedData.slice(aggregatedLength);
    campaignData.sort((a, b) => {
        if (a[4] !== b[4]) return a[4].localeCompare(b[4]); // First by campaign name
        return b[5] - a[5]; // Then by impressions descending
    });
    
    // Reconstruct the array with headers, aggregated data, and sorted campaign data
    processedData = [...headers, ...processedData.slice(0, aggregatedLength), ...campaignData];

    // Add 'All Campaigns' header and campaign names to column G
    const campaigns = [...new Set(data.map(row => row['campaign.name']))].sort();
    processedData[0].push('All Campaigns', 'Total Impressions'); // Add headers for columns G and H
    for (let i = 1; i < processedData.length; i++) {
        processedData[i].push(i <= campaigns.length ? campaigns[i-1] : '', ''); // Empty string for column H in all rows except first
    }
    
    // Add total impressions to cell H1
    processedData[0][7] = totalImpressions;

    return processedData;
}

function extractAndFilterData(data) {
    let displayAssetsSet = new Set();
    let videoAssetsSet = new Set();
    let headlineAssetsSet = new Set();
    let descriptionAssetsSet = new Set();
    let longHeadlineAssetsSet = new Set();
    let logoAssetsSet = new Set();

    data.assetGroupAssetData.forEach(row => {
        if (row['assetGroupAsset.fieldType'] && row['assetGroupAsset.fieldType'].includes('MARKETING')) {
            displayAssetsSet.add(row['asset.resourceName']);
        }
        if (row['assetGroupAsset.fieldType'] && row['assetGroupAsset.fieldType'].includes('VIDEO')) {
            videoAssetsSet.add(row['asset.resourceName']);
        }
        if (row['assetGroupAsset.fieldType'] && row['assetGroupAsset.fieldType'].includes('HEADLINE')) {
            headlineAssetsSet.add(row['asset.resourceName']);
        }
        if (row['assetGroupAsset.fieldType'] && row['assetGroupAsset.fieldType'].includes('DESCRIPTION')) {
            descriptionAssetsSet.add(row['asset.resourceName']);
        }
        if (row['assetGroupAsset.fieldType'] && row['assetGroupAsset.fieldType'].includes('LONG_HEADLINE')) {
            longHeadlineAssetsSet.add(row['asset.resourceName']);
        }
        if (row['assetGroupAsset.fieldType'] && row['assetGroupAsset.fieldType'].includes('LOGO')) {
            logoAssetsSet.add(row['asset.resourceName']);
        }
    });

    let displayAssets = [...displayAssetsSet];
    let videoAssets = [...videoAssetsSet];
    let headlineAssets = [...headlineAssetsSet];
    let descriptionAssets = [...descriptionAssetsSet];
    let longHeadlineAssets = [...longHeadlineAssetsSet];
    let logoAssets = [...logoAssetsSet];

    let displayAssetData = data.displayVideoData.filter(row => displayAssets.includes(row['segments.assetInteractionTarget.asset']));
    let videoAssetData = data.displayVideoData.filter(row => videoAssets.includes(row['segments.assetInteractionTarget.asset']));
    let headlineAssetData = data.displayVideoData.filter(row => headlineAssets.includes(row['segments.assetInteractionTarget.asset']));
    let descriptionAssetData = data.displayVideoData.filter(row => descriptionAssets.includes(row['segments.assetInteractionTarget.asset']));
    let longHeadlineAssetData = data.displayVideoData.filter(row => longHeadlineAssets.includes(row['segments.assetInteractionTarget.asset']));
    let logoAssetData = data.displayVideoData.filter(row => logoAssets.includes(row['segments.assetInteractionTarget.asset']));

    return {
        displayAssetData,
        videoAssetData,
        headlineAssetData,
        descriptionAssetData,
        longHeadlineAssetData,
        logoAssetData
    };
}

function mergeAssetsWithDetails(displayMetrics, displayDetails, videoMetrics, videoDetails, headlineMetrics, headlineDetails, descriptionMetrics, descriptionDetails, longHeadlineMetrics, longHeadlineDetails, logoMetrics, logoDetails) {
    let mergeWithBucket = (metrics, details, bucket) => {
        return details.map(detail => {
            let metric = metrics[detail.assetName];
            return {
                ...detail,
                ...metric,
                bucket: bucket
            };
        });
    };

    let mergedDisplay = mergeWithBucket(displayMetrics, displayDetails, 'display');
    let mergedVideo = mergeWithBucket(videoMetrics, videoDetails, 'video');
    let mergedHeadline = mergeWithBucket(headlineMetrics, headlineDetails, 'headline');
    let mergedDescription = mergeWithBucket(descriptionMetrics, descriptionDetails, 'description');
    let mergedLongHeadline = mergeWithBucket(longHeadlineMetrics, longHeadlineDetails, 'long_headline');
    let mergedLogo = mergeWithBucket(logoMetrics, logoDetails, 'logo');

    let headers = ['Asset Name', 'Source', 'File/Title', 'URL/ID', 'Impr', 'Clicks', 'Views', 'Cost', 'Conv', 'Value', 'CTR', 'CVR', 'AOV', 'ROAS', 'CPA', 'Bucket'];
    let dataArray = [...mergedDisplay, ...mergedVideo, ...mergedHeadline, ...mergedDescription, ...mergedLongHeadline, ...mergedLogo].map(i => {
        return [i.assetName, i.assetSource, i.filenameOrTitle, i.urlOrID, i.impr, i.clicks, i.views, i.cost, i.conv, i.value, i.ctr, i.cvr, i.aov, i.roas, i.cpa, i.bucket];
    });

    return [headers].concat(dataArray);
}

function enrichAssetMetrics(aggregatedMetrics, assetData, type) {
    let assetDetailsArray = [];

    // For each asset in aggregatedMetrics, fetch details from assetData
    for (let assetName of Object.keys(aggregatedMetrics)) {
        // Find the asset in assetData
        let matchingAsset = assetData.find(asset => asset['asset.resourceName'] === assetName);
        if (matchingAsset) {
            let assetDetails = {
                type: type,
                assetName: assetName,
                assetSource: matchingAsset['asset.source'],
                filenameOrTitle: '',
                urlOrID: '',
                impr: aggregatedMetrics[assetName].impr
            };

            // Set filenameOrTitle and urlOrID based on asset type
            if (['display', 'logo'].includes(type)) {
                assetDetails.filenameOrTitle = matchingAsset['asset.name'] || matchingAsset['asset.imageAsset.fullSize.url'] || '';
                assetDetails.urlOrID = matchingAsset['asset.imageAsset.fullSize.url'] || '';
            } else if (type === 'video') {
                assetDetails.filenameOrTitle = matchingAsset['asset.youtubeVideoAsset.youtubeVideoTitle'] || '';
                assetDetails.urlOrID = matchingAsset['asset.youtubeVideoAsset.youtubeVideoId'] || '';
            } else if (['headline', 'description', 'long_headline'].includes(type)) {
                assetDetails.filenameOrTitle = matchingAsset['asset.textAsset.text'] || '';
                assetDetails.urlOrID = matchingAsset['asset.id'] || '';
            }

            assetDetailsArray.push(assetDetails);
        }
    }
    // sort by impr
    assetDetailsArray.sort((a, b) => b.impr - a.impr);
    return assetDetailsArray;
}

function aggregateMetricsByAsset(data) {
    const metrics = ['impr', 'clicks', 'views', 'cost', 'conv', 'value'];
    const calculations = {
        ctr: (m) => m.impr > 0 ? m.clicks / m.impr : 0,
        cvr: (m) => m.clicks > 0 ? m.conv / m.clicks : 0,
        aov: (m) => m.conv > 0 ? m.value / m.conv : 0,
        roas: (m) => m.cost > 0 ? m.value / m.cost : 0,
        cpa: (m) => m.conv > 0 ? m.cost / m.conv : 0
    };

    return data.reduce((acc, row) => {
        const asset = row['segments.assetInteractionTarget.asset'];
        if (!acc[asset]) {
            acc[asset] = metrics.reduce((m, k) => ({ ...m, [k]: 0 }), {});
        }

        // Update base metrics
        acc[asset].impr += parseInt(row['metrics.impressions']) || 0;
        acc[asset].clicks += parseInt(row['metrics.clicks']) || 0;
        acc[asset].views += parseInt(row['metrics.videoViews']) || 0;
        acc[asset].cost += (parseInt(row['metrics.costMicros']) / 1e6) || 0;
        acc[asset].conv += parseFloat(row['metrics.conversions']) || 0;
        acc[asset].value += parseFloat(row['metrics.conversionsValue']) || 0;

        // Calculate derived metrics
        Object.entries(calculations).forEach(([key, calc]) => {
            acc[asset][key] = calc(acc[asset]);
        });

        return acc;
    }, {});
}

function aggregateDataByDateAndCampaign(data) {
    let aggData = {};
    data.forEach(row => {
        let date = row['segments.date'];
        let campName = row['campaign.name'];
        let key = `${date}_${campName}`;
        if (!aggData[key]) {
            aggData[key] = {
                'date': date,
                'campName': campName,
                'cost': 0,
                'impr': 0,
                'clicks': 0,
                'conv': 0,
                'value': 0
            };
        }
        aggData[key].cost += row['metrics.costMicros'] ? row['metrics.costMicros'] / 1e6 : 0;
        aggData[key].impr += row['metrics.impressions'] ? parseInt(row['metrics.impressions']) : 0;
        aggData[key].clicks += row['metrics.clicks'] ? parseInt(row['metrics.clicks']) : 0;
        aggData[key].conv += row['metrics.conversions'] ? parseFloat(row['metrics.conversions']) : 0;
        aggData[key].value += row['metrics.conversionsValue'] ? parseFloat(row['metrics.conversionsValue']) : 0;
    });
    return Object.values(aggData);
}

function getSearchResults(processedCampData, nonSearchData) {
    let searchMetrics = {};

    // Pre-allocate all metrics to avoid dynamic object growth
    processedCampData.forEach(row => {
        let key = row.date + '_' + row.campName;
        searchMetrics[key] = {
            cost: 0, impr: 0, clicks: 0, conv: 0, value: 0
        };
    });

    // Single pass accumulation
    for (let i = 0; i < nonSearchData.length; i++) {
        let row = nonSearchData[i];
        let key = row.date + '_' + row.campName;
        let metrics = searchMetrics[key];
        if (metrics) {
            metrics.cost += row.cost || 0;
            metrics.impr += row.impressions || 0;
            metrics.clicks += row.clicks || 0;
            metrics.conv += row.conversions || 0;
            metrics.value += row.conversionsValue || 0;
        }
    }

    // Direct array allocation and population
    let results = new Array(processedCampData.length);
    for (let i = 0; i < processedCampData.length; i++) {
        let row = processedCampData[i];
        let key = row.date + '_' + row.campName;
        let nonSearch = searchMetrics[key];

        results[i] = {
            date: row.date,
            campName: row.campName,
            campType: row.campType,
            cost: row.cost - nonSearch.cost,
            impressions: row.impressions - nonSearch.impr,
            clicks: row.clicks - nonSearch.clicks,
            conversions: row.conversions - nonSearch.conv,
            conversionsValue: row.value - nonSearch.value
        };

        // Clean up negative values in one pass
        if (results[i].cost < 0) results[i].cost = 0;
        if (results[i].impressions < 0) results[i].impressions = 0;
        if (results[i].clicks < 0) results[i].clicks = 0;
        if (results[i].conversions < 0) results[i].conversions = 0;
        if (results[i].conversionsValue < 0) results[i].conversionsValue = 0;
    }

    return results;
}

function processData(data) {
    let summedData = {};
    data.forEach(row => {
        let date = row['segments.date'];
        let campName = row['campaign.name'];
        let campType = row['campaign.advertisingChannelType'];
        let key = `${date}_${campName}`;
        // Initialize if the key doesn't exist
        if (!summedData[key]) {
            summedData[key] = {
                'date': date,
                'campName': campName,
                'campType': campType,
                'cost': 0,
                'impr': 0,
                'clicks': 0,
                'conv': 0,
                'value': 0
            };
        }
        summedData[key].cost += row['metrics.costMicros'] ? row['metrics.costMicros'] / 1e6 : 0;
        summedData[key].impr += row['metrics.impressions'] ? parseInt(row['metrics.impressions']) : 0;
        summedData[key].clicks += row['metrics.clicks'] ? parseInt(row['metrics.clicks']) : 0;
        summedData[key].conv += row['metrics.conversions'] ? parseFloat(row['metrics.conversions']) : 0;
        summedData[key].value += row['metrics.conversionsValue'] ? parseFloat(row['metrics.conversionsValue']) : 0;
    });

    return Object.values(summedData);
}

function tidyAssetGroupData(data) {
    const calcMetrics = row => {
        const base = {
            impr: parseInt(row['metrics.impressions']) || 0,
            clicks: parseInt(row['metrics.clicks']) || 0,
            cost: (parseInt(row['metrics.costMicros']) / 1e6) || 0,
            conv: parseFloat(row['metrics.conversions']) || 0,
            value: parseFloat(row['metrics.conversionsValue']) || 0
        };

        return {
            'Camp Name': row['campaign.name'],
            'Asset Group Name': row['assetGroup.name'],
            'Status': row['assetGroup.status'],
            'Impr': base.impr,
            'Clicks': base.clicks,
            'Cost': base.cost,
            'Conv': base.conv,
            'Value': base.value,
            'CTR': base.impr > 0 ? base.clicks / base.impr : 0,
            'CVR': base.clicks > 0 ? base.conv / base.clicks : 0,
            'AOV': base.conv > 0 ? base.value / base.conv : 0,
            'ROAS': base.cost > 0 ? base.value / base.cost : 0,
            'CPA': base.conv > 0 ? base.cost / base.conv : 0
        };
    };

    return data
        .map(calcMetrics)
        .sort((a, b) => a['Camp Name'].localeCompare(b['Camp Name']) || b['Impr'] - a['Impr']);
}

function processDataCommon(dataGroups, isSummary) {
    // Pre-allocate arrays for headers
    let headerRow = isSummary ?
        ['Date', 'Campaign Name', 'Camp Cost', 'Camp Conv', 'Camp Value',
            'Shop Cost', 'Shop Conv', 'Shop Value', 'Disp Cost', 'Disp Conv', 'Disp Value',
            'Video Cost', 'Video Conv', 'Video Value', 'Search Cost', 'Search Conv', 'Search Value',
            'Campaign Type'] :
        ['Campaign Name', 'Camp Cost', 'Camp Conv', 'Camp Value', 'Shop Cost', 'Shop Conv',
            'Shop Value', 'Disp Cost', 'Disp Conv', 'Disp Value', 'Video Cost', 'Video Conv',
            'Video Value', 'Search Cost', 'Search Conv', 'Search Value', 'Campaign Type'];

    let processed = {};
    let keyOrder = [];

    // Pre-process to get unique keys and initialize data structure
    dataGroups.forEach(group => {
        group.data.forEach(row => {
            let key = isSummary ? row.date + '_' + row.campName : row.campName;
            if (!processed[key]) {
                processed[key] = {
                    date: row.date || '',
                    campName: row.campName,
                    campType: row.campType,
                    general: [0, 0, 0],
                    shopping: [0, 0, 0],
                    display: [0, 0, 0],
                    video: [0, 0, 0],
                    search: [0, 0, 0]
                };
                keyOrder.push(key);
            }
        });
    });

    // Process data in direct assignments
    for (let i = 0; i < dataGroups.length; i++) {
        let group = dataGroups[i];
        let data = group.data;
        let type = group.type;

        for (let j = 0; j < data.length; j++) {
            let row = data[j];
            let key = isSummary ? row.date + '_' + row.campName : row.campName;
            let entry = processed[key];

            let targetArray = entry[type];
            targetArray[0] += row.cost || 0;
            targetArray[1] += row.conv || 0;
            targetArray[2] += row.value || 0;

            if (type === 'general' && row.campType === 'SHOPPING') {
                let shopArray = entry.shopping;
                shopArray[0] += row.cost || 0;
                shopArray[1] += row.conv || 0;
                shopArray[2] += row.value || 0;
            }
        }
    }

    // Build output array directly
    let output = new Array(keyOrder.length + 1);
    output[0] = headerRow;

    for (let i = 0; i < keyOrder.length; i++) {
        let data = processed[keyOrder[i]];
        let remainingCost;

        // Adjust video
        remainingCost = data.general[0] - data.shopping[0];
        if (data.video[0] > remainingCost) {
            data.video[0] = remainingCost;
            data.video[1] = Math.min(data.video[1], data.general[1] - data.shopping[1]);
            data.video[2] = Math.min(data.video[2], data.general[2] - data.shopping[2]);
        }

        // Adjust display
        remainingCost = data.general[0] - data.shopping[0] - data.video[0];
        if (data.display[0] > remainingCost) {
            data.display[0] = remainingCost;
            data.display[1] = Math.min(data.display[1], data.general[1] - data.shopping[1] - data.video[1]);
            data.display[2] = Math.min(data.display[2], data.general[2] - data.shopping[2] - data.video[2]);
        }

        // Calculate search
        remainingCost = data.general[0] - data.shopping[0] - data.video[0] - data.display[0];
        if (remainingCost <= 0) {
            data.search = [0, 0, 0];
        } else {
            data.search[0] = remainingCost;
            data.search[1] = Math.max(0, data.general[1] - data.shopping[1] - data.video[1] - data.display[1]);
            data.search[2] = Math.max(0, data.general[2] - data.shopping[2] - data.video[2] - data.display[2]);
        }

        // Build row directly
        let row = isSummary ?
            [data.date, data.campName].concat(
                data.general, data.shopping, data.display,
                data.video, data.search, [data.campType]
            ) :
            [data.campName].concat(
                data.general, data.shopping, data.display,
                data.video, data.search, [data.campType]
            );

        output[i + 1] = row;
    }

    return output;
}

function processSummaryData(processedCampData, processedAssetGroupData, processedDisplayData, processedVideoData, searchResults) {
    let dataGroups = [
        { data: processedCampData, type: 'general' },
        { data: processedAssetGroupData, type: 'shopping', excludeType: 'SHOPPING' },
        { data: processedDisplayData, type: 'display' },
        { data: processedVideoData, type: 'video' },
        { data: searchResults, type: 'search' }
    ];
    return processDataCommon(dataGroups, true);
}

function processTotalData(processedCampData, processedAssetGroupData, processedDisplayData, processedVideoData, searchResults) {
    let dataGroups = [
        { data: processedCampData, type: 'general' },
        { data: processedAssetGroupData, type: 'shopping', excludeType: 'SHOPPING' },
        { data: processedDisplayData, type: 'display' },
        { data: processedVideoData, type: 'video' },
        { data: searchResults, type: 'search' }
    ];
    return processDataCommon(dataGroups, false);
}

function fetchProductData(queryString, tCost, tRoas, outputType) {
    let productCampaigns = new Map();
    let aggregatedData = new Map();
    let iterator = AdsApp.search(queryString);

    while (iterator.hasNext()) {
        let row = flattenObject(iterator.next());
        let productId = row['segments.productItemId'];
        let channelType = row['campaign.advertisingChannelType'];
        let cost = (Number(row['metrics.costMicros']) / 1e6) || 0;

        // Track campaigns and costs
        if (!productCampaigns.has(productId)) {
            productCampaigns.set(productId, {
                campaigns: { SHOPPING: new Set(), PERFORMANCE_MAX: new Set() },
                costs: { SHOPPING: 0, PERFORMANCE_MAX: 0 }
            });
        }

        if (['SHOPPING', 'PERFORMANCE_MAX'].includes(channelType)) {
            let info = productCampaigns.get(productId);
            info.campaigns[channelType].add(row['campaign.name']);
            info.costs[channelType] += cost;
        }

        // Aggregate metrics
        let key = getUniqueKey(row, outputType);
        if (!aggregatedData.has(key)) {
            aggregatedData.set(key, {
                'Impr': 0, 'Clicks': 0, 'Cost': 0, 'Conv': 0, 'Value': 0,
                'Product Title': row['segments.productTitle'],
                'Product ID': row['segments.productItemId'],
                'Campaign': row['campaign.name'],
                'Channel': row['campaign.advertisingChannelType']
            });
        }

        let metrics = aggregatedData.get(key);
        metrics.Impr += Number(row['metrics.impressions']) || 0;
        metrics.Clicks += Number(row['metrics.clicks']) || 0;
        metrics.Cost += cost;
        metrics.Conv += Number(row['metrics.conversions']) || 0;
        metrics.Value += Number(row['metrics.conversionsValue']) || 0;
    }

    // Transform to final output using array method
    return [...aggregatedData.values()].map(data => {
        let campaignInfo = productCampaigns.get(data['Product ID']);
        let baseObj = {
            ...data,
            countPmax: campaignInfo?.campaigns.PERFORMANCE_MAX.size || 0,
            countShop: campaignInfo?.campaigns.SHOPPING.size || 0,
            costPmax: campaignInfo?.costs.PERFORMANCE_MAX || 0,
            costShop: campaignInfo?.costs.SHOPPING || 0,
            inBoth: campaignInfo?.campaigns.PERFORMANCE_MAX.size &&
                campaignInfo?.campaigns.SHOPPING.size ? 1 : 0
        };

        if (outputType !== 'idCount') {
            baseObj.ROAS = baseObj.Cost > 0 ? baseObj.Value / baseObj.Cost : 0;
            baseObj.CvR = baseObj.Clicks > 0 ? baseObj.Conv / baseObj.Clicks : 0;
            baseObj.CTR = baseObj.Impr > 0 ? baseObj.Clicks / baseObj.Impr : 0;
            baseObj.Bucket = determineBucket(baseObj.Cost, baseObj.Conv, baseObj.ROAS, tCost, tRoas);
        }

        return constructBaseDataObject(baseObj, outputType);
    });
}

function getUniqueKey(row, type) {
    let id = row['segments.productItemId'];
    let title = row['segments.productTitle'];
    let campaign = row['campaign.name'];
    let channel = row['campaign.advertisingChannelType'];

    switch (type) {
        case 'pTitle': return title;
        case 'pTitleCampaign': return title + '|' + campaign;
        case 'pTitleID': return title + '|' + id + '|' + campaign;
        case 'idAccount': return id;
        case 'idChannel': return id + '|' + channel;
        case 'idCount': return id;
        default: return id;
    }
}

function determineBucket(cost, conv, roas, tCost, tRoas) {
    if (cost === 0) return 'zombie';
    if (conv === 0) return 'zeroconv';
    if (cost < tCost) return roas < tRoas ? 'meh' : 'flukes';
    return roas < tRoas ? 'costly' : 'profitable';
}

function constructBaseDataObject(aggData, outputType) {
    let baseDataObject = {
        'Product Title': aggData['Product Title'],
        'Product ID': aggData['Product ID'],
        'Impr': aggData['Impr'],
        'Clicks': aggData['Clicks'],
        'Cost': aggData['Cost'],
        'Conv': aggData['Conv'],
        'Value': aggData['Value'],
        'CTR': aggData['CTR'],
        'ROAS': aggData['ROAS'],
        'CvR': aggData['CvR'],
        'Bucket': aggData['Bucket'],
        'Campaign': aggData['Campaign'],
        'Channel': aggData['Channel']
    };

    switch (outputType) {
        // build with all columns - which is pTitle&ID
        case 'pTitleCampaign': // Remove the Product ID for 'pTitleCampaign' output type
            delete baseDataObject['Product ID'];
            break;
        case 'pTitle': // delete ID, campaign & channel - to aggregate across whole account
            delete baseDataObject['Product ID'];
            delete baseDataObject['Campaign'];
            delete baseDataObject['Channel'];
            break;

        // Account level is default (v60) & channel if 'idChannel' is selected
        case 'idAccount':
            baseDataObject = {
                'ID': aggData['Product ID'],
                'Bucket': aggData['Bucket']
            };
            break;
        case 'idChannel':
            baseDataObject = {
                'ID': aggData['Product ID'],
                'Bucket': aggData['Bucket'],
                'Channel': aggData['Channel']
            };
            break;
        case 'idCount':
            baseDataObject = {
                'Product Title': aggData['Product Title'],
                'ID': aggData['Product ID'],
                'inBoth': aggData['inBoth'] || 0,
                'countPmax': aggData['countPmax'] || 0,
                'countShop': aggData['countShop'] || 0,
                'costPmax': aggData['costPmax'] || 0,
                'costShop': aggData['costShop'] || 0
            }
            break;
    }

    return baseDataObject;
}

function extractAndAggregateTitleNGrams(s, productData) {
    let nGrams = {};

    productData.forEach(row => {
        let productTitle = row['Product Title'] ? row['Product Title'].toLowerCase() : '';
        let terms = productTitle.split(' ');

        terms.forEach((term) => {
            let key = cleanNGram(term);
            if (!nGrams[key]) {
                nGrams[key] = {
                    nGram: term,
                    impr: 0,
                    clicks: 0,
                    cost: 0,
                    conv: 0,
                    value: 0
                };
            }

            nGrams[key].impr += row['Impr'];
            nGrams[key].clicks += row['Clicks'];
            nGrams[key].cost += row['Cost'];
            nGrams[key].conv += row['Conv'];
            nGrams[key].value += row['Value'];
        });
    });

    let tNgrams = [['nGram', 'Impr', 'Clicks', 'Cost', 'Conv', 'Value', 'CTR', 'CvR', 'AOV', 'ROAS']];

    for (let term in nGrams) {
        let item = nGrams[term];
        item.CTR = item.impr > 0 ? item.clicks / item.impr : 0;
        item.CvR = item.clicks > 0 ? item.conv / item.clicks : 0;
        item.AOV = item.conv > 0 ? item.value / item.conv : 0;
        item.ROAS = item.cost > 0 ? item.value / item.cost : 0;
        tNgrams.push([item.nGram, item.impr, item.clicks, item.cost, item.conv, item.value, item.CTR, item.CvR, item.AOV, item.ROAS]);
    }

    tNgrams.sort((a, b) => {
        if (a[0] === 'nGram') return -1;
        if (b[0] === 'nGram') return 1;
        return b[3] - a[3]; // Sort by Cost (index 3) in descending order
    });

    let brandTerm = s.brandTerm.includes(',') ? s.brandTerm.split(/[ ,]+/).map(i => i.toLowerCase()) : s.brandTerm.split(' ').map(i => i.toLowerCase());
    tNgrams = tNgrams.filter(i => !brandTerm.includes(i[0]) && i[0].length > 1);

    return tNgrams;
}

function cleanNGram(nGram) {
    if (!nGram || nGram.length <= 1) return '';

    let start = 0;
    let end = nGram.length;
    let specialChars = '.,/#!$%^&*;:{}=-_`~()';

    // Trim start
    while (start < end && specialChars.indexOf(nGram[start]) > -1) start++;

    // Trim end
    while (end > start && specialChars.indexOf(nGram[end - 1]) > -1) end--;

    return end - start <= 1 ? '' : nGram.slice(start, end);
}

function log(ss, startDuration, s, ident) {
    let endDuration = new Date();
    let duration = ((endDuration - startDuration) / 1000).toFixed(0);
    Logger.log(`Script execution time: ${duration} seconds. \nFinished script for ${ident}.`);

    let newRow = [new Date(), duration, s.numberOfDays, s.tCost, s.tRoas, s.brandTerm, ident, s.aiRunAt,
    s.fromDate, s.toDate, s.lotsProducts, s.turnonTitleCampaign, s.turnonTitleID, s.turnonIDChannel,
    s.campFilter, s.turnonLP, s.turnonPlace, s.turnonGeo, s.turnonChange, s.turnonAISheet, s.turnonNgramSheet,
    s.llm, s.model, s.lang, s.scriptVersion, s.sheetVersion];
    logUrl = ss.getRangeByName('u').getValue();
    [safeOpenAndShareSpreadsheet(logUrl), ss].map(s => s.getSheetByName('log')).forEach(sheet => sheet.appendRow(newRow));
}

function determineBucketAndDistance(term, brandTerms, tolerance) {
    const terms = brandTerms?.split(',').map(t => t.trim()).filter(Boolean) || ['no brand has been entered on the sheet'];
    if (!term || term === 'blank') return { bucket: 'blank', distance: '' };

    const exactMatch = terms.some(b => term === b.toLowerCase());
    if (exactMatch) return { bucket: 'brand', distance: 0 };

    const closeMatch = terms.reduce((match, brand) => {
        const dist = levenshtein(term, brand.toLowerCase());
        return (!match && (term.includes(brand.toLowerCase()) || dist <= tolerance)) ?
            { bucket: 'close-brand', distance: dist } : match;
    }, null);

    return closeMatch || { bucket: 'non-brand', distance: '' };
}

function levenshtein(a, b) {
    let tmp;
    if (a.length === 0) { return b.length; }
    if (b.length === 0) { return a.length; }
    if (a.length > b.length) { tmp = a; a = b; b = tmp; }

    let i, j, res, alen = a.length, blen = b.length, row = Array(alen);
    for (i = 0; i <= alen; i++) { row[i] = i; }

    for (i = 1; i <= blen; i++) {
        res = i;
        for (j = 1; j <= alen; j++) {
            tmp = row[j - 1];
            row[j - 1] = res;
            res = b[i - 1] === a[j - 1] ? tmp : Math.min(tmp + 1, Math.min(res + 1, row[j] + 1));
        }
    }
    return res;
}

function aggLPData(lpData, ss, s, tabName) {
    let urlData = {};

    lpData.forEach(row => {
        let url = row['landingPageView.unexpandedFinalUrl'];
        if (url) {
            let [domain, ...pathSegments] = url.split('/').slice(2);
            let paths = [domain, ...pathSegments.join('/').split('?')[0].split('/')];

            paths.forEach((path, i) => {
                path = path || '';
                let key = `/${paths.slice(1, i + 1).join('/')}`;
                if (!urlData[key]) {
                    urlData[key] = {
                        domain: paths[0],
                        path1: paths[1] || '',
                        path2: paths[2] || '',
                        path3: paths[3] || '',
                        impr: 0,
                        clicks: 0,
                        cost: 0,
                        conv: 0,
                        value: 0,
                        bucket: ['domain', 'path1', 'path2', 'path3'][i]
                    };
                }
                urlData[key].impr += parseFloat(row['metrics.impressions']) || 0;
                urlData[key].clicks += parseFloat(row['metrics.clicks']) || 0;
                urlData[key].cost += parseFloat(row['metrics.costMicros']) / 1e6 || 0;
                urlData[key].conv += parseFloat(row['metrics.conversions']) || 0;
                urlData[key].value += parseFloat(row['metrics.conversionsValue']) || 0;
            });
        }
    });

    // Calculate additional metrics
    Object.values(urlData).forEach(d => {
        d.ctr = d.impr ? d.clicks / d.impr : 0;
        d.cvr = d.clicks ? d.conv / d.clicks : 0;
        d.aov = d.conv ? d.value / d.conv : 0;
        d.roas = d.cost ? d.value / d.cost : 0;
        d.cpa = d.conv ? d.cost / d.conv : 0;
    });

    // Prepare data and output
    let urlSummary = Object.entries(urlData)
        .filter(([url, d]) => d.impr > s.minLpImpr)
        .map(([url, d]) => [
            url, d.impr, d.clicks, d.cost, d.conv, d.value, d.ctr, d.cvr, d.aov, d.roas, d.cpa, d.bucket,
            d.domain,
            d.path1,
            d.path2,
            d.path3
        ]);

    urlSummary.sort((a, b) => b[1] - a[1]);
    let urlHeaders = [['PathDetail', 'Impr', 'Clicks', 'Cost', 'Conv', 'Value', 'CTR', 'CVR', 'AOV', 'ROAS', 'CPA', 'Bucket', 'Domain', 'Path1', 'Path2', 'Path3']];
    outputDataToSheet(ss, tabName, urlHeaders.concat(urlSummary), 'notLast');
}

function handleClientSheetUpdate(ident, clientOldUrl, whispererOldUrl, mcc) {
    const updateSheet = (oldUrl, templateUrl, sheetType, settingsToCopy) => {
        let oldSs = safeOpenAndShareSpreadsheet(oldUrl);
        return createOrUpdateClientSheet(oldSs, templateUrl, ident, sheetType, mcc.scriptVersion, settingsToCopy);
    };

    return {
        clientSheet: updateSheet(clientOldUrl, mcc.urls.template, 'PMax Insights', CLIENT_SETTINGS),
        whispererSheet: updateSheet(whispererOldUrl, mcc.urls.aiTemplate, 'AI Whisperer', AI_SETTINGS)
    };
}

function updateCrossReferences(clientSheet, whispererSheet) {
    try {
        clientSheet.getRangeByName('whispererUrl').setValue(whispererSheet.getUrl());
        whispererSheet.getRangeByName('pmaxUrl').setValue(clientSheet.getUrl());
    } catch (e) {
        Logger.error('Error updating cross-references: ' + e.message);
    }
}
//#endregion

//#region MCC only functions 
function updateClientSheets(row, indexMap, mcc) {

    let clientName = row[indexMap.clientName] || 'Unknown Client';

    let updateSheet = (oldUrl, templateUrl, sheetType, settingsToCopy) => {
        let oldSs = oldUrl ? safeOpenAndShareSpreadsheet(oldUrl) : null;
        return createOrUpdateClientSheet(oldSs, templateUrl, clientName, sheetType, mcc.scriptVersion, settingsToCopy);
    };

    let clientSheet = updateSheet(row[indexMap.clientSheet], mcc.urls.template, 'PMax Insights', CLIENT_SETTINGS);
    let whispererSheet = updateSheet(row[indexMap.whispererUrl], mcc.urls.aiTemplate, 'AI Whisperer', AI_SETTINGS);

    updateCrossReferences(clientSheet, whispererSheet);

    let clientSheetUrl = clientSheet.getUrl();
    let whispererUrl = whispererSheet.getUrl();

    return { clientSheetUrl, whispererUrl };
}

function createOrUpdateClientSheet(oldSs, templateUrl, clientName, sheetType, scriptVersion, settingsToCopy) {
    let newSs = safeOpenAndShareSpreadsheet(templateUrl, true, `${clientName} ${sheetType} ${scriptVersion} - (c) MikeRhodes.com.au`);

    if (oldSs) {
        try {
            let settingsSheet = oldSs.getSheetByName('Settings');
            if (settingsSheet) {
                let settingsIdentifier;
                try {
                    settingsIdentifier = settingsSheet.getRange('G1').getValue();
                    Logger.log(`Updating ${clientName}: ${sheetType} sheet identifier: ${settingsIdentifier}`);
                } catch (e) {
                    settingsIdentifier = 'unknown';
                    Logger.log(`Old sheet identifier: ${settingsIdentifier}`);
                }
            }

            copySettings(oldSs, newSs, settingsToCopy);
            updateOldSheet(oldSs, newSs.getUrl(), scriptVersion, `This ${sheetType} sheet is no longer in use`);

        } catch (e) {
            console.error(`Error accessing or modifying old ${sheetType} sheet for ${clientName}: ${e.message}`);
            Logger.log(`Unable to fully access old sheet. Proceeding with new sheet only.`);
        }
    } else {
        Logger.log(`No existing ${sheetType} sheet found for ${clientName}. Created new sheet.`);
    }

    return newSs;
}

function copySettings(oldSs, newSs, settingsToCopy) {
    let missingSettings = [];

    settingsToCopy.forEach(settingName => {
        // Skip copying the sheetVersion
        if (settingName === 'sheetVersion') {
            return;
        }

        try {
            let oldRange = oldSs.getRangeByName(settingName);
            let newRange = newSs.getRangeByName(settingName);
            if (oldRange && newRange) {
                newRange.setValue(oldRange.getValue());
            } else if (!oldRange && newRange) {
                missingSettings.push(settingName);
            } else {
                Logger.log(`Named range ${settingName} not found in ${oldRange ? 'new' : 'old'} sheet.`);
            }
        } catch (e) {
            console.error(`Error copying setting ${settingName}: ${e.message}`);
        }
    });

    if (missingSettings.length > 0) {
        Logger.log(`New settings available in the updated sheet: ${missingSettings.join(', ')}`);
    }
}

function columnToNumber(column) {
    return column.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0);
}

function updateOldSheet(oldSheet, newSheetUrl, scriptVersion, message) {
    oldSheet.rename(message);
    let oldTab = oldSheet.getSheetByName('old') || oldSheet.insertSheet('old', 0);
    oldSheet.getSheets().forEach(sheet => sheet.getName() !== 'old' && sheet.hideSheet());
    oldTab.getRange('B2').setValue(
        `${message}\nThe latest version of the script is ${scriptVersion}.\nPlease use the new sheet: ${newSheetUrl}`
    ).setFontSize(20).setWrap(true).setBackground('#d0f0c0');
    oldTab.setColumnWidth(2, 800);
    oldTab.setHiddenGridlines(true);
    let rows = oldTab.getMaxRows();
    let cols = oldTab.getMaxColumns();
    rows > 3 && oldTab.deleteRows(4, rows - 3);
    cols > 3 && oldTab.deleteColumns(4, cols - 3);
}

function safeOpenAndShareSpreadsheet(url, setAccess = false, newName = null) {
    try {
        // Basic validation
        if (!url) {
            console.error(`URL is empty or undefined: ${url}`);
            return null;
        }

        // Type checking and format validation
        if (typeof url !== 'string') {
            console.error(`Invalid URL type - expected string but got ${typeof url}`);
            return null;
        }

        // Validate Google Sheets URL format
        if (!url.includes('docs.google.com/spreadsheets/d/')) {
            console.error(`Invalid Google Sheets URL format: ${url}`);
            return null;
        }

        // Try to open the spreadsheet
        let ss;
        try {
            ss = SpreadsheetApp.openByUrl(url);
        } catch (error) {
            Logger.log(`Error opening spreadsheet: ${error.message}`);
            Logger.log(`Settings were: ${url}, ${setAccess}, ${newName}`);
            return null;
        }

        // Handle copy if newName is provided
        if (newName) {
            try {
                ss = ss.copy(newName);
            } catch (error) {
                Logger.log(`Error copying spreadsheet: ${error.message}`);
                return null;
            }
        }

        // Handle sharing settings if required
        if (setAccess) {
            try {
                let file = DriveApp.getFileById(ss.getId());

                // Try ANYONE_WITH_LINK first
                try {
                    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
                    Logger.log("Sharing set to ANYONE_WITH_LINK");
                } catch (error) {
                    Logger.log("ANYONE_WITH_LINK failed, trying DOMAIN_WITH_LINK");

                    // If ANYONE_WITH_LINK fails, try DOMAIN_WITH_LINK
                    try {
                        file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);
                        Logger.log("Sharing set to DOMAIN_WITH_LINK");
                    } catch (error) {
                        Logger.log("DOMAIN_WITH_LINK failed, setting to PRIVATE");

                        // If all else fails, set to PRIVATE
                        try {
                            file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.EDIT);
                            Logger.log("Sharing set to PRIVATE");
                        } catch (error) {
                            Logger.log(`Failed to set any sharing permissions: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                Logger.log(`Error setting file permissions: ${error.message}`);
                // Continue even if sharing fails - the sheet is still usable
            }
        }

        return ss;

    } catch (error) {
        // Catch any other unexpected errors
        console.error(`Unexpected error in safeOpenAndShareSpreadsheet: ${error.message}`);
        Logger.log(`Full error details: ${error.stack}`);
        return null;
    }
}

const CLIENT_SETTINGS = [
    'numberOfDays', 'tCost', 'tRoas', 'brandTerm', 'accountType', 'aiRunAt', 'minPlaceImpr',
    'fromDate', 'toDate', 'lotsProducts', 'turnonTitleID', 'turnonIDChannel',
    'turnonTitleCampaign', 'campFilter', 'turnonLP', 'turnonPlace', 'turnonGeo',
    'turnonChange', 'turnonAISheet', 'whispererUrl'
];

const AI_SETTINGS = [
    'llm', 'model', 'apiKey', 'anth_apikey', 'pmaxUrl', 'lang', 'expertMode', 'whoFor',
    'useVoice', 'voice', 'folder', 'useEmail', 'email', 'maxResults',
    'p_productTitles', 'p_landingPages', 'p_changeHistory', 'p_searchCategories',
    'p_productMatrix', 'p_nGrams', 'p_nGramsSearch', 'p_asset', 'p_placement', 'p_myData',
    'p_internal', 'p_client', 'p_expertMode', 'p_evalOutput',
    'r_productTitles', 'r_landingPages', 'r_changeHistory', 'r_searchCategories',
    'r_productMatrix', 'r_nGrams', 'r_nGramsSearch', 'r_asset', 'r_placement', 'r_myData',
    'e_productTitles', 'e_landingPages', 'e_changeHistory', 'e_searchCategories',
    'e_productMatrix', 'e_nGrams', 'e_nGramsSearch', 'e_asset',
    'use_productTitles', 'use_landingPages', 'use_changeHistory', 'use_searchCategories',
    'use_productMatrix', 'use_nGrams', 'use_nGramsSearch', 'use_asset'
];
//#endregion


/*

DISCLAIMER  -  PLEASE READ CAREFULLY BEFORE USING THIS SCRIPT

Fair Use: This script is provided for the sole use of the entity (business, agency, or individual) to which it is licensed.
While you are encouraged to use and benefit from this script, you must do so within the confines of this agreement.

Copyright: All rights, including copyright, in this script are owned by or licensed to Off Rhodes Pty Ltd t/a Mike Rhodes Ideas.
Reproducing, distributing, or selling any version of this script, whether modified or unmodified, without proper authorization is strictly prohibited.

License Requirement: A separate license must be purchased for each legal entity that wishes to use this script.
For example, if you own multiple businesses or agencies, each business or agency can use this script under one license.
However, if you are part of a holding group or conglomerate with multiple separate entities, each entity must purchase its own license for use.

Code of Honour: This script is offered under a code of honour.
We trust in the integrity of our users to adhere to the terms of this agreement and to do the right thing.
Your honour and professionalism in respecting these terms not only supports the creator but also fosters a community of trust and respect.

Limitations & Liabilities: Off Rhodes Pty Ltd t/a Mike Rhodes Ideas does not guarantee that this script will be error-free
or will meet your specific requirements. We are not responsible for any damages or losses that might arise from using this script.
Always back up your data and test the script in a safe environment before deploying it in a production setting.

The script does not make any changes to your account or data.
It only reads data from your account and writes it to your spreadsheet.
However if you choose to use the data on the ID tab in a supplemental data feed in your GMC account, you do so at your own risk.

By using this script, you acknowledge that you have read, understood, and agree to be bound by the terms of this license agreement.
If you do not agree with these terms, do not use this script.




Help Docs: https://pmax.super.site/



--------------------------------------------------------------------------------------------------------------
Please feel free to change the code... it's why I add so many comments. I'd love it if you get to know how it works.
However, if you do, it's because you've read the wiki & you know code, scripts and google ads inside out
and (importantly!) you're happy to no longer receive any support. I can't support code that's been changed, sorry.
-------------------------------------------------------------------------------------------------------------- */



// If you get any errors, please read the docs at https://pmax.super.site/ & then try again ;)

// If you're still getting an error, copy the logs & paste them into a post at https://mikerhodes.circle.so/c/help/ 
// and tag me so I can help you resolve it :)


// Now hit preview (or run) and let's get this party started! Thanks for using this script.


// PS you're awesome! 