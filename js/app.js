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
    return "<tr" + cls + ">" + baseCells(entry) + detailCells(entry) + "</tr>";
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
