/**
 * Code.gs — Apps Script Web App backend for the CRM Website Dashboard.
 *
 * WHAT THIS DOES
 * Reads the "Branch Summary" sheet (same layout as CRM_DB_Website_DCP.xlsx:
 * a small Branch Performance Summary table at the top, followed by five
 * SA-level team blocks — ISO Dungun, ISO KN, ISO JT, ISO JK, ISO NEV) and
 * returns it as JSON for js/app.js to render.
 *
 * HOW TO DEPLOY
 * 1. Open the live Google Sheet this dashboard should read from.
 * 2. Extensions > Apps Script. Paste this whole file in as Code.gs.
 * 3. Deploy > New deployment > type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone within [your domain]  (recommended for an
 *        internal tool — see the earlier conversation about keeping this
 *        private rather than fully public)
 * 4. Copy the deployment URL and paste it into js/config.js as SCRIPT_URL.
 * 5. Every time you edit this script, you must create a NEW deployment
 *    version (or "Manage deployments" > edit > new version) for changes
 *    to take effect on the existing URL.
 *
 * IMPORTANT ASSUMPTION (v1)
 * Row positions are found dynamically (so adding new SAs to a team is
 * safe), but each team's COLUMN layout is assumed to match what's in the
 * schema below — i.e. don't reorder the ON GROUND / ONLINE ACTIVITIES /
 * etc. columns within a team block without also updating TEAM_SCHEMA.
 */

var SHEET_NAME = 'Branch Summary';

// Column indices (0-based) per team, extracted from the current sheet
// structure. total_col / pct_col are the summary columns already shown
// as the base metrics; detail_cols are the sub-metric breakdown columns
// (SAGA/PERS/S70/X50/X70/X90 etc.) shown only when "Show channel
// breakdown" is toggled on in the dashboard.
var TEAM_SCHEMA = {
  dungun: {
    label: 'ISO Dungun', nameCol: 1, taggingCol: 2, gradeCol: 3, yosCol: 4,
    groups: {
      on_ground:  { totalCol: 10, pctCol: null, detailCols: [5,6,7,8,9] },
      online:     { totalCol: 17, pctCol: null, detailCols: [11,12,13,14,15,16] },
      live:       { totalCol: 24, pctCol: null, detailCols: [18,19,20,21,22,23,25] },
      prospek:    { totalCol: 33, pctCol: null, detailCols: [26,27,28,29,30,31,32] },
      booking:    { totalCol: 41, pctCol: 42,   detailCols: [34,35,36,37,38,39,40] },
      submission: { totalCol: 50, pctCol: 51,   detailCols: [43,44,45,46,47,48,49] },
      register:   { totalCol: 59, pctCol: null, detailCols: [52,53,54,55,56,57,58] }
    }
  },
  kn: {
    label: 'ISO KN', nameCol: 1, taggingCol: 2, gradeCol: 3, yosCol: 4,
    groups: {
      on_ground:  { totalCol: 10, pctCol: null, detailCols: [5,6,7,8] },
      online:     { totalCol: 17, pctCol: null, detailCols: [11,12,13,14,15,16] },
      live:       { totalCol: 24, pctCol: null, detailCols: [18,19,20,21,22,23] },
      prospek:    { totalCol: 33, pctCol: null, detailCols: [26,27,28,29,30,31,32] },
      booking:    { totalCol: 41, pctCol: 42,   detailCols: [34,35,36,37,38,39,40] },
      submission: { totalCol: 50, pctCol: 51,   detailCols: [43,44,45,46,47,48] },
      register:   { totalCol: 59, pctCol: null, detailCols: [52,53,54,55,56,57] }
    }
  },
  jt: {
    label: 'ISO JT', nameCol: 1, taggingCol: 2, gradeCol: 3, yosCol: 4,
    groups: {
      on_ground:  { totalCol: 10, pctCol: null, detailCols: [5,6,7,8] },
      online:     { totalCol: 17, pctCol: null, detailCols: [11,12,13,14,15,16] },
      live:       { totalCol: 24, pctCol: null, detailCols: [18,19,20,21,22,23] },
      prospek:    { totalCol: 33, pctCol: null, detailCols: [26,27,28,29,30,31,32] },
      booking:    { totalCol: 41, pctCol: 42,   detailCols: [34,35,36,37,38,39,40] },
      submission: { totalCol: 50, pctCol: 51,   detailCols: [43,44,45,46,47,48] },
      register:   { totalCol: 59, pctCol: null, detailCols: [52,53,54,55,56,57] }
    }
  },
  jk: {
    label: 'ISO JK', nameCol: 1, taggingCol: 2, gradeCol: 3, yosCol: 4,
    groups: {
      on_ground:  { totalCol: 10, pctCol: null, detailCols: [5,6,7,8] },
      online:     { totalCol: 17, pctCol: null, detailCols: [11,12,13,14,15,16] },
      live:       { totalCol: 24, pctCol: null, detailCols: [18,19,20,21,22,23] },
      prospek:    { totalCol: 33, pctCol: null, detailCols: [26,27,28,29,30,31,32] },
      booking:    { totalCol: 41, pctCol: 42,   detailCols: [34,35,36,37,38,39] },
      submission: { totalCol: 50, pctCol: 51,   detailCols: [43,44,45,46,47,48,49] },
      register:   { totalCol: 59, pctCol: null, detailCols: [52,53,54,55,56,57] }
    }
  },
  nev: {
    label: 'ISO NEV', nameCol: 1, taggingCol: 2, gradeCol: 3, yosCol: 4,
    groups: {
      on_ground:  { totalCol: 10, pctCol: null, detailCols: [5,6,7,8] },
      online:     { totalCol: 17, pctCol: null, detailCols: [11,12,13,14,15,16] },
      live:       { totalCol: 24, pctCol: null, detailCols: [18,19,20,21,22,23] },
      prospek:    { totalCol: 30, pctCol: null, detailCols: [26,27,28,29] },
      booking:    { totalCol: 35, pctCol: 36,   detailCols: [31,32,33,34] },
      submission: { totalCol: 41, pctCol: 42,   detailCols: [37,38,39,40] },
      register:   { totalCol: 47, pctCol: 48,   detailCols: [43,44,45,46] }
    }
  }
};

