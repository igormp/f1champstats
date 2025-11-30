import {
  calculateDriverResult,
  sortStandings,
  determineChampion,
} from "./engine.js";
import { BASE_DRIVERS } from "./data.js";

// Get just the contenders
const contenders = BASE_DRIVERS.filter((d) => d.isContender);
// Map them for easy lookup by ID or name if needed, though index is fastest for brute force
const [norris, verstappen, piastri] = contenders;

/**
 * Generates all valid finishing scenarios for the top 3 contenders.
 * Returns a list of scenarios where a specific driver wins.
 *
 * @param {string} targetWinnerId - 'norris', 'verstappen', or 'piastri'
 * @returns {Array} List of winning scenarios
 */
export function findWinningScenarios(targetWinnerId) {
  const winningScenarios = [];

  // Positions to iterate: 1..10, plus 11 (representing >10 or No Points)
  const MAX_POS = 11;

  for (let posN = 1; posN <= MAX_POS; posN++) {
    for (let posV = 1; posV <= MAX_POS; posV++) {
      // Optimization: If Norris and Verstappen collide in points (both <= 10 and equal), skip
      if (posN <= 10 && posV <= 10 && posN === posV) continue;

      for (let posP = 1; posP <= MAX_POS; posP++) {
        // Check collisions with Piastri
        if (posP <= 10) {
          if (posN <= 10 && posN === posP) continue;
          if (posV <= 10 && posV === posP) continue;
        }

        // Construct a mini simulation
        // We only need to calculate these 3, assuming everyone else scores 0
        // (or rather, everyone else is irrelevant for the title math unless they score,
        // but since we only care about relative order of these 3 and their total points,
        // we can ignore the rest for the "Who is Champion" check,
        // provided the "rest" don't magically jump to 400+ points, which they can't).

        // Wait - we need to be careful. The sortStandings function takes an array.
        // We should construct results for these 3.
        // The champion check relies on the sorted array.

        const resN = calculateDriverResult(norris, posN > 10 ? null : posN);
        const resV = calculateDriverResult(verstappen, posV > 10 ? null : posV);
        const resP = calculateDriverResult(piastri, posP > 10 ? null : posP);

        const miniStandings = sortStandings([resN, resV, resP]);
        const { champion, isTie } = determineChampion(miniStandings);

        // Check if our target won
        // Note: If isTie is true, technically it's a draw, not a sole win.
        // Depending on user requirement, we might exclude ties or include them.
        // Usually "Champion" means sole champion or winning the tie-break.
        // Our logic already puts the winner of tie-break first.
        // But if isTie is TRUE, it means exact same points/wins/podiums.
        // In F1, that's incredibly rare (dead heat in everything).
        // For this purpose, we'll assume top of list is champion.

        if (champion.id === targetWinnerId && !isTie) {
          winningScenarios.push({
            norrisPos: posN,
            verstappenPos: posV,
            piastriPos: posP,
          });
        }
      }
    }
  }
  return winningScenarios;
}

/**
 * Groups scenarios to make them readable.
 * Example logic: "If Norris is P1, Verstappen must be >= Px and Piastri >= Py"
 * This is complex because the requirements are coupled.
 *
 * Simplified approach for UI:
 * Group by Target Driver's position.
 * For each position of Target, find the BEST possible result the rivals can have without preventing the win.
 * Actually, it's usually "Rival must be X or worse".
 *
 * Let's try: Group by Target Position.
 * Then for that Target Position, find the "Max Allowed Position" (highest rank/lowest number) for rivals.
 * But sometimes it's combinatorial (If Rival A is P3, Rival B must be P5; if Rival A is P4, Rival B can be P3).
 *
 * Robust Strategy for Display:
 * Iterate Target Position 1..10 (and No Points if mathematically possible).
 * For each Target Pos, list the discrete valid combinations of rivals.
 * Simplify consecutive ranges if possible.
 */
export function groupScenarios(targetId, scenarios) {
  // 1. Group by target driver's position
  const byTargetPos = {};

  scenarios.forEach((sc) => {
    const targetPos = sc[targetId + "Pos"]; // e.g. sc['norrisPos']
    if (!byTargetPos[targetPos]) {
      byTargetPos[targetPos] = [];
    }
    byTargetPos[targetPos].push(sc);
  });

  // 2. Format for display
  const output = [];
  const positions = Object.keys(byTargetPos).sort((a, b) => a - b);

  positions.forEach((pos) => {
    const scenariosForPos = byTargetPos[pos];
    const displayPos = pos > 10 ? "No Points" : "P" + pos;

    // We need to summarize the constraints on the other two.
    // Let's identify the other drivers.
    const otherIds = ["norris", "verstappen", "piastri"].filter(
      (id) => id !== targetId
    );

    // Simple text generation: "Verstappen P4+, Piastri P5+"
    // To do this strictly, we need to check if there are dependencies.
    // A simple way is to just list the minimal constraints if they are independent,
    // or list distinct sets if dependent.

    // Let's try to find the "minimum required position" (worst finish required) for rivals
    // e.g. "Verstappen <= P4" means Verstappen must finish P4, P5... or No Points.
    // In integer terms, posV >= 4.

    // Let's look at the range of allowed positions for the rivals in this subset.
    // It's often: "If Target P1, Rival1 can be [4,5,6...11] AND Rival2 can be [2,3,4...11]"
    // But we must check if they are coupled.

    // Let's just list distinct simplified conditions.
    // "Verstappen finishes P4 or lower, Piastri finishes P2 or lower"

    const summary = summarizeConstraints(scenariosForPos, otherIds);

    output.push({
      position: displayPos,
      description: summary,
    });
  });

  return output;
}

function summarizeConstraints(scenarios, otherIds) {
  // This is a heuristic simplifier.
  // It looks for the "best" position (lowest number) each rival achieves in the dataset.
  // If the scenarios cover ALL combinations of positions worse than those bests, we can say "X >= P_best".

  // Let's just create a string based on the worst-case for the rivals (closest to P1 they can get).
  // Note: This might be slightly inaccurate if there's a specific "hole" in the combinations,
  // but for F1 points, usually if (V=4, P=5) works, then (V=5, P=5) works too.
  // The only blocker is the "clash" rule (V and P can't both be 4).

  // Let's find the minimum allowed position value (highest rank) for each rival across ALL scenarios for this target pos.
  const minPos = {};
  otherIds.forEach((id) => (minPos[id] = 99));

  scenarios.forEach((sc) => {
    otherIds.forEach((id) => {
      const p = sc[id + "Pos"];
      if (p < minPos[id]) minPos[id] = p;
    });
  });

  // Now construct string
  const parts = otherIds.map((id) => {
    const mp = minPos[id];
    const mpStr = mp > 10 ? "No Points" : "P" + mp;
    const name = id.charAt(0).toUpperCase() + id.slice(1);
    return `${name} finishes ${mpStr} or lower`;
  });

  return parts.join(" AND <br>");
}
