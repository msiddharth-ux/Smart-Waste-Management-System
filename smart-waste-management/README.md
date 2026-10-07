# Smart Waste Management System

A software prototype for monitoring waste-bin fill levels, viewing bin locations, generating alerts, and preparing collection routes. The current project uses simulated bin readings; **no physical sensors are connected**.

## Project At A Glance

- **Frontend:** React and Vite
- **Backend:** Node.js, Express, and Socket.IO
- **Data:** MongoDB/Mongoose when connected; volatile in-memory fallback when it is unavailable
- **Maps:** Leaflet with OpenStreetMap tiles and place search
- **Simulation interval:** 10 seconds
- **Current scope:** Software prototype and functional demonstration
- **Hardware status:** Proposed as future work only

## Implemented Features

- Live dashboard with bin status, fill percentage, summary metrics, and update time
- Simulated readings that increase fill levels and set a bin to `FULL` at its alert threshold
- Real-time dashboard updates through Socket.IO
- **EcoAI Operations Assistant:** Real-time conversational AI co-pilot with live IoT telemetry analysis, operational health diagnosis, priority dispatch recommendations, waste segregation guidance, voice read-out, and interactive navigation actions
- **Dual-Mode AI Interface:** Full-screen Operations Command Center page plus an omnipresent floating assistant widget across all views
- Bin management for creating, editing, and deleting bin records
- Human-readable location names and a map picker that sets latitude and longitude
- Map view of bin locations
- Alert history and browser notifications
- Historical fill-level charts and a least-squares linear-regression time-to-full estimate
- Multi-vehicle, capacity-constrained route planning using a genetic algorithm and Haversine distance
- Browser-side MobileNet image classification with an advisory waste-category mapping
- Public citizen complaint submissions and an authenticated staff review/status workflow
- Live fill-level heatmap with all-bin and full-bin filters
- Collection-performance report with daily collection count, average fill, pending complaints, and route-distance savings
- Demo login accounts for admin, operator, and viewer roles with secure manual credential authentication
- Modern enterprise SaaS design system with Google Fonts (`Plus Jakarta Sans` & `Space Grotesk`), glassmorphism, responsive cards, and dark-forest login gateway

The forecast is a regression over simulated history and is not validated against real sensor data. The image model is general-purpose ImageNet classification, not a model trained specifically for waste. The genetic algorithm uses straight-line distances, estimated load from fill percentages, and a bin-centroid depot; it is not a road-network optimizer or a guarantee of a globally optimal route.

## Requirements

- Node.js and npm
- MongoDB is optional for the local demo. When connected, bin and complaint records use MongoDB. When it is unavailable, both models use in-memory stores and records are lost when the backend stops.
- Internet access is needed to load OpenStreetMap tiles and search place names.
- Internet access is also needed on first use of the MobileNet classifier to download its model files. Image inference runs in the browser; selected photos are not uploaded to the backend.
- If WebGL is unavailable, TensorFlow.js falls back to CPU inference, which may be slower.

## Run Locally

Open a terminal in the project root. Install root dependencies with lifecycle scripts disabled, then install the frontend and backend dependencies:

```powershell
npm.cmd install --ignore-scripts
npm.cmd install --prefix backend
npm.cmd install --prefix frontend
```

Start both services:

```powershell
npm.cmd run dev
```

Or start them separately in two terminals:

```powershell
cd backend
npm.cmd start
```

```powershell
cd frontend
npm.cmd run dev
```

In PowerShell, `npm.cmd` avoids a possible script execution-policy block on `npm.ps1`. The Vite frontend normally opens at `http://localhost:5173`; if that port is occupied, Vite may select another available port and print it in the terminal. The backend listens at `http://localhost:5000` by default.

The supplied `start.bat` and `start.ps1` scripts can also launch both services after dependencies have been installed. The batch file currently prints an old frontend port; use the port printed by Vite as the correct address.

## Demo Login

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Operator | `operator` | `operator123` |
| Viewer | `viewer` | `viewer123` |

These accounts and credentials are for local demonstration only. Do not deploy them or the current JWT configuration to a public service.

## Data And Simulation

When the selected store is empty, the backend seeds three example bins with locations in Bengaluru. The simulator then runs every 10 seconds, adds a random value from 0 to 19 to each bin's fill level, caps the level at 100, updates its status, records history, and broadcasts the updated bins.

The forecast fits a least-squares line to up to 20 timestamped history records and projects the trend to bin capacity. The heatmap weights map points by current simulated fill level. The route planner interprets each selected full bin's fill percentage as a load unit and splits stops across vehicles by the supplied capacity. These are software demonstrations; simulated readings are not sensor measurements.

A bin is counted as collected when an authenticated update changes its fill level from above zero to zero. The report counts those events since midnight UTC, averages the current fill levels across bins, and counts complaints with `NEW` or `IN_REVIEW` status. Route efficiency is percentage distance saved by the genetic algorithm compared with visiting current full bins in their stored order; it uses straight-line distance and is not a measure of road, fuel, or operational efficiency.

