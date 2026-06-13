import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// ── Firebase init ────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const REF = doc(db, "liga", "data");

// ── Default state ────────────────────────────────────────────
const DEFAULT = {
  settings: {
    startDate:      "",
    startTime:      "18:00",
    spielerPassword:"",
    dayPriority:    ["Freitag","Samstag","Donnerstag","Mittwoch","Dienstag","Montag","Sonntag"]
  },
  teams: {
    team1: { name: "Team A", players: Array(8).fill("") },
    team2: { name: "Team B", players: Array(8).fill("") }
  },
  doubles: {
    team1: [["",""],["",""],["",""],["",""]],
    team2: [["",""],["",""],["",""],["",""]]
  },
  schedule:          [],
  matchAssignments:  {}
};

// ── Live state (merged from Firestore) ──────────────────────
let S = JSON.parse(JSON.stringify(DEFAULT));
let currentUser = null;
let currentView = "login";
let dragSrc     = null;
let unsubscribe = null;

// ── Firestore helpers ────────────────────────────────────────
async function pushToFirestore() {
  try {
    await setDoc(REF, {
      settings:         S.settings,
      teams:            S.teams,
      doubles:          S.doubles,
      schedule:         S.schedule,
      matchAssignments: S.matchAssignments
    });
  } catch (e) {
    showToast("⚠ Speichern fehlgeschlagen: " + e.message, true);
  }
}

function startListener() {
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(REF, snap => {
    if (snap.exists()) {
      const d = snap.data();
      S.settings         = { ...DEFAULT.settings,         ...(d.settings         || {}) };
      S.teams            = { ...DEFAULT.teams,             ...(d.teams            || {}) };
      S.doubles          = { ...DEFAULT.doubles,           ...(d.doubles          || {}) };
      S.schedule         = d.schedule         || [];
      S.matchAssignments = d.matchAssignments || {};
    }
    render();
  }, err => {
    showToast("⚠ Verbindungsfehler: " + err.message, true);
  });
}

// ── Routing ──────────────────────────────────────────────────
function setView(v) { currentView = v; render(); }

function render() {
  const views = {
    login:       renderLogin,
    admin:       renderAdmin,
    admin_plan:  renderAdminPlan,
    spieler_plan:renderSpielerPlan,
    spiele:      renderSpiele
  };
  (views[currentView] || renderLogin)();
}

// ── Helpers ──────────────────────────────────────────────────
function getPlayDays() {
  if (!S.settings.startDate) return [];
  const start = new Date(S.settings.startDate);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + 2 + i);
    return d;
  });
}

function getDayName(d) {
  return ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"][d.getDay()];
}

function fmt(d) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function fmtFull(d) {
  return d.toLocaleDateString("de-DE", { weekday:"long", day:"2-digit", month:"2-digit", year:"numeric" });
}

function sortDays(days) {
  const prio = S.settings.dayPriority;
  return [...days].sort((a, b) => {
    const ai = prio.indexOf(getDayName(a));
    const bi = prio.indexOf(getDayName(b));
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
}

function buildMatches() {
  const t1 = S.teams.team1, t2 = S.teams.team2;
  const matches = [];
  for (let i = 0; i < 8; i++) {
    matches.push({
      id: `E${i+1}`, type: "Einzel",
      p1: t1.players[i] || `Spieler ${i+1}`,
      p2: t2.players[i] || `Spieler ${i+1}`,
      t1: t1.name, t2: t2.name
    });
  }
  for (let i = 0; i < 4; i++) {
    const d1 = S.doubles.team1[i], d2 = S.doubles.team2[i];
    matches.push({
      id: `D${i+1}`, type: "Doppel",
      p1: [d1[0]||`S${2*i+1}`, d1[1]||`S${2*i+2}`].join(" & "),
      p2: [d2[0]||`S${2*i+1}`, d2[1]||`S${2*i+2}`].join(" & "),
      t1: t1.name, t2: t2.name
    });
  }
  return matches;
}

function showToast(msg, isError = false) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.className = "toast" + (isError ? " toast-err" : "");
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = "0"; }, 2800);
}

