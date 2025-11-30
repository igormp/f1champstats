import { BASE_DRIVERS } from "./data.js";
import {
  calculateDriverResult,
  sortStandings,
  determineChampion,
} from "./engine.js";
import { findWinningScenarios, groupScenarios } from "./scenarios.js";

// DOM Elements
const tbody = document.getElementById("drivers-body");
const championSummary = document.getElementById("champion-summary");
const simulateBtn = document.getElementById("simulate-btn");
const resetBtn = document.getElementById("reset-btn");
const strategyResults = document.getElementById("strategy-results");
const strategyButtons = document.querySelectorAll(".driver-select-btn");

// State
let drivers = [...BASE_DRIVERS]; // Working copy could be useful, but we regenerate on fly mostly

function init() {
  buildTable();
  setupEventListeners();
}

function setupEventListeners() {
  simulateBtn.addEventListener("click", runSimulation);
  resetBtn.addEventListener("click", resetTable);

  strategyButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Toggle active state
      strategyButtons.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      const driverId = e.target.dataset.driver;
      runStrategyAnalysis(driverId);
    });
  });
}

function buildTable() {
  tbody.innerHTML = "";
  BASE_DRIVERS.forEach((driver, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.driverIndex = idx.toString();
    if (driver.isContender) {
      tr.classList.add("contender");
    }

    const tds = [
      { text: "-", class: "rank" },
      { text: driver.name },
      { text: driver.team },
      { text: driver.points },
      { text: driver.wins },
      { text: driver.podiums },
      { html: createPositionSelect(idx, driver.points).outerHTML },
      { text: "0", id: `race-pts-${idx}` },
      { text: driver.points, id: `final-pts-${idx}` },
      { text: driver.wins, id: `final-wins-${idx}` },
      { text: driver.podiums, id: `final-pods-${idx}` },
    ];

    tds.forEach((tdData) => {
      const td = document.createElement("td");
      if (tdData.id) td.id = tdData.id;
      if (tdData.html) td.innerHTML = tdData.html;
      else td.textContent = tdData.text;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  // Add event listeners for selects after creating them
  const selects = tbody.querySelectorAll("select");
  selects.forEach((sel) => {
    sel.addEventListener("change", handlePositionChange);
  });

  championSummary.innerHTML = "";
}

function createPositionSelect(driverIdx, currentPoints) {
  const select = document.createElement("select");
  select.name = `finish-pos-${driverIdx}`;
  select.dataset.idx = driverIdx;

  const optNone = document.createElement("option");
  optNone.value = "";
  optNone.textContent = "No points / DNF";
  select.appendChild(optNone);

  for (let pos = 1; pos <= BASE_DRIVERS.length; pos++) {
    const opt = document.createElement("option");
    opt.value = pos.toString();
    opt.textContent = "P" + pos;
    select.appendChild(opt);
  }
  return select;
}

// Ensure no two drivers have the same P1-P21 position (basic validation UI)
// This is an enhancement: Auto-clear conflicting positions?
// For now, let's keep it simple as per original, but maybe warn?
// The prompt asked for specific scenario logic, not necessarily complex table validation.
// We'll stick to basic table behavior.
function handlePositionChange(e) {
  // Optional: could add live updates here
}

function runSimulation() {
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const results = [];

  // 1. Gather inputs
  rows.forEach((tr) => {
    const idx = parseInt(tr.dataset.driverIndex, 10);
    const base = BASE_DRIVERS[idx];
    const select = tr.querySelector("select");
    const posValue = select.value;
    const finishingPos = posValue === "" ? null : parseInt(posValue, 10);

    results.push(calculateDriverResult(base, finishingPos));
  });

  // 2. Sort
  const sortedResults = sortStandings(results);

  // 3. Determine Champion
  const { champion, second, isTie } = determineChampion(sortedResults);

  // 4. Update UI
  updateTable(sortedResults, isTie);
  updateSummary(champion, second, isTie);
}

function updateTable(sortedResults, isTie) {
  tbody.innerHTML = "";

  sortedResults.forEach((res, rankIndex) => {
    const originalIdx = BASE_DRIVERS.findIndex((d) => d.name === res.name); // simplistic match

    const tr = document.createElement("tr");
    if (rankIndex === 0 && !isTie) {
      tr.classList.add("champion-row");
    }
    if (res.isContender) {
      tr.classList.add("contender");
    }
    tr.dataset.driverIndex = originalIdx.toString();

    // Re-create cells
    // Note: We need to preserve the user's selection in the dropdown

    const selectHtml = createPositionSelect(originalIdx).outerHTML;

    // Helper to get value
    const racePts = res.racePoints;
    const finalPts = res.finalPoints;

    const tds = [
      rankIndex + 1,
      res.name,
      res.team,
      res.points, // Base
      res.wins,
      res.podiums,
      selectHtml, // We'll set value after
      racePts,
      finalPts,
      res.finalWins,
      res.finalPodiums,
    ];

    tds.forEach((content, i) => {
      const td = document.createElement("td");
      if (i === 6) {
        td.innerHTML = content;
        const sel = td.querySelector("select");
        if (res.finishingPos) sel.value = res.finishingPos.toString();
        sel.addEventListener("change", handlePositionChange);
      } else {
        td.textContent = content;
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function updateSummary(champion, second, isTie) {
  let summaryHtml = "";
  if (isTie) {
    summaryHtml =
      `<p><span class="champion-badge tie-badge">Tie</span> ` +
      `Tie on points/wins/podiums between <strong>${champion.name}</strong> and ` +
      `<strong>${second.name}</strong> (${champion.finalPoints} pts).</p>`;
  } else {
    summaryHtml =
      `<p><span class="champion-badge">Champion</span> ` +
      `<strong>${champion.name}</strong> (${champion.team}) with ` +
      `<strong>${champion.finalPoints}</strong> points ` +
      `(wins: ${champion.finalWins}, podiums: ${champion.finalPodiums}).</p>`;
  }
  championSummary.innerHTML = summaryHtml;
}

function resetTable() {
  buildTable();
  championSummary.innerHTML = "";
}

// Strategy Room Logic
function runStrategyAnalysis(driverId) {
  strategyResults.innerHTML = "<p>Calculating scenarios...</p>";

  // Allow UI to update before blocking (though it's fast enough to be sync usually)
  setTimeout(() => {
    const scenarios = findWinningScenarios(driverId);

    if (scenarios.length === 0) {
      strategyResults.innerHTML = `<p>No scenarios found where ${driverId} wins the title given the constraints.</p>`;
      return;
    }

    const grouped = groupScenarios(driverId, scenarios);

    // Render
    strategyResults.innerHTML = grouped
      .map(
        (group) => `
            <div class="scenario-card">
                <h4>If ${
                  driverId.charAt(0).toUpperCase() + driverId.slice(1)
                } finishes <strong>${group.position}</strong></h4>
                <p>${group.description}</p>
            </div>
        `
      )
      .join("");
  }, 10);
}

// Run init
init();
