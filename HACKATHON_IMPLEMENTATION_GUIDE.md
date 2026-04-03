# KC Valley Digital Twin - Hackathon Fast Guide

This is the shortest reliable path to reproduce the current minimal outcome:
- Neon holographic terrain (no satellite texture)
- Real-map aligned OSM 3D buildings
- KC Valley highlight + rain/flood + traffic + alerts
- Camera presets and smooth demo flow

---

## 1. Outcome You Should Target

In under a day, your demo should show:
1. A Cesium globe centered at KC Valley with terrain enabled.
2. Hologram terrain styling (dark base + cyan contour glow).
3. OSM buildings styled in neon shades by height.
4. Data overlays from backend (rain, traffic, alerts).
5. Controls for toggles/sliders and camera presets.

---

## 2. Tech Stack (Recommended for Hackathon)

Frontend:
- React 18
- Vite
- CesiumJS

Backend:
- Node.js + Express (fastest for hackathon)
- Optional: Python service for AI inference
- Optional DB: PostgreSQL/PostGIS or MongoDB

AI Layer:
- Any model that returns structured JSON (cloud or local)
- Use AI only for scoring/insights; keep map rendering deterministic

Core principle:
- Backend sends cleaned geo-data JSON.
- Frontend only renders and animates.

---

## 3. Installation and Requirements

Prerequisites:
- Node.js 18+
- npm 9+
- Cesium Ion account (free tier is fine)

Install:

```bash
npm install
npm run dev
```

Environment:
Create `.env` in project root:

```env
VITE_CESIUM_ION_TOKEN=your_token_here
VITE_API_BASE_URL=http://localhost:8080
```

Build check:

```bash
npm run build
```

---

## 4. Current Frontend Architecture

Main file:
- `src/components/DigitalTwin.jsx`

Rendering layers (in order):
1. Cesium world terrain
2. Hologram globe material (contour shader)
3. OSM 3D buildings (neon style)
4. Ground overlays:
   - KC boundary
   - Rain/flood polygons
   - Traffic polylines
   - Alert points + labels
5. Camera + post-processing (bloom, fog, FXAA)

Important implementation choices:
- No satellite imagery layer.
- Map and overlays are ground-clamped or terrain-relative.
- Buildings come from OSM for real footprint alignment.

---

## 5. Backend Data Contracts (Do This Early)

Keep backend payloads simple and stable.

### 5.1 Flood API
`GET /api/flood?rain=0-100`

Response example:

```json
{
  "rain": 62,
  "zones": [
    {
      "id": "f1",
      "ring": [77.659,12.879,77.665,12.879,77.665,12.884,77.659,12.884],
      "depth": 1.8,
      "severity": "high"
    }
  ]
}
```

### 5.2 Traffic API
`GET /api/traffic?level=0-100`

```json
{
  "level": 70,
  "corridors": [
    {
      "id": "t1",
      "path": [77.648,12.876,77.664,12.885,77.678,12.892],
      "congestion": 0.82
    }
  ]
}
```

### 5.3 Alerts API
`GET /api/alerts?level=0-100`

```json
{
  "level": 45,
  "alerts": [
    {
      "id": "a1",
      "lon": 77.666,
      "lat": 12.888,
      "title": "Water Logging",
      "severity": "medium"
    }
  ]
}
```

---

## 6. AI Integration Pattern (No-Fumble Version)

Do not let AI directly emit Cesium entities.

Use this flow:
1. Sensors or mock feeds -> backend.
2. AI model -> returns only risk scores, severity, and recommendations.
3. Backend validator -> clamps values and enforces schema.
4. Frontend -> renders validated JSON.

Example AI output schema (backend internal):

```json
{
  "risk": {
    "flood": 0.78,
    "traffic": 0.64,
    "overall": 0.71
  },
  "recommendations": [
    "Reroute corridor t1",
    "Raise alert for zone f1"
  ]
}
```

Rule:
- AI decides severity.
- Backend decides shape coordinates.
- Frontend decides visualization.

