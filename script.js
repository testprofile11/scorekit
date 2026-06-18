const screens = [...document.querySelectorAll(".screen")];
const tabs = [...document.querySelectorAll(".tab")];
const backButton = document.querySelector("#back-button");

const defaults = {
  groups: [
    { id: "group-1", name: "Saturday Open Gym", organizer: "You" }
  ],
  selectedGroupId: "group-1",
  players: [
    { name: "Mia", roles: ["player", "organizer"] },
    { name: "Noah", roles: ["player"] },
    { name: "Ava", roles: ["player"] },
    { name: "Liam", roles: ["player"] }
  ],
  matches: [
    { groupId: "group-1", sport: "pickleball", a: "Mia", b: "Noah", scoreA: 11, scoreB: 8, winner: "Mia", date: "2026-06-12T10:30:00" },
    { groupId: "group-1", sport: "badminton", a: "Ava", b: "Liam", scoreA: 18, scoreB: 21, winner: "Liam", date: "2026-06-13T18:10:00" },
    { groupId: "group-1", sport: "basketball", a: "Mia", b: "Ava", scoreA: 32, scoreB: 27, winner: "Mia", date: "2026-06-14T15:45:00" }
  ]
};

const state = {
  selectedSport: "basketball",
  selectedGroupId: null,
  leaderboardFilter: "all",
  history: ["dashboard"],
  activeMatch: null,
  pointStack: [],
  data: loadData()
};

function loadData() {
  const stored = localStorage.getItem("scorekit-data");
  const data = stored ? JSON.parse(stored) : structuredClone(defaults);
  const normalized = normalizeData(data);
  localStorage.setItem("scorekit-data", JSON.stringify(normalized));
  return normalized;
}

function saveData() {
  state.data.selectedGroupId = state.selectedGroupId;
  localStorage.setItem("scorekit-data", JSON.stringify(state.data));
}

function normalizeData(data) {
  const normalized = { ...structuredClone(defaults), ...data };
  if (!Array.isArray(normalized.groups) || !normalized.groups.length) {
    normalized.groups = structuredClone(defaults.groups);
  }
  if (!normalized.selectedGroupId || !normalized.groups.some((group) => group.id === normalized.selectedGroupId)) {
    normalized.selectedGroupId = normalized.groups[0].id;
  }
  normalized.matches = (normalized.matches || []).map((match) => ({
    ...match,
    groupId: match.groupId || normalized.selectedGroupId
  }));
  normalized.players = normalizePlayers(normalized.players);
  normalized.groups.forEach((group) => upsertPlayer(normalized.players, group.organizer, ["organizer"]));
  return normalized;
}

state.selectedGroupId = state.data.selectedGroupId;

function normalizePlayers(players) {
  if (!Array.isArray(players)) return [];
  return players
    .map((player) => {
      if (typeof player === "string") return { name: player, roles: ["player"] };
      return {
        name: cleanName(player.name || ""),
        roles: normalizeRoles(player.roles)
      };
    })
    .filter((player) => player.name);
}

function normalizeRoles(roles) {
  const values = Array.isArray(roles) ? roles : ["player"];
  const clean = values.filter((role) => role === "player" || role === "organizer");
  return [...new Set(clean.length ? clean : ["player"])];
}

function roleValueToRoles(value) {
  if (value === "organizer") return ["organizer"];
  if (value === "both") return ["organizer", "player"];
  return ["player"];
}

function roleLabel(roles) {
  const normalized = normalizeRoles(roles);
  if (normalized.includes("organizer") && normalized.includes("player")) return "Organizer + Player";
  if (normalized.includes("organizer")) return "Organizer";
  return "Player";
}

function upsertPlayer(players, name, roles = ["player"]) {
  const cleaned = cleanName(name);
  if (!cleaned) return;
  const existing = players.find((player) => player.name.toLowerCase() === cleaned.toLowerCase());
  if (existing) {
    existing.roles = normalizeRoles([...existing.roles, ...roles]);
    return;
  }
  players.push({ name: cleaned, roles: normalizeRoles(roles) });
}

function goTo(screenId, push = true) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === screenId));
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.go === screenId));
  if (push && state.history[state.history.length - 1] !== screenId) state.history.push(screenId);
  backButton.hidden = state.history.length <= 1;
  render();
}

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => goTo(button.dataset.go));
});

