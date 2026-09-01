import { useEffect } from "react";
import "./App.scss";
import Experience from "./Experience/Experience";
import Modal from "./components/Modal/Modal";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import HeroOverlay from "./components/HeroOverlay/HeroOverlay";
import AudioManager from "./components/AudioManager/AudioManager";
import { useExperienceStore } from "./stores/experienceStore";
import { useAuthStore } from "./stores/authStore";

function App() {
  const { isExperienceReady } = useExperienceStore();
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <LoadingScreen />
      <AudioManager />
      <HeroOverlay visible={isExperienceReady} />
      <Modal />
      <Experience />
    </>
  );
}

export default App;
