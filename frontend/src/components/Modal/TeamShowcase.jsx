/*
 * TeamShowcase — Three.js particle-based image transition for the Zyverse team.
 *
 * Scroll-driven: each snap step triggers a triangular-fragment transition where
 * the current portrait scatters into particles along cubic bezier curves and the
 * next one assembles from particles flying in.
 *
 * Rewrite of the CodePen BAS animation for modern Three.js (v0.173+) — uses
 * raw BufferGeometry + ShaderMaterial instead of the legacy BAS library.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import gsap from "gsap";
import "./TeamShowcase.scss";

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════ */

const PLANE_W = 48;
const PLANE_H = 64;
const SEG_W = 36;
const SEG_H = 48;
const CAM_Z = 50;
const CAM_FOV = 80;
const TRANSITION_SECS = 2.0;
/* Fraction of the view the portrait occupies on whichever axis binds; the
   rest is headroom for shards in flight. Width is allowed to run closer to
   the edge than height because a phone's column is far taller than a 3:4
   portrait, so without it the portrait would sit small in a sea of slack. */
const FRAME_FILL_H = 0.9;
const FRAME_FILL_V = 0.82;
const HALF_FOV_TAN = Math.tan((CAM_FOV * Math.PI) / 360);

/* ═══════════════════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════════════ */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ── Vertex shader ────────────────────────────────────────────────────── */

const makeVertexShader = (phase) => `
  uniform float uTime;
  attribute vec2 aAnimation;
  attribute vec3 aStartPosition;
  attribute vec3 aControl0;
  attribute vec3 aControl1;
  attribute vec3 aEndPosition;
  varying vec2 vUv;

  vec3 cubicBezier(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
    float nt = 1.0 - t;
    return nt * nt * nt * p0
         + 3.0 * nt * nt * t * p1
         + 3.0 * nt * t * t * p2
         + t * t * t * p3;
  }

  float easeInOutCubic(float t, float b, float c, float d) {
    float s = t / (d * 0.5);
    if (s < 1.0) return c * 0.5 * s * s * s + b;
    s -= 2.0;
    return c * 0.5 * (s * s * s + 2.0) + b;
  }

  void main() {
    vUv = uv;

    float tDelay    = aAnimation.x;
    float tDuration = aAnimation.y;
    float tTime     = clamp(uTime - tDelay, 0.0, tDuration);
    float tProgress = easeInOutCubic(tTime, 0.0, 1.0, tDuration);

    vec3 transformed = position;
    ${
      phase === "in"
        ? "transformed *= tProgress;"
        : "transformed *= 1.0 - tProgress;"
    }
    transformed += cubicBezier(
      aStartPosition, aControl0, aControl1, aEndPosition, tProgress
    );

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

/* The sampler returns linear values (the textures are tagged sRGB), and a
   hand-written ShaderMaterial gets none of three's automatic output
   conversion — without the include the portraits render dark and flat. */
const FRAGMENT_SHADER = `
  uniform sampler2D map;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(map, vUv);
    #include <colorspace_fragment>
  }