var TEAM_ORDER = ['dungun', 'kn', 'jt', 'jk', 'nev'];
var GROUP_KEYS = ['on_ground', 'online', 'live', 'prospek', 'booking', 'submission', 'register'];

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  var payload = {
    branch: parseBranchSummary(data),
    teams: parseAllTeams(data),
    updatedAt: new Date().toISOString()
  };

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function isBlank(v) {
  return v === '' || v === null || v === undefined;
}

/** Branch Performance Summary block — small fixed-shape table at the top. */
function parseBranchSummary(data) {
  var headerRow = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === 'Branch' && data[i][1] === 'Prospect') {
      headerRow = i;
      break;
    }
  }
  var rows = [];
  var total = null;
  if (headerRow !== -1) {
    for (var r = headerRow + 1; r < data.length; r++) {
      var row = data[r];
      if (isBlank(row[0])) break;
      var entry = {
        name: row[0], prospect: row[1] || 0, booking: row[2] || 0,
        submission: row[3] || 0, rfa: row[4] || 0,
        registration: row[5] || 0, conv: row[6] || 0
      };
      if (String(row[0]).toUpperCase() === 'TOTAL') {
        total = entry;
      } else {
        rows.push(entry);
      }
    }
  }
  return { rows: rows, total: total };
}

/** Finds every row containing 'SA NAME' — one per team block. */
function findHeaderRows(data) {
  var idxs = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i].indexOf('SA NAME') !== -1) idxs.push(i);
  }
  return idxs;
}

/** Finds the team label (e.g. "ISO Dungun") by scanning a few rows above the header row. */
function findTeamLabel(data, headerIdx) {
  for (var back = 1; back <= 4; back++) {
    var r = headerIdx - back;
    if (r < 0) break;
    var cell = data[r][1];
    if (!isBlank(cell) && String(cell).trim().toUpperCase() !== 'SA NAME') {
      return String(cell).trim();
    }
  }
  return null;
}

function matchTeamKey(label) {
  if (!label) return null;
  var norm = label.toUpperCase().replace(/\s+/g, ' ').trim();
  for (var key in TEAM_SCHEMA) {
    if (norm.indexOf(TEAM_SCHEMA[key].label.toUpperCase()) !== -1) return key;
  }
  return null;
}

function fmtCell(v) {
  if (v === '' || v === null || v === undefined) return 0;
  return v;
}

function extractRow(row, schema) {
  var name = row[schema.nameCol];
  var tagging = row[schema.taggingCol];
  var grade = row[schema.gradeCol];
  var yos = row[schema.yosCol];

  var groups = {};
  GROUP_KEYS.forEach(function (gk) {
    var g = schema.groups[gk];
    var detail = g.detailCols.map(function (c) { return fmtCell(row[c]); });
    groups[gk] = {
      total: fmtCell(row[g.totalCol]),
      pct: g.pctCol !== null ? row[g.pctCol] : null,
      detail: detail
    };
  });

  return { name: name, tagging: tagging, grade: grade, yos: yos, groups: groups };
}

function parseAllTeams(data) {
  var headerRows = findHeaderRows(data);
  var result = {};

  headerRows.forEach(function (hIdx, i) {
    var label = findTeamLabel(data, hIdx);
    var key = matchTeamKey(label);
    if (!key) return; // skip blocks that aren't one of our 5 known teams (e.g. the rollup block)

    var schema = TEAM_SCHEMA[key];
    var dataStart = hIdx + 2;
    var dataEnd = (i + 1 < headerRows.length) ? headerRows[i + 1] : data.length;

    var rows = [];
    var totalRow = null;

    for (var r = dataStart; r < dataEnd; r++) {
      var row = data[r];
      var marker = (row[0] === 'TOTAL') ? row[0] : row[1];
      if (marker === 'TOTAL') {
        totalRow = extractRow(row, schema); // last TOTAL row wins (grand total)
        continue;
      }
      if (isBlank(row[schema.nameCol])) continue;
      rows.push(extractRow(row, schema));
    }

    result[key] = { label: schema.label, rows: rows, total: totalRow };
  });

  return result;
}
