import "./App.scss";
import Experience from "./Experience/Experience";
import Modal from "./components/Modal/Modal";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import HeroOverlay from "./components/HeroOverlay/HeroOverlay";
import AudioManager from "./components/AudioManager/AudioManager";
import { useExperienceStore } from "./stores/experienceStore";

function App() {
  const { isExperienceReady } = useExperienceStore();

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
