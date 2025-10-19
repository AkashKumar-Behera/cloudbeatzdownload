// download-counter-multi.js
// Track multiple files; show the sum of their counts in one element by ID.

// ---------- CONFIG ----------
const TRACK_FILES = [
  "CloudBeatz.apk",
  "CloudBeatz-Setup.exe"
];
const COUNT_ELEMENT_ID = "data-count-target";
const COOLDOWN_SECONDS = 10;

const firebaseConfig = {
  apiKey: "AIzaSyBhjSO-xQZzHX27CYwenVxLH7TfexNfJTc",
  authDomain: "mobiletracker-5044e.firebaseapp.com",
  databaseURL: "https://mobiletracker-5044e-default-rtdb.firebaseio.com",
  projectId: "mobiletracker-5044e",
  storageBucket: "mobiletracker-5044e.firebasestorage.app",
  messagingSenderId: "477780655230",
  appId: "1:477780655230:web:536d07465b3309ef6dec2f",
  measurementId: "G-407W62VM70"
};

// ---------- Firebase Imports ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getDatabase,
  ref,
  runTransaction,
  onValue,
  push,
  set,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------- Helpers ----------
function sanitizeKey(name) {
  return name ? String(name).replace(/[.#$\[\]\/]/g, "_") : "unknown";
}

function getFilenameFromAnchor(a) {
  if (!a) return null;
  const explicit = a.getAttribute("data-download-id") || a.getAttribute("data-download-name");
  if (explicit) return explicit;
  const dl = a.getAttribute("download");
  if (dl) return dl;
  try {
    const url = new URL(a.href, location.href);
    return url.pathname.split("/").filter(Boolean).pop() || null;
  } catch {
    return null;
  }
}

function formatWhen(date = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day}/${month}/${year} - ${hours}:${minutes}${ampm}`;
}

function getDeviceName() {
  try {
    if (navigator.userAgentData && navigator.userAgentData.brands) {
      const uaData = navigator.userAgentData;
      const platform = uaData.platform || navigator.platform || "Unknown";
      const brand = (uaData.brands[0] && uaData.brands[0].brand) || "";
      return `${platform} ${brand}`.trim();
    }
  } catch {}
  const ua = navigator.userAgent || navigator.vendor || "Unknown";
  const paren = ua.match(/\(([^)]+)\)/);
  if (paren && paren[1]) {
    const parts = paren[1].split(";").map(s => s.trim()).filter(Boolean);
    const model = parts.find(p => /Build|Mobile|Nexus|Pixel|SM-|iPhone|iPad|Android/i.test(p));
    if (model) return model;
    return parts.join(" / ");
  }
  return `${navigator.platform || "Unknown platform"} - ${ua.slice(0, 60)}...`;
}

// ---------- Firebase Operations ----------
async function incrementDownloadCount(safeKey) {
  const countRef = ref(db, `downloads/${safeKey}/count`);
  return runTransaction(countRef, current => (current || 0) + 1);
}

async function recordDownloadEvent(safeKey, filename) {
  try {
    const eventsRef = ref(db, `downloads/${safeKey}/events`);
    const newRef = push(eventsRef);
    await set(newRef, {
      filename,
      page: location.pathname + location.search,
      ua: navigator.userAgent,
      device: getDeviceName(),
      when: formatWhen(new Date())
    });
  } catch (err) {
    console.warn("recordDownloadEvent failed:", err);
  }
}

// ---------- Cooldown ----------
const cooldownMap = new Map();
function isOnCooldown(safeKey) {
  const t = cooldownMap.get(safeKey);
  return t && Date.now() < t;
}
function startCooldown(safeKey, seconds = COOLDOWN_SECONDS) {
  const until = Date.now() + seconds * 1000;
  cooldownMap.set(safeKey, until);
  setTimeout(() => {
    const cur = cooldownMap.get(safeKey);
    if (cur && cur <= Date.now()) cooldownMap.delete(safeKey);
  }, seconds * 1000 + 200);
}

// ---------- Live Sum ----------
const trackedSafeKeys = TRACK_FILES.map(sanitizeKey);
const liveValues = new Map();

function updateSumInDOM() {
  const el = document.getElementById(COUNT_ELEMENT_ID);
  if (!el) return;
  let sum = 0;
  for (const k of trackedSafeKeys) sum += Number(liveValues.get(k) || 0);
  el.textContent = String(sum);
}

function bindLiveSum() {
  trackedSafeKeys.forEach(safe => {
    const countRef = ref(db, `downloads/${safe}/count`);
    onValue(countRef, snap => {
      const v = snap.val();
      liveValues.set(safe, (v === null || v === undefined) ? 0 : Number(v));
      updateSumInDOM();
    }, err => console.error("onValue error for", safe, err));
  });
}

// ---------- Click Handler ----------
function handleClick(ev) {
  if (ev.button !== 0) return;
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

  let el = ev.target;
  while (el && el !== document && el.tagName !== "A") el = el.parentElement;
  if (!el || el.tagName !== "A") return;

  const a = el;
  if (!(a.classList.contains("btn") && (a.classList.contains("primary") || a.classList.contains("outline")))) return;

  const href = a.getAttribute("href") || "";
  const dataId = a.getAttribute("data-download-id") || a.getAttribute("data-download-name") || "";
  const inferred = getFilenameFromAnchor(a);

  let matchedFile = null;
  for (const f of TRACK_FILES) {
    if (dataId === f || inferred === f || href.includes(f)) {
      matchedFile = f;
      break;
    }
  }
  if (!matchedFile) return;

  ev.preventDefault();
  const safe = sanitizeKey(matchedFile);

  if (isOnCooldown(safe)) {
    navigateToHref(a, href);
    return;
  }

  startCooldown(safe);
  incrementDownloadCount(safe)
    .then(res => {
      if (res?.committed) ;
    })
    .catch(err => console.error("[download-counter-multi] increment error:", err));

  recordDownloadEvent(safe, matchedFile).catch(() => {});
  navigateToHref(a, href);
}

function navigateToHref(a, href) {
  try {
    const full = new URL(href, location.href).toString();
    if (a.target && a.target.toLowerCase() === "_blank") window.open(full, "_blank");
    else setTimeout(() => location.assign(full), 25);
  } catch (e) {
    console.error("navigate fallback:", e);
    try { a.click(); } catch {}
  }
}

// ---------- Init ----------
document.addEventListener("click", handleClick, { passive: false });
window.addEventListener("DOMContentLoaded", () => {
  bindLiveSum();
  updateSumInDOM();
   console.log("Made By Akash");
});

// ---------- Debug Helper ----------
window.__downloadCounterMulti = {
  TRACK_FILES,
  COUNT_ELEMENT_ID,
  sanitizeKey,
  liveValues
};