function header(tab) {
  const isAdmin = currentUser === "admin";
  return `
  <header class="topbar">
    <div class="topbar-brand">
      <span class="brand-icon">🍺</span>
      <span class="brand-name">Beerpong Liga</span>
    </div>
    <nav class="topbar-nav">
      ${isAdmin ? `<button class="nav-btn ${tab==="einstellungen"?"active":""}" onclick="setView('admin')">Einstellungen</button>` : ""}
      <button class="nav-btn ${tab==="spielplan"?"active":""}" onclick="setView(currentUser==='admin'?'admin_plan':'spieler_plan')">Spielplan</button>
      <button class="nav-btn ${tab==="spiele"?"active":""}" onclick="setView('spiele')">Alle Spiele</button>
    </nav>
    <div class="topbar-user">
      <span class="user-name">${currentUser}</span>
      <button class="btn btn-ghost btn-sm" onclick="logout()">Abmelden</button>
    </div>
  </header>`;
}

function logout() {
  currentUser = null;
  setView("login");
}

// ── Login ────────────────────────────────────────────────────
let loginRole = null; // "admin" | "spieler"

function renderLogin() {
  document.getElementById("root").innerHTML = `
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-logo">🍺</div>
      <h1 class="login-title">Beerpong Liga</h1>
      <p class="login-sub">Wer bist du?</p>

      <div class="role-picker" id="role-picker">
        <button class="role-btn" id="role-admin" onclick="selectRole('admin')">
          <span class="role-icon">🔧</span>
          <span class="role-label">Admin</span>
        </button>
        <button class="role-btn" id="role-spieler" onclick="selectRole('spieler')">
          <span class="role-icon">🏓</span>
          <span class="role-label">Spieler</span>
        </button>
      </div>

      <div id="pw-section" style="display:none">
        <div class="field">
          <label for="lp" id="pw-label">Passwort</label>
          <input id="lp" type="password" placeholder="Passwort eingeben"
            autocomplete="current-password"
            onkeydown="if(event.key==='Enter')doLogin()" />
        </div>
        <p class="err-msg" id="lerr" style="display:none">Falsches Passwort.</p>
        <button class="btn btn-primary btn-full" onclick="doLogin()">Anmelden</button>
      </div>
    </div>
  </div>`;
  if (loginRole) selectRole(loginRole);
}

function selectRole(role) {
  loginRole = role;
  document.querySelectorAll(".role-btn").forEach(b => b.classList.remove("role-active"));
  document.getElementById("role-" + role).classList.add("role-active");
  document.getElementById("pw-section").style.display = "block";
  document.getElementById("pw-label").textContent = role === "admin" ? "Admin-Passwort" : "Spieler-Passwort";
  document.getElementById("lp").focus();
}

function doLogin() {
  const p   = document.getElementById("lp").value;
  const err = document.getElementById("lerr");
  if (loginRole === "admin" && p === "morgakunz7") {
    currentUser = "admin"; startListener(); setView("admin");
  } else if (loginRole === "spieler" && S.settings.spielerPassword && p === S.settings.spielerPassword) {
    currentUser = "Spieler"; startListener(); setView("spieler_plan");
  } else {
    err.style.display = "block";
  }
}

