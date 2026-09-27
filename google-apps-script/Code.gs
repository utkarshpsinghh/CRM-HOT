/**
 * Kingdom 1391 Content Management & Enquiry Receiver
 * 
 * Optimized for high-speed delivery with single-batch sheet reads.
 */

// Paste the Spreadsheet ID of your DETAILS sheet:
const DETAILS_SPREADSHEET_ID = '1-f8iKPpN7Leshbf_JzVL3QwbTpvU0j_3HlurXVI4nNY';

// Paste the Spreadsheet ID of your ENQUIRIES sheet:
const ENQUIRIES_SPREADSHEET_ID = '1NI7nsi0Zy23mndt7NzI2r4qog3TNE6r5s-Mc1b90Hd8';

const DUPLICATE_WINDOW_HOURS = 24;

/**
 * Adds a custom menu to Google Sheets for easy one-click setup
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Kingdom 1391')
    .addItem('Initialize Details Sheet', 'setupDetailsSheet')
    .addItem('Initialize Enquiries Sheet', 'setupEnquiriesSheet')
    .addSeparator()
    .addItem('Initialize Both Sheets', 'setupKingdomSheets')
    .addToUi();
}

/**
 * Gets the Details Workbook (CMS content)
 */
function getDetailsWorkbook_() {
  try {
    if (DETAILS_SPREADSHEET_ID && DETAILS_SPREADSHEET_ID !== 'YOUR_DETAILS_SPREADSHEET_ID_HERE') {
      return SpreadsheetApp.openById(DETAILS_SPREADSHEET_ID);
    }
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(DETAILS_SPREADSHEET_ID);
}

/**
 * Gets the Enquiries Workbook (Application submissions)
 */
function getEnquiriesWorkbook_() {
  try {
    if (ENQUIRIES_SPREADSHEET_ID && ENQUIRIES_SPREADSHEET_ID !== 'YOUR_ENQUIRIES_SPREADSHEET_ID_HERE') {
      return SpreadsheetApp.openById(ENQUIRIES_SPREADSHEET_ID);
    }
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(ENQUIRIES_SPREADSHEET_ID);
}

/**
 * Fast GET handler: Reads all sheets in a single batch for maximum speed
 */
function doGet(e) {
  try {
    const wb = getDetailsWorkbook_();
    let sheets = wb.getSheets();
    let sheetMap = {};
    for (var i = 0; i < sheets.length; i++) {
      sheetMap[sheets[i].getName()] = sheets[i];
    }

    // Auto-create Leaderboard sheet if not created yet
    if (!sheetMap['Leaderboard']) {
      initDetailsSheetsIfMissing_(wb);
      sheets = wb.getSheets();
      sheetMap = {};
      for (var j = 0; j < sheets.length; j++) {
        sheetMap[sheets[j].getName()] = sheets[j];
      }
    }


    const settings = getSettingsDataFromSheet_(sheetMap['Settings']);
    const leadersMap = getAllianceLeadersMapFromSheet_(sheetMap['Alliance_Leaders']);
    const alliances = getAlliancesDataFromSheet_(sheetMap['Alliances'], leadersMap);
    const team = getTeamDataFromSheet_(sheetMap['Team']);
    const kvkRecords = getKvkDataFromSheet_(sheetMap['KVK_Records']);
    const news = getNewsDataFromSheet_(sheetMap['News']);
    const faq = getFaqDataFromSheet_(sheetMap['FAQ']);
    const leaderboard = getLeaderboardDataFromSheet_(sheetMap['Leaderboard']);
    const lastSyncedAt = getLeaderboardLastSyncedAt_(sheetMap['Leaderboard']);

    const payload = {
      ok: true,
      updatedAt: new Date().toISOString(),
      data: {
        settings: settings,
        alliances: alliances,
        team: team,
        kvkRecords: kvkRecords,
        news: news,
        faq: faq,
        leaderboard: leaderboard,
        lastSyncedAt: lastSyncedAt
      }
    };

    // Support JSONP if requested by client
    const callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(payload) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return json_(payload);
  } catch (err) {
    const errPayload = { ok: false, error: String(err) };
    const callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errPayload) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return json_(errPayload);
  }
}

/**
 * Handle POST requests for transfer application submissions into ENQUIRIES sheet
 */
function doPost(event) {
  try {
    const payload = JSON.parse((event && event.postData && event.postData.contents) || '{}');
    
    // Honeypot check
    if (payload.website || !payload.playerName) {
      return json_({ ok: true, ignored: true });
    }

    // Minimum completion time check
    if (!payload.formStartedAt || Date.now() - Number(payload.formStartedAt) < 2000) {
      return json_({ ok: true, ignored: true });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    const wb = getEnquiriesWorkbook_();
    const sheet = getEnquiriesSheet_(wb);

    if (hasRecentDuplicate_(sheet, payload)) {
      lock.releaseLock();
      return json_({ ok: true, duplicate: true });
    }

    sheet.appendRow([
      new Date(),
      payload.playerName || '',
      payload.playerId || '',
      payload.power || '',
      payload.currentKingdom || '',
      payload.currentAlliance || '',
      payload.tgCenterLevel || '',
      payload.archersLevel || '',
      payload.infantryLevel || '',
      payload.cavalryLevel || '',
      payload.preferredAlliance || '',
      payload.preferredEventTime || '',
      payload.playstyle || '',
      payload.discordUsername || '',
      payload.message || ''
    ]);

    lock.releaseLock();
    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

/**
 * Checks for recent duplicate enquiries within the duplicate window
 */
function hasRecentDuplicate_(sheet, payload) {
  const normPlayerId = normalize_(payload.playerId);
  const normName = normalize_(payload.playerName);
  const normDiscord = normalize_(payload.discordUsername);

  const identifier = normPlayerId || (normName && normDiscord ? normName + '|' + normDiscord : '');
  if (!identifier) return false;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const firstDataRow = Math.max(2, lastRow - 499);
  const rows = sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, 15).getValues();
  const cutoff = Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000;

  return rows.some(function (row) {
    const submittedAt = new Date(row[0]).getTime();
    if (submittedAt < cutoff) return false;

    const rowPlayerId = normalize_(row[2]);
    const rowPlayerName = normalize_(row[1]);
    const rowDiscord = normalize_(row[13]);

    if (normPlayerId && rowPlayerId && normPlayerId === rowPlayerId) {
      return true;
    }
    if (normName && normDiscord && rowPlayerName === normName && rowDiscord === normDiscord) {
      return true;
    }
    return false;
  });
}

function normalize_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Formats time values safely in case Google Sheets auto-parses them as Date objects
 */
function formatTimeValue_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var h = val.getHours();
    var m = val.getMinutes();
    return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
  }
  return String(val);
}

/**
 * Reads Alliance Leaders from the dedicated 'Alliance_Leaders' sheet
 */
function getAllianceLeadersMapFromSheet_(sheet) {
  const map = {};
  if (!sheet) return map;

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return map;

  for (var i = 1; i < rows.length; i++) {
    const r = rows[i];
    const allianceId = String(r[0] || '').trim().toUpperCase();
    const name = String(r[1] || '').trim();
    const playerId = String(r[2] || '').trim();

    if (!allianceId || !name) continue;

    if (!map[allianceId]) {
      map[allianceId] = [];
    }

    map[allianceId].push({
      name: name,
      playerId: playerId
    });
  }

  return map;
}

/**
 * Reads Alliances sheet and merges contacts from Alliance_Leaders
 */
function getAlliancesDataFromSheet_(sheet, leadersMap) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const list = [];

  for (var i = 1; i < rows.length; i++) {
    const r = rows[i];
    const id = String(r[0] || '').trim().toUpperCase();
    if (!id) continue;

    const parseTimes = function (raw) {
      const val = formatTimeValue_(raw);
      if (!val) return [];
      return String(val)
        .split(/[,/]/)
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
    };

    let contacts = (leadersMap && leadersMap[id]) || [];
    if (contacts.length === 0) {
      const contactNames = String(r[9] || '').split(/[,/]/).map(function(s){ return s.trim(); });
      const contactIds = String(r[10] || '').split(/[,/]/).map(function(s){ return s.trim(); });
      for (var c = 0; c < Math.max(contactNames.length, contactIds.length); c++) {
        if (contactNames[c] || contactIds[c]) {
          contacts.push({
            name: contactNames[c] || '',
            playerId: contactIds[c] || ''
          });
        }
      }
    }

    list.push({
      id: id,
      name: String(r[1] || (id + ' Alliance')).trim(),
      description: String(r[2] || '').trim(),
      playstyle: String(r[3] || '').trim(),
      transferStatus: String(r[4] || 'OPEN').trim().toUpperCase(),
      color: String(r[5] || '#8b5128').trim(),
      crest: String(r[6] || '✦').trim(),
      events: {
        bear: parseTimes(r[7]),
        vikings: parseTimes(r[8]),
        swordland: parseTimes(r[11]),
        threeAlliance: parseTimes(r[12])
      },
      contacts: contacts
    });
  }
  return list;
}

