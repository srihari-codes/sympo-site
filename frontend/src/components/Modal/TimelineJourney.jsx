import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import "./TimelineJourney.scss";

/*
 * A cinematic route through the schedule.
 *
 * Approach: the route and the landmarks live in a real 3D coordinate space,
 * and a small perspective projector maps them to screen coordinates every
 * frame. The route is drawn as ONE continuous SVG path and the landmarks are
 * ordinary DOM, positioned from the same projection.
 *
 * Why not WebGL: the site already ships a ~690KB three.js scene and ~28MB of
 * models, and a second GL context for a modal would cost far more than it
 * returns. Why not pure CSS 3D: rotating a route that spans seven screens of
 * depth throws its far end kilometres off screen, and SVG cannot be nested in
 * a preserve-3d subtree without flattening. Projecting by hand sidesteps both,
 * keeps the route genuinely continuous, and keeps every label as real,
 * selectable, screen-readable text.
 *
 * three.js is only used for its Catmull-Rom curve — it is already in the
 * bundle, so the spline costs nothing extra.
 */

/*
 * Route control points. x swings left/right, y rises and falls slightly, z
 * runs forward into the screen. The alternation is deliberate rather than
 * random: out to the left, hard across to the right, back again with the
 * swings tightening, then straightening to centre for the finish so the
 * journey resolves rather than just stopping.
 *
 * Index 0 is a lead-in before the first landmark and the last entry is a
 * run-out past the final one; landmark k sits at control index k + 1.
 */
const ROUTE_POINTS = [
  { x: -0.06, y: 0.0, z: 1.9 },
  { x: -0.34, y: 0.05, z: 0.0 },
  { x: 0.36, y: -0.06, z: -1.7 },
  { x: -0.3, y: 0.05, z: -3.4 },
  { x: 0.34, y: -0.04, z: -5.1 },
  { x: -0.31, y: 0.06, z: -6.8 },
  { x: 0.27, y: -0.05, z: -8.5 },
  { x: 0.0, y: 0.01, z: -10.2 },
  { x: 0.0, y: 0.0, z: -11.6 },
];

const SAMPLES = 300; // points along the route path
const LOOKAHEAD = 0.13; // how far ahead of the camera the route is drawn
const CAM_BACK = 0.85; // camera sits this far behind its point on the route
const CAM_HEIGHT = 0.17; // and this far above it
const NEAR = 0.12; // anything closer than this is behind the lens
const REF_DEPTH = 2.8; // depth at which a landmark renders at scale 1

/*
 * The camera deliberately turns LESS than the route does. Looking straight
 * down the tangent means every bend swings the whole world, which is what
 * makes this kind of thing nauseating; flattening the heading toward "forward"
 * lets the path visibly curve away in front of you while the horizon stays
 * roughly put. Same for lateral position — the camera only partly follows the
 * swing, so the route moves across the view instead of the view chasing it.
 */
const YAW_DAMP = 0.34; // 0 = never turns, 1 = follows every bend exactly
const CAM_FOLLOW = 0.72; // how much of the route's sideways swing the camera takes

// Travel stops with the final landmark held in view — the journey ends at the
// prize ceremony rather than drifting past it into empty space.
const ARRIVAL = 0.105;

// Per-frame easing toward the scroll position. Keeps travel unhurried and
// smooths the step between wheel notches.
const SMOOTH = 0.12;

/*
 * The camera opens dollied back from the route and flies up to the first
 * landmark, so stop 01 is approached rather than simply being there on frame
 * one. This moves the CAMERA rather than the travel parameter: travel cannot
 * go below zero, so pulling it back just clamps and yields almost no approach,
 * and it would also mean touching the mapping the snap stops depend on.
 */
const INTRO_MS = 1700;
const INTRO_DOLLY = 2.4;

const ICONS = {
  register: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 2h6v4H9z" />
      <path d="M15 4h3v18H6V4h3" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  spark: (
    <>
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      <path d="m5.6 5.6 3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 2c3 2.5 4.5 6 4.5 10L12 17l-4.5-5C7.5 8 9 4.5 12 2z" />
      <path d="M7.5 12 4 14l1.5 4 3-1.5M16.5 12 20 14l-1.5 4-3-1.5" />
      <circle cx="12" cy="9" r="1.6" />
    </>
  ),
  lunch: (
    <>
      <path d="M3 2v7a3 3 0 0 0 3 3v10M6 2v6M9 2v6" />
      <path d="M18 2c-1.5 2-2 4-2 7 0 2 .5 3 2 3v10" />
    </>
  ),
  resume: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5 16 12l-6 3.5z" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v6a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
      <path d="M9 21h6M12 15v6" />
    </>
  ),
};

const LandmarkIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {ICONS[name] ?? ICONS.spark}
  </svg>
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
};

/* Static, fully readable version for reduced-motion users. Same information,
   same order, no travel. */
const TimelineStatic = ({ timeline }) => (
  <ol className="tj-static">
    {timeline.map((stop, index) => (
      <li className="tj-static__item" key={stop.id}>
        <span className="tj-static__icon">
          <LandmarkIcon name={stop.icon} />
        </span>
        <div className="tj-static__body">
          <span className="tj-static__index">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="tj-static__name">{stop.name}</h3>
          <p className="tj-static__when">
            {stop.date} &middot; {stop.time}
          </p>
          <p className="tj-static__detail">{stop.detail}</p>
        </div>
      </li>
    ))}
  </ol>
);

const Journey = ({ timeline }) => {
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const glowRef = useRef(null);
  const gridRef = useRef(null);
  const dustRef = useRef(null);
  const progressRef = useRef(null);
  const nodeRefs = useRef([]);
  const labelRefs = useRef([]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Landmark k sits at control index k + 1, and CatmullRomCurve3 maps u
  // uniformly across segments, so its position on the curve is exact.
  const landmarkU = useMemo(
    () => timeline.map((_, i) => (i + 1) / (ROUTE_POINTS.length - 1)),
    [timeline]
  );

  useEffect(() => {
    const root = rootRef.current;
    const scroller = scrollRef.current;
    if (!root || !scroller) return;

    let width = 0;
    let height = 0;
    let focal = 0;
    let horizon = 0;
    let spread = 1;
    let route = null;
    let labelHalfWidths = [];
    let labelPad = 0;

    /*
     * The horizontal swing is baked into the route rather than applied at
     * projection time, because the camera rides the same curve — scaling one
     * without the other would peel the camera off its own path.
     */
    const buildRoute = () => {
      const curve = new THREE.CatmullRomCurve3(
        ROUTE_POINTS.map(
          (p) => new THREE.Vector3(p.x * spread, p.y, p.z)
        ),
        false,
        "catmullrom",
        0.5
      );

      const samples = new Array(SAMPLES + 1);
      for (let i = 0; i <= SAMPLES; i++) {
        const u = i / SAMPLES;
        const point = curve.getPoint(u);
        samples[i] = { u, x: point.x, y: point.y, z: point.z };
      }

      route = { curve, samples };
    };

    const measure = () => {
      const rect = root.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const narrow = width < 780;
      // Tighter swing and a longer lens on a phone: a wide zig-zag under a
      // short lens throws landmarks past the edges of a narrow viewport.
      spread = narrow ? 0.46 : 1;
      focal = Math.max(width, height) * (narrow ? 1.15 : 0.92);
      horizon = height * (narrow ? 0.42 : 0.46);
      labelPad = narrow ? 14 : 28;

      if (svgRef.current) {
        svgRef.current.setAttribute("viewBox", `0 0 ${width} ${height}`);
      }

      // Cached so the per-frame loop never reads layout back after writing.
      labelHalfWidths = labelRefs.current.map((el) =>
        el ? el.offsetWidth / 2 : 0
      );

      buildRoute();
    };

    measure();

    const cam = { x: 0, y: 0, z: 0 };
    const fwd = { x: 0, y: 0, z: -1 };
    const rgt = { x: 1, y: 0, z: 0 };

    // Screen position of a world point, or null when it is behind the lens.
    const project = (px, py, pz) => {
      const dx = px - cam.x;
      const dy = py - cam.y;
      const dz = pz - cam.z;

      const depth = dx * fwd.x + dy * fwd.y + dz * fwd.z;
      if (depth < NEAR) return null;

      const k = focal / depth;
      return {
        x: width / 2 + (dx * rgt.x + dz * rgt.z) * k,
        y: horizon - dy * k,
        depth,
      };
    };

    let frame = null;
    let lastActive = -1;

    const draw = (t, intro = 1) => {
      if (!route) return;

      const firstU = landmarkU[0];
      const finalU = landmarkU[landmarkU.length - 1];
      // One snap step per landmark, both evenly spaced, so this linear map
      // lands every stop exactly on its landmark.
      const travel = firstU - ARRIVAL + t * (finalU - firstU);

      const here = route.curve.getPoint(travel);
      const ahead = route.curve.getPoint(Math.min(1, travel + 0.012));

      // Tangent, then flattened toward straight-ahead so the view leans into
      // a bend rather than swinging through it.
      let dx = (ahead.x - here.x) * YAW_DAMP;
      let dy = (ahead.y - here.y) * YAW_DAMP;
      let dz = ahead.z - here.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      dx /= len;
      dy /= len;
      dz /= len;

      fwd.x = dx;
      fwd.y = dy;
      fwd.z = dz;

      const flat = Math.hypot(dz, dx) || 1;
      rgt.x = -dz / flat;
      rgt.z = dx / flat;

      // Extra stand-off on the opening frames, easing to nothing.
      const back = CAM_BACK + (1 - intro) * INTRO_DOLLY;

      cam.x = here.x * CAM_FOLLOW - fwd.x * back;
      cam.y = here.y - fwd.y * back + CAM_HEIGHT;
      cam.z = here.z - fwd.z * back;

      // Route is revealed ahead of the camera but never past the last
      // landmark, so it terminates at the prize ceremony.
      const reveal = Math.min(finalU, travel + LOOKAHEAD);
      let d = "";
      let started = false;

      for (let i = 0; i <= SAMPLES; i++) {
        const s = route.samples[i];
        if (s.u > reveal) break;

        const q = project(s.x, s.y, s.z);
        if (!q) {
          started = false;
          continue;
        }

        d += `${started ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)} `;
        started = true;
      }

      if (pathRef.current) pathRef.current.setAttribute("d", d);
      if (glowRef.current) glowRef.current.setAttribute("d", d);

      // ── landmarks ──
      let nearest = 0;
      let nearestGap = Infinity;

      for (let i = 0; i < timeline.length; i++) {
        const node = nodeRefs.current[i];
        const label = labelRefs.current[i];
        if (!node || !label) continue;

        const u = landmarkU[i];
        const gap = Math.abs(u - travel);
        if (gap < nearestGap) {
          nearestGap = gap;
          nearest = i;
        }

        const point = route.curve.getPoint(u);
        const q = project(point.x, point.y, point.z);

        if (!q || u > reveal) {
          node.style.opacity = "0";
          label.style.opacity = "0";
          continue;
        }

        // Emerge from depth, hold, then fall away as the camera passes.
        let alpha = 1;
        if (q.depth > 4.8) alpha = clamp(1 - (q.depth - 4.8) / 2.4, 0, 1);
        if (q.depth < 1.25) alpha = Math.min(alpha, clamp((q.depth - 0.3) / 0.95, 0, 1));

        const scale = clamp(REF_DEPTH / q.depth, 0.5, 1.3);

        node.style.opacity = String(alpha);
        node.style.transform = `translate3d(${q.x.toFixed(1)}px, ${q.y.toFixed(
          1
        )}px, 0) scale(${scale.toFixed(3)}) translate(-50%, -50%)`;

        // Labels follow the zig-zag but are held inside the viewport, so a
        // landmark swinging wide never pushes its own text off the edge.
        const half = labelHalfWidths[i] || 0;
        const lx = clamp(q.x, labelPad + half, width - labelPad - half);

        label.style.opacity = String(alpha);
        label.style.transform = `translate3d(${lx.toFixed(1)}px, ${(
          q.y - 34 * scale
        ).toFixed(1)}px, 0) scale(${scale.toFixed(3)}) translate(-50%, -100%)`;
      }

      if (nearest !== lastActive) {
        lastActive = nearest;
        setActiveIndex(nearest);
      }

      // ── environment parallax and progress ──
      if (gridRef.current) {
        gridRef.current.style.transform = `translate3d(${(
          -cam.x * 90
        ).toFixed(1)}px, ${(t * 60).toFixed(1)}px, 0)`;
      }
      if (dustRef.current) {
        dustRef.current.style.transform = `translate3d(${(
          -cam.x * 190
        ).toFixed(1)}px, ${(t * 150).toFixed(1)}px, 0)`;
      }
      if (progressRef.current) {
        // % here is resolved against the track, not the 7px dot — hence `left`
        // rather than `translateX`, which would only shift it by its own width.
        progressRef.current.style.left = `${(t * 100).toFixed(2)}%`;
      }
    };

    let current = 0;

    const readTarget = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      return max > 0 ? clamp(scroller.scrollTop / max, 0, 1) : 0;
    };

    let introStart = null;

    const loop = (now) => {
      if (introStart === null) introStart = now;
      const raw = Math.min(1, (now - introStart) / INTRO_MS);
      const intro = raw * raw * (3 - 2 * raw);

      const target = readTarget();
      const diff = target - current;
      const settled = Math.abs(diff) < 0.00012;

      if (settled) current = target;
      else current += diff * SMOOTH;

      draw(current, intro);

      // Keep running until BOTH the scroll and the fly-in have finished.
      if (settled && raw >= 1) {
        frame = null;
        return;
      }

      frame = requestAnimationFrame(loop);
    };

    const request = () => {
      if (frame === null) frame = requestAnimationFrame(loop);
    };

    const onResize = () => {
      measure();
      request();
    };

    scroller.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", onResize);

    // Fonts settle after first paint and change the cached label widths.
    const settle = setTimeout(onResize, 120);
    // Draw the pulled-back first frame, then let the loop fly it in.
    draw(0, 0);
    request();

    return () => {
      scroller.removeEventListener("scroll", request);
      window.removeEventListener("resize", onResize);
      clearTimeout(settle);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [timeline, landmarkU]);

  return (
    <div className="tj" ref={rootRef}>
      <div className="tj-scene" aria-hidden="true">
        <div className="tj-scene__fog" />
        <div className="tj-scene__grid" ref={gridRef} />
        <div className="tj-scene__dust" ref={dustRef} />
        <div className="tj-scene__horizon" />

        <svg className="tj-route" ref={svgRef} preserveAspectRatio="none">
          <defs>
            <linearGradient id="tjRouteFade" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f0d68a" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#c9a84c" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path className="tj-route__glow" ref={glowRef} />
          <path className="tj-route__line" ref={pathRef} />
        </svg>
      </div>

      {/* Landmark markers, positioned from the same projection as the route. */}
      <div className="tj-markers" aria-hidden="true">
        {timeline.map((stop, index) => (
          <span
            key={`node-${stop.id}`}
            className={`tj-node${index === activeIndex ? " is-active" : ""}`}
            ref={(el) => {
              nodeRefs.current[index] = el;
            }}
          />
        ))}
      </div>

      {/* Real headings and text: readable by screen readers in document order,
          whatever the camera happens to be doing. */}
      <ol className="tj-labels">
        {timeline.map((stop, index) => (
          <li
            key={stop.id}
            className={`tj-label${index === activeIndex ? " is-active" : ""}`}
            ref={(el) => {
              labelRefs.current[index] = el;
            }}
          >
            <span className="tj-label__icon">
              <LandmarkIcon name={stop.icon} />
            </span>
            <span className="tj-label__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="tj-label__name">{stop.name}</h3>
            <p className="tj-label__when">
              <span className="tj-label__date">{stop.date}</span>
              <span className="tj-label__dot" aria-hidden="true" />
              <span className="tj-label__time">{stop.time}</span>
            </p>
            <p className="tj-label__detail">{stop.detail}</p>
          </li>
        ))}
      </ol>

      {/* The surface that actually scrolls. Empty, transparent, and focusable
          so the journey can be driven from the keyboard. */}
      <div
        className="tj-scroll"
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Scroll to travel through the symposium timeline"
      >
        {/* One step per landmark: a single scroll gesture advances exactly
            one stop and locks there. */}
        {timeline.map((stop) => (
          <div className="tj-scroll__step" key={`step-${stop.id}`} />
        ))}
      </div>

      <div className="tj-progress" aria-hidden="true">
        <span className="tj-progress__cap">START</span>
        <span className="tj-progress__track">
          <span className="tj-progress__head" ref={progressRef} />
        </span>
        <span className="tj-progress__cap">END</span>
      </div>
    </div>
  );
};

const TimelineJourney = ({ timeline }) => {
  const reduced = usePrefersReducedMotion();

  return reduced ? (
    <TimelineStatic timeline={timeline} />
  ) : (
    <Journey timeline={timeline} />
  );
};

export default TimelineJourney;