// ── Admin: Einstellungen ─────────────────────────────────────
function renderAdmin() {
  const s  = S.settings;
  const t1 = S.teams.team1, t2 = S.teams.team2;
  const d1 = S.doubles.team1, d2 = S.doubles.team2;

  let startNote = "";
  if (s.startDate) {
    const d3 = new Date(s.startDate);
    d3.setDate(d3.getDate() + 2);
    startNote = `<div class="notice">Spieltage starten ab <strong>${fmtFull(d3)}</strong> (Tag 3). Insgesamt 12 Spieltage verfügbar.</div>`;
  }

  document.getElementById("root").innerHTML = `
  ${header("einstellungen")}
  <main class="content">

    <section class="card">
      <h2 class="card-title">⚙️ Allgemeine Einstellungen</h2>
      <div class="field-row">
        <label>Passwort für "Spieler"</label>
        <input id="spw" type="text" value="${s.spielerPassword}" placeholder="Passwort festlegen" />
      </div>
      <div class="field-row">
        <label>Aktuelles Passwort</label>
        <div class="pw-display">
          ${s.spielerPassword
            ? `<span class="pw-value" id="pw-shown">${s.spielerPassword}</span>`
            : `<span class="pw-empty">Noch kein Passwort gesetzt</span>`}
        </div>
      </div>
      <div class="field-row">
        <label>Startdatum</label>
        <input id="sd" type="date" value="${s.startDate}" />
      </div>
      <div class="field-row">
        <label>Startuhrzeit</label>
        <input id="st" type="time" value="${s.startTime}" />
      </div>
      ${startNote}
      <button class="btn btn-primary" onclick="saveSettings()">Speichern</button>
    </section>

    <section class="card">
      <h2 class="card-title">📅 Tagespriorisierung</h2>
      <p class="card-desc">Ziehe die Wochentage in die gewünschte Reihenfolge. Ganz oben = höchste Priorität bei der Spieltagsplanung.</p>
      <div id="priolist" class="prio-list">
        ${s.dayPriority.map((day, i) => `
        <div class="prio-row" draggable="true" data-idx="${i}"
          ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropDay(event)">
          <span class="prio-handle">⠿</span>
          <span class="prio-label">${day}</span>
          <span class="prio-rank">#${i+1}</span>
        </div>`).join("")}
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="savePrio()">Reihenfolge speichern</button>
    </section>

    <section class="card">
      <h2 class="card-title">👥 Teams & Spieler</h2>
      <div class="teams-grid">
        <div class="team-col">
          <div class="team-header">
            <span class="tag tag-blue">Team 1</span>
            <input id="tn1" type="text" value="${t1.name}" placeholder="Teamname" />
          </div>
          ${t1.players.map((p, i) => `
          <div class="player-row">
            <span class="player-num">${i+1}</span>
            <input class="p1" data-i="${i}" type="text" value="${p}" placeholder="Spieler ${i+1}" />
          </div>`).join("")}
        </div>
        <div class="team-col">
          <div class="team-header">
            <span class="tag tag-green">Team 2</span>
            <input id="tn2" type="text" value="${t2.name}" placeholder="Teamname" />
          </div>
          ${t2.players.map((p, i) => `
          <div class="player-row">
            <span class="player-num">${i+1}</span>
            <input class="p2" data-i="${i}" type="text" value="${p}" placeholder="Spieler ${i+1}" />
          </div>`).join("")}
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="savePlayers()">Spieler speichern</button>
    </section>

    <section class="card">
      <h2 class="card-title">🤝 Doppelaufstellung</h2>
      <div class="teams-grid">
        <div class="team-col">
          <div class="team-header"><span class="tag tag-blue">${t1.name}</span></div>
          ${[0,1,2,3].map(i => `
          <div class="double-block">
            <div class="double-label"><span class="tag tag-blue">D${i+1}</span></div>
            <div class="double-inputs">
              <input class="d1a" data-i="${i}" type="text" value="${d1[i][0]}" placeholder="Spieler A" />
              <input class="d1b" data-i="${i}" type="text" value="${d1[i][1]}" placeholder="Spieler B" />
            </div>
          </div>`).join("")}
        </div>
        <div class="team-col">
          <div class="team-header"><span class="tag tag-green">${t2.name}</span></div>
          ${[0,1,2,3].map(i => `
          <div class="double-block">
            <div class="double-label"><span class="tag tag-green">D${i+1}</span></div>
            <div class="double-inputs">
              <input class="d2a" data-i="${i}" type="text" value="${d2[i][0]}" placeholder="Spieler A" />
              <input class="d2b" data-i="${i}" type="text" value="${d2[i][1]}" placeholder="Spieler B" />
            </div>
          </div>`).join("")}
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="saveDoubles()">Doppel speichern</button>
    </section>

  </main>`;
}

