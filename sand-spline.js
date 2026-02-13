// ═══════════════════════════════════════════════════════════════
// Sand Spline — Generative Art Generator
// Based on https://inconvergent.net/generative/sand-spline/
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── Color Palettes ──────────────────────────────────────────

  const PALETTES = {
    ink: [
      [20, 20, 30],
      [40, 40, 60],
      [60, 50, 80],
      [30, 30, 50],
      [50, 40, 70],
    ],
    ocean: [
      [10, 60, 120],
      [20, 100, 160],
      [30, 140, 180],
      [15, 80, 140],
      [40, 120, 170],
      [5, 50, 100],
    ],
    sunset: [
      [180, 60, 30],
      [200, 80, 40],
      [160, 40, 60],
      [220, 120, 50],
      [140, 30, 50],
      [190, 70, 70],
    ],
    forest: [
      [30, 80, 40],
      [40, 100, 50],
      [20, 70, 30],
      [50, 110, 60],
      [25, 60, 35],
      [60, 90, 45],
    ],
    neon: [
      [255, 20, 100],
      [20, 200, 255],
      [255, 200, 0],
      [100, 255, 100],
      [200, 50, 255],
    ],
    earth: [
      [120, 80, 50],
      [140, 100, 60],
      [100, 70, 40],
      [160, 120, 80],
      [90, 60, 35],
      [110, 85, 55],
    ],
    mono: [
      [30, 30, 30],
      [50, 50, 50],
      [70, 70, 70],
      [40, 40, 40],
      [60, 60, 60],
    ],
    pastel: [
      [180, 130, 160],
      [130, 170, 190],
      [170, 190, 140],
      [200, 170, 130],
      [150, 140, 190],
      [190, 150, 150],
    ],
  };

  // ── Presets ─────────────────────────────────────────────────

  const PRESETS = {
    default: {
      numSplines: 8,
      numPoints: 6,
      grains: 80,
      noise: 0.002,
      noiseGrowth: 1.5,
      opacity: 0.03,
      speed: 3,
      palette: "ink",
      bgColor: "#faf8f5",
      layout: "horizontal",
    },
    storm: {
      numSplines: 20,
      numPoints: 10,
      grains: 150,
      noise: 0.008,
      noiseGrowth: 2.5,
      opacity: 0.015,
      speed: 8,
      palette: "ocean",
      bgColor: "#1a1a2e",
      layout: "random",
    },
    gentle: {
      numSplines: 5,
      numPoints: 4,
      grains: 60,
      noise: 0.0008,
      noiseGrowth: 1.2,
      opacity: 0.02,
      speed: 1,
      palette: "pastel",
      bgColor: "#faf8f5",
      layout: "horizontal",
    },
    chaos: {
      numSplines: 30,
      numPoints: 12,
      grains: 200,
      noise: 0.015,
      noiseGrowth: 3.0,
      opacity: 0.01,
      speed: 15,
      palette: "neon",
      bgColor: "#0d0d0d",
      layout: "random",
    },
    minimal: {
      numSplines: 3,
      numPoints: 4,
      grains: 40,
      noise: 0.001,
      noiseGrowth: 1.3,
      opacity: 0.04,
      speed: 2,
      palette: "mono",
      bgColor: "#ffffff",
      layout: "horizontal",
    },
    dense: {
      numSplines: 25,
      numPoints: 8,
      grains: 120,
      noise: 0.003,
      noiseGrowth: 1.8,
      opacity: 0.012,
      speed: 5,
      palette: "earth",
      bgColor: "#f0ead6",
      layout: "vertical",
    },
    circle: {
      numSplines: 12,
      numPoints: 8,
      grains: 100,
      noise: 0.003,
      noiseGrowth: 1.6,
      opacity: 0.025,
      speed: 3,
      palette: "sunset",
      bgColor: "#faf8f5",
      layout: "radial",
    },
    radial: {
      numSplines: 20,
      numPoints: 6,
      grains: 90,
      noise: 0.004,
      noiseGrowth: 2.0,
      opacity: 0.018,
      speed: 4,
      palette: "forest",
      bgColor: "#1a1a2e",
      layout: "radial",
    },
  };

  // ── State ───────────────────────────────────────────────────

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // Float buffer for high-precision alpha accumulation
  let floatBuffer = null;
  let bufferWidth = 0;
  let bufferHeight = 0;

  let splines = [];
  let running = true;
  let iterationCount = 0;
  let animFrameId = null;

  // Current parameters (read from controls)
  let params = { ...PRESETS.default };

  // ── DOM References ──────────────────────────────────────────

  const els = {
    preset: document.getElementById("preset"),
    numSplines: document.getElementById("numSplines"),
    numPoints: document.getElementById("numPoints"),
    grains: document.getElementById("grains"),
    noise: document.getElementById("noise"),
    noiseGrowth: document.getElementById("noiseGrowth"),
    opacity: document.getElementById("opacity"),
    speed: document.getElementById("speed"),
    palette: document.getElementById("palette"),
    bgColor: document.getElementById("bgColor"),
    layout: document.getElementById("layout"),
    btnRestart: document.getElementById("btnRestart"),
    btnPause: document.getElementById("btnPause"),
    btnSave: document.getElementById("btnSave"),
    iterCount: document.getElementById("iterCount"),
    numSplinesVal: document.getElementById("numSplinesVal"),
    numPointsVal: document.getElementById("numPointsVal"),
    grainsVal: document.getElementById("grainsVal"),
    noiseVal: document.getElementById("noiseVal"),
    noiseGrowthVal: document.getElementById("noiseGrowthVal"),
    opacityVal: document.getElementById("opacityVal"),
    speedVal: document.getElementById("speedVal"),
  };

  // ── Utility ─────────────────────────────────────────────────

  function gaussianRandom() {
    // Box-Muller transform for normal distribution
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // ── B-Spline Evaluation ─────────────────────────────────────
  // Attempt a cubic B-spline through the control points.
  // We evaluate points along the spline using De Boor's algorithm
  // simplified for uniform knots.

  function evaluateBSpline(controlPoints, numSamples) {
    const n = controlPoints.length;
    if (n < 2) return controlPoints.slice();

    const points = [];

    // For cubic B-spline, we use a Catmull-Rom style interpolation
    // which passes through the control points and gives smooth curves.
    for (let i = 0; i < numSamples; i++) {
      const t = i / (numSamples - 1);
      const segment = t * (n - 1);
      const idx = Math.min(Math.floor(segment), n - 2);
      const local = segment - idx;

      // Get 4 control points for Catmull-Rom (clamp at boundaries)
      const p0 = controlPoints[Math.max(0, idx - 1)];
      const p1 = controlPoints[idx];
      const p2 = controlPoints[Math.min(n - 1, idx + 1)];
      const p3 = controlPoints[Math.min(n - 1, idx + 2)];

      // Catmull-Rom spline evaluation
      const tt = local * local;
      const ttt = tt * local;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * local +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * local +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt);

      points.push({ x, y });
    }

    return points;
  }

  // ── Spline Creation ─────────────────────────────────────────

  function createSpline(index, total) {
    const w = canvas.width;
    const h = canvas.height;
    const pts = [];
    const numPts = params.numPoints;
    const layout = params.layout;
    const palette = PALETTES[params.palette];
    const color = palette[index % palette.length];

    if (layout === "horizontal") {
      // Horizontal splines spread vertically
      const yBase = (h * (index + 1)) / (total + 1);
      for (let j = 0; j < numPts; j++) {
        const t = j / (numPts - 1);
        pts.push({
          x: t * w,
          y: yBase + gaussianRandom() * h * 0.05,
        });
      }
    } else if (layout === "vertical") {
      const xBase = (w * (index + 1)) / (total + 1);
      for (let j = 0; j < numPts; j++) {
        const t = j / (numPts - 1);
        pts.push({
          x: xBase + gaussianRandom() * w * 0.05,
          y: t * h,
        });
      }
    } else if (layout === "radial") {
      const cx = w / 2;
      const cy = h / 2;
      const angle = (index / total) * Math.PI * 2;
      const rMin = Math.min(w, h) * 0.05;
      const rMax = Math.min(w, h) * 0.45;
      for (let j = 0; j < numPts; j++) {
        const t = j / (numPts - 1);
        const r = lerp(rMin, rMax, t);
        const angleJitter = gaussianRandom() * 0.1;
        pts.push({
          x: cx + Math.cos(angle + angleJitter) * r,
          y: cy + Math.sin(angle + angleJitter) * r,
        });
      }
    } else {
      // random
      for (let j = 0; j < numPts; j++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
        });
      }
    }

    return {
      controlPoints: pts,
      color: color,
    };
  }

  // ── Float Buffer Management ─────────────────────────────────
  // We accumulate color in float precision to avoid the 0-255
  // rounding issue described by inconvergent.

  function initFloatBuffer() {
    bufferWidth = canvas.width;
    bufferHeight = canvas.height;
    // 4 channels: R, G, B, A
    floatBuffer = new Float64Array(bufferWidth * bufferHeight * 4);

    // Initialize with background color
    const bg = hexToRgb(params.bgColor);
    for (let i = 0; i < bufferWidth * bufferHeight; i++) {
      const idx = i * 4;
      floatBuffer[idx] = bg.r;
      floatBuffer[idx + 1] = bg.g;
      floatBuffer[idx + 2] = bg.b;
      floatBuffer[idx + 3] = 255;
    }
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 250, g: 248, b: 245 };
  }

  function paintGrain(x, y, color, alpha) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || px >= bufferWidth || py < 0 || py >= bufferHeight) return;

    const idx = (py * bufferWidth + px) * 4;
    // Alpha-blend the grain color onto the buffer
    floatBuffer[idx] = floatBuffer[idx] + (color[0] - floatBuffer[idx]) * alpha;
    floatBuffer[idx + 1] =
      floatBuffer[idx + 1] + (color[1] - floatBuffer[idx + 1]) * alpha;
    floatBuffer[idx + 2] =
      floatBuffer[idx + 2] + (color[2] - floatBuffer[idx + 2]) * alpha;
  }

  function flushBufferToCanvas() {
    const imageData = ctx.createImageData(bufferWidth, bufferHeight);
    const data = imageData.data;
    for (let i = 0; i < bufferWidth * bufferHeight; i++) {
      const idx = i * 4;
      data[idx] = Math.round(Math.min(255, Math.max(0, floatBuffer[idx])));
      data[idx + 1] = Math.round(
        Math.min(255, Math.max(0, floatBuffer[idx + 1]))
      );
      data[idx + 2] = Math.round(
        Math.min(255, Math.max(0, floatBuffer[idx + 2]))
      );
      data[idx + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ── Core Algorithm ──────────────────────────────────────────
  // Each iteration:
  // 1. Perturb control points with gaussian noise (more noise further along)
  // 2. Evaluate the B-spline through the control points
  // 3. Draw transparent grains along the spline

  function perturbSpline(spline) {
    const noiseMag = params.noise * Math.min(canvas.width, canvas.height);
    const growth = params.noiseGrowth;
    const n = spline.controlPoints.length;

    for (let i = 0; i < n; i++) {
      // Noise increases along the spline (keep first point more stable)
      const factor = Math.pow((i + 1) / n, growth);
      spline.controlPoints[i].x += gaussianRandom() * noiseMag * factor;
      spline.controlPoints[i].y += gaussianRandom() * noiseMag * factor;
    }
  }

  function drawSplineGrains(spline) {
    const numGrains = params.grains;
    const alpha = params.opacity;

    // Evaluate spline into sample points
    const curvePoints = evaluateBSpline(spline.controlPoints, numGrains);

    // Draw a grain at each sample point
    for (let i = 0; i < curvePoints.length; i++) {
      const pt = curvePoints[i];
      // Add tiny jitter to each grain for a natural look
      const jx = pt.x + gaussianRandom() * 0.5;
      const jy = pt.y + gaussianRandom() * 0.5;
      paintGrain(jx, jy, spline.color, alpha);
    }
  }

  function iterate() {
    for (let i = 0; i < splines.length; i++) {
      perturbSpline(splines[i]);
      drawSplineGrains(splines[i]);
    }
    iterationCount++;
  }

  // ── Rendering Loop ──────────────────────────────────────────

  // We only flush the float buffer to the canvas periodically for performance
  let flushCounter = 0;
  const FLUSH_INTERVAL = 4; // flush every N frames

  function frame() {
    if (!running) return;

    const stepsPerFrame = params.speed;
    for (let s = 0; s < stepsPerFrame; s++) {
      iterate();
    }

    flushCounter++;
    if (flushCounter >= FLUSH_INTERVAL) {
      flushBufferToCanvas();
      flushCounter = 0;
    }

    els.iterCount.textContent = iterationCount;
    animFrameId = requestAnimationFrame(frame);
  }

  // ── Initialization ──────────────────────────────────────────

  function resizeCanvas() {
    const container = document.getElementById("canvas-container");
    const maxW = container.clientWidth - 40;
    const maxH = container.clientHeight - 40;

    // Use a nice aspect ratio that fits the container
    const size = Math.min(maxW, maxH, 1200);
    const aspect = maxW > maxH ? 1.4 : 0.75;
    let w, h;
    if (maxW > maxH) {
      h = Math.min(size, maxH);
      w = Math.min(Math.round(h * aspect), maxW);
    } else {
      w = Math.min(size, maxW);
      h = Math.min(Math.round(w / aspect), maxH);
    }

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }

  function restart() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    iterationCount = 0;
    flushCounter = 0;

    resizeCanvas();
    initFloatBuffer();

    // Create splines
    splines = [];
    const num = params.numSplines;
    for (let i = 0; i < num; i++) {
      splines.push(createSpline(i, num));
    }

    // Clear canvas with bg color
    ctx.fillStyle = params.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    els.iterCount.textContent = "0";

    if (running) {
      animFrameId = requestAnimationFrame(frame);
    }
  }

  // ── Control Binding ─────────────────────────────────────────

  function readParams() {
    params.numSplines = parseInt(els.numSplines.value);
    params.numPoints = parseInt(els.numPoints.value);
    params.grains = parseInt(els.grains.value);
    params.noise = parseFloat(els.noise.value);
    params.noiseGrowth = parseFloat(els.noiseGrowth.value);
    params.opacity = parseFloat(els.opacity.value);
    params.speed = parseInt(els.speed.value);
    params.palette = els.palette.value;
    params.bgColor = els.bgColor.value;
    params.layout = els.layout.value;
  }

  function setControlsFromParams() {
    els.numSplines.value = params.numSplines;
    els.numPoints.value = params.numPoints;
    els.grains.value = params.grains;
    els.noise.value = params.noise;
    els.noiseGrowth.value = params.noiseGrowth;
    els.opacity.value = params.opacity;
    els.speed.value = params.speed;
    els.palette.value = params.palette;
    els.bgColor.value = params.bgColor;
    els.layout.value = params.layout;
    updateValueDisplays();
  }

  function updateValueDisplays() {
    els.numSplinesVal.textContent = els.numSplines.value;
    els.numPointsVal.textContent = els.numPoints.value;
    els.grainsVal.textContent = els.grains.value;
    els.noiseVal.textContent = parseFloat(els.noise.value).toFixed(4);
    els.noiseGrowthVal.textContent = parseFloat(els.noiseGrowth.value).toFixed(
      1
    );
    els.opacityVal.textContent = parseFloat(els.opacity.value).toFixed(3);
    els.speedVal.textContent = els.speed.value;
  }

  // Live-update controls that don't require restart
  function onLiveChange() {
    readParams();
    updateValueDisplays();
  }

  // Controls that require restart (structural changes)
  function onRestartChange() {
    readParams();
    updateValueDisplays();
    restart();
  }

  // Bind controls
  // Live controls (change during animation without restart)
  ["noise", "noiseGrowth", "opacity", "speed", "grains"].forEach(function (id) {
    els[id].addEventListener("input", onLiveChange);
  });

  // Restart controls (structural changes need new splines)
  ["numSplines", "numPoints", "layout"].forEach(function (id) {
    els[id].addEventListener("input", function () {
      onRestartChange();
    });
  });

  // Palette change: restart to re-assign colors
  els.palette.addEventListener("change", onRestartChange);

  // Background change: restart with new bg
  els.bgColor.addEventListener("change", onRestartChange);

  // Preset selector
  els.preset.addEventListener("change", function () {
    const p = PRESETS[this.value];
    if (p) {
      params = { ...p };
      setControlsFromParams();
      restart();
    }
  });

  // Buttons
  els.btnRestart.addEventListener("click", function () {
    readParams();
    restart();
  });

  els.btnPause.addEventListener("click", function () {
    running = !running;
    els.btnPause.innerHTML = running ? "&#x23f8; Pause" : "&#x25b6; Play";
    if (running) {
      animFrameId = requestAnimationFrame(frame);
    }
  });

  els.btnSave.addEventListener("click", function () {
    // Flush current state to canvas before saving
    flushBufferToCanvas();
    const link = document.createElement("a");
    link.download = "sand-spline-" + Date.now() + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      readParams();
      restart();
    }, 250);
  });

  // ── Start ───────────────────────────────────────────────────

  setControlsFromParams();
  restart();
})();
