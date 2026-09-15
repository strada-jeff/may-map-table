import { CONFIG } from './config'
import { useIdle } from './hooks/useIdle'
import { RouteProvider } from './hooks/RouteContext'
import MapView from './components/MapView'
import WelcomeOverlay from './components/WelcomeOverlay'

function App() {
  const [showWelcome, dismissWelcome] = useIdle(CONFIG.welcomeScreen.idleTimeoutMs)

  return (
    <RouteProvider>
      <div className="relative h-full w-full">
        <MapView />
        {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} />}
      </div>
    </RouteProvider>
  )
}

export default App