function saveSettings() {
  S.settings.spielerPassword = document.getElementById("spw").value;
  S.settings.startDate       = document.getElementById("sd").value;
  S.settings.startTime       = document.getElementById("st").value;
  pushToFirestore().then(() => showToast("Einstellungen gespeichert ✓"));
}

function dragStart(e) { dragSrc = parseInt(e.currentTarget.dataset.idx); }
function dragOver(e)  { e.preventDefault(); }
function dropDay(e) {
  e.preventDefault();
  const target = parseInt(e.currentTarget.dataset.idx);
  if (dragSrc === null || dragSrc === target) return;
  const arr  = S.settings.dayPriority;
  const item = arr.splice(dragSrc, 1)[0];
  arr.splice(target, 0, item);
  dragSrc = null;
  renderAdmin();
}
function savePrio() {
  pushToFirestore().then(() => showToast("Priorisierung gespeichert ✓"));
}

function savePlayers() {
  S.teams.team1.name = document.getElementById("tn1").value || "Team A";
  S.teams.team2.name = document.getElementById("tn2").value || "Team B";
  document.querySelectorAll(".p1").forEach(el => { S.teams.team1.players[+el.dataset.i] = el.value; });
  document.querySelectorAll(".p2").forEach(el => { S.teams.team2.players[+el.dataset.i] = el.value; });
  pushToFirestore().then(() => showToast("Spieler gespeichert ✓"));
}

function saveDoubles() {
  document.querySelectorAll(".d1a").forEach(el => { S.doubles.team1[+el.dataset.i][0] = el.value; });
  document.querySelectorAll(".d1b").forEach(el => { S.doubles.team1[+el.dataset.i][1] = el.value; });
  document.querySelectorAll(".d2a").forEach(el => { S.doubles.team2[+el.dataset.i][0] = el.value; });
  document.querySelectorAll(".d2b").forEach(el => { S.doubles.team2[+el.dataset.i][1] = el.value; });
  pushToFirestore().then(() => showToast("Doppel gespeichert ✓"));
}

// ── Admin: Spielplan ─────────────────────────────────────────
function renderAdminPlan() {
  const pdays   = getPlayDays();
  const sorted  = sortDays(pdays);
  const matches = buildMatches();
  const sel     = S.schedule;

  if (!S.settings.startDate) {
    document.getElementById("root").innerHTML = `
    ${header("spielplan")}
    <main class="content">
      <div class="card">
        <p class="empty-state">⚠️ Bitte zuerst ein Startdatum in den Einstellungen festlegen.</p>
      </div>
    </main>`;
    return;
  }

  document.getElementById("root").innerHTML = `
  ${header("spielplan")}
  <main class="content">

    <section class="card">
      <h2 class="card-title">📅 Spieltage auswählen</h2>
      <p class="card-desc">Start: <strong>${S.settings.startDate}</strong> · Uhrzeit: <strong>${S.settings.startTime} Uhr</strong> · Tage nach Priorität sortiert</p>
      <div class="days-grid">
        ${sorted.map(d => {
          const ds    = d.toISOString().slice(0, 10);
          const isSel = sel.includes(ds);
          return `<div class="day-tile ${isSel ? "day-sel" : "day-avail"}" onclick="toggleDay('${ds}')" title="${fmtFull(d)}">
            <span class="day-wd">${getDayName(d).slice(0,2)}</span>
            <span class="day-dt">${fmt(d)}</span>
            ${isSel ? '<span class="day-check">✓</span>' : ""}
          </div>`;
        }).join("")}
      </div>
      <p class="days-count">${sel.length} / 12 Spieltage ausgewählt</p>
    </section>

    <section class="card">
      <h2 class="card-title">🗓 Spielzuordnung</h2>
      <p class="card-desc">Weise jedem Spiel einen der ausgewählten Spieltage zu.</p>
      <div class="match-list">
        ${matches.map(m => `
        <div class="match-row">
          <span class="tag ${m.type==="Einzel"?"tag-blue":"tag-green"}">${m.id}</span>
          <span class="match-players">${m.p1} <em>vs</em> ${m.p2}</span>
          <select class="match-select" onchange="assignDay('${m.id}', this.value)">
            <option value="">– kein Tag –</option>
            ${sel.map(ds => {
              const d = new Date(ds);
              return `<option value="${ds}" ${S.matchAssignments[m.id]===ds?"selected":""}>${getDayName(d).slice(0,2)} ${fmt(d)}</option>`;
            }).join("")}
          </select>
        </div>`).join("")}
      </div>
    </section>

  </main>`;
}

