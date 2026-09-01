import React, { useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "../../stores/experienceStore";

/* ══════════════════════════════════════════════════════════════════
   HeroDragon — a small procedural low-poly dragon in its own transparent
   canvas over the hero. It flies in from off-screen, roams a loop around
   the wordmark, then dives to the "Z" slot and dissolves; the CSS "Z"
   glyph ignites in its place (experienceStore.dragonLanded).
   No model files — the creature is built from primitives.
   ══════════════════════════════════════════════════════════════════ */

const START_DELAY = 0.15;
const FLY_DUR = 3.2;
const LAND_DUR = 0.7;
const DISSOLVE_DUR = 0.5;

const N_BEADS = 18;
const BODY_LEN = 2.9;
const WING_SCALE = 1.8;

const FWD = new THREE.Vector3(0, 0, -1);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = THREE.MathUtils.lerp;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/* bat-wing membrane silhouette */
function makeWingShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.5, 0.35, 1.15, 0.2);
  s.quadraticCurveTo(0.95, 0.05, 1.25, -0.05);
  s.quadraticCurveTo(0.85, -0.12, 1.05, -0.32);
  s.quadraticCurveTo(0.7, -0.32, 0.8, -0.55);
  s.quadraticCurveTo(0.45, -0.45, 0.5, -0.7);
  s.quadraticCurveTo(0.2, -0.5, 0.05, -0.62);
  s.quadraticCurveTo(0.02, -0.3, 0, 0);
  return s;
}

