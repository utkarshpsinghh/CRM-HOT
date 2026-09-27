/**
 * =========================================================================
 * HOT — KINGSHOT ALLIANCE CRM — GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * 
 * Version: 1.0 (MVP)
 * Purpose: Secure backend & REST API for HOT Alliance Command Center.
 * Source of Truth: Google Sheets.
 *
 * HOW TO DEPLOY:
 * 1. Open Google Sheets -> Extensions -> Apps Script.
 * 2. Replace Code.gs with this entire file.
 * 3. Run the "setupDatabase()" function once to automatically build all sheets,
 *    headers, initial admin credentials, and default settings.
 * 4. Click "Deploy" -> "New deployment" -> Select type "Web app".
 *    - Description: "HOT Alliance CRM Web App"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Copy the Web App URL and paste it into the Settings tab of the CRM!
 */

const SHEET_NAMES = {
  MEMBERS: 'Members',
  EVENTS: 'Events',
  ATTENDANCE: 'Attendance',
  STRIKES: 'Strike History',
  COMMUNICATION: 'Communication',
  ADMINS: 'Admins',
  SETTINGS: 'Settings',
  CONTRIBUTIONS: 'Contributions'
};

// --------------------------------------------------------------------------
// ONE-CLICK DATABASE INITIALIZATION
// --------------------------------------------------------------------------
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Members Sheet
  let memSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
  if (!memSheet) memSheet = ss.insertSheet(SHEET_NAMES.MEMBERS);
  memSheet.getRange(1, 1, 1, 9).setValues([[
    'Member ID', 'Name', 'Current Rank', 'Former Rank', 'Strikes', 'Communication', 'Status', 'Created At', 'Updated At'
  ]]);
  formatHeaderRow(memSheet, 9);

  // 2. Events Sheet
  let evtSheet = ss.getSheetByName(SHEET_NAMES.EVENTS);
  if (!evtSheet) evtSheet = ss.insertSheet(SHEET_NAMES.EVENTS);
  evtSheet.getRange(1, 1, 1, 7).setValues([[
    'Event ID', 'Event Type', 'Event Name', 'Date', 'Created At', 'Status', 'Notes'
  ]]);
  formatHeaderRow(evtSheet, 7);

  // 3. Attendance Sheet
  let attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  if (!attSheet) attSheet = ss.insertSheet(SHEET_NAMES.ATTENDANCE);
  attSheet.getRange(1, 1, 1, 6).setValues([[
    'Attendance ID', 'Event ID', 'Member ID', 'Vote Status', 'Attendance Status', 'Updated At'
  ]]);
  formatHeaderRow(attSheet, 6);

  // 4. Strike History Sheet
  let strkSheet = ss.getSheetByName(SHEET_NAMES.STRIKES);
  if (!strkSheet) strkSheet = ss.insertSheet(SHEET_NAMES.STRIKES);
  strkSheet.getRange(1, 1, 1, 5).setValues([[
    'Strike ID', 'Member ID', 'Date', 'Reason', 'Added By'
  ]]);
  formatHeaderRow(strkSheet, 5);

  // 5. Communication Sheet
  let commSheet = ss.getSheetByName(SHEET_NAMES.COMMUNICATION);
  if (!commSheet) commSheet = ss.insertSheet(SHEET_NAMES.COMMUNICATION);
  commSheet.getRange(1, 1, 1, 6).setValues([[
    'Communication ID', 'Member ID', 'Status', 'Note', 'Date', 'Added By'
  ]]);
  formatHeaderRow(commSheet, 6);

  // 6. Admins Sheet
  let admSheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
  if (!admSheet) admSheet = ss.insertSheet(SHEET_NAMES.ADMINS);
  admSheet.getRange(1, 1, 1, 4).setValues([[
    'Admin ID', 'Username', 'Password Hash', 'Role'
  ]]);
  formatHeaderRow(admSheet, 4);

  // Create default admin: username "seoyoon", password "masterlogin", role "Leader"
  const defaultHash = hashPassword('masterlogin');
  if (admSheet.getLastRow() === 1) {
    admSheet.appendRow(['adm-001', 'seoyoon', defaultHash, 'Leader']);
  }

  // 7. Settings Sheet
  let setSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!setSheet) setSheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
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
  let cntSheet = ss.getSheetByName(SHEET_NAMES.CONTRIBUTIONS);
  if (!cntSheet) cntSheet = ss.insertSheet(SHEET_NAMES.CONTRIBUTIONS);
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
function doGet(e) {
  const action = e.parameter.action || 'ping';

  try {
    let result = {};
    if (action === 'ping') {
      result = { status: 'success', message: 'HOT Alliance Command Center API is live!', timestamp: new Date().toISOString() };
    } else if (action === 'getMembers') {
      result = { status: 'success', data: fetchMembers() };
    } else if (action === 'getEvents') {
      result = { status: 'success', data: fetchEvents() };
    } else if (action === 'getAttendance') {
      const eventId = e.parameter.eventId;
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
    } else if (action === 'getDashboard') {
      result = { status: 'success', data: getDashboardData() };
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
    return jsonResponse(result, e);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, e);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    const action = body.action || e.parameter.action;

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
        result = handleUpdateProfile(body.adminId, body.name, body.username);
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

function jsonResponse(data, e) {
  const callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
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
  const normUser = String(username).trim().toLowerCase();
  const pass = String(password).trim();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
  if (!sheet) return { status: 'error', message: 'Admins database table not configured.' };

  const data = sheet.getDataRange().getValues();
  const inputHash = hashPassword(pass);

  for (let i = 1; i < data.length; i++) {
    const rowUser = String(data[i][1]).trim().toLowerCase();
    const rowHash = String(data[i][2]).trim();
    const rawRole = String(data[i][3] || 'Officer').trim();

    if (rowUser === normUser) {
      // Allow matching either the SHA-256 hash OR a plain-text password typed directly into the sheet!
      const isMatch = (rowHash === inputHash || rowHash === pass);
      if (isMatch) {
        // If password was entered in plain text directly in the sheet, auto-upgrade to SHA-256 hash for security
        if (rowHash === pass) {
          sheet.getRange(i + 1, 3).setValue(inputHash);
        }
        const isLeader = (rawRole.toLowerCase() === 'leader' || rawRole.toLowerCase() === 'mainadmin' || rawRole.toLowerCase() === 'r5');
        return {
          status: 'success',
          user: {
            id: String(data[i][0] || 'adm-' + i),
            username: String(data[i][1]).trim(),
            name: String(data[i][4] || data[i][1]).trim(),
            role: isLeader ? 'MainAdmin' : 'SubAdmin',
            token: Utilities.getUuid()
          }
        };
      } else {
        return { status: 'error', message: 'Invalid credentials. Password does not match.' };
      }
    }
  }

  return { status: 'error', message: 'User not found in alliance records.' };
}

// --------------------------------------------------------------------------
// MEMBERS OPERATIONS
// --------------------------------------------------------------------------
function fetchMembers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.EVENTS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const evtSheet = ss.getSheetByName(SHEET_NAMES.EVENTS);
  const attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  const memSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.STRIKES);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const strkSheet = ss.getSheetByName(SHEET_NAMES.STRIKES);
  const memSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const strkSheet = ss.getSheetByName(SHEET_NAMES.STRIKES);
  const memSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.COMMUNICATION);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const commSheet = ss.getSheetByName(SHEET_NAMES.COMMUNICATION);
  const memSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet || sheet.getLastRow() <= 1) return {};

  const data = sheet.getDataRange().getValues();
  const settings = {};

  for (let i = 1; i < data.length; i++) {
    settings[String(data[i][0])] = data[i][1];
  }
  return settings;
}

function handleUpdateSettings(newSettings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CONTRIBUTIONS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.CONTRIBUTIONS);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(SHEET_NAMES.CONTRIBUTIONS);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
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

function handleUpdateProfile(adminId, newName, username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
  if (!sheet) return { status: 'error', message: 'Admins sheet not found.' };

  const data = sheet.getDataRange().getValues();
  const normUser = String(username || adminId || '').trim().toLowerCase();
  const targetId = String(adminId || '').trim();

  // If Admins sheet has fewer than 5 columns, ensure Header 5 is 'Display Name'
  if (sheet.getLastColumn() < 5) {
    sheet.getRange(1, 5).setValue('Display Name');
  }

  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0]).trim();
    const rowUser = String(data[i][1]).trim().toLowerCase();
    if (rowId === targetId || rowUser === normUser) {
      sheet.getRange(i + 1, 5).setValue(newName);
      return { status: 'success' };
    }
  }
  return { status: 'success' };
}

