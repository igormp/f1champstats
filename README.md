# F1 2025 Final Race Championship Simulator

A lightweight, static web application designed to simulate the final race of the 2025 Formula 1 season. This tool helps visualize championship outcomes based on potential race results.

## Features

- **Strategy Room:** Explore "Path to Glory" scenarios for title contenders (Norris, Verstappen, Piastri) to see exactly what results are needed to clinch the championship.
- **Manual Simulation:** Manually set finishing positions for each driver to instantly calculate the final standings.
- **Real-time Calculation:** Updates championship points, wins, and podium counts dynamically.
- **Tie-break Logic:** Implements official F1 tie-break rules: Points > Wins > Podiums.

## Tech Stack

- **HTML5**
- **CSS3**
- **Vanilla JavaScript** (ES6 Modules)

## Getting Started

Since this is a static web project, no build step or server is required.

1. Clone the repository.
2. Open `index.html` directly in your web browser.

## Project Structure

- `index.html`: Main entry point and layout.
- `css/style.css`: Application styling.
- `js/`:
  - `app.js`: Main application logic and event handling.
  - `data.js`: Initial driver data and state.
  - `engine.js`: Calculation engine for points and standings.
  - `scenarios.js`: Logic for generating "winning scenarios".

## Assumptions

- Uses standard race points (25-18-15-12-10-8-6-4-2-1).
- No sprint race or fastest lap points are included in the specific calculations.
- Assumes the championship battle is limited to the current top contenders.