function DragonRig({ onLanded }) {
  const { camera, size } = useThree();

  const group = useRef();
  const beads = useRef();
  const head = useRef();
  const wingL = useRef();
  const wingR = useRef();
  const shoulder = useRef();
  const bodyMat = useRef();
  const wingMatR = useRef();
  const wingMatL = useRef();
  const glow = useRef();

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      up: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
    }),
    []
  );
  const start = useRef(null);
  const landedFired = useRef(false);

  /* landing target (where the DOM "Z" sits) on the z=0 plane, in world space */
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

  const flightCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(8.5, 3.6, -3.0),
        new THREE.Vector3(2.0, 1.5, 1.6),
        new THREE.Vector3(-2.8, 0.7, 0.8),
        new THREE.Vector3(-3.5, -1.5, -0.4),
        new THREE.Vector3(-0.6, 1.8, -1.6),
        new THREE.Vector3(2.6, 0.8, 0.9),
        new THREE.Vector3(-0.5, 0.1, 0.3),
      ]),
    []
  );

  const wingShape = useMemo(() => makeWingShape(), []);
  const spine = useMemo(
    () => Array.from({ length: N_BEADS }, () => new THREE.Vector3()),
    []
  );

  useFrame((state) => {
    if (!group.current) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current - START_DELAY;
    if (t < 0) return;

    const flyU = clamp01(t / FLY_DUR);
    const landU = clamp01((t - FLY_DUR) / LAND_DUR);
    const dissU = clamp01((t - FLY_DUR - LAND_DUR) / DISSOLVE_DUR);

    /* serpentine local spine (dragon lies along -Z, head at 0) */
    const slither = t * 6;
    for (let i = 0; i < N_BEADS; i++) {
      const p = i / (N_BEADS - 1);
      const ph = slither - p * 7;
      spine[i].set(
        Math.sin(ph) * 0.13 * (0.35 + p * 1.3),
        Math.sin(ph * 0.8 + 1) * 0.06 * (0.3 + p),
        -p * BODY_LEN
      );
    }

    if (beads.current) {
      for (let i = 0; i < N_BEADS; i++) {
        const p = i / (N_BEADS - 1);
        let r = lerp(0.24, 0.035, Math.pow(p, 0.82));
        dummy.position.copy(spine[i]);
        if (dissU > 0) {
          dummy.position.addScaledVector(
            scratch.pos.copy(spine[i]).normalize(),
            dissU * 0.9
          );
          r *= 1 - dissU;
        }
        dummy.scale.setScalar(Math.max(r, 0.0001));
        dummy.rotation.set(i * 1.3, i * 0.7, 0);
        dummy.updateMatrix();
        beads.current.setMatrixAt(i, dummy.matrix);
      }
      beads.current.instanceMatrix.needsUpdate = true;
    }

    if (head.current) {
      head.current.position.copy(spine[0]);
      head.current.position.z += 0.16;
      head.current.scale.setScalar(Math.max(1 - dissU, 0.0001));
    }

    /* wings */
    if (shoulder.current) {
      shoulder.current.position.copy(spine[2]);
      const slow = Math.max(landU, dissU);
      const flapSpeed = lerp(24, 5, slow);
      const flap = Math.sin(t * flapSpeed) * lerp(0.85, 0.12, slow);
      const fold = lerp(0, -0.9, Math.max(landU * 0.6, dissU));
      const ws = Math.max(1 - dissU, 0.0001) * WING_SCALE;
      if (wingR.current) {
        wingR.current.rotation.z = -0.15 + flap + fold;
        wingR.current.rotation.x = Math.sin(t * flapSpeed + 1) * 0.12;
        wingR.current.scale.setScalar(ws);
      }
      if (wingL.current) {
        wingL.current.rotation.z = 0.15 - flap - fold;
        wingL.current.rotation.x = Math.sin(t * flapSpeed + 1) * 0.12;
        wingL.current.scale.set(-ws, ws, ws);
      }
    }

    /* group flight path */
    if (t < FLY_DUR) {
      flightCurve.getPoint(easeInOut(flyU), scratch.pos);
    } else {
      flightCurve.getPoint(1, scratch.pos);
      scratch.pos.lerp(landTarget.current, easeInOut(landU));
    }
    group.current.position.copy(scratch.pos);

    /* orientation: local -Z along the flight tangent, banked into turns */
    flightCurve.getTangent(easeInOut(Math.min(flyU, 0.999)), scratch.tan).normalize();
    const roll = THREE.MathUtils.clamp(-scratch.tan.x * 1.1, -0.7, 0.7);
    scratch.up.set(0, 1, 0).applyAxisAngle(scratch.tan, roll);
    scratch.m.lookAt(
      scratch.pos,
      scratch.pos.clone().add(scratch.tan),
      scratch.up
    );
    // Matrix4.lookAt orients -Z toward (pos + tan); that's our forward.
    scratch.q.setFromRotationMatrix(scratch.m);
    group.current.quaternion.slerp(scratch.q, 0.2);

    const grow = lerp(0.45, 1.15, easeInOut(clamp01(t / (FLY_DUR * 0.6))));
    const shrink = lerp(1, 0.55, easeInOut(landU)); // ease down to ~Z size on approach
    group.current.scale.setScalar(grow * shrink * Math.max(1 - dissU, 0.0001));

    /* emissive charge-up then flash */
    const em = 0.55 + Math.sin(t * 3) * 0.18 + landU * 1.6 + dissU * 4;
    if (bodyMat.current) bodyMat.current.emissiveIntensity = em;
    for (const m of [wingMatR.current, wingMatL.current]) {
      if (!m) continue;
      m.emissiveIntensity = 0.4 + landU * 1.2 + dissU * 3;
      m.opacity = 0.82 * (1 - dissU);
    }
    if (glow.current) glow.current.intensity = 2 + landU * 5 + dissU * 12;

    if (dissU >= 1 && !landedFired.current) {
      landedFired.current = true;
      onLanded();
    }
  });

  return (
    <>
      <ambientLight intensity={0.9} color="#ffd9b0" />
      <directionalLight position={[3, 4, 6]} intensity={1.2} color="#f0c674" />

      <group ref={group} scale={0.45}>
        <pointLight ref={glow} color="#ff7a3c" intensity={2} decay={0} />

        <instancedMesh ref={beads} args={[undefined, undefined, N_BEADS]} frustumCulled={false}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            ref={bodyMat}
            color="#1c130d"
            emissive="#e0563b"
            emissiveIntensity={0.55}
            roughness={0.55}
            metalness={0.35}
            flatShading
          />
        </instancedMesh>

        <group ref={head}>
          <mesh scale={[0.22, 0.19, 0.34]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color="#1c130d"
              emissive="#e0563b"
              emissiveIntensity={0.6}
              roughness={0.5}
              metalness={0.4}
              flatShading
            />
          </mesh>
          <mesh position={[0.07, 0.12, -0.1]} rotation={[0.6, 0, -0.3]}>
            <coneGeometry args={[0.03, 0.22, 5]} />
            <meshStandardMaterial color="#e8b64c" emissive="#7a4e12" emissiveIntensity={0.5} flatShading />
          </mesh>
          <mesh position={[-0.07, 0.12, -0.1]} rotation={[0.6, 0, 0.3]}>
            <coneGeometry args={[0.03, 0.22, 5]} />
            <meshStandardMaterial color="#e8b64c" emissive="#7a4e12" emissiveIntensity={0.5} flatShading />
          </mesh>
          <mesh position={[0, -0.05, 0.18]} rotation={[0.3, 0, 0]} scale={[0.14, 0.06, 0.16]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#140d08" emissive="#c9342d" emissiveIntensity={0.4} flatShading />
          </mesh>
        </group>

        <group ref={shoulder}>
          <mesh ref={wingR} rotation={[0, 0, -0.15]}>
            <shapeGeometry args={[wingShape]} />
            <meshStandardMaterial
              ref={wingMatR}
              color="#3a1508"
              emissive="#e0563b"
              emissiveIntensity={0.4}
              roughness={0.7}
              transparent
              opacity={0.82}
              side={THREE.DoubleSide}
              flatShading
            />
          </mesh>
          <mesh ref={wingL} rotation={[0, 0, 0.15]} scale={[-1, 1, 1]}>
            <shapeGeometry args={[wingShape]} />
            <meshStandardMaterial
              ref={wingMatL}
              color="#3a1508"
              emissive="#e0563b"
              emissiveIntensity={0.4}
              roughness={0.7}
              transparent
              opacity={0.82}
              side={THREE.DoubleSide}
              flatShading
            />
          </mesh>
        </group>
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
