const screens = [...document.querySelectorAll(".screen")];
const tabs = [...document.querySelectorAll(".tab")];
const backButton = document.querySelector("#back-button");
const STORAGE_KEY = "j1-hoops-scorekit-data-v1";

const defaults = {
  groups: [],
  selectedGroupId: null,
  setupRole: "host",
  nextPlayerNumber: 0,
  players: [],
  matches: []
};

const state = {
  selectedSport: "basketball",
  selectedGroupId: null,
  setupRole: "host",
  leaderboardFilter: "all",
  history: ["dashboard"],
  activeMatch: null,
  timerInterval: null,
  pointStack: [],
  data: loadData()
};

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const data = stored ? JSON.parse(stored) : structuredClone(defaults);
  const normalized = normalizeData(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function saveData() {
  state.data.selectedGroupId = state.selectedGroupId;
  state.data.setupRole = state.setupRole;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function normalizeData(data) {
  const normalized = { ...structuredClone(defaults), ...data };
  if (!Array.isArray(normalized.groups)) {
    normalized.groups = [];
  }
  normalized.nextPlayerNumber = Number.isInteger(normalized.nextPlayerNumber) ? normalized.nextPlayerNumber : 0;
  normalized.groups = normalized.groups.map((group) => ({
    teams: [],
    ...group,
    teams: Array.isArray(group.teams) ? group.teams : []
  }));
  if (normalized.groups.length && (!normalized.selectedGroupId || !normalized.groups.some((group) => group.id === normalized.selectedGroupId))) {
    normalized.selectedGroupId = normalized.groups[0].id;
  }
  if (!normalized.groups.length) normalized.selectedGroupId = null;
  normalized.setupRole = normalized.setupRole === "joiner" ? "joiner" : "host";
  normalized.matches = (normalized.matches || []).map((match) => ({
    ...match,
    groupId: match.groupId || normalized.selectedGroupId
  }));
  normalized.players = normalizePlayers(normalized.players);
  normalized.players.forEach((player) => {
    if (!player.code) player.code = nextPlayerCode(normalized);
  });
  normalized.groups.forEach((group) => {
    if (group.organizer) upsertPlayer(normalized.players, group.organizer, ["organizer"]);
  });
  return normalized;
}

state.selectedGroupId = state.data.selectedGroupId;
state.setupRole = state.data.setupRole;

function normalizePlayers(players) {
  if (!Array.isArray(players)) return [];
  return players
    .map((player) => {
      if (typeof player === "string") return { code: "", name: player, roles: ["player"], teams: {} };
      return {
        code: player.code || "",
        name: cleanName(player.name || ""),
        roles: normalizeRoles(player.roles),
        teams: normalizeTeams(player.teams)
      };
    })
    .filter((player) => player.name);
}

function nextPlayerCode(data = state.data) {
  const number = data.nextPlayerNumber || 0;
  data.nextPlayerNumber = number + 1;
  return `Player#${String(number).padStart(5, "0")}`;
}

function normalizeTeams(teams) {
  if (!teams) return {};
  return Object.fromEntries(Object.entries(teams).map(([groupId, team]) => [groupId, cleanName(team)]).filter(([, team]) => team));
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

function upsertPlayer(players, name, roles = ["player"], teamName = "", groupId = state.selectedGroupId) {
  const cleaned = cleanName(name);
  if (!cleaned) return null;
  const team = cleanName(teamName);
  const existing = players.find((player) => player.name.toLowerCase() === cleaned.toLowerCase());
  if (existing) {
    existing.roles = normalizeRoles([...existing.roles, ...roles]);
    existing.teams = normalizeTeams(existing.teams);
    if (!existing.code) existing.code = nextPlayerCode();
    if (team && groupId) existing.teams[groupId] = team;
    return existing;
  }
  const player = { code: nextPlayerCode(), name: cleaned, roles: normalizeRoles(roles), teams: team && groupId ? { [groupId]: team } : {} };
  players.push(player);
  return player;
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

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.setupRole = button.dataset.mode;
    saveData();
    goTo("groups");
  });
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
  if (!activeGroup()) {
    goTo("groups");
    return;
  }
  const playerA = cleanName(document.querySelector("#player-a").value);
  const playerB = cleanName(document.querySelector("#player-b").value);
  if (!playerA || !playerB || playerA.toLowerCase() === playerB.toLowerCase()) return;
  const playerARecord = addPlayer(playerA);
  const playerBRecord = addPlayer(playerB);
  state.activeMatch = {
    groupId: state.selectedGroupId,
    sport: state.selectedSport,
    a: playerA,
    b: playerB,
    aCode: playerARecord.code,
    bCode: playerBRecord.code,
    scoreA: 0,
    scoreB: 0,
    target: Number(document.querySelector("#target-score").value) || 21,
    timerSeconds: state.selectedSport === "basketball" ? 720 : 0,
    timerRunning: false
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
  resetTimer();
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
  stopTimer();
  match.winner = match.scoreA > match.scoreB ? match.a : match.b;
  match.winnerCode = match.scoreA > match.scoreB ? match.aCode : match.bCode;
  match.date = new Date().toISOString();
  state.data.matches.unshift({
    groupId: match.groupId,
    sport: match.sport,
    a: match.a,
    b: match.b,
    aCode: match.aCode,
    bCode: match.bCode,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winner: match.winner,
    winnerCode: match.winnerCode,
    date: match.date
  });
  saveData();
  document.querySelector("#winner-name").textContent = `${match.winner} wins`;
  document.querySelector("#result-copy").textContent = `${titleCase(match.sport)} final saved. All-time win/loss is updated.`;
  document.querySelector("#result-score").textContent = `${match.scoreA} - ${match.scoreB}`;
  state.activeMatch = null;
  goTo("result");
});

document.querySelector("#timer-toggle").addEventListener("click", () => {
  if (!state.activeMatch || state.activeMatch.sport !== "basketball") return;
  state.activeMatch.timerRunning ? stopTimer() : startTimer();
  updateTimerDisplay();
});

document.querySelector("#timer-reset").addEventListener("click", () => {
  resetTimer();
});

document.querySelector("#add-player-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#new-player-name");
  const roleSelect = document.querySelector("#new-player-role");
  const teamInput = document.querySelector("#new-player-team");
  addPlayer(input.value, roleValueToRoles(roleSelect.value), teamInput.value);
  input.value = "";
  teamInput.value = "";
  saveData();
  render();
});

