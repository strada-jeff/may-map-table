import { CONFIG } from './config'
import { useIdle } from './hooks/useIdle'
import { RouteProvider } from './hooks/RouteContext'
import { FilterProvider } from './hooks/FilterContext'
import MapView from './components/MapView'
import WelcomeOverlay from './components/WelcomeOverlay'
import Drawer from './components/Drawer'

function App() {
  const [showWelcome, dismissWelcome] = useIdle(CONFIG.welcomeScreen.idleTimeoutMs)

  return (
    <RouteProvider>
      <FilterProvider>
        <div className="relative h-full w-full">
          <MapView />
          <Drawer />
          {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} />}
        </div>
      </FilterProvider>
    </RouteProvider>
  )
}

export default App