`;

/* ── Stand-in card for a member whose photo is missing ─────────────────────
   Drawn at the plane's own 3:4 ratio so it is never stretched. Covers both
   members with no `portrait` set and — via the loader's error callback —
   ones whose file 404s. Add the missing photo to /public/images/team and it
   takes over automatically, no code change. */

const PLACEHOLDER_W = 480;
const PLACEHOLDER_H = 640;

function makePlaceholderCanvas(name) {
  const canvas = document.createElement("canvas");
  canvas.width = PLACEHOLDER_W;
  canvas.height = PLACEHOLDER_H;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, PLACEHOLDER_W, PLACEHOLDER_H);
  grad.addColorStop(0, "#221d15");
  grad.addColorStop(1, "#0b0a08");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PLACEHOLDER_W, PLACEHOLDER_H);

  ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, PLACEHOLDER_W - 36, PLACEHOLDER_H - 36);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(240, 214, 138, 0.62)";
  ctx.font = `bold ${PLACEHOLDER_W * 0.34}px Georgia, serif`;
  ctx.fillText(initials, PLACEHOLDER_W / 2, PLACEHOLDER_H * 0.44);

  ctx.fillStyle = "rgba(201, 168, 76, 0.42)";
  ctx.font = `600 ${PLACEHOLDER_W * 0.045}px sans-serif`;
  ctx.fillText("PHOTO PENDING", PLACEHOLDER_W / 2, PLACEHOLDER_H * 0.68);

  return canvas;
}

/* ═══════════════════════════════════════════════════════════════════════════
   buildSlide — create one Slide mesh (either "out" or "in" phase)

   Splits a subdivided plane into independent triangular faces, each with
   per-face bezier animation attributes baked into the geometry.
   ═══════════════════════════════════════════════════════════════════════ */

function buildSlide(phase) {
  /* 1. Base plane → non-indexed (every triangle owns its own vertices) */
  const base = new THREE.PlaneGeometry(PLANE_W, PLANE_H, SEG_W, SEG_H);
  const geo = base.toNonIndexed();
  base.dispose();

  const pos = geo.getAttribute("position").array;
  const vtxCount = pos.length / 3;
  const faceCount = vtxCount / 3;

  /* 2. Per-vertex custom attribute buffers */
  const aAnim = new Float32Array(vtxCount * 2);
  const aStart = new Float32Array(vtxCount * 3);
  const aCtrl0 = new Float32Array(vtxCount * 3);
  const aCtrl1 = new Float32Array(vtxCount * 3);
  const aEnd = new Float32Array(vtxCount * 3);

  /* 3. Timing constants — identical to the original CodePen */
  const minDur = 0.8;
  const maxDur = 1.2;
  const maxDX = 0.9;
  const maxDY = 0.125;
  const stretch = 0.11;
  const totalDuration = maxDur + maxDX + maxDY + stretch;

  /* 4. Per-face: compute centroid, centre positions, set bezier curves */
  for (let f = 0; f < faceCount; f++) {
    const fi = f * 9;

    /* Centroid */
    const cx = (pos[fi] + pos[fi + 3] + pos[fi + 6]) / 3;
    const cy = (pos[fi + 1] + pos[fi + 4] + pos[fi + 7]) / 3;
    const cz = (pos[fi + 2] + pos[fi + 5] + pos[fi + 8]) / 3;

    /* Make vertex positions relative to centroid */
    for (let v = 0; v < 3; v++) {
      const pi = fi + v * 3;
      pos[pi] -= cx;
      pos[pi + 1] -= cy;
      pos[pi + 2] -= cz;
    }

    /* Timing */
    const dur = minDur + Math.random() * (maxDur - minDur);
    const dx = ((cx + PLANE_W * 0.5) / PLANE_W) * maxDX;
    const dy =
      phase === "in"
        ? (Math.abs(cy) / (PLANE_H * 0.5)) * maxDY
        : (1 - Math.abs(cy) / (PLANE_H * 0.5)) * maxDY;

    /* Control point offsets */
    const sy = Math.sign(cy) || 1;
    const cp0x = (0.1 + Math.random() * 0.2) * 50;
    const cp0y = sy * (0.1 + Math.random() * 0.2) * 70;
    const cp0z = (Math.random() - 0.5) * 20;
    const cp1x = (0.3 + Math.random() * 0.3) * 50;
    const cp1y = -sy * (0.3 + Math.random() * 0.3) * 70;
    const cp1z = (Math.random() - 0.5) * 20;

    /* "in" subtracts the offset; "out" adds it */
    const sign = phase === "in" ? -1 : 1;
    const c0x = cx + sign * cp0x;
    const c0y = cy + sign * cp0y;
    const c0z = cz + sign * cp0z;
    const c1x = cx + sign * cp1x;
    const c1y = cy + sign * cp1y;
    const c1z = cz + sign * cp1z;

    /* Write the same face data to all 3 vertices of this triangle */
    for (let v = 0; v < 3; v++) {
      const vi = f * 3 + v;

      aAnim[vi * 2] = dx + dy + Math.random() * stretch * dur;
      aAnim[vi * 2 + 1] = dur;

      const i3 = vi * 3;
      aStart[i3] = cx;
      aStart[i3 + 1] = cy;
      aStart[i3 + 2] = cz;
      aEnd[i3] = cx;
      aEnd[i3 + 1] = cy;
      aEnd[i3 + 2] = cz;
      aCtrl0[i3] = c0x;
      aCtrl0[i3 + 1] = c0y;
      aCtrl0[i3 + 2] = c0z;
      aCtrl1[i3] = c1x;
      aCtrl1[i3 + 1] = c1y;
      aCtrl1[i3 + 2] = c1z;
    }
  }

  geo.getAttribute("position").needsUpdate = true;
  geo.setAttribute("aAnimation", new THREE.BufferAttribute(aAnim, 2));
  geo.setAttribute("aStartPosition", new THREE.BufferAttribute(aStart, 3));
  geo.setAttribute("aControl0", new THREE.BufferAttribute(aCtrl0, 3));
  geo.setAttribute("aControl1", new THREE.BufferAttribute(aCtrl1, 3));
  geo.setAttribute("aEndPosition", new THREE.BufferAttribute(aEnd, 3));

  /* 5. Material */
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      map: { value: new THREE.Texture() },
    },
    vertexShader: makeVertexShader(phase),
    fragmentShader: FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.userData.totalDuration = totalDuration;
  return mesh;
}

/* ═══════════════════════════════════════════════════════════════════════════
   React component
   ═══════════════════════════════════════════════════════════════════════ */

const TeamShowcase = ({ faculty }) => {
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const threeRef = useRef(null);
  const activeRef = useRef(0);
  const busyRef = useRef(false);
  const pendingRef = useRef(null);
  const timelineRef = useRef(null);
  const introRef = useRef(null);

  const [activeIndex, setActiveIndex] = useState(0);
  // Starts hidden: the copy fades in as the first portrait assembles.
  const [infoVisible, setInfoVisible] = useState(false);

  /* ── Transition: scatter current portrait, assemble the next one ──── */
  const transitionTo = useCallback((newIdx) => {
    const ctx = threeRef.current;
    if (!ctx) return;

    /* Block overlapping transitions; queue the latest scroll target. */
    if (busyRef.current) {
      pendingRef.current = newIdx;
      return;
    }

    const curIdx = activeRef.current;
    if (newIdx === curIdx) return;

    busyRef.current = true;
    const { slideOut, slideIn, textures } = ctx;
    const dur = slideOut.userData.totalDuration;

    /* Assign textures and reset animation clocks. */
    slideOut.material.uniforms.map.value = textures[curIdx];
    slideIn.material.uniforms.map.value = textures[newIdx];
    slideOut.material.uniforms.uTime.value = 0;
    slideIn.material.uniforms.uTime.value = 0;

    /* Fade out info text immediately. */
    setInfoVisible(false);

    const tl = gsap.timeline({
      onComplete: () => {
        activeRef.current = newIdx;
        setActiveIndex(newIdx);
        setInfoVisible(true);
        busyRef.current = false;
        timelineRef.current = null;

        /* Drain the queue. */
        if (pendingRef.current !== null && pendingRef.current !== newIdx) {
          const next = pendingRef.current;
          pendingRef.current = null;
          transitionTo(next);
        } else {
          pendingRef.current = null;
        }
      },
    });

    /* Tween both slide clocks from 0 → totalDuration simultaneously. */
    tl.to(
      slideOut.material.uniforms.uTime,
      { value: dur, duration: TRANSITION_SECS, ease: "none" },
      0
    );
    tl.to(
      slideIn.material.uniforms.uTime,
      { value: dur, duration: TRANSITION_SECS, ease: "none" },
      0
    );

    /* Swap displayed text near the midpoint. */
    tl.call(() => setActiveIndex(newIdx), [], TRANSITION_SECS * 0.4);
    tl.call(() => setInfoVisible(true), [], TRANSITION_SECS * 0.55);

    timelineRef.current = tl;
  }, []);

  /* ── Three.js init ─────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !faculty?.length) return;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: window.devicePixelRatio === 1,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    /* Scene + Camera */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAM_FOV, 3 / 4, 1, 1000);
    camera.position.set(0, 0, CAM_Z);

    /* Slides */
    const slideOut = buildSlide("out");
    const slideIn = buildSlide("in");
    scene.add(slideOut);
    scene.add(slideIn);

    /* Textures.
       Each member starts on its stand-in card and the photo REPLACES the
       array entry once it decodes — it is never swapped into the card's own
       texture. That matters: once a texture's Source has been uploaded to
       the GPU, reassigning `texture.image` does not re-upload it, and
       `needsUpdate` alone will not force it either. Only member 1 was ever
       uploaded while still holding its card (it is the one on screen at
       open), which is exactly why it, and only it, stayed a placeholder. */
    const loader = new THREE.TextureLoader();
    const disposables = [];

    const textures = faculty.map((p, i) => {
      const card = new THREE.CanvasTexture(makePlaceholderCanvas(p.name));
      card.colorSpace = THREE.SRGBColorSpace;
      disposables.push(card);
      if (!p.portrait) return card;

      const photo = loader.load(
        p.portrait,
        () => {
          textures[i] = photo;
          if (i === 0) startIntro();
          else showActive();
        },
        undefined,
        /* 404 or decode failure — the stand-in card simply stays. */
        () => {
          if (i === 0) startIntro();
        }
      );
      photo.colorSpace = THREE.SRGBColorSpace;
      disposables.push(photo);
      return card;
    });

    /* Re-point the visible slide at the active member's current texture.
       Only needed when a photo lands while its member is already on screen;
       any later transition reads `textures` fresh. */
    const showActive = () => {
      if (busyRef.current) return;
      slideIn.material.uniforms.map.value = textures[activeRef.current];
    };

    /* Intro — the first member assembles out of the fragments instead of
       snapping in, so the entrance uses the same transition as every step.
       Held until its photo resolves so the shards carry the real face. */
    slideIn.material.uniforms.map.value = textures[0];
    slideIn.material.uniforms.uTime.value = 0;
    slideOut.material.uniforms.uTime.value = slideOut.userData.totalDuration;

    let introDone = false;
    const startIntro = () => {
      if (introDone) return;
      introDone = true;
      const dur = slideIn.userData.totalDuration;
      slideIn.material.uniforms.map.value = textures[0];
      slideIn.material.uniforms.uTime.value = 0;
      busyRef.current = true;

      const tl = gsap.timeline({
        onComplete: () => {
          busyRef.current = false;
          introRef.current = null;
          /* A scroll during the intro is honoured the moment it ends. */
          if (pendingRef.current !== null) {
            const next = pendingRef.current;
            pendingRef.current = null;
            transitionTo(next);
          }
        },
      });
      tl.to(
        slideIn.material.uniforms.uTime,
        { value: dur, duration: TRANSITION_SECS, ease: "none" },
        0
      );
      tl.call(() => setInfoVisible(true), [], TRANSITION_SECS * 0.35);
      introRef.current = tl;
    };

    /* Never let a stalled request hold the entrance hostage. */
    const introGuard = window.setTimeout(startIntro, 2500);

    /* Framing.
       The canvas fills its wrapper — the shards need that room to fly into —
       and the camera pulls back just far enough that the 3:4 portrait always
       fits with a margin. Driving the distance instead of the canvas shape
       means a tall phone column and a short desktop half both frame the
       portrait identically, with nothing cropped. */
    let lastW = 0;
    let lastH = 0;
    const resize = () => {
      const wrap = canvas.parentElement;
      if (!wrap) return;
      const w = Math.round(wrap.clientWidth);
      const h = Math.round(wrap.clientHeight);
      /* Bail on a collapsed or unchanged box — re-entrant resizes here are
         what let the canvas grow without bound. */
      if (w < 2 || h < 2 || (w === lastW && h === lastH)) return;
      lastW = w;
      lastH = h;

      renderer.setSize(w, h, true);
      const aspect = w / h;
      camera.aspect = aspect;
      camera.position.z =
        Math.max(
          PLANE_H / FRAME_FILL_V,
          PLANE_W / (FRAME_FILL_H * aspect)
        ) /
        (2 * HALF_FOV_TAN);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    /* The wrapper takes its size from the grid, which settles after layout
       and shifts again when a mobile URL bar slides away — neither of which
       fires a window resize. */
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    /* Render loop */
    let raf;
    const loop = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    threeRef.current = { renderer, scene, camera, slideOut, slideIn, textures };

    return () => {
      window.removeEventListener("resize", resize);
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(introGuard);
      if (timelineRef.current) timelineRef.current.kill();
      if (introRef.current) introRef.current.kill();
      renderer.dispose();
      slideOut.geometry.dispose();
      slideOut.material.dispose();
      slideIn.geometry.dispose();
      slideIn.material.dispose();
      /* `textures` entries get replaced as photos land, so dispose the full
         set that was actually created, not just what the array holds now. */
      disposables.forEach((t) => t.dispose());
      threeRef.current = null;
    };
  }, [faculty]);

  /* ── Scroll → target member index ──────────────────────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || faculty.length <= 1) return;

    let last = 0;

    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      const progress = clamp(el.scrollTop / max, 0, 1);
      const target = Math.round(progress * (faculty.length - 1));

      if (target !== last) {
        last = target;
        transitionTo(target);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [faculty.length, transitionTo]);

  /* ── Render ─────────────────────────────────────────────────────────── */
  if (!faculty?.length) return null;

  const member = faculty[activeIndex];

  return (
    <div className="ts" ref={scrollRef}>
      <div className="ts__run">
        <div className="ts__stage">
          <div className="ts__canvas-wrap">
            <canvas ref={canvasRef} />
          </div>

          <div className={`ts__info${infoVisible ? " is-visible" : ""}`}>
            <span className="ts__counter">
              {String(activeIndex + 1).padStart(2, "0")}
              <span className="ts__total">
                {` / ${String(faculty.length).padStart(2, "0")}`}
              </span>
            </span>

            <h3 className="ts__name">{member.name}</h3>
            <p className="ts__role">{member.designation}</p>
            {member.department && (
              <p className="ts__dept">{member.department}</p>
            )}
          </div>
        </div>

        {/* One snap step per member — vertical scroll drives transitions. */}
        {faculty.map((_, i) => (
          <div className="ts__step" key={`step-${i}`} />
        ))}
      </div>
    </div>
  );
};

export default TeamShowcase;
