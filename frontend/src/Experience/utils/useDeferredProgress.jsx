import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/*
 * drei drives its useProgress store straight from THREE.DefaultLoadingManager's
 * callbacks (see @react-three/drei/core/Progress.js). Those callbacks fire
 * synchronously the moment a loader starts a fetch, and useGLTF/useTexture
 * start their fetches during the render phase — so reading that store with the
 * plain hook asks React to update the subscribing component while it is still
 * rendering a model component:
 *
 *   Cannot update a component (`LoadingManager`) while rendering a
 *   different component (`Model`).
 *
 * Subscribing imperatively and flushing the snapshot on a macrotask moves the
 * state update out of the render phase. When loading actually starts and
 * finishes is unchanged; only the React re-render is pushed past the commit.
 */
const readProgress = () => {
  const { active, progress } = useProgress.getState();
  return { active, progress };
};

export function useDeferredProgress() {
  const [snapshot, setSnapshot] = useState(readProgress);

  useEffect(() => {
    const timers = new Set();

    const flush = () => {
      const next = readProgress();
      setSnapshot((prev) =>
        prev.active === next.active && prev.progress === next.progress
          ? prev
          : next
      );
    };

    // Catch anything that loaded between the first render and this effect.
    flush();

    const unsubscribe = useProgress.subscribe(() => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        flush();
      }, 0);
      timers.add(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
      unsubscribe();
    };
  }, []);

  return snapshot;
}
