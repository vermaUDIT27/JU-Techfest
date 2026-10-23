# WasteWise — Smart Waste Collection System

> **JU Techfest 2026** | **Problem Statement SC-03: Waste Doesn't Wait**  
> An intelligent waste monitoring, overflow risk prediction, and route planning platform designed for modern urban and campus sanitation operations.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [Planned Features](#4-planned-features)
5. [System Workflow](#5-system-workflow)
6. [Technology Stack](#6-technology-stack)
7. [Data Model](#7-data-model)
8. [Prediction and Route Optimization](#8-prediction-and-route-optimization)
9. [Simulated Data and Limitations](#9-simulated-data-and-limitations)
10. [Success Metrics](#10-success-metrics)
11. [Development Roadmap](#11-development-roadmap)
12. [Installation and Usage](#12-installation-and-usage)
13. [Git Workflow](#13-git-workflow)
14. [Future Improvements](#14-future-improvements)

---

## 1. Project Overview

**WasteWise** is a smart municipal and campus waste management platform engineered for **JU Techfest 2026** under the hackathon challenge **SC-03: Waste Doesn't Wait**.

Traditional waste management relies heavily on static, fixed-schedule routes where municipal sanitation vehicles visit every bin on a predetermined schedule regardless of its actual fill level. This results in empty bins being visited unnecessarily while rapidly filling bins in dense areas overflow before the next scheduled collection.

**WasteWise** bridges this operational gap by replacing rigid schedules with data-informed, demand-responsive collection planning. By aggregating bin telemetry, categorizing collection urgency through explainable priority rules, and generating optimized collection paths that respect truck capacity constraints, WasteWise equips sanitation operators with actionable insights to keep public spaces clean, reduce wasted travel distance, and eliminate preventable bin overflows.

---

## 2. Problem Statement

Urban centers and expanding campuses face major sanitation challenges driven by inefficient, uncoordinated waste collection processes:

- **Overflowing Garbage Bins**: Fixed collection schedules fail to accommodate unpredictable demand spikes (e.g., public events, dining areas, seasonal crowds), leading to litter accumulation, foul odors, pest infestations, and hygiene hazards.
- **Unnecessary Collection Trips**: Trucks frequently make stops at empty or partially filled bins, consuming operator labor hours and increasing unnecessary vehicle wear-and-tear.
- **Inefficient Routes and Wasted Fuel**: Without dynamic route planning, vehicles follow static paths that do not account for spatial clustering or collection urgency, resulting in excessive fuel consumption, elevated operational costs, and avoidable carbon emissions.
- **Lack of Operational Visibility**: Fleet dispatchers and sanitation supervisors lack a centralized interface to view bin fill levels, track fill acceleration, and identify imminent overflow risks across the service territory.

---

## 3. Proposed Solution

**WasteWise** provides a centralized decision-support platform for municipal and campus sanitation operators:

1. **Continuous Fill Level Monitoring**: Visualizes current bin fill levels across the target area on an intuitive geospatial map.
2. **Explainable Priority & Overflow Estimation**: Applies transparent rules combining current fill percentage and fill rates to classify bins by urgency and estimate time-to-overflow.
3. **Capacity-Aware Route Planning**: Algorithmatically constructs streamlined collection routes that prioritize high-urgency bins while enforcing vehicle capacity limits and minimizing transit distance.
4. **Impact Telemetry & Baseline Comparison**: Directly compares the generated collection path against standard fixed-schedule baseline routes to quantify distance saved, unnecessary stops avoided, and overflow risk mitigated.

---

## 4. Planned Features

The platform features are structured across operational visibility, intelligence, and reporting:

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Operator Dashboard** | High-level operations center highlighting total bins monitored, critical alerts, pending collections, and fleet load status. | *Planned* |
| **Interactive Geospatial Map** | Map interface rendering all bin locations with interactive markers and quick-look details. | *Planned* |
| **Color-Coded Fill Status** | Visual fill indicators (e.g., Green for normal, Yellow for moderate, Red for urgent/critical) for immediate operator recognition. | *Planned* |
| **Bin Priority Classification** | Rule-based classification categorizing bins into priority tiers (`Low`, `Medium`, `High`, `Critical`). | *Planned* |
| **Explainable Overflow Prediction** | Transparent heuristic estimation of time remaining before a bin reaches overflow threshold based on fill trajectory. | *Planned* |
| **Capacity-Aware Route Optimization** | Route planning algorithm balancing transit distance, bin urgency, vehicle capacity, and stop times. | *Planned* |
| **Collection Alerts & Details** | Granular inspection panel displaying individual bin metrics, timestamps, and alert triggers. | *Planned* |
| **Baseline Route Comparison** | Side-by-side comparative analysis evaluating the optimized route against a traditional sequential baseline route. | *Planned* |
| **Performance Analytics** | Calculated metrics dashboard tracking total distance, estimated trip duration, stops completed/avoided, and residual overflow risk. | *Planned* |

---

## 5. System Workflow

The WasteWise operational pipeline processes bin data into actionable dispatch routes through five discrete stages:

```
[ Bin Data ]
  (IDs, Coordinates, Fill Levels, Fill Rates)
       │
       ▼
[ Priority & Overflow-Risk Engine ]
  (Applies explainable thresholds & urgency rules)
       │
       ▼
[ Route Optimization Algorithm ]
  (Balances urgency, vehicle capacity, travel distance, and stop times)
       │
       ▼
[ Operator Dashboard & Interactive Map ]
  (Visualizes prioritized bins, turn-by-turn route, and vehicle load)
       │
       ▼
[ Performance Comparison & Analytics ]
  (Calculates distance, time saved, and stops avoided vs. baseline)
```

1. **Bin Data Ingestion**: Bin records containing geographic coordinates, fill percentages, and fill rates are loaded into the system.
2. **Priority & Risk Computation**: Each bin is evaluated against transparent rules to determine urgency tier and projected time until overflow.
3. **Route Construction**: The routing engine filters bins requiring immediate service and computes an efficient path considering vehicle capacity and travel costs.
4. **Dashboard Presentation**: Operators inspect the recommended route, bin statuses, and truck capacity utilization on the interactive map.
5. **Comparative Evaluation**: The system generates performance metrics benchmarking the planned route against a conventional static collection schedule.

---

## 6. Technology Stack

### Current Repository State
- **Version Control**: Git / GitHub
- **Active Branch**: `shivansh`
- **Application Code & Dependencies**: Minimal repository setup. No frameworks, runtimes, or external packages are installed yet.

### Proposed Technologies for Future Development
The following technologies are planned for evaluation and incremental adoption during upcoming development phases:

- **Frontend & User Interface**:
  - Framework: Modern component-driven architecture (e.g., React with Vite and TypeScript).
  - Styling & Layout: Tailwind CSS or modular CSS for responsive operational dashboards.
  - Interactive Mapping: Leaflet / OpenStreetMap or Mapbox GL for geospatial bin rendering, color-coded markers, and route polyline overlays.
- **Backend & Computational Logic**:
  - Computation: Python or TypeScript/Node.js for priority heuristic calculations and route planning logic.
  - Routing / Graph Solving: Algorithmic heuristic solver (e.g., Nearest Neighbor with Priority Weighting / Capacitated Vehicle Routing Problem heuristics).
- **Data & State Management**:
  - Structured client-side JSON store and scenario generator for consistent simulated datasets.

*(Note: Dependencies will be added incrementally during implementation phases and documented upon installation.)*

---

## 7. Data Model

The planned data structures model both physical waste infrastructure and collection fleet assets.

### Bin Data Model

| Field | Type | Description |
| :--- | :--- | :--- |
| `bin_id` | `string` | Unique identifier for each waste receptacle (e.g., `"BIN-101"`). |
| `latitude` | `number` (float) | Geographic latitude coordinate of the bin. |
| `longitude` | `number` (float) | Geographic longitude coordinate of the bin. |
| `fill_percentage` | `number` (0–100) | Current fill level expressed as a percentage of total capacity. |
| `estimated_fill_rate` | `number` (float) | Estimated accumulation rate (e.g., `% per hour`). |
| `estimated_waste_quantity` | `number` (float) | Estimated waste mass or volume currently in the bin (e.g., in kilograms or liters). |
| `priority_level` | `string` (`enum`) | Urgency tier (`"Low"`, `"Medium"`, `"High"`, `"Critical"`). |
| `last_collection_time` | `string` (ISO 8601) | Timestamp of the most recent collection event, if recorded. |

### Truck / Fleet Data Model

| Field | Type | Description |
| :--- | :--- | :--- |
| `truck_id` | `string` | Unique identifier for the collection vehicle (e.g., `"TRUCK-01"`). |
| `vehicle_capacity` | `number` (float) | Maximum load limit the truck can carry per trip (in kg, liters, or bin count units). |
| `current_load` | `number` (float) | Current cumulative waste volume/weight collected on the active route. |
| `starting_location` | `object` `{lat, lng}` | Coordinates of the sanitation depot or starting dispatch terminal. |
| `collection_status` | `string` (`enum`) | Operational status (`"Idle"`, `"En Route"`, `"Collecting"`, `"Capacity Full"`, `"Completed"`). |

---

## 8. Prediction and Route Optimization

### Explainable Overflow Prediction
Rather than relying on opaque black-box models, the initial prototype employs **transparent, deterministic rules** to classify bins and predict overflow risks:
- **Critical Urgency**: Fill level $\ge 85\%$ or projected overflow within 2 hours.
- **High Urgency**: Fill level between $70\%$ and $84\%$, or projected overflow within 4 hours.
- **Medium Urgency**: Fill level between $45\%$ and $69\%$, with stable filling rates.
- **Low Urgency**: Fill level $< 45\%$ with negligible overflow risk.

### Route Planning Logic
The routing algorithm formulates a practical collection schedule balancing four core operational constraints:
1. **Bin Urgency**: Prioritizing critical and high-risk bins to mitigate overflow hazards.
2. **Travel Distance**: Minimizing Euclidean or road-network transit distance between waypoints.
3. **Vehicle Capacity Constraints**: Tracking cumulative payload so the route does not exceed the truck's maximum load limit before returning to the depot.
4. **Estimated Collection Time**: Factoring in estimated service handling time per stop plus travel transit duration.

> **Algorithmic Note**: The initial prototype utilizes heuristic methods (such as Capacitated Nearest Neighbor with Priority Weighting). Because the Vehicle Routing Problem (VRP) is NP-hard, heuristic solutions provide high-quality, practical routes within short compute times, but mathematically absolute optimality is not claimed or guaranteed.

---

## 9. Simulated Data and Limitations

To ensure full transparency during hackathon evaluation:

- **Simulated Inputs**: The initial prototype operates on **simulated bin coordinates, synthetic fill levels, and modeled fill accumulation rates**.
- **No Physical Sensors Claimed**: Fill percentages and rates are generated through parameterized simulation scripts; they are not streamed from physical IoT sensor hardware in the current phase.
- **No Fabricated Real-World Impact**: Metrics regarding distance reduction, operational time saved, and avoided stops represent algorithmic comparisons against an unoptimized baseline within the simulated scenario. No unsubstantiated real-world fuel cost savings or carbon credit claims are asserted.

---

## 10. Success Metrics

System efficacy is assessed via objective, repeatable benchmark comparisons between the **WasteWise Optimized Route** and a **Standard Baseline Route** (a naive schedule visiting every bin sequentially in numerical or static order).

Evaluation metrics include:
1. **Total Route Distance**: Combined travel distance (in km) required to complete the collection assignment.
2. **Estimated Collection Time**: Total time spent traveling and servicing bins.
3. **Number of Stops**: Total bins visited along the route.
4. **Unnecessary Stops Avoided**: Count of low-fill bins safely bypassed without risking overflow.
5. **High-Priority Bins Serviced**: Percentage of critical and high-urgency bins successfully cleared.
6. **Residual Overflow Risk**: Measure of remaining uncollected bins that could exceed capacity before the subsequent collection cycle.

All comparative analyses are reproducible through fixed test datasets and documented scoring formulas.

---

## 11. Development Roadmap

The development process is organized into seven progressive phases:

- [x] **Phase 1: Repository Setup and Documentation**
  - Verify Git configuration and working branch (`shivansh`).
  - Author comprehensive architectural `README.md`.
- [ ] **Phase 2: Dashboard Layout and Navigation**
  - Establish project structure, application layout, and navigation shell.
  - Implement responsive operator dashboard framing and statistics cards.
- [ ] **Phase 3: Bin Data and Interactive Map**
  - Integrate interactive geospatial map.
  - Load synthetic bin datasets with coordinates and color-coded status markers.
- [ ] **Phase 4: Priority Classification and Overflow-Risk Estimation**
  - Implement explainable rule engine for urgency categorization (`Low`, `Medium`, `High`, `Critical`).
  - Calculate estimated time-to-overflow based on fill levels and fill rates.
- [ ] **Phase 5: Route Optimization**
  - Develop capacity-aware route planning heuristic balancing distance, urgency, and vehicle capacity.
  - Render generated collection routes as interactive map paths.
- [ ] **Phase 6: Analytics and Baseline Comparison**
  - Build comparative analysis engine (Optimized Route vs. Fixed Baseline).
  - Display analytics for distance traveled, time saved, and unnecessary stops avoided.
- [ ] **Phase 7: Testing, Bug Fixes, and Hackathon Demonstration**
  - Execute end-to-end integration and scenario testing.
  - Prepare repeatable demonstration scenarios and presentation walk-through for JU Techfest 2026 judges.

---

## 12. Installation and Usage

> **Status Notice**: The repository is currently at **Phase 1 (Repository Setup and Documentation)**. Application code, runtime dependencies, and build scripts have not been installed yet.

Complete installation, dependency management, and run commands will be added in **Phase 2** as soon as the project scaffolding and environment are initialized.

Future run commands will follow standard practices:
```bash
# Planned workflow (subject to Phase 2 framework selection)
# git clone <repo-url>
# cd JU-Techfest
# npm install (or pip install -r requirements.txt)
# npm run dev (or python app.py)
```

---

## 13. Git Workflow

To maintain clean version control and collaboration hygiene across the team:

- **`main` Branch**: The shared production/default branch. Remains stable, deployable, and updated only via approved pull requests.
- **`shivansh` Branch**: The primary active development branch for feature implementation.
- **Workflow Steps**:
  1. Make changes and verify them locally on the `shivansh` branch.
  2. Stage and commit changes with clear, descriptive commit messages:
     ```bash
     git add <modified-files>
     git commit -m "feat(scope): concise description of changes"
     ```
  3. Push updates to the remote feature branch:
     ```bash
     git push origin shivansh
     ```
  4. Open a Pull Request (PR) from `shivansh` into `main` when milestones are ready for review.
  5. Merge into `main` exclusively through team review and verification.

---

## 14. Future Improvements

Beyond the initial hackathon prototype, potential future enhancements include:

- **Hardware IoT Telemetry**: Integration with physical ultrasonic distance sensors, weight sensors, and LoRaWAN/NB-IoT microcontrollers for live field data streaming.
- **Dynamic Real-Time Re-Routing**: In-transit route updates triggered by real-time overflow alert broadcasts.
- **GPS Vehicle Tracking**: Live fleet tracking with turn-by-turn navigation for drivers on mobile/tablet devices.
- **Predictive Machine Learning**: Forecasting fill patterns using historical trends, weather conditions, campus class schedules, and event calendars.
- **Citizen Engagement Portal**: Mobile web interface enabling residents and students to report overflowing bins or local waste hotspots.
- **Multi-Vehicle Fleet Dispatching**: Multi-depot Capacitated Vehicle Routing (CVRP) allocating multiple trucks across distinct geographic zones.

---

*Authored for JU Techfest 2026 — Problem Statement SC-03: Waste Doesn't Wait.*
