import { CONFIG } from './config'
import { useIdle } from './hooks/useIdle'
import MapView from './components/MapView'
import WelcomeOverlay from './components/WelcomeOverlay'

function App() {
  const [showWelcome, dismissWelcome] = useIdle(CONFIG.welcomeScreen.idleTimeoutMs)

  return (
    <div className="relative h-full w-full">
      <MapView />
      {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} />}
    </div>
  )
}

export default App