/**
 * Reads Team sheet
 */
function getTeamDataFromSheet_(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const list = [];
  for (var i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r[0] || '').trim();
    if (!name) continue;

    list.push({
      name: name,
      playerId: String(r[1] || '').trim(),
      category: String(r[2] || 'Staff').trim(),
      role: String(r[3] || '').trim(),
      alliance: String(r[4] || '').trim(),
      rank: String(r[5] || 'STAFF').trim(),
      pfp: String(r[6] || '').trim(),
      crest: String(r[7] || '✦').trim()
    });
  }
  return list;
}

/**
 * Reads KVK Records sheet
 */
function getKvkDataFromSheet_(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const list = [];
  for (var i = 1; i < rows.length; i++) {
    const r = rows[i];
    const kvk = String(r[0] || '').trim();
    if (!kvk) continue;

    list.push({
      kvk: kvk.padStart(2, '0'),
      opponent: String(r[1] || '').trim(),
      prep: String(r[2] || 'WIN').trim().toUpperCase(),
      battle: String(r[3] || 'WIN').trim().toUpperCase()
    });
  }
  return list;
}

/**
 * Reads News sheet
 */
function getNewsDataFromSheet_(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const list = [];
  for (var i = 1; i < rows.length; i++) {
    const r = rows[i];
    const title = String(r[1] || '').trim();
    if (!title) continue;

    list.push({
      icon: String(r[0] || '📜').trim(),
      title: title,
      copy: String(r[2] || '').trim(),
      cta: String(r[3] || 'LEARN MORE').trim(),
      to: String(r[4] || '/').trim()
    });
  }
  return list;
}

/**
 * Reads FAQ sheet
 */
function getFaqDataFromSheet_(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const list = [];
  for (var i = 1; i < rows.length; i++) {
    const r = rows[i];
    const q = String(r[0] || '').trim();
    if (!q) continue;

    list.push({
      question: q,
      answer: String(r[1] || '').trim()
    });
  }
  return list;
}

/**
 * Reads Leaderboard sheet
 */
function getLeaderboardDataFromSheet_(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const list = [];
  for (var i = 1; i < rows.length; i++) {
    const r = rows[i];
    const cat = String(r[0] || '').trim();
    if (!cat) continue;

    list.push({
      category: cat,
      rank: Number(r[1]) || 1,
      playerName: String(r[2] || '').trim(),
      alliance: String(r[3] || '').trim().toUpperCase(),
      scoreValue: String(r[4] || '').trim(),
      scoreLabel: String(r[5] || 'Power').trim(),
      avatarUrl: String(r[6] || '').trim(),
      updatedAt: r[7] ? String(r[7]) : ''
    });
  }
  return list;
}

/**
 * Returns latest sync timestamp from Leaderboard sheet
 */
function getLeaderboardLastSyncedAt_(sheet) {
  if (!sheet) return new Date().toISOString();
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return new Date().toISOString();

  // Check last column (col 8) for custom date, else fallback
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][7]) {
      const d = new Date(rows[i][7]);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
}


/**
 * Reads Settings sheet
 */
function getSettingsDataFromSheet_(sheet) {
  const defaultSet = {
    kingdomNumber: '1391',
    kingdomName: 'KINGSHOT KINGDOM 1391',
    discordUrl: '',
    heroTitle: 'FIND YOUR\nFOREVER HOME',
    heroSubtitle: 'in K1391',
    heroCopy: 'A friendly kingdom for active players,\nstrong alliances and unforgettable battles.'
  };

  if (!sheet) return defaultSet;
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return defaultSet;

  const map = {};
  for (var i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || '').trim();
    if (key) map[key] = String(rows[i][1] || '').trim();
  }

  return {
    kingdomNumber: map['kingdomNumber'] || defaultSet.kingdomNumber,
    kingdomName: map['kingdomName'] || defaultSet.kingdomName,
    discordUrl: map['discordUrl'] || defaultSet.discordUrl,
    heroTitle: map['heroTitle'] || defaultSet.heroTitle,
    heroSubtitle: map['heroSubtitle'] || defaultSet.heroSubtitle,
    heroCopy: map['heroCopy'] || defaultSet.heroCopy
  };
}

/**
 * Get or create Enquiries sheet in the Enquiries workbook
 */
