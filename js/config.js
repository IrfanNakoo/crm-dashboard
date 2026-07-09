/**
 * config.js — fill in SCRIPT_URL after deploying Code.gs as a Web App
 * (Extensions > Apps Script > Deploy > New deployment > Web app).
 *
 * Leave REFRESH_INTERVAL_MS at 30000 to match the 30-second auto-refresh
 * from the original project plan. Lower it for testing, but avoid going
 * much below 10s in production — Apps Script Web Apps have execution
 * quotas and every dashboard tab open counts as a separate caller.
 */
window.CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxw9TQ2LleszS00tqLHGxG6lQ7XhxMxJyyYT8_tDURbCcYOF8P1S1d7lBV4R_v5rGB0sQ/exec",
  REFRESH_INTERVAL_MS: 30000
};
