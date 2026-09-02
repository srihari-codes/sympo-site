import { useEffect } from "react";
import "./App.scss";
import Experience from "./Experience/Experience";
import Modal from "./components/Modal/Modal";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import HeroOverlay from "./components/HeroOverlay/HeroOverlay";
import AudioManager from "./components/AudioManager/AudioManager";
import { useExperienceStore } from "./stores/experienceStore";
import { useAuthStore } from "./stores/authStore";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";

function App() {
  // Select only the flag we need — the store's scrollProgress is rewritten
  // every frame, and a bare useExperienceStore() would re-render the whole app
  // (Modal, Dashboard, the Google button…) on every one of those writes.
  const isExperienceReady = useExperienceStore((s) => s.isExperienceReady);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <LoadingScreen />
      <AudioManager />
      <HeroOverlay visible={isExperienceReady} />
      <ErrorBoundary label="Modal">
        <Modal />
      </ErrorBoundary>
      <ErrorBoundary label="3D scene">
        <Experience />
      </ErrorBoundary>
    </>
  );
}

export default App;