---

## 7. Copilot Workflow in 3 Prompt Rounds

Use these almost as-is.

### Prompt 1: Foundation (viewer + style)

```text
Build a React Cesium component for KC Valley Bengaluru using createWorldTerrainAsync and createOsmBuildingsAsync.
Use a pure neon hologram look: remove imagery layers, set globe base dark blue, apply ElevationContour globe material in cyan.
Add camera presets (front, oblique, top), bloom, fog, FXAA, and cleanup on unmount.
Keep everything in one component first.
```

Expected result:
- Terrain + OSM + hologram map render stable.

### Prompt 2: Data overlays (API-connected)

```text
Extend the component with backend-driven overlays.
Add fetch functions for /api/flood, /api/traffic, /api/alerts.
Render flood polygons, traffic glow polylines, and alert points with labels.
Use clampToGround or terrain-relative settings so layers align with terrain.
Add slider/toggles for rain, traffic level, alert level.
Implement clearEntities lifecycle cleanup for each layer.
```

Expected result:
- Interactive map with API-fed overlays.

### Prompt 3: Demo polish + reliability

```text
Polish this digital twin for hackathon demo quality.
Improve neon contrast, add KC Valley highlight boundary, and smoother camera transitions.
Optimize performance (resolutionScale cap, avoid redundant redraws, stable refs).
Add graceful init error messaging when token/network fail.
Keep code deterministic and avoid visual layer drift.
```

Expected result:
- Stable, presentable, cinematic demo.

---

## 8. Step-by-Step Build Order (Time-boxed)

### Phase A (60-90 min)
1. Verify token and terrain load.
2. Render OSM buildings.
3. Apply hologram terrain style.
4. Add camera presets.

### Phase B (90-120 min)
1. Add flood overlay.
2. Add traffic overlay.
3. Add alert overlay.
4. Add UI controls and toggle logic.

### Phase C (60 min)
1. Connect backend endpoints.
2. Add loading/error fallback.
3. Validate all layers align under zoom/tilt/orbit.

### Phase D (30-45 min)
1. Demo script practice.
2. Build check (`npm run build`).
3. Backup video recording.

---

## 9. Reliability Checklist Before Judges

- [ ] `.env` token present and valid.
- [ ] `npm run build` passes.
- [ ] Terrain, OSM buildings, flood, traffic, alerts all visible.
- [ ] No floating overlays when camera tilts.
- [ ] No layer drift while rotating around KC Valley.
- [ ] API error fallback message appears cleanly.
- [ ] One-click reset camera preset works.

---

## 10. Minimal Backend Skeleton (Express)

```js
import express from "express";
const app = express();

app.get("/api/flood", (req, res) => {
  const rain = Number(req.query.rain ?? 0);
  res.json({ rain, zones: [] });
});

app.get("/api/traffic", (req, res) => {
  const level = Number(req.query.level ?? 0);
  res.json({ level, corridors: [] });
});

app.get("/api/alerts", (req, res) => {
  const level = Number(req.query.level ?? 0);
  res.json({ level, alerts: [] });
});

app.listen(8080, () => console.log("API on :8080"));
```

---

## 11. Demo Script (90 seconds)

"This is a live digital twin for KC Valley. The base terrain is rendered in Cesium with a holographic contour style. Real-map OSM buildings are neon-styled and aligned to terrain. We stream flood, traffic, and alert layers from backend APIs. As rainfall and traffic inputs change, overlays update in real-time, helping operations teams prioritize response and rerouting."

---

## 12. What Not To Do in Hackathon

- Do not let AI output raw Cesium rendering code at runtime.
- Do not mix satellite imagery with hologram map if visual consistency matters.
- Do not use random geometry that is not map-aligned for final demo.
- Do not skip build verification before presentation.

---

## 13. If You Have 2 Extra Hours

1. Add time playback (last 24h).
2. Add incident drill-down panel.
3. Add backend caching for API speed.
4. Add one-click scenario presets (Monsoon, Peak Traffic, Emergency).
