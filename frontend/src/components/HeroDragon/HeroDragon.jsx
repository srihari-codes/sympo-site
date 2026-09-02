import React, { useMemo, useRef, useEffect, createRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "../../stores/experienceStore";

/* ══════════════════════════════════════════════════════════════════════════
   HeroDragon — a procedural western dragon that flies the hero entrance in
   its own transparent canvas, then dissolves into the CSS "Z" of the
   wordmark (experienceStore.dragonLanded). No model files; the whole
   creature is generated and deformed on the CPU each frame.

   ── Anatomy ──
   Body      one continuous tube, skinned onto an animated spine. The spine
             carries an arched neck, a deep keeled chest, and a long tail
             that is laterally compressed into a rudder. Cross-sections are
             elliptical, not round, so the chest reads deep and the tail
             reads bladed.
   Wings     a bat armature — humerus, forearm, then four finger struts
             fanning off the wrist. The membrane is interpolated across the
             fan, so it only spans between fingers where a real wing has
             skin, and the innermost panel runs back to the hip.
   Ridge     dorsal spikes riding the spine, tapering to the tail.
   Head      arched neck, snout, hinged jaw, swept horns, glowing eyes.
   Legs      four limbs that tuck in flight and reach on the landing flare.

   ── Why it used to read as an insect (all fixed here) ──
   • wings beat at 3.8 Hz (insect tempo) → now ~1.1 Hz with a fast power
     downstroke and a slower folded recovery, the way a big flyer flies;
   • wings were flat 2D `shapeGeometry` panels → now a membrane that billows
     off the stroke direction and curls between the finger bones;
   • wings sat at 11% down the body, right behind the head (a dragonfly's
     thorax) → now on the chest at 27%, behind a real neck;
   • the body was 18 loose beads, an insect abdomen → now one tube;
   • and it flew tail-first: `lookAt` puts forward on -Z, but the old spine
     ran `z = -p * BODY_LEN`, which pointed the TAIL along the flight path.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Choreography (seconds) ─────────────────────────────────────────────── */
const START_DELAY = 0.2;
const GLIDE_DUR = 1.15; // enters far and high on spread wings, barely beating
const ROAM_DUR = 3.15; // banking circuit of the wordmark under full power
const FLARE_DUR = 1.3; // backwings to brake, reaches out, roars
const DISSOLVE_DUR = 0.65; // burns down into the "Z"
const FLY_DUR = GLIDE_DUR + ROAM_DUR;

/** Total run time. HeroOverlay's safety net waits on this. */
export const DRAGON_TOTAL_MS =
  (START_DELAY + FLY_DUR + FLARE_DUR + DISSOLVE_DUR) * 1000;

/* ── Build resolution ───────────────────────────────────────────────────── */
const SEGS = 44; // spine stations
const RADIAL = 9; // ring resolution around the body
const BODY_LEN = 3.6;
const WCOLS = 17; // membrane columns, fanned across the finger struts
const WROWS = 10; // membrane rows, root → wingtip
const N_SPIKES = 15;
const N_BONES = 12; // 6 struts per wing
const N_EMBERS = 30;

const SHOULDER_U = 0.27; // where the wings meet the spine
const HIP_U = 0.47; // where the rear of the membrane anchors to the body

/* ── Wing armature ──────────────────────────────────────────────────────────
   Four fingers fan off the wrist. The first is longest and carries the
   wingtip; the rest shorten and sweep further aft so the tips describe a
   curve, which is what gives a dragon wing its raked silhouette. */
const HUMERUS = 0.68;
const FOREARM = 0.92;
const FINGERS = [
  // length, sweep aft (rad), droop (rad)
  { len: 1.25, sweep: 0.1, droop: 0.04 },
  { len: 1.12, sweep: 0.55, droop: 0.1 },
  { len: 1.0, sweep: 1.05, droop: 0.17 },
  { len: 0.78, sweep: 1.6, droop: 0.26 },
];
const N_RIBS = FINGERS.length + 1; // + the trailing edge running back to the hip
/* How deeply the membrane cuts in between one strut and the next. Without
   this the trailing edge is a straight hem and the wing reads as a curtain. */
const SCALLOP = [0.17, 0.17, 0.15, 0.07];

/* ── Small maths ────────────────────────────────────────────────────────── */
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
const smoother = (t) => {
  t = clamp01(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const range = (a, b, t) => clamp01((t - a) / (b - a));

const AXIS_X = new THREE.Vector3(1, 0, 0);
const UP_Y = new THREE.Vector3(0, 1, 0);

/* Girth down the length: nape → neck → shoulders → chest → belly → tail. */
const GIRTH = [
  [0.0, 0.085],
  [0.1, 0.115],
  [0.22, 0.2],
  [0.33, 0.255], // deepest at the chest, right behind the wing roots
  [0.45, 0.215],
  [0.58, 0.155],
  [0.72, 0.09],
  [0.86, 0.042],
  [1.0, 0.012],
];

function girthAt(u) {
  for (let i = 1; i < GIRTH.length; i++) {
    if (u <= GIRTH[i][0]) {
      const [u0, r0] = GIRTH[i - 1];
      const [u1, r1] = GIRTH[i];
      return lerp(r0, r1, (u - u0) / (u1 - u0));
    }
  }
  return GIRTH[GIRTH.length - 1][1];
}

/* Rest pose of the spine: head carried high on an arched neck, chest slung
   low, tail streaming down and back with a flick at the tip. */
function restSpine(u, out) {
  const z = u * BODY_LEN - 0.55; // head end sits forward of the origin
  const neck = Math.exp(-((u / 0.19) ** 2));
  const chest = Math.exp(-(((u - 0.33) / 0.2) ** 2));
  const tail = smooth((u - 0.52) / 0.48);
  const y = 0.3 * neck - 0.05 * chest - 0.3 * tail * tail + 0.16 * tail ** 3;
  out.set(0, y, z);
}

/* Elliptical cross-section: deep through the chest, bladed down the tail. */
function sectionAt(u, out) {
  const chest = Math.exp(-(((u - 0.33) / 0.24) ** 2));
  const tail = smooth((u - 0.62) / 0.38);
  out.set(
    (0.88 + 0.16 * chest) * lerp(1, 0.72, tail), // half-width
    (1.02 + 0.3 * chest) * lerp(1, 1.3, tail) // half-height
  );
}

/* A wingbeat: a fast, committed downstroke and a slower folded recovery.
   The asymmetry is most of what separates a dragon from a moth. */
const DOWN_FRAC = 0.38;
const WING_UP = 0.72;
const WING_DOWN = -0.72;
/* The stroke is driven from the shoulder; the joints outboard of it follow
   with progressively less throw. Rotating the whole armature by the same
   angle folds the wing shut like a fan — which is what made it hang as a
   flat curtain instead of staying spread. */
const FOREARM_FOLLOW = 0.78;
const FINGER_FOLLOW = 0.55;
function flapAt(p) {
  p -= Math.floor(p);
  return p < DOWN_FRAC
    ? lerp(WING_UP, WING_DOWN, smoother(p / DOWN_FRAC))
    : lerp(WING_DOWN, WING_UP, smoother((p - DOWN_FRAC) / (1 - DOWN_FRAC)));
}

/* ── Geometry builders ──────────────────────────────────────────────────── */
function buildBody() {
  const idx = [];
  for (let i = 0; i < SEGS; i++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = i * RADIAL + j;
      const b = i * RADIAL + ((j + 1) % RADIAL);
      const c = (i + 1) * RADIAL + j;
      const d = (i + 1) * RADIAL + ((j + 1) % RADIAL);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array((SEGS + 1) * RADIAL * 3), 3)
  );
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
  return g;
}

function buildWing() {
  const idx = [];
  for (let c = 0; c < WCOLS - 1; c++) {
    for (let r = 0; r < WROWS - 1; r++) {
      const a = c * WROWS + r;
      const b = a + 1;
      const d = (c + 1) * WROWS + r;
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  // Bake the finger bones into the membrane as darker vertex bands, so the
  // struts read through the skin without extra geometry.
  const col = new Float32Array(WCOLS * WROWS * 3);
  for (let c = 0; c < WCOLS; c++) {
    const span = (c / (WCOLS - 1)) * (N_RIBS - 1);
    const nearRib = Math.abs(span - Math.round(span)); // 0 on a strut
    const k = smooth(nearRib / 0.3); // 0 at the bone, 1 mid-panel
    for (let r = 0; r < WROWS; r++) {
      const o = (c * WROWS + r) * 3;
      col[o] = lerp(0.17, 0.92, k);
      col[o + 1] = lerp(0.07, 0.44, k);
      col[o + 2] = lerp(0.04, 0.27, k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(WCOLS * WROWS * 3), 3)
  );
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
  return g;
}

/* ══════════════════════════════════════════════════════════════════════════
   The rig
   ══════════════════════════════════════════════════════════════════════════ */
function DragonRig({ onLanded }) {
  const { camera, size } = useThree();

  const group = useRef();
  const bodyRef = useRef();
  const wingRootRef = useRef();
  const wingRRef = useRef();
  const wingLRef = useRef();
  const bonesRef = useRef();
  const spikesRef = useRef();
  const headRef = useRef();
  const jawRef = useRef();
  const embersRef = useRef();
  const bodyMat = useRef();
  const wingMat = useRef();
  const emberMat = useRef();
  const eyeMat = useRef();
  const glow = useRef();
  const throat = useRef();

  const legs = useMemo(
    () =>
      Array.from({ length: 4 }, () => ({
        root: createRef(),
        upper: createRef(),
        lower: createRef(),
      })),
    []
  );

  const bodyGeo = useMemo(buildBody, []);
  const wingGeoR = useMemo(buildWing, []);
  const wingGeoL = useMemo(buildWing, []);

  /* Everything below is allocated once — the frame loop must not allocate. */
  const S = useMemo(() => {
    const vec = () => new THREE.Vector3();
    return {
      pts: Array.from({ length: SEGS + 1 }, vec), // spine stations
      tan: Array.from({ length: SEGS + 1 }, vec),
      nrm: Array.from({ length: SEGS + 1 }, vec), // dorsal
      bin: Array.from({ length: SEGS + 1 }, vec), // lateral
      ribs: Array.from({ length: N_RIBS }, () =>
        Array.from({ length: WROWS }, vec)
      ),
      ribCurves: Array.from(
        { length: N_RIBS },
        () => new THREE.CatmullRomCurve3([vec(), vec(), vec(), vec()])
      ),
      tips: Array.from({ length: FINGERS.length }, vec),
      shoulder: vec(),
      elbow: vec(),
      wrist: vec(),
      hipAnchor: vec(),
      wingN: vec(),
      a: vec(),
      b: vec(),
      c: vec(),
      d: vec(),
      pos: vec(),
      tanA: vec(),
      tanB: vec(),
      up: vec(),
      sect: new THREE.Vector2(),
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      dummy: new THREE.Object3D(),
      ember: {
        born: false,
        pos: new Float32Array(N_EMBERS * 3),
        vel: new Float32Array(N_EMBERS * 3),
        size: new Float32Array(N_EMBERS),
      },
    };
  }, []);

  const clock = useRef({ t0: null, phase: 0, flap: WING_UP, flapVel: 0 });
  const landedFired = useRef(false);

  /* Landing target — where the DOM "Z" sits, projected onto the z=0 plane. */
  const landTarget = useRef(new THREE.Vector3(-0.7, 0.05, 0.15));
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(".ho-wordmark");
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const px = r.left - r.height * 0.34;
      const py = r.top + r.height * 0.52;
      camera.updateMatrixWorld();
      const v = new THREE.Vector3(
        (px / window.innerWidth) * 2 - 1,
        -((py / window.innerHeight) * 2 - 1),
        0.5
      ).unproject(camera);
      const dir = v.sub(camera.position).normalize();
      landTarget.current
        .copy(camera.position)
        .add(dir.multiplyScalar(-camera.position.z / dir.z));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [camera, size]);

  /* Enters high and far on the right, crosses the wordmark, banks hard left
     and down, sweeps back up across the right, then settles over the "Z". */
  const flightCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          [9.5, 3.2, -6.0],
          [5.2, 2.25, -3.0],
          [1.6, 1.35, -0.6],
          [-2.4, 0.75, 1.2],
          [-4.4, -0.6, -0.6],
          [-2.2, -1.5, -2.6],
          [1.4, -0.35, -2.0],
          [3.0, 1.05, -0.2],
          [0.9, 1.5, 0.6],
          [-0.9, 0.55, 0.35],
        ].map((p) => new THREE.Vector3(...p)),
        false,
        "centripetal"
      ),
    []
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 1 / 20); // survive a dropped frame
    const C = clock.current;
    if (C.t0 === null) C.t0 = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - C.t0 - START_DELAY;
    if (t < 0) return;

    const flyU = clamp01(t / FLY_DUR);
    const flareU = clamp01((t - FLY_DUR) / FLARE_DUR);
    const dissU = clamp01((t - FLY_DUR - FLARE_DUR) / DISSOLVE_DUR);
    const alive = 1 - dissU;
    const glideU = clamp01(t / GLIDE_DUR); // spread-wing entry

    /* ── Wingbeat clock ────────────────────────────────────────────────
       Slow on the entry glide, full power over the circuit, then one huge
       braking backbeat on the flare. Phase is accumulated so that changing
       the rate never snaps the wings. */
    const hz = lerp(0.5, 1.15, glideU) * lerp(1, 0.62, smooth(flareU));
    C.phase += dt * hz;
    const prevFlap = C.flap;
    C.flap = flapAt(C.phase);
    C.flapVel = lerp(C.flapVel, (C.flap - prevFlap) / dt, 0.4);

    // On the flare the wings cup forward and hold high to kill airspeed.
    const flare = smoother(flareU);
    const flap = lerp(C.flap, 0.95, flare * 0.75);
    const flapVel = C.flapVel * (1 - flare * 0.6);
    // Wings partly fold on the recovery stroke, and spread wide to brake.
    const fold = clamp01(0.34 * smooth(-flapVel * 0.35)) * (1 - flare);
    const twist = clamp(-flapVel * 0.11, -0.5, 0.5) + flare * 0.34;

    /* ── 1. Spine ──────────────────────────────────────────────────────
       A travelling wave from head to tail; the head end is damped so the
       skull stays level while the tail does the swimming. */
    const swim = t * 2.6;
    const bodyBob = -0.085 * flap; // body lifts on the downstroke
    for (let i = 0; i <= SEGS; i++) {
      const u = i / SEGS;
      const p = S.pts[i];
      restSpine(u, p);
      const damp = smooth(u / 0.3); // no lateral whip in the neck
      p.x += Math.sin(swim - u * 5.2) * 0.1 * damp * (0.2 + u * 1.35);
      p.y +=
        Math.sin(swim * 0.72 - u * 4.0) * 0.035 * (0.15 + u) +
        bodyBob * (1 - smooth(u / 0.5)) * 0.6;
      // The tail streams straight back on the flare as a counterweight.
      p.y -= flare * 0.34 * smooth((u - 0.5) / 0.5);
    }

    // Tangents (central differences), then parallel transport so the frame
    // never flips or twists down the length.
    for (let i = 0; i <= SEGS; i++) {
      const a = S.pts[Math.max(i - 1, 0)];
      const b = S.pts[Math.min(i + 1, SEGS)];
      S.tan[i].subVectors(b, a).normalize();
    }
    S.nrm[0].set(0, 1, 0).addScaledVector(S.tan[0], -S.tan[0].y).normalize();
    S.bin[0].crossVectors(S.nrm[0], S.tan[0]).normalize();
    for (let i = 1; i <= SEGS; i++) {
      const T = S.tan[i];
      S.nrm[i]
        .copy(S.nrm[i - 1])
        .addScaledVector(T, -S.nrm[i - 1].dot(T))
        .normalize();
      S.bin[i].crossVectors(S.nrm[i], T).normalize();
    }

    /* ── 2. Skin the body tube onto the spine ──────────────────────────── */
    const bpos = bodyGeo.attributes.position.array;
    for (let i = 0; i <= SEGS; i++) {
      const u = i / SEGS;
      sectionAt(u, S.sect);
      let r = girthAt(u);
      // The dissolve inflates the body into embers as it burns out.
      const swell = 1 + dissU * 1.4;
      r *= alive * swell;
      const P = S.pts[i];
      const N = S.nrm[i];
      const B = S.bin[i];
      for (let j = 0; j < RADIAL; j++) {
        const a = (j / RADIAL) * Math.PI * 2;
        const w = Math.cos(a) * r * S.sect.x;
        const h = Math.sin(a) * r * S.sect.y;
        const o = (i * RADIAL + j) * 3;
        bpos[o] = P.x + B.x * w + N.x * h;
        bpos[o + 1] = P.y + B.y * w + N.y * h;
        bpos[o + 2] = P.z + B.z * w + N.z * h;
      }
    }
    bodyGeo.attributes.position.needsUpdate = true;

    /* ── 3. Dorsal ridge ───────────────────────────────────────────────── */
    if (spikesRef.current) {
      for (let k = 0; k < N_SPIKES; k++) {
        const u = lerp(0.07, 0.93, k / (N_SPIKES - 1));
        const i = Math.round(u * SEGS);
        const P = S.pts[i];
        const N = S.nrm[i];
        const T = S.tan[i];
        sectionAt(u, S.sect);
        const r = girthAt(u) * S.sect.y * alive;
        S.a.copy(N).multiplyScalar(0.86).addScaledVector(T, 0.5).normalize();
        S.dummy.position.copy(P).addScaledVector(N, r * 0.92);
        S.dummy.quaternion.setFromUnitVectors(UP_Y, S.a);
        const h = lerp(0.16, 0.03, smooth(u / 0.9)) * alive;
        S.dummy.scale.set(h * 0.42, h, h * 0.42);
        S.dummy.updateMatrix();
        spikesRef.current.setMatrixAt(k, S.dummy.matrix);
      }
      spikesRef.current.instanceMatrix.needsUpdate = true;
    }

    /* ── 4. Head, riding the frame at the neck end ─────────────────────── */
    const headI = 0;
    if (headRef.current) {
      const P = S.pts[headI];
      const N = S.nrm[headI];
      const T = S.tan[headI];
      headRef.current.position.copy(P);
      // Basis (right, up, back): the model's -Z then points down the neck.
      S.m.makeBasis(S.bin[headI], N, T);
      S.q.setFromRotationMatrix(S.m);
      headRef.current.quaternion.copy(S.q);
      headRef.current.scale.setScalar(alive);
    }
    // Jaw: idles shut, gapes into a roar as it flares onto the wordmark.
    if (jawRef.current) {
      const roar = smooth(range(0.25, 0.72, flareU)) * (1 - smooth(dissU * 2));
      jawRef.current.rotation.x =
        0.06 + roar * 0.6 + Math.sin(t * 1.7) * 0.02 * (1 - roar);
    }

    /* ── 5. Wings ──────────────────────────────────────────────────────── */
    const shI = Math.round(SHOULDER_U * SEGS);
    if (wingRootRef.current) {
      wingRootRef.current.position
        .copy(S.pts[shI])
        .addScaledVector(S.nrm[shI], 0.1);
      S.m.makeBasis(S.bin[shI], S.nrm[shI], S.tan[shI]);
      wingRootRef.current.quaternion.setFromRotationMatrix(S.m);
      wingRootRef.current.scale.setScalar(alive);
    }

    // Armature, solved once for the right wing and mirrored for the left.
    // Local axes here: +x outboard, +y up, +z aft.
    const armDir = (a, sweep, out) =>
      out
        .set(
          Math.cos(a) * Math.cos(sweep),
          Math.sin(a),
          Math.cos(a) * Math.sin(sweep)
        )
        .normalize();

    S.shoulder.set(0.1, 0, 0);
    armDir(flap, 0.1 + fold * 0.3, S.a);
    S.elbow.copy(S.shoulder).addScaledVector(S.a, HUMERUS);
    armDir(
      flap * FOREARM_FOLLOW - 0.1 - fold * 0.55,
      0.26 + fold * 0.5,
      S.b
    );
    S.wrist.copy(S.elbow).addScaledVector(S.b, FOREARM * (1 - fold * 0.3));
    S.hipAnchor.set(0.07, -0.07, (HIP_U - SHOULDER_U) * BODY_LEN);

    for (let f = 0; f < FINGERS.length; f++) {
      const F = FINGERS[f];
      // Outer joints lag the shoulder, which is what makes a wing look like
      // it whips rather than pivots.
      const lagFlap = flapAt(C.phase - 0.07 * (f + 1));
      const a =
        lerp(C.flap, lagFlap, 0.85) * FINGER_FOLLOW - F.droop - fold * 0.85;
      armDir(lerp(a, flap, flare * 0.7), F.sweep + fold * 0.45, S.c);
      S.tips[f]
        .copy(S.wrist)
        .addScaledVector(S.c, F.len * (1 - fold * 0.42));
    }

    // Each finger rib runs shoulder → elbow → wrist → its own tip. The extra
    // last rib is the trailing edge, sweeping from the hip out to the
    // hindmost fingertip — the panel that joins the wing to the body.
    const lastTip = S.tips[FINGERS.length - 1];
    for (let f = 0; f < N_RIBS; f++) {
      const cp = S.ribCurves[f].points;
      if (f < FINGERS.length) {
        cp[0].copy(S.shoulder);
        cp[1].copy(S.elbow);
        cp[2].copy(S.wrist);
        cp[3].copy(S.tips[f]);
      } else {
        cp[0].copy(S.hipAnchor);
        cp[1].lerpVectors(S.hipAnchor, lastTip, 0.34).addScaledVector(UP_Y, -0.05);
        cp[2].lerpVectors(S.hipAnchor, lastTip, 0.7);
        cp[3].copy(lastTip);
      }
      for (let r = 0; r < WROWS; r++) {
        S.ribCurves[f].getPoint(r / (WROWS - 1), S.ribs[f][r]);
      }
    }

    // Membrane normal from the wing's own axes, so billow stays correct at
    // any flap angle.
    S.a.subVectors(S.wrist, S.shoulder); // span
    S.b.subVectors(lastTip, S.tips[0]); // chord
    S.wingN.crossVectors(S.b, S.a).normalize();

    const billow = clamp(-flapVel * 0.06, -0.34, 0.34) + 0.05;
    for (const [geo, side] of [
      [wingGeoR, 1],
      [wingGeoL, -1],
    ]) {
      const wp = geo.attributes.position.array;
      for (let c = 0; c < WCOLS; c++) {
        const span = (c / (WCOLS - 1)) * (N_RIBS - 1);
        const i0 = Math.min(Math.floor(span), N_RIBS - 2);
        const f = span - i0;
        const panel = Math.sin(Math.PI * f); // sag between two struts
        const chord = Math.sin((Math.PI * c) / (WCOLS - 1)); // whole-wing camber
        for (let r = 0; r < WROWS; r++) {
          const rn = r / (WROWS - 1);
          S.d.lerpVectors(S.ribs[i0][r], S.ribs[i0 + 1][r], f);
          // Draw the free edge back toward the wrist between the struts, so
          // the hem scallops instead of running straight.
          S.d.lerp(S.wrist, SCALLOP[i0] * panel * rn * rn);
          const sag =
            billow * (panel * 0.75 + chord * 0.55) * smooth(rn * 2.5) +
            // trailing edge flutters in the airstream
            0.014 * Math.sin(t * 19 + rn * 6.2) * Math.pow(chord, 3);
          const o = (c * WROWS + r) * 3;
          wp[o] = (S.d.x + S.wingN.x * sag) * side;
          wp[o + 1] = S.d.y + S.wingN.y * sag;
          wp[o + 2] = S.d.z + S.wingN.z * sag;
        }
      }
      geo.attributes.position.needsUpdate = true;
    }

    // Solid struts, so the armature carries the silhouette.
    if (bonesRef.current) {
      const segs = [
        [S.shoulder, S.elbow, 0.032],
        [S.elbow, S.wrist, 0.026],
        [S.wrist, S.tips[0], 0.018],
        [S.wrist, S.tips[1], 0.016],
        [S.wrist, S.tips[2], 0.014],
        [S.wrist, S.tips[3], 0.012],
      ];
      let k = 0;
      for (const side of [1, -1]) {
        for (const [p0, p1, th] of segs) {
          S.a.copy(p1).sub(p0);
          const len = S.a.length() || 0.0001;
          S.b.copy(S.a).multiplyScalar(1 / len);
          S.b.x *= side;
          S.dummy.position.copy(p0).addScaledVector(p1.clone().sub(p0), 0.5);
          S.dummy.position.x *= side;
          S.dummy.quaternion.setFromUnitVectors(UP_Y, S.b);
          S.dummy.scale.set(th * alive, len, th * alive);
          S.dummy.updateMatrix();
          bonesRef.current.setMatrixAt(k++, S.dummy.matrix);
        }
      }
      bonesRef.current.instanceMatrix.needsUpdate = true;
    }

    /* ── 6. Legs — tucked in flight, reaching on the flare ──────────────── */
    const reach = smoother(range(0.15, 0.85, flareU));
    for (let l = 0; l < 4; l++) {
      const L = legs[l];
      if (!L.root.current) continue;
      const front = l < 2;
      const side = l % 2 === 0 ? 1 : -1;
      const i = Math.round((front ? 0.31 : 0.55) * SEGS);
      sectionAt(i / SEGS, S.sect);
      const r = girthAt(i / SEGS);
      L.root.current.position
        .copy(S.pts[i])
        .addScaledVector(S.bin[i], side * r * S.sect.x * 0.75)
        .addScaledVector(S.nrm[i], -r * 0.35);
      S.m.makeBasis(S.bin[i], S.nrm[i], S.tan[i]);
      L.root.current.quaternion.setFromRotationMatrix(S.m);
      L.root.current.scale.set(side * alive, alive, alive);
      const idle = Math.sin(t * 2.1 + l) * 0.05;
      if (L.upper.current)
        L.upper.current.rotation.x = lerp(1.15, -0.35, reach) + idle;
      if (L.lower.current)
        L.lower.current.rotation.x = lerp(-1.9, -0.55, reach) - idle;
    }

    /* ── 7. Flight path ────────────────────────────────────────────────── */
    if (t < FLY_DUR) {
      flightCurve.getPoint(easeInOut(flyU), S.pos);
    } else {
      flightCurve.getPoint(1, S.pos);
      S.pos.lerp(landTarget.current, smoother(flareU));
    }
    group.current.position.copy(S.pos);

    /* Orientation: -Z down the tangent, banked into the turn. The bank is
       taken from the actual heading change ahead on the curve, so it leans
       into corners instead of guessing from screen position. */
    const cu = easeInOut(Math.min(flyU, 0.999));
    flightCurve.getTangent(cu, S.tanA).normalize();
    flightCurve.getTangent(Math.min(cu + 0.03, 1), S.tanB).normalize();
    let turn =
      Math.atan2(S.tanB.x, -S.tanB.z) - Math.atan2(S.tanA.x, -S.tanA.z);
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    const bank = clamp(turn * 2.2, -1.0, 1.0) * (1 - flare * 0.75);
    S.up.set(0, 1, 0).applyAxisAngle(S.tanA, bank);
    S.a.copy(S.pos).add(S.tanA);
    S.m.lookAt(S.pos, S.a, S.up);
    S.q.setFromRotationMatrix(S.m);
    // Nose up hard on the flare — the braking attitude.
    S.q2.setFromAxisAngle(AXIS_X, flare * 0.62);
    S.q.multiply(S.q2);
    group.current.quaternion.slerp(S.q, 1 - Math.exp(-9 * dt));

    /* Scale: small and distant on entry, full size over the circuit, then
       down to roughly glyph height as it settles. */
    const grow = lerp(0.26, 0.6, smoother(clamp01(t / (FLY_DUR * 0.55))));
    const settle = lerp(1, 0.42, smoother(flareU));
    group.current.scale.setScalar(grow * settle * Math.max(alive, 0.0001));

    /* ── 8. Heat, and the burn-down ────────────────────────────────────── */
    const roarGlow = smooth(range(0.25, 0.8, flareU));
    if (bodyMat.current) {
      bodyMat.current.emissiveIntensity =
        0.5 + Math.sin(t * 2.6) * 0.14 + roarGlow * 1.5 + dissU * 5;
      bodyMat.current.opacity = clamp01(alive * 1.6);
    }
    if (wingMat.current) {
      wingMat.current.emissiveIntensity = 0.32 + roarGlow * 1.1 + dissU * 3.4;
      // Membrane thins and lights up as the wing stretches over the flare.
      wingMat.current.opacity = clamp01((0.86 + roarGlow * 0.1) * alive * 1.5);
    }
    if (eyeMat.current)
      eyeMat.current.emissiveIntensity = 2.2 + roarGlow * 3.5 + dissU * 6;
    if (glow.current)
      glow.current.intensity = 1.8 + roarGlow * 5 + dissU * 14;
    if (throat.current)
      throat.current.intensity = roarGlow * 3.4 * (1 - dissU);

    /* Embers: seeded off the spine the instant the body starts to burn. */
    if (embersRef.current) {
      const E = S.ember;
      if (dissU > 0 && !E.born) {
        E.born = true;
        for (let k = 0; k < N_EMBERS; k++) {
          const i = Math.round((k / N_EMBERS) * SEGS);
          const a = (k * 2.399) % (Math.PI * 2); // golden-angle spread
          E.pos[k * 3] = S.pts[i].x + Math.cos(a) * 0.1;
          E.pos[k * 3 + 1] = S.pts[i].y + Math.sin(a) * 0.1;
          E.pos[k * 3 + 2] = S.pts[i].z;
          E.vel[k * 3] = Math.cos(a) * 0.55 + 0.25;
          E.vel[k * 3 + 1] = Math.sin(a) * 0.4 + 1.1;
          E.vel[k * 3 + 2] = ((k % 5) - 2) * 0.14;
          E.size[k] = 0.022 + ((k * 37) % 11) * 0.0035;
        }
      }
      for (let k = 0; k < N_EMBERS; k++) {
        if (!E.born) {
          S.dummy.scale.setScalar(0.0001);
        } else {
          E.pos[k * 3] += E.vel[k * 3] * dt;
          E.pos[k * 3 + 1] += E.vel[k * 3 + 1] * dt;
          E.pos[k * 3 + 2] += E.vel[k * 3 + 2] * dt;
          E.vel[k * 3 + 1] -= 0.35 * dt; // they arc over and fall
          S.dummy.position.set(
            E.pos[k * 3],
            E.pos[k * 3 + 1],
            E.pos[k * 3 + 2]
          );
          S.dummy.rotation.set(t * 3 + k, t * 2 + k, 0);
          S.dummy.scale.setScalar(Math.max(E.size[k] * (1 - dissU), 0.0001));
        }
        S.dummy.updateMatrix();
        embersRef.current.setMatrixAt(k, S.dummy.matrix);
      }
      embersRef.current.instanceMatrix.needsUpdate = true;
      if (emberMat.current) emberMat.current.opacity = 1 - dissU * dissU;
    }

    if (dissU >= 1 && !landedFired.current) {
      landedFired.current = true;
      onLanded();
    }
  });

  return (
    <>
      <ambientLight intensity={0.85} color="#ffd9b0" />
      <directionalLight position={[3, 4, 6]} intensity={1.15} color="#f0c674" />
      <directionalLight position={[-4, -1, -3]} intensity={0.4} color="#e0563b" />

      <group ref={group} scale={0.3}>
        <pointLight ref={glow} color="#ff7a3c" intensity={2} decay={0} />

        {/* ── Body ── */}
        <mesh ref={bodyRef} geometry={bodyGeo} frustumCulled={false}>
          <meshStandardMaterial
            ref={bodyMat}
            color="#1c130d"
            emissive="#e0563b"
            emissiveIntensity={0.5}
            roughness={0.55}
            metalness={0.35}
            side={THREE.DoubleSide}
            transparent
            flatShading
          />
        </mesh>

        {/* ── Dorsal ridge ── */}
        <instancedMesh
          ref={spikesRef}
          args={[undefined, undefined, N_SPIKES]}
          frustumCulled={false}
        >
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial
            color="#e8b64c"
            emissive="#7a4e12"
            emissiveIntensity={0.5}
            roughness={0.6}
            flatShading
          />
        </instancedMesh>

        {/* ── Head ── */}
        <group ref={headRef}>
          <pointLight
            ref={throat}
            color="#ff9a3c"
            intensity={0}
            distance={1.4}
            decay={2}
            position={[0, -0.02, -0.16]}
          />
          {/* skull */}
          <mesh scale={[0.115, 0.115, 0.17]} position={[0, 0.01, -0.12]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color="#1c130d"
              emissive="#e0563b"
              emissiveIntensity={0.55}
              roughness={0.5}
              metalness={0.4}
              flatShading
            />
          </mesh>
          {/* snout */}
          <mesh
            position={[0, -0.01, -0.3]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.085, 0.2, 0.075]}
          >
            <coneGeometry args={[1, 1, 5]} />
            <meshStandardMaterial
              color="#1c130d"
              emissive="#e0563b"
              emissiveIntensity={0.5}
              roughness={0.5}
              metalness={0.4}
              flatShading
            />
          </mesh>
          {/* hinged lower jaw */}
          <group ref={jawRef} position={[0, -0.06, -0.16]}>
            <mesh
              position={[0, -0.01, -0.1]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[0.062, 0.17, 0.045]}
            >
              <coneGeometry args={[1, 1, 5]} />
              <meshStandardMaterial
                color="#140d08"
                emissive="#c9342d"
                emissiveIntensity={0.45}
                roughness={0.6}
                flatShading
              />
            </mesh>
          </group>
          {/* eyes */}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[s * 0.075, 0.045, -0.2]}
              scale={0.026}
            >
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                ref={s === 1 ? eyeMat : undefined}
                color="#ffd27a"
                emissive="#ffae3c"
                emissiveIntensity={2.2}
                toneMapped={false}
              />
            </mesh>
          ))}
          {/* swept horns + cheek spikes */}
          {[-1, 1].map((s) => (
            <group key={`h${s}`}>
              <mesh
                position={[s * 0.075, 0.11, -0.05]}
                rotation={[0.95, s * 0.25, -s * 0.3]}
                scale={[0.026, 0.34, 0.026]}
              >
                <coneGeometry args={[1, 1, 5]} />
                <meshStandardMaterial
                  color="#e8b64c"
                  emissive="#7a4e12"
                  emissiveIntensity={0.5}
                  roughness={0.55}
                  flatShading
                />
              </mesh>
              <mesh
                position={[s * 0.095, 0.0, -0.12]}
                rotation={[1.5, s * 0.4, -s * 0.5]}
                scale={[0.016, 0.15, 0.016]}
              >
                <coneGeometry args={[1, 1, 4]} />
                <meshStandardMaterial
                  color="#e8b64c"
                  emissive="#7a4e12"
                  emissiveIntensity={0.4}
                  roughness={0.6}
                  flatShading
                />
              </mesh>
            </group>
          ))}
        </group>

        {/* ── Wings ── */}
        <group ref={wingRootRef}>
          <mesh ref={wingRRef} geometry={wingGeoR} frustumCulled={false}>
            <meshStandardMaterial
              ref={wingMat}
              vertexColors
              emissive="#e0563b"
              emissiveIntensity={0.32}
              roughness={0.75}
              transparent
              opacity={0.86}
              side={THREE.DoubleSide}
              flatShading
            />
          </mesh>
          <mesh ref={wingLRef} geometry={wingGeoL} frustumCulled={false}>
            <meshStandardMaterial
              vertexColors
              emissive="#e0563b"
              emissiveIntensity={0.32}
              roughness={0.75}
              transparent
              opacity={0.86}
              side={THREE.DoubleSide}
              flatShading
            />
          </mesh>
          <instancedMesh
            ref={bonesRef}
            args={[undefined, undefined, N_BONES]}
            frustumCulled={false}
          >
            <cylinderGeometry args={[1, 1, 1, 5]} />
            <meshStandardMaterial
              color="#2a1a0e"
              emissive="#8a3a1c"
              emissiveIntensity={0.4}
              roughness={0.65}
              flatShading
            />
          </instancedMesh>
        </group>

        {/* ── Legs ── */}
        {legs.map((L, i) => (
          <group key={i} ref={L.root}>
            <group ref={L.upper}>
              <mesh position={[0, -0.09, 0]} scale={[0.042, 0.11, 0.042]}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                  color="#1c130d"
                  emissive="#e0563b"
                  emissiveIntensity={0.42}
                  roughness={0.6}
                  metalness={0.3}
                  flatShading
                />
              </mesh>
              <group ref={L.lower} position={[0, -0.18, 0]}>
                <mesh position={[0, -0.07, 0]} scale={[0.03, 0.085, 0.03]}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial
                    color="#1c130d"
                    emissive="#e0563b"
                    emissiveIntensity={0.4}
                    roughness={0.6}
                    flatShading
                  />
                </mesh>
                {/* claws */}
                {[-1, 0, 1].map((c) => (
                  <mesh
                    key={c}
                    position={[c * 0.022, -0.16, -0.012]}
                    rotation={[-0.5, 0, c * 0.3]}
                    scale={[0.011, 0.05, 0.011]}
                  >
                    <coneGeometry args={[1, 1, 4]} />
                    <meshStandardMaterial
                      color="#e8b64c"
                      emissive="#7a4e12"
                      emissiveIntensity={0.45}
                      flatShading
                    />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        ))}

        {/* ── Burn-down embers ── */}
        <instancedMesh
          ref={embersRef}
          args={[undefined, undefined, N_EMBERS]}
          frustumCulled={false}
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            ref={emberMat}
            color="#ffd9a0"
            emissive="#ff8a3c"
            emissiveIntensity={3}
            transparent
            opacity={1}
            toneMapped={false}
            flatShading
          />
        </instancedMesh>
      </group>
    </>
  );
}

class DragonBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

const HeroDragon = ({ opacity = 1 }) => {
  const setDragonLanded = useExperienceStore((s) => s.setDragonLanded);
  const dragonLanded = useExperienceStore((s) => s.dragonLanded);

  const finish = () => setDragonLanded(true);

  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (reduce || dragonLanded || opacity < 0.03) return null;

  return (
    <div className="hero-dragon-canvas" aria-hidden="true" style={{ opacity }}>
      <DragonBoundary onError={finish}>
        <Canvas
          dpr={[1, 1.75]}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          camera={{ position: [0, 0, 7], fov: 42 }}
          fallback={null}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <DragonRig onLanded={finish} />
        </Canvas>
      </DragonBoundary>
    </div>
  );
};

export default HeroDragon;
