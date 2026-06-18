const state = {
  scoreA: 0,
  scoreB: 0,
  timerSeconds: 720,
  defaultTimerSeconds: 720,
  timerRunning: false,
  timerId: null
};

const scoreA = document.querySelector("#score-a");
const scoreB = document.querySelector("#score-b");
const timerDisplay = document.querySelector("#timer-display");
const timerToggle = document.querySelector("#timer-toggle");

document.querySelectorAll("[data-team]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.team === "a" ? "scoreA" : "scoreB";
    const points = Number(button.dataset.points);
    state[key] = Math.max(0, state[key] + points);
    render();
  });
});

timerToggle.addEventListener("click", () => {
  state.timerRunning ? pauseTimer() : startTimer();
  render();
});

document.querySelector("#timer-reset").addEventListener("click", () => {
  pauseTimer();
  state.timerSeconds = state.defaultTimerSeconds;
  render();
});

document.querySelector("#timer-edit").addEventListener("submit", (event) => {
  event.preventDefault();
  pauseTimer();
  const minutes = clampNumber(document.querySelector("#timer-minutes").value, 0, 99);
  const seconds = clampNumber(document.querySelector("#timer-seconds").value, 0, 59);
  const total = Math.max(1, minutes * 60 + seconds);
  state.defaultTimerSeconds = total;
  state.timerSeconds = total;
  render();
});

document.querySelector("#reset-all").addEventListener("click", () => {
  pauseTimer();
  state.scoreA = 0;
  state.scoreB = 0;
  state.defaultTimerSeconds = 720;
  state.timerSeconds = 720;
  document.querySelector("#timer-minutes").value = 12;
  document.querySelector("#timer-seconds").value = 0;
  document.querySelector("#team-a-name").value = "HOME";
  document.querySelector("#team-b-name").value = "AWAY";
  render();
});

function startTimer() {
  if (state.timerId) return;
  state.timerRunning = true;
  state.timerId = window.setInterval(() => {
    state.timerSeconds = Math.max(0, state.timerSeconds - 1);
    if (state.timerSeconds === 0) pauseTimer();
    render();
  }, 1000);
}

function pauseTimer() {
  state.timerRunning = false;
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function render() {
  scoreA.textContent = state.scoreA;
  scoreB.textContent = state.scoreB;
  const minutes = Math.floor(state.timerSeconds / 60);
  const seconds = state.timerSeconds % 60;
  timerDisplay.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
  timerToggle.textContent = state.timerRunning ? "Pause" : "Start";
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

render();