function toggleDay(ds) {
  const i = S.schedule.indexOf(ds);
  if (i >= 0) S.schedule.splice(i, 1);
  else if (S.schedule.length < 12) S.schedule.push(ds);
  pushToFirestore().then(() => renderAdminPlan());
}

function assignDay(matchId, day) {
  if (day) S.matchAssignments[matchId] = day;
  else delete S.matchAssignments[matchId];
  pushToFirestore();
}

// ── Spieler: Spielplan ───────────────────────────────────────
function renderSpielerPlan() {
  const matches = buildMatches();
  const byDay   = {};
  Object.entries(S.matchAssignments).forEach(([mid, ds]) => {
    if (!byDay[ds]) byDay[ds] = [];
    byDay[ds].push(mid);
  });
  const days = Object.keys(byDay).sort();

  document.getElementById("root").innerHTML = `
  ${header("spielplan")}
  <main class="content">
    <section class="card">
      <h2 class="card-title">📅 Spielplan</h2>
      ${days.length === 0
        ? `<p class="empty-state">Noch kein Spielplan veröffentlicht.</p>`
        : days.map(ds => {
            const d = new Date(ds);
            const dayMatches = byDay[ds].map(mid => matches.find(m => m.id === mid)).filter(Boolean);
            return `
            <div class="day-block">
              <div class="day-block-header">${fmtFull(d)} · ${S.settings.startTime} Uhr</div>
              ${dayMatches.map(m => `
              <div class="match-row">
                <span class="tag ${m.type==="Einzel"?"tag-blue":"tag-green"}">${m.id}</span>
                <span class="match-players">${m.p1} <em>vs</em> ${m.p2}</span>
                <span class="tag tag-gray">${m.type}</span>
              </div>`).join("")}
            </div>`;
          }).join("")}
    </section>
  </main>`;
}

// ── Alle Spiele ──────────────────────────────────────────────
function renderSpiele() {
  const matches = buildMatches();
  const singles = matches.filter(m => m.type === "Einzel");
  const doubles = matches.filter(m => m.type === "Doppel");

  function matchTable(list) {
    return `
    <table class="match-table">
      <thead>
        <tr><th>#</th><th>${S.teams.team1.name}</th><th></th><th>${S.teams.team2.name}</th><th>Datum</th></tr>
      </thead>
      <tbody>
        ${list.map(m => {
          const ds = S.matchAssignments[m.id];
          const d  = ds ? new Date(ds) : null;
          return `<tr>
            <td><span class="tag ${m.type==="Einzel"?"tag-blue":"tag-green"}">${m.id}</span></td>
            <td>${m.p1}</td>
            <td class="vs-cell">vs</td>
            <td>${m.p2}</td>
            <td class="date-cell">${d ? getDayName(d).slice(0,2)+". "+fmt(d) : "–"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
  }

  document.getElementById("root").innerHTML = `
  ${header("spiele")}
  <main class="content">
    <section class="card">
      <h2 class="card-title">🏆 Einzel (E1–E8)</h2>
      ${matchTable(singles)}
    </section>
    <section class="card">
      <h2 class="card-title">🤝 Doppel (D1–D4)</h2>
      ${matchTable(doubles)}
    </section>
  </main>`;
}

// ── Expose to window (called from inline onclick) ────────────
Object.assign(window, {
  setView, doLogin, logout, selectRole,
  saveSettings, savePrio, savePlayers, saveDoubles,
  dragStart, dragOver, dropDay,
  toggleDay, assignDay,
  currentUser: () => currentUser
});

// ── Boot ─────────────────────────────────────────────────────
render();