function getEnquiriesSheet_(wb) {
  let sheet = wb.getSheetByName('Enquiries');
  if (!sheet) {
    sheet = wb.insertSheet('Enquiries');
    sheet.appendRow([
      'Submitted at', 'Player name', 'Player ID', 'Power', 'Current kingdom',
      'Current alliance', 'TG Center level', 'Archers level', 'Infantry level', 'Cavalry level',
      'Preferred alliance', 'Preferred event time',
      'Playstyle', 'Discord username', 'Message'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 15).setFontWeight('bold');
  }
  return sheet;
}

/**
 * Setup functions callable from menu or script runner
 */
function setupKingdomSheets() {
  setupDetailsSheet();
  setupEnquiriesSheet();
}

function setupDetailsSheet() {
  const wb = getDetailsWorkbook_();
  initDetailsSheetsIfMissing_(wb);
}

function setupEnquiriesSheet() {
  const wb = getEnquiriesWorkbook_();
  getEnquiriesSheet_(wb);
}

/**
 * Initializes all content tabs with headers and initial values in the Details sheet
 */
function initDetailsSheetsIfMissing_(wb) {
  // 1. Settings Sheet
  let sSheet = wb.getSheetByName('Settings');
  if (!sSheet) {
    sSheet = wb.insertSheet('Settings');
    sSheet.appendRow(['Setting Key', 'Value', 'Description']);
    sSheet.appendRow(['kingdomNumber', '1391', 'Kingdom number']);
    sSheet.appendRow(['kingdomName', 'KINGSHOT KINGDOM 1391', 'Full kingdom brand name']);
    sSheet.appendRow(['discordUrl', 'https://discord.com/channels/1461962057346846762/1461962057938108439/1546087990416117813', 'Discord invite URL']);
    sSheet.appendRow(['heroTitle', 'FIND YOUR\nFOREVER HOME', 'Main hero title']);
    sSheet.appendRow(['heroSubtitle', 'in K1391', 'Hero subtitle']);
    sSheet.appendRow(['heroCopy', 'A friendly kingdom for active players,\nstrong alliances and unforgettable battles.', 'Hero description']);
    sSheet.setFrozenRows(1);
    sSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }

  // 2. Alliances Sheet
  let aSheet = wb.getSheetByName('Alliances');
  if (!aSheet) {
    aSheet = wb.insertSheet('Alliances');
    aSheet.appendRow([
      'Alliance ID', 'Full Name', 'Description', 'Playstyle', 'Transfer Status (OPEN/CLOSED)',
      'Banner Color', 'Crest Symbol', 'Bear Event Times (UTC)', 'Vikings Event Times (UTC)',
      'Contact Names (fallback)', 'Contact IDs (fallback)',
      'Swordland Event Times (UTC)', '3Alliance Event Times (UTC)'
    ]);
    aSheet.appendRow([
      'HOT', 'HOT Alliance', 'Warm welcome. Serious fun.', 'Active · Friendly · Competitive', 'OPEN',
      '#bd4c2d', '✦', '00:30, 16:00', '01:00, 16:30', 'Sally, MoonLight', '208885630, 202703263', '02:00, 12:00', '02:00, 12:00'
    ]);
    aSheet.appendRow([
      'VIK', 'VIK Alliance', 'Organised, active and battle-ready.', 'Active · Battle-ready · Organised', 'OPEN',
      '#315d93', 'ᛉ', '00:30, 16:30', '19:00', 'Sigurd', '202736204', '02:00, 19:00', '02:00, 19:00'
    ]);
    aSheet.appendRow([
      'NAT', 'NAT Alliance', 'A balanced home for active players.', 'Active · Balanced · Social', 'OPEN',
      '#5f873b', '❖', '14:00, 19:00, 23:00', '14:00', 'Madara Uchiha', '204128952', '19:00', '02:00, 19:00'
    ]);
    aSheet.appendRow([
      'MAD', 'MAD Alliance', 'Competitive spirit with a chaotic charm.', 'Competitive · Active · War-focused', 'OPEN',
      '#bd681a', '⚡', '02:30, 20:00', '01:00, 20:00', 'Valkyrie, Ernie', '205439578, 205079469', '02:00, 19:00', '02:00, 19:00'
    ]);
    aSheet.appendRow([
      'SDB', 'SDB Alliance', 'Find your squad and settle in.', 'Social · Friendly · Active', 'OPEN',
      '#76518d', '☾', '12:00, 18:00', '02:00, 13:00', 'Maddawg', '202720532', '02:00, 12:00', '02:00, 12:00'
    ]);
    aSheet.setFrozenRows(1);
    aSheet.getRange(1, 1, 1, 13).setFontWeight('bold');
  }

  // 3. Dedicated Alliance Leaders Sheet (CONTACT THE LEADERS)
  let lSheet = wb.getSheetByName('Alliance_Leaders');
  if (!lSheet) {
    lSheet = wb.insertSheet('Alliance_Leaders');
    lSheet.appendRow(['Alliance ID', 'Leader Name', 'Player ID', 'Role / Notes']);
    lSheet.appendRow(['HOT', 'Sally', '208885630', 'Leader']);
    lSheet.appendRow(['HOT', 'MoonLight', '202703263', 'Leader']);
    lSheet.appendRow(['VIK', 'Sigurd', '202736204', 'Leader']);
    lSheet.appendRow(['NAT', 'Madara Uchiha', '204128952', 'Leader']);
    lSheet.appendRow(['MAD', 'Valkyrie', '205439578', 'Leader']);
    lSheet.appendRow(['MAD', 'Ernie', '205079469', 'Leader']);
    lSheet.appendRow(['SDB', 'Maddawg', '202720532', 'Leader']);
    lSheet.setFrozenRows(1);
    lSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  // 4. Team Sheet
  let tSheet = wb.getSheetByName('Team');
  if (!tSheet) {
    tSheet = wb.insertSheet('Team');
    tSheet.appendRow([
      'Name', 'Player ID', 'Category (Transfer Managers / Alliance R5s / Staff)',
      'Role Title', 'Alliance (optional)', 'Rank Badge', 'Avatar PFP URL', 'Crest'
    ]);
    tSheet.appendRow(['[HOT] Sally', '208885630', 'Transfer Managers', 'TRANSFER MANAGER', '', 'TM', 'https://jeabslist.com/avatars/ef7b38b33b02bfc2a7c118a01251ada7.png', '⚔']);
    tSheet.appendRow(['[VIK] Hayate Beeshida', '203818078', 'Transfer Managers', 'TRANSFER MANAGER', '', 'TM', 'https://jeabslist.com/avatars/01892610373cfd0ad24bfd1b7f91f1b1.png', '⚔']);
    tSheet.appendRow(['Bee of ᴰᴱᴬᵀᴴ', '205063171', 'Alliance R5s', 'R5 LEADER', 'HOT', 'R5', 'https://jeabslist.com/avatars/9bf0135dbf3ddcebb85fe1a76cb0914d.png', '🛡']);
    tSheet.appendRow(['Sigurd McSting', '202736204', 'Alliance R5s', 'R5 LEADER', 'VIK', 'R5', 'https://jeabslist.com/avatars/1eaa46ec192edb7bb64bce3161ca8b2f.png', '🛡']);
    tSheet.appendRow(['EhMoose', '207314613', 'Alliance R5s', 'Alliance R5s', 'NAT', 'R5', 'https://jeabslist.com/avatars/cfe3a4cdf0928f712e3b45eec18d44d0.png', '🛡']);
    tSheet.appendRow(['valkyrie', '205439578', 'Alliance R5s', 'Alliance R5s', 'MAD', 'R5', 'https://jeabslist.com/avatars/5e591f24e3e7e4437b79eb49218a2fad.png', '🛡']);
    tSheet.appendRow(['Maddawgg', '202720532', 'Alliance R5s', 'Alliance R5s', 'SDB', 'R5', 'https://jeabslist.com/avatars/014311400002621eb4bb048711b9bd7f.png', '🛡']);
    tSheet.appendRow(['[HOT] MoonLight', '202703263', 'Staff', '', '', 'STAFF', 'https://jeabslist.com/assets/preset_avatars/1031.png', '✦']);
    tSheet.appendRow(['[MAD] Ernie', '205079469', 'Staff', '', '', 'STAFF', 'https://jeabslist.com/avatars/a24249d7b04d0619c379774a0d7f930f.png', '✦']);
    tSheet.appendRow(['[VIK] Crab', '204751680', 'Staff', '', '', 'STAFF', 'https://jeabslist.com/avatars/f9f1ffd19e83e76327ef9f1fa04a2b19.png', '✦']);
    tSheet.appendRow(['[GRF] ᴍᴀᴅᴀʀᴀ々ᴜᴄʜɪʜᴀ', '204128952', 'Staff', '', '', 'STAFF', 'https://jeabslist.com/avatars/ac0c34ec8c1b9c4b0742b785423255b5.png', '✦']);
    tSheet.appendRow(['[HOT] Chucky', '202638148', 'Staff', '', '', 'STAFF', 'https://jeabslist.com/avatars/1d4ae55c730698bbaca6f355ae1a7291.png', '✦']);
    tSheet.appendRow(['nenedono', 'kimetakara', 'Staff', 'DISCORD', '', 'STAFF', 'https://cdn.discordapp.com/avatars/673514649852968977/dbe93e1a3b27079e8eec9bca22781462.png?size=3072', '✦']);
    tSheet.appendRow(['[GRF] EhM4tko', '209231997', 'Staff', '', '', 'STAFF', 'https://jeabslist.com/avatars/c7c7bf05d19d4eddc4eec6399c07ef02.png', '✦']);
    tSheet.appendRow(['[GRF] LovinᴾᴵᴳDaddy', '183851500', 'Staff', '', '', 'STAFF', 'https://jeabslist.com/avatars/cf542b6c9df38d893ffa69df88d78a76.png', '✦']);
    tSheet.setFrozenRows(1);
    tSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  // 5. KVK Records Sheet
  let kSheet = wb.getSheetByName('KVK_Records');
  if (!kSheet) {
    kSheet = wb.insertSheet('KVK_Records');
    kSheet.appendRow(['Campaign Number', 'Opponent Kingdom', 'Preparation Result (WIN/LOSS)', 'Battle Result (WIN/LOSS)']);
    kSheet.appendRow(['08', '1385', 'WIN', 'WIN']);
    kSheet.appendRow(['07', '1419', 'WIN', 'WIN']);
    kSheet.appendRow(['06', '1386', 'WIN', 'WIN']);
    kSheet.appendRow(['05', '1404', 'WIN', 'LOSS']);
    kSheet.appendRow(['04', '1410', 'WIN', 'WIN']);
    kSheet.appendRow(['03', '1387', 'WIN', 'WIN']);
    kSheet.appendRow(['02', '1396', 'WIN', 'WIN']);
    kSheet.appendRow(['01', '1400', 'WIN', 'LOSS']);
    kSheet.setFrozenRows(1);
    kSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  // 6. News Sheet
  let nSheet = wb.getSheetByName('News');
  if (!nSheet) {
    nSheet = wb.insertSheet('News');
    nSheet.appendRow(['Icon', 'Title', 'Description', 'CTA Button Text', 'Target Link']);
    nSheet.appendRow(['⚔', 'KVK CAMPAIGN RECORD', 'Kingdom 1391 stands strong in Preparation and Battle Phases across recorded campaigns.', 'VIEW KVK RECORDS', '/records']);
    nSheet.appendRow(['🕐', 'ALLIANCE EVENT SCHEDULES', 'Compare Bear, Vikings, Swordland and 3Alliance times to find the alliance rhythm that fits you.', 'VIEW SCHEDULE', '/schedule']);
    nSheet.appendRow(['🛡', 'ALLIANCE HALL OPEN', 'Explore the alliance halls, meet their listed representatives, and ask about joining.', 'EXPLORE ALLIANCES', '/alliances']);
    nSheet.appendRow(['💬', 'COMMUNITY GATE', 'Ask questions, meet the kingdom, and join the official Discord server.', 'VISIT COMMUNITY', '/community']);
    nSheet.setFrozenRows(1);
    nSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  // 7. FAQ Sheet
  let fSheet = wb.getSheetByName('FAQ');
  if (!fSheet) {
    fSheet = wb.insertSheet('FAQ');
    fSheet.appendRow(['Question', 'Answer']);
    fSheet.appendRow(['What is Kingdom 1391?', 'A player community where you can explore alliance options, event schedules and transfer contacts.']);
    fSheet.appendRow(['How does kingdom transfer work?', 'Transfer details can change, so review the checklist and confirm the latest requirements with alliance leadership.']);
    fSheet.appendRow(['Which alliances are recruiting?', 'The available alliance halls listed here are the current sample information. Contact a leader to confirm availability.']);
    fSheet.appendRow(['What are the alliance event times?', 'Each alliance page and the schedule board show event times in Kingshot time (UTC).']);
    fSheet.appendRow(['How do I contact an alliance leader?', 'Open an alliance hall to find the listed contact name and player ID.']);
    fSheet.appendRow(["Can I apply if I don't know which alliance I want?", 'Absolutely. Select “Not Sure Yet” on the application scroll.']);
    fSheet.appendRow(['What timezone are schedules in?', 'Schedules default to Kingshot time (UTC); use the schedule switch to see browser-local conversions.']);
    fSheet.appendRow(['How long does it take to receive a response?', 'Response times vary. A leader will share the next steps when they can.']);
    fSheet.setFrozenRows(1);
    fSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  }

  // 8. Leaderboard Sheet
  let lSheet = wb.getSheetByName('Leaderboard');
  if (!lSheet) {
    lSheet = wb.insertSheet('Leaderboard');
    lSheet.appendRow(['Category', 'Rank', 'Player Name', 'Alliance', 'Score / Power', 'Score Label', 'Avatar URL', 'Updated At']);
    
    // Alliance Rankings
    lSheet.appendRow(['Alliance Power', 1, 'OneForAll', 'HOT', '18,450,000,000', 'Alliance Power', '', new Date()]);
    lSheet.appendRow(['Alliance Power', 2, 'NastyAzzTroops', 'NAT', '16,920,000,000', 'Alliance Power', '', new Date()]);
    lSheet.appendRow(['Alliance Power', 3, 'VikingsValhalla', 'VIK', '14,210,000,000', 'Alliance Power', '', new Date()]);
    lSheet.appendRow(['Alliance Power', 4, 'MadChaos', 'MAD', '12,800,000,000', 'Alliance Power', '', new Date()]);
    lSheet.appendRow(['Alliance Power', 5, 'SquadDownBad', 'SDB', '10,500,000,000', 'Alliance Power', '', new Date()]);

    lSheet.appendRow(['Alliance Kills', 1, 'NastyAzzTroops', 'NAT', '4,820,000,000', 'Alliance Kills', '', new Date()]);
    lSheet.appendRow(['Alliance Kills', 2, 'OneForAll', 'HOT', '4,150,000,000', 'Alliance Kills', '', new Date()]);
    lSheet.appendRow(['Alliance Kills', 3, 'VikingsValhalla', 'VIK', '3,600,000,000', 'Alliance Kills', '', new Date()]);
    lSheet.appendRow(['Alliance Kills', 4, 'MadChaos', 'MAD', '2,950,000,000', 'Alliance Kills', '', new Date()]);
    lSheet.appendRow(['Alliance Kills', 5, 'SquadDownBad', 'SDB', '2,400,000,000', 'Alliance Kills', '', new Date()]);

    // Top 10 Personal Power (From in-game screenshot)
    lSheet.appendRow(['Personal Power', 1, 'PIGTATORDADDy', 'NAT', '671,030,304', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 2, 'EhMoose', 'NAT', '642,252,053', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 3, 'KLITlicker', 'VIK', '509,439,874', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 4, 'SuperBumbleBeep', 'HOT', '488,208,722', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 5, 'Moha HOT', 'HOT', '453,022,202', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 6, 'P@nd@', 'HOT', '433,211,587', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 7, 'OL DAWG', 'VIK', '428,787,600', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 8, 'King_Slayer', 'NAT', '412,550,120', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 9, 'Valkyrie', 'MAD', '405,190,400', 'Power', '', new Date()]);
    lSheet.appendRow(['Personal Power', 10, 'Maddawg', 'SDB', '398,420,950', 'Power', '', new Date()]);

    // Private categories from screenshots
    lSheet.appendRow(['Town Center Level', 1, 'East_666', 'NAT', 'TG 30 (FC 5)', 'TG Level', '', new Date()]);
    lSheet.appendRow(['Kill Count', 1, 'PIGTATORDADDy', 'NAT', '1,420,550,230', 'Kills', '', new Date()]);
    lSheet.appendRow(['Rebel Conquest Stage', 1, 'PIGTATORDADDy', 'NAT', 'Stage 420', 'Stage', '', new Date()]);
    lSheet.appendRow(['Hero Power', 1, 'PIGTATORDADDy', 'NAT', '85,420,000', 'Hero Power', '', new Date()]);
    lSheet.appendRow(['Hero\'s Total Power', 1, 'PIGTATORDADDy', 'NAT', '195,800,000', 'Total Hero Power', '', new Date()]);
    lSheet.appendRow(['Total Pet Power', 1, 'SuperBumbleBeep', 'HOT', '68,230,000', 'Pet Power', '', new Date()]);
    lSheet.appendRow(['Island Prosperity', 1, 'EhMoose', 'NAT', '14,850', 'Prosperity', '', new Date()]);
    lSheet.appendRow(['Mystic Trial', 1, 'EhMoose', 'NAT', 'Floor 850', 'Floor', '', new Date()]);
    lSheet.appendRow(['Master Total Power', 1, 'SuperBumbleBeep', 'HOT', '312,400,000', 'Master Power', '', new Date()]);

    lSheet.setFrozenRows(1);
    lSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }
}

function json_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}



// ==========================================================================
// HOT ALLIANCE CRM ENGINE & DATABASE EXTENSION FOR KINGDOM 1391
// ==========================================================================

const CRM_SHEET_NAMES = {
  MEMBERS: 'Members',
  EVENTS: 'Events',
  ATTENDANCE: 'Attendance',
  STRIKES: 'Strike History',
  COMMUNICATION: 'Communication',
  ADMINS: 'Admins',
  SETTINGS: 'CRM_Settings',
  CONTRIBUTIONS: 'Contributions'
};

// --------------------------------------------------------------------------
// ONE-CLICK DATABASE INITIALIZATION
// --------------------------------------------------------------------------
function setupCrmDatabase() {
  const ss = getDetailsWorkbook_();

  // 1. Members Sheet
  let memSheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);
  if (!memSheet) memSheet = ss.insertSheet(CRM_SHEET_NAMES.MEMBERS);
  memSheet.getRange(1, 1, 1, 9).setValues([[
    'Member ID', 'Name', 'Current Rank', 'Former Rank', 'Strikes', 'Communication', 'Status', 'Created At', 'Updated At'
  ]]);
  formatHeaderRow(memSheet, 9);

  // 2. Events Sheet
  let evtSheet = ss.getSheetByName(CRM_SHEET_NAMES.EVENTS);
  if (!evtSheet) evtSheet = ss.insertSheet(CRM_SHEET_NAMES.EVENTS);
  evtSheet.getRange(1, 1, 1, 7).setValues([[
    'Event ID', 'Event Type', 'Event Name', 'Date', 'Created At', 'Status', 'Notes'
  ]]);
  formatHeaderRow(evtSheet, 7);

  // 3. Attendance Sheet
  let attSheet = ss.getSheetByName(CRM_SHEET_NAMES.ATTENDANCE);
  if (!attSheet) attSheet = ss.insertSheet(CRM_SHEET_NAMES.ATTENDANCE);
  attSheet.getRange(1, 1, 1, 6).setValues([[
    'Attendance ID', 'Event ID', 'Member ID', 'Vote Status', 'Attendance Status', 'Updated At'
  ]]);
  formatHeaderRow(attSheet, 6);

  // 4. Strike History Sheet
  let strkSheet = ss.getSheetByName(CRM_SHEET_NAMES.STRIKES);
  if (!strkSheet) strkSheet = ss.insertSheet(CRM_SHEET_NAMES.STRIKES);
  strkSheet.getRange(1, 1, 1, 5).setValues([[
    'Strike ID', 'Member ID', 'Date', 'Reason', 'Added By'
  ]]);
  formatHeaderRow(strkSheet, 5);

  // 5. Communication Sheet
  let commSheet = ss.getSheetByName(CRM_SHEET_NAMES.COMMUNICATION);
  if (!commSheet) commSheet = ss.insertSheet(CRM_SHEET_NAMES.COMMUNICATION);
  commSheet.getRange(1, 1, 1, 6).setValues([[
    'Communication ID', 'Member ID', 'Status', 'Note', 'Date', 'Added By'
  ]]);
  formatHeaderRow(commSheet, 6);

  // 6. Admins Sheet
  let admSheet = ss.getSheetByName(CRM_SHEET_NAMES.ADMINS);
  if (!admSheet) admSheet = ss.insertSheet(CRM_SHEET_NAMES.ADMINS);
  admSheet.getRange(1, 1, 1, 4).setValues([[
    'Admin ID', 'Username', 'Password Hash', 'Role'
  ]]);
  formatHeaderRow(admSheet, 4);

  // Create default admin: username "admin", password "kingshot_hot"
  const defaultHash = hashPassword('kingshot_hot');
  if (admSheet.getLastRow() === 1) {
    admSheet.appendRow(['adm-001', 'admin', defaultHash, 'Leader']);
    admSheet.appendRow(['adm-002', 'hot_leader', defaultHash, 'Officer']);
  }

  // 7. Settings Sheet
  let setSheet = ss.getSheetByName(CRM_SHEET_NAMES.SETTINGS);
  if (!setSheet) setSheet = ss.insertSheet(CRM_SHEET_NAMES.SETTINGS);
  setSheet.getRange(1, 1, 1, 2).setValues([['Setting', 'Value']]);
  formatHeaderRow(setSheet, 2);

  if (setSheet.getLastRow() === 1) {
    setSheet.appendRow(['inactivityWarningDays', '3']);
    setSheet.appendRow(['inactivityInactiveDays', '7']);
    setSheet.appendRow(['inactivityCriticalDays', '14']);
    setSheet.appendRow(['allianceName', 'HOT']);
    setSheet.appendRow(['allianceMotto', 'Strength Through Unity']);
  }

  // 8. Officer Contributions Sheet
  let cntSheet = ss.getSheetByName(CRM_SHEET_NAMES.CONTRIBUTIONS);
  if (!cntSheet) cntSheet = ss.insertSheet(CRM_SHEET_NAMES.CONTRIBUTIONS);
  cntSheet.getRange(1, 1, 1, 10).setValues([[
    'Contribution ID', 'Admin ID', 'Admin Username', 'Admin Name', 'Admin Role', 'Action Type', 'Description', 'Target Name', 'Count', 'Timestamp'
  ]]);
  formatHeaderRow(cntSheet, 10);

  Logger.log('HOT Alliance Database Successfully Initialized with Contributions tracking!');
}

function formatHeaderRow(sheet, numCols) {
  const header = sheet.getRange(1, 1, 1, numCols);
  header.setBackground('#1f2937');
  header.setFontColor('#fbbf24');
  header.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// --------------------------------------------------------------------------
// WEB API HANDLERS (doGet & doPost)
// --------------------------------------------------------------------------


function handleCrmGetAction_(e, action) {
  try {
    let result = {};
    if (action === 'ping') {
      result = { status: 'success', message: 'HOT Alliance Command Center API is live!', timestamp: new Date().toISOString() };
    } else if (action === 'getMembers') {
      result = { status: 'success', data: fetchMembers() };
    } else if (action === 'getEvents') {
      result = { status: 'success', data: fetchEvents() };
    } else if (action === 'getAttendance') {
      const eventId = e && e.parameter && e.parameter.eventId;
      result = { status: 'success', data: fetchAttendance(eventId) };
    } else if (action === 'getStrikes') {
      result = { status: 'success', data: fetchStrikes() };
    } else if (action === 'getCommunications') {
      result = { status: 'success', data: fetchCommunications() };
    } else if (action === 'getSettings') {
      result = { status: 'success', data: fetchSettings() };
    } else if (action === 'getAdmins') {
      result = { status: 'success', data: fetchAdmins() };
    } else if (action === 'getContributions') {
      result = { status: 'success', data: fetchContributions() };
    } else {
      result = { status: 'error', message: 'Unknown CRM action: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function handleCrmPostAction_(body) {
  try {
    const action = body.action;
    let result = {};
    switch (action) {
      case 'login':
        result = handleLogin(body.username, body.password);
        break;
      case 'createAdmin':
        result = handleCreateAdmin(body.admin);
        break;
      case 'deleteAdmin':
        result = handleDeleteAdmin(body.adminId);
        break;
      case 'recordContribution':
        result = handleRecordContribution(body.contribution);
        break;
      case 'updatePassword':
        result = handleUpdatePassword(body.adminId, body.password);
        break;
      case 'updateProfile':
        result = handleUpdateProfile(body.adminId, body.name);
        break;
      case 'createMember':
        result = handleCreateMember(body.member);
        break;
      case 'updateMember':
        result = handleUpdateMember(body.member);
        break;
      case 'archiveMember':
        result = handleArchiveMember(body.memberId);
        break;
      case 'createEvent':
        result = handleCreateEvent(body.event);
        break;
      case 'updateVote':
        result = handleUpdateVote(body.eventId, body.memberId, body.voteStatus);
        break;
      case 'updateAttendance':
        result = handleUpdateAttendance(body.eventId, body.memberId, body.attendanceStatus);
        break;
      case 'bulkUpdateAttendance':
        result = handleBulkUpdateAttendance(body.eventId, body.updates);
        break;
      case 'addStrike':
        result = handleAddStrike(body.memberId, body.reason, body.addedBy);
        break;
      case 'removeStrike':
        result = handleRemoveStrike(body.strikeId, body.memberId);
        break;
      case 'addCommunication':
        result = handleAddCommunication(body.memberId, body.status, body.note, body.addedBy);
        break;
      case 'updateSettings':
        result = handleUpdateSettings(body.settings);
        break;
      default:
        result = { status: 'error', message: 'Unsupported POST action: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --------------------------------------------------------------------------
// PASSWORD HASHING & AUTH
// --------------------------------------------------------------------------
function hashPassword(pass) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pass, Utilities.Charset.UTF_8);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length == 1) byteHex = '0' + byteHex;
    txtHash += byteHex;
  }
  return txtHash;
}

function handleLogin(username, password) {
  if (!username || !password) {
    return { status: 'error', message: 'Username and password are required.' };
  }
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ADMINS);
  if (!sheet) return { status: 'error', message: 'Admins database table not configured.' };

  const data = sheet.getDataRange().getValues();
  const inputHash = hashPassword(password);

  for (let i = 1; i < data.length; i++) {
    const rowUser = String(data[i][1]).trim().toLowerCase();
    const rowHash = String(data[i][2]).trim();
    const role = data[i][3] || 'Officer';

    if (rowUser === username.trim().toLowerCase()) {
      if (rowHash === inputHash) {
        return {
          status: 'success',
          user: {
            id: data[i][0],
            username: data[i][1],
            role: role,
            token: Utilities.getUuid()
          }
        };
      } else {
        return { status: 'error', message: 'Invalid credentials. Password does not match.' };
      }
    }
  }

  return { status: 'error', message: 'Admin officer not found in alliance records.' };
}

// --------------------------------------------------------------------------
// MEMBERS OPERATIONS
// --------------------------------------------------------------------------
function fetchMembers() {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const members = [];

  for (let i = 1; i < data.length; i++) {
    members.push({
      id: String(data[i][0]),
      name: String(data[i][1]),
      currentRank: data[i][2],
      formerRank: data[i][3],
      strikes: Number(data[i][4] || 0),
      communication: data[i][5],
      status: data[i][6],
      createdAt: data[i][7],
      updatedAt: data[i][8]
    });
  }
  return members;
}

function handleCreateMember(member) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);
  const now = new Date().toISOString();
  const id = 'mem-' + Utilities.getUuid().substring(0, 8);

  sheet.appendRow([
    id,
    member.name,
    member.currentRank || 'R1',
    member.formerRank || 'None',
    0,
    member.communication || 'Good',
    'Active',
    now,
    now
  ]);

  return { status: 'success', memberId: id };
}

function handleUpdateMember(member) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(member.id)) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue(member.name);
      sheet.getRange(row, 3).setValue(member.currentRank);
      sheet.getRange(row, 4).setValue(member.formerRank);
      sheet.getRange(row, 5).setValue(member.strikes);
      sheet.getRange(row, 6).setValue(member.communication);
      sheet.getRange(row, 7).setValue(member.status);
      sheet.getRange(row, 9).setValue(now);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Member not found: ' + member.id };
}

function handleArchiveMember(memberId) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(memberId)) {
      const row = i + 1;
      sheet.getRange(row, 7).setValue('Archived');
      sheet.getRange(row, 9).setValue(now);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Member not found: ' + memberId };
}

// --------------------------------------------------------------------------
// EVENTS OPERATIONS
// --------------------------------------------------------------------------
function fetchEvents() {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.EVENTS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const events = [];

  for (let i = 1; i < data.length; i++) {
    events.push({
      id: String(data[i][0]),
      eventType: data[i][1],
      eventName: data[i][2],
      date: data[i][3],
      createdAt: data[i][4],
      status: data[i][5],
      notes: data[i][6] || ''
    });
  }
  return events;
}

function handleCreateEvent(event) {
  const ss = getDetailsWorkbook_();
  const evtSheet = ss.getSheetByName(CRM_SHEET_NAMES.EVENTS);
  const attSheet = ss.getSheetByName(CRM_SHEET_NAMES.ATTENDANCE);
  const memSheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);

  const now = new Date().toISOString();
  const eventId = 'evt-' + Utilities.getUuid().substring(0, 8);

  // 1. Append Event
  evtSheet.appendRow([
    eventId,
    event.eventType,
    event.eventName,
    event.date,
    now,
    event.status || 'Scheduled',
    event.notes || ''
  ]);

  // 2. Automatically load and provision attendance rows for all ACTIVE members
  const memData = memSheet.getDataRange().getValues();
  const newAttendanceRows = [];

  for (let i = 1; i < memData.length; i++) {
    const memberId = String(memData[i][0]);
    const status = String(memData[i][6]);

    if (status !== 'Archived') {
      const attId = 'att-' + eventId + '-' + memberId;
      newAttendanceRows.push([
        attId,
        eventId,
        memberId,
        'NO RESPONSE',
        'NOT_APPLICABLE',
        now
      ]);
    }
  }

  if (newAttendanceRows.length > 0) {
    attSheet.getRange(attSheet.getLastRow() + 1, 1, newAttendanceRows.length, 6).setValues(newAttendanceRows);
  }

  return { status: 'success', eventId: eventId, rosterCount: newAttendanceRows.length };
}

