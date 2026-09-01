import React, { useRef, useEffect, useState } from "react";
import Scene from "./Scene";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import { useModalStore } from "../stores/useModalStore";
import normalizeWheel from "normalize-wheel";
import { useExperienceStore } from "../stores/experienceStore";
import { PerformanceMonitor } from "@react-three/drei";

const Experience = () => {
  const camera = useRef();
  const cameraGroup = useRef();
  const [scrollProgress, setscrollProgress] = useState(0);
  const targetScrollProgress = useRef(0);
  const scrollSpeed = 0.01;
  const lerpFactor = 0.1;
  const isSwiping = useRef(false);
  const lastTouchY = useRef(null);
  const mousePositionOffset = useRef(new THREE.Vector3());
  const mouseRotationOffset = useRef(new THREE.Euler());
  const { isModalOpen } = useModalStore();
  const { isExperienceReady, setScrollProgress } = useExperienceStore();

  useEffect(() => {
    setScrollProgress(scrollProgress);
  }, [scrollProgress, setScrollProgress]);

  useEffect(() => {
    if (!isExperienceReady) return;

    const getEffectiveScrollSpeed = () => {
      const normProgress = ((targetScrollProgress.current % 1) + 1) % 1;
      const isSlowZone =
        (normProgress >= 0.23 && normProgress <= 0.26) ||
        (normProgress >= 0.37 && normProgress <= 0.54);
      return scrollSpeed * (isSlowZone ? 0.2 : 1.0);
    };

    const handleWheel = (e) => {
      if (isModalOpen) return;
      const normalized = normalizeWheel(e);
      const currentSpeed = getEffectiveScrollSpeed();

      targetScrollProgress.current = Math.max(
        0,
        targetScrollProgress.current +
          Math.sign(normalized.pixelY) *
            currentSpeed *
            Math.min(Math.abs(normalized.pixelY) / 100, 1)
      );
    };

    const handleMouseMove = (e) => {
      const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      const mouseY = (e.clientY / window.innerHeight) * 2 - 1;

      const sensitivityX = 0.15;
      const sensitivityY = 0.15;

      const rotationSensitivityX = 0.03;
      const rotationSensitivityY = 0.03;

      mousePositionOffset.current.x = mouseX * sensitivityX;
      mousePositionOffset.current.y = mouseY * sensitivityY;

      mouseRotationOffset.current.x = mouseY * rotationSensitivityX;
      mouseRotationOffset.current.y = mouseX * rotationSensitivityY;
    };

    const handleTouchStart = (e) => {
      if (isModalOpen) return;
      isSwiping.current = true;
      lastTouchY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!isSwiping.current) return;

      if (lastTouchY.current !== null) {
        const deltaY = e.touches[0].clientY - lastTouchY.current;
        // Natural touch scroll: swiping UP (clientY decreases) advances forward (+progress)
        const touchDelta = -deltaY;
        const touchMultiplier = 2.0;
        const currentSpeed = getEffectiveScrollSpeed();
        targetScrollProgress.current = Math.max(
          0,
          targetScrollProgress.current +
            (touchDelta / 100) * currentSpeed * touchMultiplier
        );
      }
      lastTouchY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      isSwiping.current = false;
      lastTouchY.current = null;
    };

    const handleMouseDown = (e) => {
      if (isModalOpen || e.pointerType === "touch") return;
      isSwiping.current = true;
    };

    const handleMouseDrag = (e) => {
      if (!isSwiping.current || e.pointerType === "touch") return;
      const mouseMultiplier = 0.4;
      const currentSpeed = getEffectiveScrollSpeed();
      targetScrollProgress.current = Math.max(
        0,
        targetScrollProgress.current +
          Math.sign(e.movementY) * currentSpeed * mouseMultiplier
      );
    };

    const handleMouseUp = () => {
      isSwiping.current = false;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseDrag);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseDrag);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isModalOpen, isExperienceReady]);

  return (
    <>
      <Canvas eventSource={document.getElementById("root")}>
        <group ref={cameraGroup}>
          <PerspectiveCamera ref={camera} fov={52} makeDefault />
        </group>
        {/* <OrbitControls camera={camera.current} enableZoom={false} /> */}
        <Scene
          cameraGroup={cameraGroup}
          camera={camera}
          scrollProgress={scrollProgress}
          setscrollProgress={setscrollProgress}
          targetScrollProgress={targetScrollProgress}
          lerpFactor={lerpFactor}
          mousePositionOffset={mousePositionOffset}
          mouseRotationOffset={mouseRotationOffset}
        />
      </Canvas>
    </>
  );
};

export default Experience;
