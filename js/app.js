/**
 * app.js — CRM Website Dashboard
 *
 * Fetches JSON from the Apps Script Web App (see config.js + Code.gs),
 * and updates the DATA in the existing tables/cards without rebuilding
 * the page structure. Column layout (thead, group headers) stays as
 * already rendered in index.html; this script only replaces row content.
 *
 * Files this pairs with:
 *   - css/styles.css   (styling, untouched by this file)
 *   - js/config.js     (SCRIPT_URL, REFRESH_INTERVAL_MS)
 *   - apps-script/Code.gs (deployed separately in Google Apps Script)
 */

(function () {
  "use strict";

  var TEAM_ORDER = ["dungun", "kn", "jt", "jk", "nev"];
  var GROUP_KEYS = ["on_ground", "online", "live", "prospek", "booking", "submission", "register"];

  var lastGoodData = null;
  var isFirstLoad = true;

  // --------------------------------------------------------------------
  // Formatting helpers (mirrors the logic used to originally generate
  // the static snapshot, so live data renders identically)
  // --------------------------------------------------------------------

  function fmtNum(v) {
    if (v === null || v === undefined || v === "") return "0";
    if (typeof v === "string") {
      return /DIV|VALUE|REF|NAME/.test(v) ? "–" : v;
    }
    if (typeof v === "number") {
      return Number.isInteger(v) ? String(v) : v.toFixed(1);
    }
    return String(v);
  }

  function fmtPct(v) {
    if (v === null || v === undefined || typeof v === "string") return "–";
    return (v * 100).toFixed(1) + "%";
  }

  function fmtInt(v) {
    var n = Math.round(Number(v) || 0);
    return n.toLocaleString();
  }

  function esc(v) {
    if (v === null || v === undefined) return "";
    var div = document.createElement("div");
    div.textContent = String(v);
    return div.innerHTML;
  }

  function taggingBadge(val) {
    if (val === "Y") return '<span class="badge badge--yes">Y</span>';
    if (val === "N") return '<span class="badge badge--no">N</span>';
    return '<span class="badge badge--muted">–</span>';
  }

  // --------------------------------------------------------------------
  // Branch Overview rendering
  // --------------------------------------------------------------------

  function branchRowHtml(r, isTotal) {
    var cls = isTotal ? ' class="row--total"' : "";
    return (
      "<tr" + cls + ">" +
      '<td class="cell-name">' + esc(r.name) + "</td>" +
      '<td class="num">' + fmtInt(r.prospect) + "</td>" +
      '<td class="num">' + fmtInt(r.booking) + "</td>" +
      '<td class="num">' + fmtInt(r.submission) + "</td>" +
      '<td class="num">' + fmtInt(r.rfa) + "</td>" +
      '<td class="num">' + fmtInt(r.registration) + "</td>" +
      '<td class="num">' + (r.conv ? (r.conv * 100).toFixed(1) : "0.0") + "%</td>" +
      "</tr>"
    );
  }

  function renderBranchOverview(branch) {
    if (!branch || !branch.total) return;

    var rowsHtml = (branch.rows || []).map(function (r) { return branchRowHtml(r, false); }).join("");
    var totalHtml = branchRowHtml(branch.total, true);

    setHtml("branch-rows", rowsHtml);
    setHtml("branch-total", totalHtml);

    setText("kpi-prospect", fmtInt(branch.total.prospect));
    setText("kpi-booking", fmtInt(branch.total.booking));
    setText("kpi-submission", fmtInt(branch.total.submission));
    setText("kpi-rfa", fmtInt(branch.total.rfa));
    setText("kpi-registration", fmtInt(branch.total.registration));
    setText("kpi-conversion", (branch.total.conv ? (branch.total.conv * 100).toFixed(1) : "0.0") + "%");
  }

  // --------------------------------------------------------------------
  // Weekly Performance Target (Week 1) — NEW, additive only.
  // Classifies each SA by YOS, compares their existing Prospect/Booking%/
  // Submission%/Register% against the target for their tier, and renders
  // a pass/fail badge. Weeks 2-4 are placeholders for future weeks.
  // Does not alter baseCells/detailCells/teamRowHtml's existing outputs —
  // only adds a new cell block between them.
  // --------------------------------------------------------------------

  var WEEK1_TARGETS = {
    rookie1: { prospect: 50,  booking_pct: 1,  submission_pct: 0,  register_pct: 0 },
    rookie2: { prospect: 100, booking_pct: 1,  submission_pct: 0,  register_pct: 0 },
    otai:    { prospect: 100, booking_pct: 10, submission_pct: 50, register_pct: 50 }
  };

  function parseYOSMonths(yos) {
    if (!yos) return null;
    var s = String(yos).trim().toUpperCase();
    var m = s.match(/([\d.]+)\s*(YR|Y|MO|M|WK|W)\b/);
    if (!m) return null;
    var val = parseFloat(m[1]);
    var unit = m[2];
    if (unit === "YR" || unit === "Y") return val * 12;
    if (unit === "MO" || unit === "M") return val;
    if (unit === "WK" || unit === "W") return val / 4.345;
    return null;
  }

  function classifyYOS(yos) {
    var months = parseYOSMonths(yos);
    if (months === null) return null;
    if (months <= 3) return "rookie1";
    if (months <= 6) return "rookie2";
    return "otai";
  }

  function evalWeek1Metric(rawValue, target, kind) {
    var value = (typeof rawValue === "number" && isFinite(rawValue)) ? rawValue : null;
    if (value === null || target === null || target === undefined) {
      return { status: "neutral", text: "–" };
    }
    // Pass/fail uses the raw, unrounded value — only the displayed text is rounded.
    var passed = value >= target;
    var text = kind === "pct" ? value.toFixed(1) + "%" : String(Math.round(value));
    return { status: passed ? "pass" : "fail", text: text };
  }

  function neutralWeek1Result() {
    return { status: "neutral", text: "–" };
  }

  function toValidNumber(v) {
    return (typeof v === "number" && isFinite(v)) ? v : null;
  }

  function weeklyTargetCells(entry, isTotal) {
    var tier = isTotal ? null : classifyYOS(entry.yos);
    var targets = tier ? WEEK1_TARGETS[tier] : null;

    var g = entry.groups || {};
    var prospectVal = toValidNumber(g.prospek ? g.prospek.total : null);
    var bookingPctRaw = toValidNumber(g.booking ? g.booking.pct : null);
    var submissionPctRaw = toValidNumber(g.submission ? g.submission.pct : null);
    var registerPctRaw = toValidNumber(g.register ? g.register.pct : null);

    var bookingPct = bookingPctRaw !== null ? bookingPctRaw * 100 : null;
    var submissionPct = submissionPctRaw !== null ? submissionPctRaw * 100 : null;
    var registerPct = registerPctRaw !== null ? registerPctRaw * 100 : null;

    var p = targets ? evalWeek1Metric(prospectVal, targets.prospect, "int") : neutralWeek1Result();
    var b = targets ? evalWeek1Metric(bookingPct, targets.booking_pct, "pct") : neutralWeek1Result();
    var s = targets ? evalWeek1Metric(submissionPct, targets.submission_pct, "pct") : neutralWeek1Result();
    var r = targets ? evalWeek1Metric(registerPct, targets.register_pct, "pct") : neutralWeek1Result();

    var week1 =
      '<td class="num week-cell week-' + p.status + '">' + p.text + "</td>" +
      '<td class="num week-cell week-' + b.status + '">' + b.text + "</td>" +
      '<td class="num week-cell week-' + s.status + '">' + s.text + "</td>" +
      '<td class="num week-cell week-' + r.status + '">' + r.text + "</td>";

    var placeholder = '<td class="num week-cell week-neutral week-placeholder">–</td>';
    var weeks234 = "";
    for (var i = 0; i < 12; i++) weeks234 += placeholder;

    return week1 + weeks234;
  }

  // --------------------------------------------------------------------
  // Team Detail rendering
  // --------------------------------------------------------------------

  function baseCells(entry) {
    var g = entry.groups;
    function total(key) { return fmtNum(g[key] ? g[key].total : 0); }
    function pct(key) { return g[key] && g[key].pct !== null ? fmtPct(g[key].pct) : "–"; }

    return (
      '<td class="cell-name">' + esc(entry.name || "—") + "</td>" +
      "<td>" + taggingBadge(entry.tagging) + "</td>" +
      "<td>" + esc(entry.grade || "–") + "</td>" +
      "<td>" + esc(entry.yos || "–") + "</td>" +
      '<td class="num">' + total("on_ground") + "</td>" +
      '<td class="num">' + total("online") + "</td>" +
      '<td class="num">' + total("live") + "</td>" +
      '<td class="num">' + total("prospek") + "</td>" +
      '<td class="num">' + total("booking") + "</td>" +
      '<td class="num">' + pct("booking") + "</td>" +
      '<td class="num">' + total("submission") + "</td>" +
      '<td class="num">' + pct("submission") + "</td>" +
      '<td class="num">' + total("register") + "</td>" +
      '<td class="num">' + pct("register") + "</td>"
    );
  }

  function detailCells(entry) {
    var g = entry.groups;
    var cells = "";
    GROUP_KEYS.forEach(function (gk) {
      var group = g[gk];
      var detail = group ? group.detail : [];
      detail.forEach(function (v) {
        cells += '<td class="num detail-col">' + fmtNum(v) + "</td>";
      });
    });
    return cells;
  }

  function teamRowHtml(entry, isTotal) {
    var cls = isTotal ? ' class="row--total"' : "";
    return "<tr" + cls + ">" + baseCells(entry) + weeklyTargetCells(entry, isTotal) + detailCells(entry) + "</tr>";
  }

  function renderTeamDetail(teams) {
    if (!teams) return;
    TEAM_ORDER.forEach(function (key) {
      var team = teams[key];
      if (!team) return;

      var rowsHtml = (team.rows || []).map(function (r) { return teamRowHtml(r, false); }).join("");
      setHtml("rows-" + key, rowsHtml);

      if (team.total) {
        var fakeTotal = Object.assign({}, team.total, { name: "TOTAL" });
        setHtml("total-" + key, teamRowHtml(fakeTotal, true));
      }
    });
  }

  // --------------------------------------------------------------------
  // DOM helpers
  // --------------------------------------------------------------------

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setSyncStatus(text, isError) {
    var el = document.getElementById("sync-status");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("sync-status--error", !!isError);
  }

  // --------------------------------------------------------------------
  // Fetch + refresh loop
  // --------------------------------------------------------------------

  function refresh() {
    var url = window.CONFIG && window.CONFIG.SCRIPT_URL;
    if (!url || url.indexOf("PASTE_YOUR") === 0) {
      setSyncStatus("Not connected — add SCRIPT_URL in js/config.js", true);
      return;
    }

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        lastGoodData = data;
        renderBranchOverview(data.branch);
        renderTeamDetail(data.teams);
        var updated = data.updatedAt ? new Date(data.updatedAt) : new Date();
        setSyncStatus("Last synced " + updated.toLocaleTimeString());
        isFirstLoad = false;
      })
      .catch(function (err) {
        console.error("Dashboard sync failed:", err);
        if (lastGoodData) {
          setSyncStatus("Sync failed — showing last known data", true);
        } else {
          setSyncStatus("Sync failed — no data loaded yet", true);
        }
      });
  }

  // --------------------------------------------------------------------
  // Search — filters visible rows by name, scoped to whichever panel
  // (Branch Overview table, or the currently active Team Detail tab)
  // is on screen right now.
  // --------------------------------------------------------------------

  function initSearch() {
    var input = document.querySelector(".topbar__search");
    if (!input) return;

    input.addEventListener("input", function () {
      var term = input.value.trim().toLowerCase();
      var overviewOn = document.getElementById("section-overview").checked;

      if (overviewOn) {
        filterRows("branch-rows", term);
      } else {
        var activeTeam = document.querySelector('input[name="team"]:checked');
        if (activeTeam) {
          var key = activeTeam.id.replace("tab-", "");
          filterRows("rows-" + key, term);
        }
      }
    });
  }

  function filterRows(containerId, term) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var rows = container.querySelectorAll("tr");
    rows.forEach(function (row) {
      var nameCell = row.querySelector(".cell-name");
      var name = nameCell ? nameCell.textContent.toLowerCase() : "";
      row.style.display = !term || name.indexOf(term) !== -1 ? "" : "none";
    });
  }

  // --------------------------------------------------------------------
  // Init
  // --------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    initSearch();
    refresh();
    setInterval(refresh, (window.CONFIG && window.CONFIG.REFRESH_INTERVAL_MS) || 30000);
  });
})();