backButton.addEventListener("click", () => {
  if (state.history.length <= 1) return;
  state.history.pop();
  goTo(state.history[state.history.length - 1], false);
});

document.querySelector("#reset-demo").addEventListener("click", () => {
  state.data = structuredClone(defaults);
  state.selectedGroupId = state.data.selectedGroupId;
  saveData();
  render();
});

document.querySelectorAll(".sport-card").forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedSport = button.dataset.sport;
    const defaultTargets = { basketball: 21, pickleball: 11, badminton: 21 };
    document.querySelector("#target-score").value = defaultTargets[state.selectedSport];
    document.querySelectorAll(".sport-card").forEach((card) => card.classList.toggle("selected", card === button));
  });
});

document.querySelector("#match-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const playerA = cleanName(document.querySelector("#player-a").value);
  const playerB = cleanName(document.querySelector("#player-b").value);
  if (!playerA || !playerB || playerA.toLowerCase() === playerB.toLowerCase()) return;
  addPlayer(playerA);
  addPlayer(playerB);
  state.activeMatch = {
    groupId: state.selectedGroupId,
    sport: state.selectedSport,
    a: playerA,
    b: playerB,
    scoreA: 0,
    scoreB: 0,
    target: Number(document.querySelector("#target-score").value) || 21
  };
  state.pointStack = [];
  saveData();
  updateScoreboard();
  goTo("scoreboard");
});

document.querySelectorAll(".score-actions button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.activeMatch) return;
    const key = button.dataset.side === "a" ? "scoreA" : "scoreB";
    const delta = Number(button.dataset.delta);
    const before = state.activeMatch[key];
    state.activeMatch[key] = Math.max(0, state.activeMatch[key] + delta);
    if (before !== state.activeMatch[key]) state.pointStack.push({ key, before });
    updateScoreboard();
  });
});

document.querySelector("#undo-point").addEventListener("click", () => {
  const last = state.pointStack.pop();
  if (!last || !state.activeMatch) return;
  state.activeMatch[last.key] = last.before;
  updateScoreboard();
});

document.querySelector("#reset-score").addEventListener("click", () => {
  if (!state.activeMatch) return;
  state.activeMatch.scoreA = 0;
  state.activeMatch.scoreB = 0;
  state.pointStack = [];
  updateScoreboard();
});

document.querySelector("#swap-sides").addEventListener("click", () => {
  if (!state.activeMatch) return;
  [state.activeMatch.a, state.activeMatch.b] = [state.activeMatch.b, state.activeMatch.a];
  [state.activeMatch.scoreA, state.activeMatch.scoreB] = [state.activeMatch.scoreB, state.activeMatch.scoreA];
  state.pointStack = [];
  updateScoreboard();
});

document.querySelector("#finish-match").addEventListener("click", () => {
  if (!state.activeMatch) return;
  const match = state.activeMatch;
  if (match.scoreA === match.scoreB) {
    document.querySelector("#match-status").textContent = "A match cannot end in a tie. Add one more point.";
    return;
  }
  match.winner = match.scoreA > match.scoreB ? match.a : match.b;
  match.date = new Date().toISOString();
  state.data.matches.unshift({
    groupId: match.groupId,
    sport: match.sport,
    a: match.a,
    b: match.b,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winner: match.winner,
    date: match.date
  });
  saveData();
  document.querySelector("#winner-name").textContent = `${match.winner} wins`;
  document.querySelector("#result-copy").textContent = `${titleCase(match.sport)} final saved. All-time win/loss is updated.`;
  document.querySelector("#result-score").textContent = `${match.scoreA} - ${match.scoreB}`;
  state.activeMatch = null;
  goTo("result");
});

document.querySelector("#add-player-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#new-player-name");
  const roleSelect = document.querySelector("#new-player-role");
  addPlayer(input.value, roleValueToRoles(roleSelect.value));
  input.value = "";
  saveData();
  render();
});