// --------------------------------------------------------------------------
// ATTENDANCE OPERATIONS
// --------------------------------------------------------------------------
function fetchAttendance(eventId) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ATTENDANCE);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (!eventId || String(data[i][1]) === String(eventId)) {
      records.push({
        id: String(data[i][0]),
        eventId: String(data[i][1]),
        memberId: String(data[i][2]),
        voteStatus: data[i][3],
        attendanceStatus: data[i][4],
        updatedAt: data[i][5]
      });
    }
  }
  return records;
}

function handleUpdateVote(eventId, memberId, voteStatus) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(eventId) && String(data[i][2]) === String(memberId)) {
      const row = i + 1;
      sheet.getRange(row, 4).setValue(voteStatus);
      sheet.getRange(row, 6).setValue(now);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Attendance record not found for member in this event.' };
}

function handleUpdateAttendance(eventId, memberId, attendanceStatus) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(eventId) && String(data[i][2]) === String(memberId)) {
      const row = i + 1;
      sheet.getRange(row, 5).setValue(attendanceStatus);
      sheet.getRange(row, 6).setValue(now);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Attendance record not found for member in this event.' };
}

function handleBulkUpdateAttendance(eventId, updates) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();

  const updateMap = {};
  updates.forEach(u => {
    updateMap[u.memberId] = u;
  });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(eventId)) {
      const mId = String(data[i][2]);
      if (updateMap[mId]) {
        const row = i + 1;
        if (updateMap[mId].voteStatus !== undefined) {
          sheet.getRange(row, 4).setValue(updateMap[mId].voteStatus);
        }
        if (updateMap[mId].attendanceStatus !== undefined) {
          sheet.getRange(row, 5).setValue(updateMap[mId].attendanceStatus);
        }
        sheet.getRange(row, 6).setValue(now);
      }
    }
  }
  return { status: 'success' };
}

