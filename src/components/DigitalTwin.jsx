import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

export default function DigitalTwin() {
  const viewerRef = useRef(null);
  const cesiumContainer = useRef(null);
  const buildingsRef = useRef(null);
  const orbitTickRef = useRef(null);
  const orbitHeadingRef = useRef(0);
  const orbitActiveRef = useRef(false);
  const [rain, setRain] = useState(0);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showFlood, setShowFlood] = useState(true);
  const [trafficLevel, setTrafficLevel] = useState(65);
  const [alertLevel, setAlertLevel] = useState(45);
  const [cameraPreset, setCameraPreset] = useState("oblique");
  const [orbit360, setOrbit360] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(true);
  const [glowLevel, setGlowLevel] = useState(82);
  const [sceneReady, setSceneReady] = useState(false);
  const [initError, setInitError] = useState("");
  const floodEntities = useRef([]);
  const trafficEntities = useRef([]);
  const alertEntities = useRef([]);
  const kcValleyEntities = useRef([]);
  const cityGeometryEntities = useRef([]);
  const roadFlowEntities = useRef([]);
  const fogBandEntities = useRef([]);
  const skylineSpeckleEntities = useRef([]);

  const kcValleyCenter = { lon: 77.644, lat: 12.925 };
  const kcValleyBoundary = [
    77.59, 12.962,
    77.607, 12.966,
    77.628, 12.966,
    77.651, 12.963,
    77.676, 12.954,
    77.695, 12.942,
    77.703, 12.926,
    77.699, 12.91,
    77.684, 12.896,
    77.662, 12.886,
    77.637, 12.883,
    77.616, 12.886,
    77.6, 12.896,
    77.591, 12.913,
    77.588, 12.932,
    77.59, 12.962
  ];
  const heroCamera = {
    overview: {
      destination: Cesium.Cartesian3.fromDegrees(77.644, 12.925, 11800),
      orientation: {
        heading: Cesium.Math.toRadians(28),
        pitch: Cesium.Math.toRadians(-54),
        roll: 0
      }
    },
    lock: {
      destination: Cesium.Cartesian3.fromDegrees(77.646, 12.923, 4600),
      orientation: {
        heading: Cesium.Math.toRadians(34),
        pitch: Cesium.Math.toRadians(-47),
        roll: 0
      }
    }
  };
  const cesiumToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

  const cameraViews = {
    front: {
      destination: Cesium.Cartesian3.fromDegrees(77.64, 12.914, 1600),
      orientation: {
        heading: Cesium.Math.toRadians(22),
        pitch: Cesium.Math.toRadians(-18),
        roll: 0
      }
    },
    oblique: heroCamera.lock,
    top: {
      destination: Cesium.Cartesian3.fromDegrees(77.644, 12.925, 16800),
      orientation: {
        heading: Cesium.Math.toRadians(18),
        pitch: Cesium.Math.toRadians(-89),
        roll: 0
      }
    }
  };

  const clearEntities = (viewer, listRef) => {
    listRef.current.forEach((entity) => viewer.entities.remove(entity));
    listRef.current = [];
  };

  const stopOrbit = (viewer) => {
    if (!viewer || !orbitTickRef.current) return;
    viewer.clock.onTick.removeEventListener(orbitTickRef.current);
    orbitTickRef.current = null;
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    orbitActiveRef.current = false;
  };

  const applyCameraView = (viewer, preset, duration = 1.8) => {
    if (!viewer || !cameraViews[preset]) return;
    viewer.camera.flyTo({
      destination: cameraViews[preset].destination,
      orientation: cameraViews[preset].orientation,
      duration
    });
  };

  const startOrbit = (viewer) => {
    if (!viewer) return;
    stopOrbit(viewer);

    const target = Cesium.Cartesian3.fromDegrees(kcValleyCenter.lon, kcValleyCenter.lat, 160);
    const range = 2600;
    const pitch = Cesium.Math.toRadians(-28);
    orbitHeadingRef.current = viewer.camera.heading;

    const tickFn = () => {
      orbitHeadingRef.current += Cesium.Math.toRadians(0.12);
      viewer.camera.lookAt(
        target,
        new Cesium.HeadingPitchRange(orbitHeadingRef.current, pitch, range)
      );
    };

    orbitTickRef.current = tickFn;
    viewer.clock.onTick.addEventListener(tickFn);
    orbitActiveRef.current = true;
  };

  const drawTraffic = (viewer, enabled, level) => {
    clearEntities(viewer, trafficEntities);
    if (!enabled) return;

    const corridors = [
      [77.603, 12.946, 77.618, 12.94, 77.634, 12.936, 77.651, 12.932, 77.671, 12.926],
      [77.598, 12.92, 77.614, 12.918, 77.632, 12.916, 77.652, 12.913, 77.676, 12.907],
      [77.607, 12.96, 77.625, 12.955, 77.645, 12.947, 77.665, 12.938, 77.687, 12.927]
    ];

    const trafficColor =
      level >= 75
        ? Cesium.Color.fromCssColorString("#ff658a")
        : level >= 45
          ? Cesium.Color.fromCssColorString("#ffd166")
          : Cesium.Color.fromCssColorString("#5ffbf1");

    corridors.forEach((path, index) => {
      const entity = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(path),
          clampToGround: true,
          width: 3 + index + Math.floor(level / 30),
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.24,
            color: trafficColor.withAlpha(0.92)
          })
        }
      });
      trafficEntities.current.push(entity);
    });
  };

  const drawAlerts = (viewer, enabled, level) => {
    clearEntities(viewer, alertEntities);
    if (!enabled) return;

    const alertPoints = [
      { lon: 77.621, lat: 12.938, label: "Koramangala Stress" },
      { lon: 77.644, lat: 12.922, label: "Agara Drain Alert" },
      { lon: 77.676, lat: 12.906, label: "Challaghatta Flood Risk" }
    ];

    const severityColor =
      level >= 70
        ? Cesium.Color.fromCssColorString("#ff2d55")
        : level >= 40
          ? Cesium.Color.fromCssColorString("#ffd166")
          : Cesium.Color.fromCssColorString("#4ef5ff");

    alertPoints.forEach((point) => {
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 22),
        point: {
          pixelSize: 9 + Math.floor(level / 18),
          color: severityColor,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: point.label,
          fillColor: Cesium.Color.fromCssColorString("#b7f8ff"),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -14)
        }
      });
      alertEntities.current.push(entity);
    });
  };

  const drawFlood = (viewer, rainLevel, enabled) => {
    clearEntities(viewer, floodEntities);
    if (!enabled || rainLevel <= 10) return;

    const patches = [
      [77.662, 12.921, 77.673, 12.921, 77.673, 12.928, 77.662, 12.928],
      [77.646, 12.91, 77.657, 12.91, 77.657, 12.916, 77.646, 12.916],
      [77.628, 12.918, 77.639, 12.918, 77.639, 12.924, 77.628, 12.924],
      [77.674, 12.904, 77.686, 12.904, 77.686, 12.911, 77.674, 12.911]
    ];

    const activePatchCount = Math.min(patches.length, Math.floor(rainLevel / 25) + 1);
    const floodAlpha = Math.min(0.75, 0.18 + rainLevel / 140);

    for (let i = 0; i < activePatchCount; i += 1) {
      const ring = patches[i];
        const entity = viewer.entities.add({
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(ring),
            material: Cesium.Color.CYAN.withAlpha(floodAlpha),
            height: 0,
            extrudedHeight: 1 + rainLevel * 0.18,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            outline: false
          }
        });

      floodEntities.current.push(entity);

      const boundaryEntity = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            ring[0], ring[1],
            ring[2], ring[3],
            ring[4], ring[5],
            ring[6], ring[7],
            ring[0], ring[1]
          ]),
          clampToGround: true,
          width: 2,
          material: Cesium.Color.WHITE.withAlpha(0.9)
        }
      });
      floodEntities.current.push(boundaryEntity);
    }
  };

  const drawKcValleyHighlight = (viewer) => {
    clearEntities(viewer, kcValleyEntities);

    const fill = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(kcValleyBoundary),
        material: Cesium.Color.fromCssColorString("#63f5ff").withAlpha(0.12),
        height: 0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });

    const outline = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(kcValleyBoundary),
        clampToGround: true,
        width: 4.5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.55,
          color: Cesium.Color.fromCssColorString("#ff4a5f")
        })
      }
    });

    const dashedOutline = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(kcValleyBoundary),
        clampToGround: true,
        width: 2.2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString("#ffd1d8").withAlpha(0.9),
          dashLength: 18
        })
      }
    });

    const tag = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(kcValleyCenter.lon, kcValleyCenter.lat + 0.03, 36),
      point: {
        pixelSize: 1,
        color: Cesium.Color.TRANSPARENT,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
      },
      label: {
        text: "KORAMANGALA-CHALLAGHATTA VALLEY ZONE",
        font: "700 14px sans-serif",
        fillColor: Cesium.Color.fromCssColorString("#ffe3e8"),
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineColor: Cesium.Color.fromCssColorString("#6a1020"),
        outlineWidth: 3,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString("#4a0c17").withAlpha(0.74),
        pixelOffset: new Cesium.Cartesian2(0, -6)
      }
    });

    const localityLabels = [
      { lon: 77.619, lat: 12.936, name: "Koramangala" },
      { lon: 77.64, lat: 12.922, name: "Agara" },
      { lon: 77.66, lat: 12.924, name: "Bellandur Side" },
      { lon: 77.681, lat: 12.905, name: "Challaghatta" }
    ];

    localityLabels.forEach((loc) => {
      const marker = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, 18),
        point: {
          pixelSize: 4,
          color: Cesium.Color.fromCssColorString("#ff6c7f"),
          outlineColor: Cesium.Color.fromCssColorString("#ffe6ea"),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: loc.name,
          font: "600 12px sans-serif",
          fillColor: Cesium.Color.fromCssColorString("#ffdbe2"),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.fromCssColorString("#4a0f1b"),
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10)
        }
      });
      kcValleyEntities.current.push(marker);
    });

    const landcoverZones = [
      {
        type: "forest",
        ring: [77.596, 12.911, 77.617, 12.912, 77.623, 12.902, 77.611, 12.891, 77.597, 12.896],
        color: "#33f3b9",
        alpha: 0.13
      },
      {
        type: "forest",
        ring: [77.661, 12.895, 77.679, 12.899, 77.684, 12.909, 77.668, 12.914, 77.655, 12.907],
        color: "#2ee2ad",
        alpha: 0.12
      },
      {
        type: "grassland",
        ring: [77.604, 12.944, 77.628, 12.947, 77.639, 12.938, 77.621, 12.931, 77.606, 12.935],
        color: "#90ff9a",
        alpha: 0.1
      },
      {
        type: "grassland",
        ring: [77.664, 12.943, 77.688, 12.938, 77.696, 12.927, 77.679, 12.921, 77.662, 12.929],
        color: "#9af8a0",
        alpha: 0.1
      },
      {
        type: "field",
        ring: [77.631, 12.885, 77.653, 12.887, 77.661, 12.899, 77.644, 12.905, 77.628, 12.898],
        color: "#ffd872",
        alpha: 0.11
      },
      {
        type: "field",
        ring: [77.676, 12.892, 77.696, 12.897, 77.698, 12.911, 77.68, 12.915, 77.668, 12.904],
        color: "#ffc95a",
        alpha: 0.11
      }
    ];

    landcoverZones.forEach((zone) => {
      const area = viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(zone.ring),
          material: Cesium.Color.fromCssColorString(zone.color).withAlpha(zone.alpha),
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(zone.color).withAlpha(0.45)
        }
      });
      kcValleyEntities.current.push(area);
    });

    const lakes = [
      [77.633, 12.923, 77.638, 12.923, 77.638, 12.927, 77.633, 12.927],
      [77.654, 12.924, 77.664, 12.924, 77.664, 12.931, 77.654, 12.931],
      [77.676, 12.902, 77.684, 12.902, 77.684, 12.908, 77.676, 12.908]
    ];

    lakes.forEach((ring) => {
      const lake = viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(ring),
          material: Cesium.Color.fromCssColorString("#67f5ff").withAlpha(0.42),
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#d8ffff").withAlpha(0.9)
        }
      });
      const lakeEdge = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            ring[0], ring[1],
            ring[2], ring[3],
            ring[4], ring[5],
            ring[6], ring[7],
            ring[0], ring[1]
          ]),
          clampToGround: true,
          width: 2.4,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.44,
            color: Cesium.Color.fromCssColorString("#bfffff").withAlpha(0.92)
          })
        }
      });
      kcValleyEntities.current.push(lake);
      kcValleyEntities.current.push(lakeEdge);
    });

    const extinctLakes = [
      [77.623, 12.918, 77.628, 12.918, 77.628, 12.922, 77.623, 12.922],
      [77.671, 12.935, 77.675, 12.935, 77.675, 12.939, 77.671, 12.939]
    ];

    extinctLakes.forEach((ring) => {
      const extinctPatch = viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(ring),
          material: Cesium.Color.fromCssColorString("#ff7777").withAlpha(0.24),
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#ff9ba5").withAlpha(0.8)
        }
      });
      kcValleyEntities.current.push(extinctPatch);
    });

    kcValleyEntities.current.push(fill, outline, dashedOutline, tag);
  };

  const drawUrbanContext = (viewer, enableWireframe = true) => {
    clearEntities(viewer, cityGeometryEntities);

    // CENTER: KC Valley, spacing enforces NO OVERLAP
    const centerLon = kcValleyCenter.lon;
    const centerLat = kcValleyCenter.lat;
    
    // Grid configuration: parcels sized to PREVENT overlap
    const lonStep = 0.0024;   // ~250m spacing
    const latStep = 0.002;    // ~220m spacing
    const colsLeft = 6;
    const colsRight = 7;
    const rowsBottom = 5;
    const rowsTop = 6;

    // Ground grid (digital blueprint effect)
    const addGroundGrid = () => {
      for (let x = -colsLeft; x <= colsRight; x++) {
        const lon = centerLon + x * lonStep;
        const gridLine = viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              lon, centerLat - rowsBottom * latStep - latStep * 0.5,
              lon, centerLat + rowsTop * latStep + latStep * 0.5
            ]),
            clampToGround: true,
            width: 1,
            material: Cesium.Color.fromCssColorString("#5db8d8").withAlpha(0.12)
          }
        });
        cityGeometryEntities.current.push(gridLine);
      }

      for (let y = -rowsBottom; y <= rowsTop; y++) {
        const lat = centerLat + y * latStep;
        const gridLine = viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              centerLon - colsLeft * lonStep - lonStep * 0.5, lat,
              centerLon + colsRight * lonStep + lonStep * 0.5, lat
            ]),
            clampToGround: true,
            width: 1,
            material: Cesium.Color.fromCssColorString("#5db8d8").withAlpha(0.12)
          }
        });
        cityGeometryEntities.current.push(gridLine);
      }
    };

    addGroundGrid();
  };

  const drawRoadFlow = (viewer) => {
    clearEntities(viewer, roadFlowEntities);

    const routes = [
      [77.603, 12.946, 77.618, 12.94, 77.634, 12.936, 77.651, 12.932, 77.671, 12.926],
      [77.598, 12.92, 77.614, 12.918, 77.632, 12.916, 77.652, 12.913, 77.676, 12.907],
      [77.607, 12.96, 77.625, 12.955, 77.645, 12.947, 77.665, 12.938, 77.687, 12.927],
      [77.618, 12.886, 77.63, 12.895, 77.646, 12.904, 77.664, 12.913, 77.683, 12.922]
    ];

    routes.forEach((path, index) => {
      const pulseColor = new Cesium.CallbackProperty(() => {
        const t = Date.now() * 0.002 + index * 0.8;
        const alpha = 0.36 + 0.48 * (0.5 + 0.5 * Math.sin(t));
        return Cesium.Color.fromCssColorString("#7af2ff").withAlpha(alpha);
      }, false);

      const tracer = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(path),
          clampToGround: true,
          width: 2.2,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.34,
            taperPower: 0.6,
            color: pulseColor
          })
        }
      });

      roadFlowEntities.current.push(tracer);
    });
  };

  const drawFogBands = (viewer) => {
    clearEntities(viewer, fogBandEntities);

    const bandConfig = [
      { scale: 1.6, height: 160, alpha: 0.08 },
      { scale: 1.25, height: 290, alpha: 0.06 },
      { scale: 0.95, height: 440, alpha: 0.05 }
    ];

    bandConfig.forEach((band, i) => {
      const fog = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(kcValleyCenter.lon, kcValleyCenter.lat, band.height),
        ellipse: {
          semiMajorAxis: 6200 * band.scale,
          semiMinorAxis: 4700 * band.scale,
          material: Cesium.Color.fromCssColorString("#6fefff").withAlpha(band.alpha),
          height: band.height,
          extrudedHeight: band.height + 70 + i * 20,
          outline: false
        }
      });

      fogBandEntities.current.push(fog);
    });
  };

  const drawSkylineSpeckles = (viewer) => {
    clearEntities(viewer, skylineSpeckleEntities);

    const speckCount = 90;
    for (let i = 0; i < speckCount; i += 1) {
      const theta = (Math.PI * 2 * i) / speckCount;
      const radius = 0.018 + (i % 9) * 0.0013;
      const lon = kcValleyCenter.lon + Math.cos(theta) * radius;
      const lat = kcValleyCenter.lat + Math.sin(theta) * (radius * 0.74);
      const height = 180 + ((i * 29) % 320);

      const speck = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        point: {
          pixelSize: 1.8 + (i % 3) * 0.4,
          color: Cesium.Color.fromCssColorString("#d9ffff").withAlpha(0.7),
          outlineColor: Cesium.Color.fromCssColorString("#7cf1ff").withAlpha(0.7),
        }
      });

      skylineSpeckleEntities.current.push(speck);
    }
  };

  const applyNeonBuildingStyle = (tileset) => {
    tileset.colorBlendMode = Cesium.Cesium3DTileColorBlendMode.REPLACE;
    tileset.colorBlendAmount = 1.0;
    tileset.dynamicScreenSpaceError = false;
    tileset.maximumScreenSpaceError = 1.0;
    tileset.preferLeaves = true;
    tileset.preloadFlightDestinations = true;
    tileset.style = new Cesium.Cesium3DTileStyle({
      color:
        "isFinite(${feature['cesium#estimatedHeight']}) && ${feature['cesium#estimatedHeight']} > 120 ? color('#d9ffff', 0.92) : " +
        "isFinite(${feature['cesium#estimatedHeight']}) && ${feature['cesium#estimatedHeight']} > 60 ? color('#9ef4ff', 0.86) : " +
        "color('#78e8ff', 0.8)",
      show: "${feature['building']} !== null"
    });
  };

  useEffect(() => {
    if (viewerRef.current) return;

    let isDisposed = false;

    const initViewer = async () => {
      try {
        if (cesiumToken) {
          Cesium.Ion.defaultAccessToken = cesiumToken;
        } else {
          setInitError("VITE_CESIUM_ION_TOKEN is missing. Terrain/building quality can be limited.");
        }

        const terrainProvider = await Cesium.createWorldTerrainAsync();
        if (isDisposed || !cesiumContainer.current) return;

        const viewer = new Cesium.Viewer(cesiumContainer.current, {
          terrainProvider,
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          infoBox: false,
          selectionIndicator: false
        });

        viewer.imageryLayers.removeAll();
        viewer.scene.globe.baseColor = Cesium.Color.BLACK;
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#062448");
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.showGroundAtmosphere = false;
        viewer.scene.globe.translucency.enabled = false;
        viewer.scene.globe.material = Cesium.Material.fromType("ElevationContour");
        viewer.scene.globe.material.uniforms.color = Cesium.Color.fromCssColorString("#35dfff").withAlpha(0.65);
        viewer.scene.globe.material.uniforms.spacing = 85.0;
        viewer.scene.globe.material.uniforms.width = 2.0;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0011;
        viewer.scene.fog.minimumBrightness = 0.22;
        viewer.scene.skyBox.show = false;
        viewer.scene.skyAtmosphere.show = false;
        viewer.scene.postProcessStages.fxaa.enabled = true;
        viewer.scene.highDynamicRange = true;
        viewer.scene.postProcessStages.bloom.enabled = true;
        viewer.scene.postProcessStages.bloom.uniforms.glowOnly = false;
        viewer.scene.postProcessStages.bloom.uniforms.contrast = 138;
        viewer.scene.postProcessStages.bloom.uniforms.brightness = -0.2;
        viewer.scene.postProcessStages.bloom.uniforms.delta = 1.0;
        viewer.scene.postProcessStages.bloom.uniforms.sigma = 3.6;
        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.2);
        viewer.targetFrameRate = 60;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000;
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 40;
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableLook = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.inertiaSpin = 0.94;
        viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.9;
        viewer.scene.screenSpaceCameraController.inertiaZoom = 0.82;

        viewer.camera.setView(heroCamera.overview);

        const buildings = await Cesium.createOsmBuildingsAsync();
        if (!isDisposed) {
          applyNeonBuildingStyle(buildings);
          viewer.scene.primitives.add(buildings);
          buildingsRef.current = buildings;
        }

        viewerRef.current = viewer;
        drawUrbanContext(viewer, wireframeMode);
        drawRoadFlow(viewer);
        drawFogBands(viewer);
        drawSkylineSpeckles(viewer);
        drawKcValleyHighlight(viewer);
        drawTraffic(viewer, showTraffic, trafficLevel);
        drawAlerts(viewer, showAlerts, alertLevel);
        drawFlood(viewer, rain, showFlood);

        viewer.camera.moveStart.addEventListener(() => {
          if (orbitActiveRef.current) {
            setOrbit360(false);
          }
        });

        viewer.camera.flyTo({
          destination: heroCamera.lock.destination,
          orientation: heroCamera.lock.orientation,
          duration: 3.2,
          easingFunction: Cesium.EasingFunction.CUBIC_OUT,
          complete: () => {
            if (!isDisposed) {
              setSceneReady(true);
            }
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Cesium viewer init failed";
        setInitError(message);
      }
    };

    initViewer();

    return () => {
      isDisposed = true;
      const viewer = viewerRef.current;
      if (viewer) {
        clearEntities(viewer, floodEntities);
        clearEntities(viewer, trafficEntities);
        clearEntities(viewer, alertEntities);
        clearEntities(viewer, kcValleyEntities);
        clearEntities(viewer, cityGeometryEntities);
        clearEntities(viewer, roadFlowEntities);
        clearEntities(viewer, fogBandEntities);
        clearEntities(viewer, skylineSpeckleEntities);
        stopOrbit(viewer);
        if (buildingsRef.current) {
          viewer.scene.primitives.remove(buildingsRef.current);
        }
        viewer.destroy();
      }
      buildingsRef.current = null;
      viewerRef.current = null;
      setSceneReady(false);
    };
  }, []);

  const updateFlood = (rainLevel, enabled = showFlood) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    drawFlood(viewer, rainLevel, enabled);
  };

  const handleRainChange = (e) => {
    const value = Number(e.target.value);
    setRain(value);
    updateFlood(value, showFlood);
  };

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    drawTraffic(viewer, showTraffic, trafficLevel);
  }, [showTraffic, trafficLevel]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    drawAlerts(viewer, showAlerts, alertLevel);
  }, [showAlerts, alertLevel]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    updateFlood(rain, showFlood);
  }, [showFlood]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !sceneReady) return;

    if (orbit360) {
      startOrbit(viewer);
      return;
    }

    stopOrbit(viewer);
    applyCameraView(viewer, cameraPreset, 1.5);
  }, [orbit360, sceneReady]);

  useEffect(() => {
    orbitActiveRef.current = orbit360;
  }, [orbit360]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !sceneReady || orbit360) return;
    applyCameraView(viewer, cameraPreset, 1.5);
  }, [cameraPreset, sceneReady, orbit360]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    drawUrbanContext(viewer, wireframeMode);
  }, [wireframeMode]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const bloom = viewer.scene.postProcessStages.bloom;
    if (!bloom?.enabled) return;

    const factor = glowLevel / 100;
    bloom.uniforms.contrast = 120 + factor * 30;
    bloom.uniforms.brightness = -0.22 + factor * 0.1;
    bloom.uniforms.sigma = 2.8 + factor * 1.6;
  }, [glowLevel]);

  return (
    <div
      style={{
        background: "radial-gradient(circle at 20% 20%, #1a63bf 0%, #083a7f 42%, #041a3d 72%, #01060f 100%)",
        minHeight: "100vh",
        color: "#dbffff"
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          ref={cesiumContainer}
          style={{ width: "100%", height: "80vh", borderBottom: "1px solid #1f74bd" }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(168,236,255,0.1) 0px, rgba(168,236,255,0.1) 1px, transparent 1px, transparent 4px), linear-gradient(180deg, rgba(160,232,255,0.11), rgba(0,0,0,0.16))"
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: "10px",
            border: "1px solid rgba(150, 236, 255, 0.52)",
            boxShadow: "inset 0 0 46px rgba(87, 194, 255, 0.28)",
            pointerEvents: "none"
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            padding: "8px 12px",
            background: "rgba(7, 37, 83, 0.74)",
            border: "1px solid rgba(122, 229, 255, 0.88)",
            color: "#ebffff",
            fontSize: "12px",
            letterSpacing: "0.06em",
            pointerEvents: "none"
          }}
        >
          {sceneReady ? "KC VALLEY LIVE TELEMETRY ONLINE" : "INITIALIZING CITY STREAM..."}
        </div>
      </div>

      <div
        style={{
          padding: "14px 16px",
          background: "linear-gradient(90deg, rgba(2,15,37,0.96), rgba(5,31,68,0.88))",
          borderTop: "1px solid #1f74bd"
        }}
      >
        <p style={{ margin: 0, fontWeight: 800, letterSpacing: "0.05em" }}>KC VALLEY URBAN DIGITAL TWIN</p>
        <p style={{ margin: "6px 0 12px", opacity: 0.9 }}>
          Futuristic city operations map: flood spread, traffic stress, and alert hotspots.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div style={{ padding: "8px 10px", border: "1px solid #2f86ca", borderRadius: "8px", background: "rgba(17,78,135,0.2)" }}>
            Rain Index: <strong>{rain}</strong>
          </div>
          <div style={{ padding: "8px 10px", border: "1px solid #2f86ca", borderRadius: "8px", background: "rgba(17,78,135,0.2)" }}>
            Traffic Load: <strong>{trafficLevel}</strong>
          </div>
          <div style={{ padding: "8px 10px", border: "1px solid #2f86ca", borderRadius: "8px", background: "rgba(17,78,135,0.2)" }}>
            Alert Severity: <strong>{alertLevel}</strong>
          </div>
          <div style={{ padding: "8px 10px", border: "1px solid #2f86ca", borderRadius: "8px", background: "rgba(17,78,135,0.2)" }}>
            Camera: <strong>{orbit360 ? "360 Orbit" : cameraPreset}</strong>
          </div>
          <div style={{ padding: "8px 10px", border: "1px solid #2f86ca", borderRadius: "8px", background: "rgba(17,78,135,0.2)" }}>
            Geometry: <strong>{wireframeMode ? "Wireframe" : "Solid Neon"}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <button
            type="button"
            onClick={() => {
              setOrbit360(false);
              setCameraPreset("front");
            }}
            style={{ background: "#0b4e90", color: "#e8feff", border: "1px solid #78ddff", borderRadius: "6px", padding: "6px 10px", cursor: "pointer" }}
          >
            Front View
          </button>
          <button
            type="button"
            onClick={() => {
              setOrbit360(false);
              setCameraPreset("oblique");
            }}
            style={{ background: "#0b4e90", color: "#e8feff", border: "1px solid #78ddff", borderRadius: "6px", padding: "6px 10px", cursor: "pointer" }}
          >
            Oblique View
          </button>
          <button
            type="button"
            onClick={() => {
              setOrbit360(false);
              setCameraPreset("top");
            }}
            style={{ background: "#0b4e90", color: "#e8feff", border: "1px solid #78ddff", borderRadius: "6px", padding: "6px 10px", cursor: "pointer" }}
          >
            Top View
          </button>
          <button
            type="button"
            onClick={() => setOrbit360((prev) => !prev)}
            style={{ background: orbit360 ? "#1373c9" : "#0b4e90", color: "#e8feff", border: "1px solid #78ddff", borderRadius: "6px", padding: "6px 10px", cursor: "pointer" }}
          >
            360 View
          </button>
          <button
            type="button"
            onClick={() => setWireframeMode((prev) => !prev)}
            style={{ background: wireframeMode ? "#1373c9" : "#0b4e90", color: "#e8feff", border: "1px solid #78ddff", borderRadius: "6px", padding: "6px 10px", cursor: "pointer" }}
          >
            Geometry Mode
          </button>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Rain Intensity: {rain}
            <input
              type="range"
              min="0"
              max="100"
              value={rain}
              onChange={handleRainChange}
              style={{ marginLeft: "10px" }}
            />
          </label>

          <label>
            Traffic Level: {trafficLevel}
            <input
              type="range"
              min="0"
              max="100"
              value={trafficLevel}
              onChange={(e) => setTrafficLevel(Number(e.target.value))}
              style={{ marginLeft: "10px" }}
            />
          </label>

          <label>
            Alert Level: {alertLevel}
            <input
              type="range"
              min="0"
              max="100"
              value={alertLevel}
              onChange={(e) => setAlertLevel(Number(e.target.value))}
              style={{ marginLeft: "10px" }}
            />
          </label>

          <label>
            Hologram Glow: {glowLevel}
            <input
              type="range"
              min="40"
              max="100"
              value={glowLevel}
              onChange={(e) => setGlowLevel(Number(e.target.value))}
              style={{ marginLeft: "10px" }}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={showTraffic}
              onChange={(e) => setShowTraffic(e.target.checked)}
            />
            Traffic
          </label>

          <label>
            <input
              type="checkbox"
              checked={showAlerts}
              onChange={(e) => setShowAlerts(e.target.checked)}
            />
            Alerts
          </label>

          <label>
            <input
              type="checkbox"
              checked={showFlood}
              onChange={(e) => setShowFlood(e.target.checked)}
            />
            Flood
          </label>
        </div>

        {initError ? (
          <p style={{ color: "#ff9aa2", marginTop: "10px" }}>
            Cesium init warning: {initError}
          </p>
        ) : null}
      </div>
    </div>
  );
}