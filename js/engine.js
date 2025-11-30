import { RACE_POINTS } from "./data.js";

/**
 * Calculates the final state for a driver given a race result.
 * @param {Object} baseDriver - The driver object from BASE_DRIVERS
 * @param {number|null} finishingPos - Position 1..21, or null for no points
 * @returns {Object} Enriched driver result object
 */
export function calculateDriverResult(baseDriver, finishingPos) {
  const racePoints =
    finishingPos != null && finishingPos <= 10 && finishingPos >= 1
      ? RACE_POINTS[finishingPos]
      : 0;

  const finalPoints = baseDriver.points + racePoints;
  const finalWins = baseDriver.wins + (finishingPos === 1 ? 1 : 0);
  const finalPodiums =
    baseDriver.podiums + (finishingPos != null && finishingPos <= 3 ? 1 : 0);

  return {
    ...baseDriver, // Include original data (name, team, etc)
    finishingPos,
    racePoints,
    finalPoints,
    finalWins,
    finalPodiums,
  };
}

/**
 * Sorts an array of driver result objects according to F1 Championship rules.
 * 1. Points (descending)
 * 2. Wins (descending)
 * 3. Podiums (descending)
 * 4. Name (ascending) as fallback
 * @param {Array} results
 * @returns {Array} Sorted results
 */
export function sortStandings(results) {
  return [...results].sort((a, b) => {
    if (b.finalPoints !== a.finalPoints) {
      return b.finalPoints - a.finalPoints;
    }
    if (b.finalWins !== a.finalWins) {
      return b.finalWins - a.finalWins;
    }
    if (b.finalPodiums !== a.finalPodiums) {
      return b.finalPodiums - a.finalPodiums;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Determines the champion and second place from a sorted list of results.
 * Checks for a tie based on Points, Wins, and Podiums.
 * @param {Array} sortedResults
 * @returns {Object} { champion, second, isTie }
 */
export function determineChampion(sortedResults) {
  const champion = sortedResults[0];
  const second = sortedResults[1];

  if (!second) {
    return { champion, second: null, isTie: false };
  }

  const isTie =
    champion.finalPoints === second.finalPoints &&
    champion.finalWins === second.finalWins &&
    champion.finalPodiums === second.finalPodiums;

  return { champion, second, isTie };
}