// --------------------------------------------------------------------------
// STRIKES & COMMUNICATIONS
// --------------------------------------------------------------------------
function fetchStrikes() {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.STRIKES);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const strikes = [];

  for (let i = 1; i < data.length; i++) {
    strikes.push({
      id: String(data[i][0]),
      memberId: String(data[i][1]),
      date: data[i][2],
      reason: data[i][3],
      addedBy: data[i][4]
    });
  }
  return strikes;
}

function handleAddStrike(memberId, reason, addedBy) {
  const ss = getDetailsWorkbook_();
  const strkSheet = ss.getSheetByName(CRM_SHEET_NAMES.STRIKES);
  const memSheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);

  const strikeId = 'strk-' + Utilities.getUuid().substring(0, 8);
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  strkSheet.appendRow([strikeId, memberId, dateStr, reason, addedBy || 'Admin']);

  // Increment member strike counter
  const memData = memSheet.getDataRange().getValues();
  for (let i = 1; i < memData.length; i++) {
    if (String(memData[i][0]) === String(memberId)) {
      const row = i + 1;
      const currentStrikes = Number(memData[i][4] || 0);
      memSheet.getRange(row, 5).setValue(currentStrikes + 1);
      memSheet.getRange(row, 9).setValue(new Date().toISOString());
      break;
    }
  }

  return { status: 'success', strikeId: strikeId };
}