document.querySelector("#add-group-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const groupName = cleanName(document.querySelector("#group-name").value);
  const personName = cleanName(document.querySelector("#organizer-name").value);
  if (!groupName || !personName) return;
  let group = state.data.groups.find((item) => item.name.toLowerCase() === groupName.toLowerCase());
  if (!group) {
    group = {
      id: `group-${Date.now()}`,
      name: groupName,
      organizer: state.setupRole === "host" ? personName : ""
    };
    state.data.groups.push(group);
  }
  if (state.setupRole === "host") {
    group.organizer = personName;
    addPlayer(personName, ["organizer", "player"]);
  } else {
    addPlayer(personName, ["player"]);
  }
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

document.querySelector("#role-choice").addEventListener("click", (event) => {
  const button = event.target.closest("[data-setup-role]");
  if (!button) return;
  state.setupRole = button.dataset.setupRole;
  saveData();
  renderSetupRole();
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

function addPlayer(name, roles = ["player"], teamName = "") {
  const group = activeGroup();
  const groupId = group ? group.id : state.selectedGroupId;
  const team = cleanName(teamName);
  const player = upsertPlayer(state.data.players, name, roles, team, groupId);
  if (team && group) addTeamToGroup(group, team);
  return player;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function activeGroup() {
  return state.data.groups.find((group) => group.id === state.selectedGroupId) || state.data.groups[0] || null;
}

function addTeamToGroup(group, teamName) {
  const team = cleanName(teamName);
  if (!team) return;
  if (!Array.isArray(group.teams)) group.teams = [];
  if (!group.teams.some((item) => item.toLowerCase() === team.toLowerCase())) group.teams.push(team);
}

function groupMatches() {
  const group = activeGroup();
  if (!group) return [];
  return state.data.matches.filter((match) => match.groupId === group.id);
}

function getRecords(filter = "all") {
  const group = activeGroup();
  const records = new Map(state.data.players.map((player) => [player.code, { code: player.code, name: player.name, roles: player.roles, team: group ? player.teams?.[group.id] || "" : "", wins: 0, losses: 0, games: 0 }]));
  groupMatches()
    .filter((match) => filter === "all" || match.sport === filter)
    .forEach((match) => {
      const aCode = match.aCode || findPlayerByName(match.a)?.code || match.a;
      const bCode = match.bCode || findPlayerByName(match.b)?.code || match.b;
      const winnerCode = match.winnerCode || (match.winner === match.a ? aCode : bCode);
      const loserCode = winnerCode === aCode ? bCode : aCode;
      [
        { code: aCode, name: match.a },
        { code: bCode, name: match.b }
      ].forEach((player) => {
        if (!records.has(player.code)) records.set(player.code, { code: player.code, name: player.name, roles: ["player"], team: "", wins: 0, losses: 0, games: 0 });
      });
      if (!records.has(winnerCode)) records.set(winnerCode, { code: winnerCode, name: match.winner, roles: ["player"], team: "", wins: 0, losses: 0, games: 0 });
      if (!records.has(loserCode)) records.set(loserCode, { code: loserCode, name: loserCode === aCode ? match.a : match.b, roles: ["player"], team: "", wins: 0, losses: 0, games: 0 });
      records.get(winnerCode).wins += 1;
      records.get(winnerCode).games += 1;
      records.get(loserCode).losses += 1;
      records.get(loserCode).games += 1;
    });
  return [...records.values()].sort((a, b) => {
    const rateA = a.games ? a.wins / a.games : 0;
    const rateB = b.games ? b.wins / b.games : 0;
    return rateB - rateA || b.wins - a.wins || a.name.localeCompare(b.name);
  });
}

function getPlayerRecord(name, filter = "all") {
  const player = findPlayerByName(name);
  return getRecords(filter).find((record) => record.code === player?.code || record.name.toLowerCase() === name.toLowerCase()) || {
    code: player?.code || "",
    name,
    wins: 0,
    losses: 0,
    games: 0
  };
}

function findPlayerByName(name) {
  const cleaned = cleanName(name).toLowerCase();
  return state.data.players.find((player) => player.name.toLowerCase() === cleaned);
}

function render() {
  renderSetupRole();
  renderGroupContext();
  renderDashboard();
  renderAllTime();
  renderGroups();
  renderTeams();
  renderPlayers();
  renderHistory();
  renderLeaderboard();
}

function renderTeams() {
  const list = document.querySelector("#teams-list");
  const group = activeGroup();
  if (!group) {
    list.innerHTML = `<div class="empty-state">Create or join a group before assigning teams.</div>`;
    return;
  }
  if (!group.teams?.length) {
    list.innerHTML = `<div class="empty-state">No teams yet. Add a team name when adding a player.</div>`;
    return;
  }
  list.innerHTML = `
    <div class="team-strip">
      <span>Teams in ${group.name}</span>
      ${group.teams.map((team) => `<b>${team}</b>`).join("")}
    </div>
  `;
}

function renderGroupContext() {
  const group = activeGroup();
  if (!group) {
    document.querySelector("#current-group-name").textContent = "No group yet";
    document.querySelector("#current-group-organizer").textContent = "Choose Host or Joiner to begin";
    document.querySelector("#match-group-name").textContent = "your selected group";
    return;
  }
  const organizer = group.organizer ? state.data.players.find((player) => player.name.toLowerCase() === group.organizer.toLowerCase()) : null;
  document.querySelector("#current-group-name").textContent = group.name;
  document.querySelector("#current-group-organizer").textContent = group.organizer
    ? `Organizer: ${group.organizer}${organizer ? ` · ${roleLabel(organizer.roles)}` : ""}`
    : "Organizer: Not set yet";
  document.querySelector("#match-group-name").textContent = group.name;
}

function renderSetupRole() {
  document.querySelectorAll("[data-setup-role]").forEach((button) => {
    button.classList.toggle("active", button.dataset.setupRole === state.setupRole);
  });
  const isHost = state.setupRole === "host";
  document.querySelector("#group-submit-label").textContent = isHost ? "Create group as host" : "Join group";
  document.querySelector("#organizer-name").placeholder = isHost ? "Your organizer name" : "Your player name";
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
  if (!state.data.groups.length) {
    list.innerHTML = `<div class="empty-state">No groups yet. Create one as a host or join by entering a group name.</div>`;
    return;
  }
  list.innerHTML = state.data.groups.map((group) => {
    const isActive = group.id === state.selectedGroupId;
    const totalGames = state.data.matches.filter((match) => match.groupId === group.id).length;
    return `
      <article class="group-row ${isActive ? "active" : ""}">
        <div>
          <small>${isActive ? "Active group" : "Group"}</small>
          <strong>${group.name}</strong>
          <span>Organizer: ${group.organizer || "Not set yet"} · ${totalGames} games</span>
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
      <div><strong>${record.name}</strong><code>${record.code}</code><em>${roleLabel(record.roles)}</em>${record.team ? `<em class="team-badge">${record.team}</em>` : ""}<span>Overall: ${record.wins} wins / ${record.losses} losses · ${record.games} games</span></div>
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
  renderTimer(match);
  updateLiveTracker(match);
}

function renderTimer(match) {
  const timer = document.querySelector("#game-timer");
  timer.hidden = match.sport !== "basketball";
  if (timer.hidden) return;
  updateTimerDisplay();
}

function startTimer() {
  stopTimer(false);
  state.activeMatch.timerRunning = true;
  state.timerInterval = window.setInterval(() => {
    if (!state.activeMatch) return stopTimer();
    state.activeMatch.timerSeconds = Math.max(0, state.activeMatch.timerSeconds - 1);
    if (state.activeMatch.timerSeconds === 0) stopTimer();
    updateTimerDisplay();
  }, 1000);
}

function stopTimer(markStopped = true) {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  if (markStopped && state.activeMatch) {
    state.activeMatch.timerRunning = false;
  }
}

function resetTimer() {
  if (!state.activeMatch) return;
  stopTimer();
  state.activeMatch.timerSeconds = state.activeMatch.sport === "basketball" ? 720 : 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  if (!state.activeMatch) return;
  const minutes = Math.floor(state.activeMatch.timerSeconds / 60);
  const seconds = state.activeMatch.timerSeconds % 60;
  document.querySelector("#timer-display").textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
  document.querySelector("#timer-toggle").textContent = state.activeMatch.timerRunning ? "Pause" : "Start";
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