document.querySelector("#add-group-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const groupName = cleanName(document.querySelector("#group-name").value);
  const organizerName = cleanName(document.querySelector("#organizer-name").value);
  if (!groupName || !organizerName) return;
  const group = {
    id: `group-${Date.now()}`,
    name: groupName,
    organizer: organizerName
  };
  state.data.groups.push(group);
  addPlayer(organizerName, ["organizer"]);
  state.selectedGroupId = group.id;
  document.querySelector("#group-name").value = "";
  document.querySelector("#organizer-name").value = "";
  saveData();
  render();
});

document.querySelector("#groups-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-group-id]");
  if (!button) return;
  state.selectedGroupId = button.dataset.groupId;
  saveData();
  render();
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    state.leaderboardFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
    renderLeaderboard();
  });
});

function cleanName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function addPlayer(name, roles = ["player"]) {
  upsertPlayer(state.data.players, name, roles);
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function activeGroup() {
  return state.data.groups.find((group) => group.id === state.selectedGroupId) || state.data.groups[0];
}

function groupMatches() {
  return state.data.matches.filter((match) => match.groupId === activeGroup().id);
}

function getRecords(filter = "all") {
  const records = new Map(state.data.players.map((player) => [player.name, { name: player.name, roles: player.roles, wins: 0, losses: 0, games: 0 }]));
  groupMatches()
    .filter((match) => filter === "all" || match.sport === filter)
    .forEach((match) => {
      [match.a, match.b].forEach((player) => {
        if (!records.has(player)) records.set(player, { name: player, roles: ["player"], wins: 0, losses: 0, games: 0 });
      });
      const loser = match.winner === match.a ? match.b : match.a;
      records.get(match.winner).wins += 1;
      records.get(match.winner).games += 1;
      records.get(loser).losses += 1;
      records.get(loser).games += 1;
    });
  return [...records.values()].sort((a, b) => {
    const rateA = a.games ? a.wins / a.games : 0;
    const rateB = b.games ? b.wins / b.games : 0;
    return rateB - rateA || b.wins - a.wins || a.name.localeCompare(b.name);
  });
}

function getPlayerRecord(name, filter = "all") {
  return getRecords(filter).find((record) => record.name.toLowerCase() === name.toLowerCase()) || {
    name,
    wins: 0,
    losses: 0,
    games: 0
  };
}

function render() {
  renderGroupContext();
  renderDashboard();
  renderAllTime();
  renderGroups();
  renderPlayers();
  renderHistory();
  renderLeaderboard();
}

function renderGroupContext() {
  const group = activeGroup();
  const organizer = state.data.players.find((player) => player.name.toLowerCase() === group.organizer.toLowerCase());
  document.querySelector("#current-group-name").textContent = group.name;
  document.querySelector("#current-group-organizer").textContent = `Organizer: ${group.organizer}${organizer ? ` · ${roleLabel(organizer.roles)}` : ""}`;
  document.querySelector("#match-group-name").textContent = group.name;
}

function renderDashboard() {
  const records = getRecords();
  const top = records.find((record) => record.games > 0);
  const matches = groupMatches();
  document.querySelector("#total-games").textContent = matches.length;
  document.querySelector("#total-players").textContent = state.data.players.filter((player) => player.roles.includes("player")).length;
  document.querySelector("#top-player").textContent = top ? top.name : "-";
  renderMatches(document.querySelector("#recent-list"), matches.slice(0, 3));
}

function renderAllTime() {
  const list = document.querySelector("#all-time-list");
  const records = getRecords("all").filter((record) => record.games > 0);
  if (!records.length) {
    list.innerHTML = `<div class="empty-state">All-time win/loss appears after the first saved match.</div>`;
    return;
  }
  list.innerHTML = records.map((record, index) => recordRow(record, index)).join("");
}

function renderPlayers() {
  const list = document.querySelector("#players-list");
  const records = getRecords("all");
  if (!records.length) {
    list.innerHTML = `<div class="empty-state">Add players to start tracking records.</div>`;
    return;
  }
  list.innerHTML = records.map((record, index) => recordRow(record, index)).join("");
}

function renderGroups() {
  const list = document.querySelector("#groups-list");
  list.innerHTML = state.data.groups.map((group) => {
    const isActive = group.id === state.selectedGroupId;
    const totalGames = state.data.matches.filter((match) => match.groupId === group.id).length;
    return `
      <article class="group-row ${isActive ? "active" : ""}">
        <div>
          <small>${isActive ? "Active group" : "Group"}</small>
          <strong>${group.name}</strong>
          <span>Organizer: ${group.organizer} · ${totalGames} games</span>
        </div>
        <button type="button" data-group-id="${group.id}">${isActive ? "Selected" : "Use"}</button>
      </article>
    `;
  }).join("");
}

function renderHistory() {
  renderMatches(document.querySelector("#history-list"), groupMatches());
}

function renderLeaderboard() {
  const list = document.querySelector("#leaderboard-list");
  const records = getRecords(state.leaderboardFilter).filter((record) => record.games > 0);
  if (!records.length) {
    list.innerHTML = `<div class="empty-state">No completed ${state.leaderboardFilter === "all" ? "" : titleCase(state.leaderboardFilter)} matches yet.</div>`;
    return;
  }
  list.innerHTML = records.map((record, index) => recordRow(record, index)).join("");
}

function recordRow(record, index) {
  const rate = record.games ? Math.round((record.wins / record.games) * 100) : 0;
  return `
    <article class="leader-row">
      <div class="rank">${index + 1}</div>
      <div><strong>${record.name}</strong><em>${roleLabel(record.roles)}</em><span>Overall: ${record.wins} wins / ${record.losses} losses · ${record.games} games</span></div>
      <div class="leader-score">${rate}%<small>Win rate</small></div>
    </article>
  `;
}

function renderMatches(container, matches) {
  if (!matches.length) {
    container.innerHTML = `<div class="empty-state">No matches yet. Start a new game and the result will appear here.</div>`;
    return;
  }
  container.innerHTML = matches.map((match) => {
    const date = new Date(match.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `
      <article class="match-item">
        <div>
          <small>${titleCase(match.sport)} · ${date}</small>
          <strong>${match.winner} won</strong>
          <span>${match.a} vs ${match.b}</span>
        </div>
        <div class="match-score">${match.scoreA}-${match.scoreB}</div>
      </article>
    `;
  }).join("");
}

function updateScoreboard() {
  const match = state.activeMatch;
  if (!match) return;
  document.querySelector("#score-sport").textContent = titleCase(match.sport);
  document.querySelector("#score-name-a").textContent = match.a;
  document.querySelector("#score-name-b").textContent = match.b;
  document.querySelector("#score-a").textContent = match.scoreA;
  document.querySelector("#score-b").textContent = match.scoreB;
  const high = Math.max(match.scoreA, match.scoreB);
  const low = Math.min(match.scoreA, match.scoreB);
  const lead = Math.abs(match.scoreA - match.scoreB);
  const targetReached = high >= match.target;
  const winByTwo = match.sport !== "basketball";
  const validWin = targetReached && (!winByTwo || lead >= 2);
  const leader = match.scoreA === match.scoreB ? "Tied" : `${match.scoreA > match.scoreB ? match.a : match.b} leads`;
  document.querySelector("#match-status").textContent = validWin
    ? `${leader}. Ready to save result.`
    : `${leader} · Target: ${match.target}${winByTwo ? ", win by 2" : ""}`;
  updateLiveTracker(match);
}

function updateLiveTracker(match) {
  const recordA = getPlayerRecord(match.a);
  const recordB = getPlayerRecord(match.b);
  const isTied = match.scoreA === match.scoreB;
  const leaderName = isTied ? "Tied" : (match.scoreA > match.scoreB ? match.a : match.b);
  const projectionA = isTied ? "Projected: -" : `Projected: ${leaderName === match.a ? "Win" : "Loss"}`;
  const projectionB = isTied ? "Projected: -" : `Projected: ${leaderName === match.b ? "Win" : "Loss"}`;
  document.querySelector("#live-result-label").textContent = isTied ? "Tied right now" : `${leaderName} winning`;
  document.querySelector("#live-name-a").textContent = match.a;
  document.querySelector("#live-name-b").textContent = match.b;
  document.querySelector("#live-record-a").textContent = `${recordA.wins}W / ${recordA.losses}L`;
  document.querySelector("#live-record-b").textContent = `${recordB.wins}W / ${recordB.losses}L`;
  document.querySelector("#live-projection-a").textContent = projectionA;
  document.querySelector("#live-projection-b").textContent = projectionB;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

render();