function handleRemoveStrike(strikeId, memberId) {
  const ss = getDetailsWorkbook_();
  const strkSheet = ss.getSheetByName(CRM_SHEET_NAMES.STRIKES);
  const memSheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);

  // Soft note on strike or remove row
  const data = strkSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(strikeId)) {
      strkSheet.deleteRow(i + 1);
      break;
    }
  }

  // Decrement member strike counter (never below 0)
  const memData = memSheet.getDataRange().getValues();
  for (let i = 1; i < memData.length; i++) {
    if (String(memData[i][0]) === String(memberId)) {
      const row = i + 1;
      const currentStrikes = Math.max(0, Number(memData[i][4] || 0) - 1);
      memSheet.getRange(row, 5).setValue(currentStrikes);
      memSheet.getRange(row, 9).setValue(new Date().toISOString());
      break;
    }
  }

  return { status: 'success' };
}

function fetchCommunications() {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.COMMUNICATION);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const comms = [];

  for (let i = 1; i < data.length; i++) {
    comms.push({
      id: String(data[i][0]),
      memberId: String(data[i][1]),
      status: data[i][2],
      note: data[i][3],
      date: data[i][4],
      addedBy: data[i][5]
    });
  }
  return comms;
}

function handleAddCommunication(memberId, status, note, addedBy) {
  const ss = getDetailsWorkbook_();
  const commSheet = ss.getSheetByName(CRM_SHEET_NAMES.COMMUNICATION);
  const memSheet = ss.getSheetByName(CRM_SHEET_NAMES.MEMBERS);

  const commId = 'comm-' + Utilities.getUuid().substring(0, 8);
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  commSheet.appendRow([commId, memberId, status, note, dateStr, addedBy || 'Admin']);

  // Update member communication status
  const memData = memSheet.getDataRange().getValues();
  for (let i = 1; i < memData.length; i++) {
    if (String(memData[i][0]) === String(memberId)) {
      const row = i + 1;
      memSheet.getRange(row, 6).setValue(status);
      memSheet.getRange(row, 9).setValue(new Date().toISOString());
      break;
    }
  }

  return { status: 'success', commId: commId };
}