## API Overview

The bin endpoints require a JWT bearer token obtained from login.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Sign in and obtain a token |
| `GET` | `/api/auth/verify` | Verify a token |
| `GET` | `/api/bins` | List bins |
| `GET` | `/api/bins/:id` | Get one bin |
| `POST` | `/api/bins` | Create a bin |
| `PUT` | `/api/bins/:id` | Update a bin |
| `DELETE` | `/api/bins/:id` | Delete a bin |
| `GET` | `/api/bins/:id/history` | Get fill history |
| `GET` | `/api/bins/:id/forecast` | Get the time-to-full estimate |
| `GET` | `/api/bins/optimize/route?vehicles=2&capacity=200` | Get genetic-algorithm routes for full bins |
| `POST` | `/api/complaints` | Submit a public citizen complaint |
| `GET` | `/api/complaints` | List complaints (admin/operator JWT required) |
| `PATCH` | `/api/complaints/:id/status` | Update complaint status (admin/operator JWT required) |
| `GET` | `/api/reports/collection-performance` | Get staff-only collection performance metrics |
| `POST` | `/api/ai/chat` | Contextual AI chat query with live telemetry and recommendations |
| `GET` | `/api/ai/quick-insights` | Operational radar metrics and automated dispatch insight |

The route endpoint accepts 1–20 vehicles and a positive per-vehicle load capacity. A bin's current fill percentage is used as its simulated load. If no depot is configured, the mean of the selected full-bin coordinates is used as a demonstration depot.

## Project Structure

```text
backend/
	ai.js               EcoAI Operations Assistant telemetry & insight engine
	auth.js             Demo authentication and JWT verification
	Bin.js              Bin data model and in-memory fallback
	bins.js             Bin, history, forecast, and route APIs
	Complaint.js        Complaint model and in-memory fallback
	complaints.js       Public submissions and staff complaint workflow
	reports.js          Collection performance metrics API
	routeOptimizer.js   Genetic-algorithm multi-vehicle route planner
	server.js           Express and Socket.IO server
	simulator.js        Simulated fill-level updates
frontend/src/
	components/         Dashboard, AIAssistant, reports, maps, analytics, alerts, classifier, complaints
	styles/             Component styles including AIAssistant.css and modern theme
	utils/              API (including AI endpoints) and Socket.IO clients
VTU_Paper_Draft.md    Draft manuscript for guide review
PROJECT_REPORT.md    Original project report
```

## Paper Or PPT Outline

Use the following sequence to present the project:

1. **Problem:** Fixed collection schedules provide limited visibility into current bin status.
2. **Objective:** Build a software prototype for monitoring bins and supporting collection decisions.
3. **Architecture:** React frontend, Express/Socket.IO backend, and MongoDB when available with an in-memory fallback.
4. **Method:** Simulated readings every 10 seconds, regression-based trend estimation, genetic-algorithm vehicle routes, MobileNet classification suggestions, complaint handling, and fill-weighted mapping.
5. **Demonstration:** Show the dashboard, heatmap, collection-performance report, citizen complaint portal and staff queue, image classifier, location picker, analytics, and multi-vehicle routes.
6. **Evaluation:** Report functional checks that were actually performed. Do not invent performance, accuracy, cost, fuel, or environmental results.
7. **Limitations:** No physical sensor readings, waste-specific classifier training, road-network routing, or measured collection savings.
8. **Future work:** Integrate and calibrate hardware, then evaluate it using recorded sensor and collection data.

A manuscript draft with an abstract, system description, limitations, and references is available in [`VTU_Paper_Draft.md`](VTU_Paper_Draft.md). Adapt it to the exact VTU event or publication template and get the guide's approval before submission.

## Future Hardware Work

The following is a **proposed future extension**, not part of the implemented or tested system:

- ESP32 development board for Wi-Fi connectivity
- HC-SR04 ultrasonic distance sensor for an indoor tabletop prototype
- A dedicated authenticated device endpoint to transmit readings to the backend
- Calibration using measured empty-bin and full-bin distances
- Tests comparing sensor-derived fill level with manual measurements

The ESP32 and HC-SR04 have not been connected or evaluated in this project. Any paper or presentation must describe them as planned future work until physical testing has been completed. For an outdoor installation, select a waterproof sensor and weather-resistant enclosure rather than using the indoor HC-SR04 setup.

## Verification

Build the frontend with:

```powershell
cd frontend
npm.cmd run build
```

The backend package does not currently define an automated test suite. Record any manual test steps and results you perform for the final report. Recent local checks cover frontend production builds, bin storage fallback behavior, complaint API workflow and role checks, regression response, route constraints/coverage, one browser classifier inference smoke test, heatmap rendering, and map coordinate selection; these are functional checks, not performance or accuracy benchmarks.