/**
 * Portfolio counters backend — Google Apps Script + Google Drive
 * Stores pokes + visits in a JSON file in your Google Drive.
 *
 * SETUP
 * 1. script.google.com > New project > paste this whole file (replace Code.gs).
 * 2. Run `setup` once (Run button) and approve the permissions. It creates
 *    "portfolio-counters.json" in your Drive root (you can move it anywhere).
 * 3. Deploy > New deployment > type: Web app
 *      Execute as: Me      Who has access: Anyone
 *    Copy the Web app URL (ends in /exec) into API_URL in app.js.
 * 4. After EVERY edit to this script: Deploy > Manage deployments > Edit >
 *    Version: New version > Deploy (the URL stays the same).
 */

const FILE_NAME = 'portfolio-counters.json';
const VISIT_GAP_MS = 30 * 60 * 1000; // same browser counts as a new visit after 30 min
const POKE_GAP_MS = 400;             // ignore pokes faster than this per browser (anti-spam)
const MAX_VISITORS = 5000;           // safety cap on the stored visitor table

/** Run once manually: creates the Drive file and authorizes the script. */
function setup() {
  const { file } = loadDb_();
  Logger.log('Database file: ' + file.getUrl());
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  return json_(handle_(p.action || 'get', p.visitorId));
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { /* ignore */ }
  return json_(handle_(body.action || 'get', body.visitorId));
}

function handle_(action, visitorIdRaw) {
  if (['get', 'visit', 'poke'].indexOf(action) === -1) {
    return { ok: false, error: 'Unknown action' };
  }
  const visitorId = String(visitorIdRaw || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);

  const lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (err) { return { ok: false, error: 'Busy, try again' }; }

  try {
    const { file, db } = loadDb_();
    const now = Date.now();
    const iso = new Date(now).toISOString();
    let changed = false;

    let v = null;
    if (visitorId && action !== 'get') {
      v = db.visitors[visitorId];
      if (!v) {
        if (Object.keys(db.visitors).length >= MAX_VISITORS) {
          return { ok: false, error: 'Visitor table full' };
        }
        v = db.visitors[visitorId] = { visits: 0, pokes: 0, first: iso, last: iso, lastVisitAt: 0, lastPokeAt: 0 };
        changed = true;
      }
    } else if (visitorId) {
      v = db.visitors[visitorId] || null;
    }

    if (action === 'visit' && v && now - v.lastVisitAt > VISIT_GAP_MS) {
      db.visits += 1; v.visits += 1; v.lastVisitAt = now; v.last = iso; changed = true;
    }
    if (action === 'poke' && v && now - v.lastPokeAt >= POKE_GAP_MS) {
      db.pokes += 1; v.pokes += 1; v.lastPokeAt = now; v.last = iso; changed = true;
    }

    if (changed) {
      db.updated = iso;
      file.setContent(JSON.stringify(db));
    }

    return {
      ok: true,
      pokes: db.pokes,
      visits: db.visits,
      uniqueVisitors: Object.keys(db.visitors).length,
      you: v ? { visits: v.visits, pokes: v.pokes } : { visits: 0, pokes: 0 }
    };
  } finally {
    lock.releaseLock();
  }
}

/** Finds (or creates) the JSON file in Drive and returns { file, db }. */
function loadDb_() {
  const props = PropertiesService.getScriptProperties();
  let file = null;
  const id = props.getProperty('DB_FILE_ID');
  if (id) { try { file = DriveApp.getFileById(id); } catch (err) { file = null; } }
  if (!file) {
    file = DriveApp.createFile(FILE_NAME, JSON.stringify(emptyDb_()), MimeType.PLAIN_TEXT);
    props.setProperty('DB_FILE_ID', file.getId());
  }
  let db;
  try { db = JSON.parse(file.getBlob().getDataAsString() || '{}'); } catch (err) { db = {}; }
  const base = emptyDb_();
  db.pokes = Number(db.pokes) || 0;
  db.visits = Number(db.visits) || 0;
  db.visitors = db.visitors || {};
  db.created = db.created || base.created;
  return { file, db };
}

function emptyDb_() {
  return { pokes: 0, visits: 0, visitors: {}, created: new Date().toISOString(), updated: null };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