// --------------------------------------------------------------------------
// SETTINGS
// --------------------------------------------------------------------------
function fetchSettings() {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.SETTINGS);
  if (!sheet || sheet.getLastRow() <= 1) return {};

  const data = sheet.getDataRange().getValues();
  const settings = {};

  for (let i = 1; i < data.length; i++) {
    settings[String(data[i][0])] = data[i][1];
  }
  return settings;
}

function handleUpdateSettings(newSettings) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();

  for (const key in newSettings) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(newSettings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, newSettings[key]]);
    }
  }
  return { status: 'success' };
}

// --------------------------------------------------------------------------
// ADMINS
// --------------------------------------------------------------------------
function fetchAdmins() {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ADMINS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const admins = [];

  for (let i = 1; i < data.length; i++) {
    const rawRole = String(data[i][3] || 'Officer');
    const role = (rawRole === 'MainAdmin' || rawRole === 'Leader') ? 'MainAdmin' : 'SubAdmin';
    admins.push({
      id: String(data[i][0]),
      username: String(data[i][1]),
      role: role,
      name: String(data[i][1]),
      createdAt: new Date().toISOString()
    });
  }
  return admins;
}

function handleCreateAdmin(adminData) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ADMINS);
  if (!sheet) return { status: 'error', message: 'Admins database sheet not found.' };

  const admId = 'adm-' + Utilities.getUuid().substring(0, 8);
  const hash = hashPassword(adminData.password || 'hot123');
  const role = adminData.role === 'MainAdmin' ? 'Leader' : 'Officer';

  sheet.appendRow([admId, adminData.username.trim(), hash, role]);
  return {
    status: 'success',
    admin: {
      id: admId,
      username: adminData.username.trim(),
      role: 'SubAdmin',
      name: adminData.name || adminData.username.trim(),
      createdAt: new Date().toISOString()
    }
  };
}

function handleDeleteAdmin(adminId) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ADMINS);
  if (!sheet) return { status: 'error', message: 'Admins database sheet not found.' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(adminId)) {
      const role = String(data[i][3]);
      if (role === 'Leader' || role === 'MainAdmin' || String(data[i][1]).toLowerCase() === 'admin') {
        return { status: 'error', message: 'Cannot delete the Main Admin account.' };
      }
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Admin account not found in database.' };
}

function fetchContributions() {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.CONTRIBUTIONS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = data.length - 1; i >= 1; i--) {
    list.push({
      id: String(data[i][0]),
      adminId: String(data[i][1]),
      adminUsername: String(data[i][2]),
      adminName: String(data[i][3]),
      adminRole: String(data[i][4]),
      action: String(data[i][5]),
      description: String(data[i][6]),
      targetName: String(data[i][7] || ''),
      count: Number(data[i][8] || 1),
      timestamp: String(data[i][9])
    });
  }
  return list;
}

function handleRecordContribution(entry) {
  const ss = getDetailsWorkbook_();
  let sheet = ss.getSheetByName(CRM_SHEET_NAMES.CONTRIBUTIONS);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(CRM_SHEET_NAMES.CONTRIBUTIONS);
  }

  const id = entry.id || ('cnt-' + Utilities.getUuid().substring(0, 8));
  const ts = entry.timestamp || new Date().toISOString();

  sheet.appendRow([
    id,
    entry.adminId || '',
    entry.adminUsername || '',
    entry.adminName || '',
    entry.adminRole || '',
    entry.action || '',
    entry.description || '',
    entry.targetName || '',
    entry.count || 1,
    ts
  ]);

  return { status: 'success', id: id };
}

function handleUpdatePassword(adminId, newPassword) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ADMINS);
  if (!sheet) return { status: 'error', message: 'Admins sheet not found.' };

  const data = sheet.getDataRange().getValues();
  const hash = hashPassword(newPassword);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(adminId)) {
      sheet.getRange(i + 1, 3).setValue(hash);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Admin account not found.' };
}

function handleUpdateProfile(adminId, newName) {
  const ss = getDetailsWorkbook_();
  const sheet = ss.getSheetByName(CRM_SHEET_NAMES.ADMINS);
  if (!sheet) return { status: 'error', message: 'Admins sheet not found.' };

  return { status: 'success' };
}


