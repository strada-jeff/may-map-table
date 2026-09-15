import { CONFIG } from './config'
import { useIdle } from './hooks/useIdle'
import { RouteProvider } from './hooks/RouteContext'
import { FilterProvider } from './hooks/FilterContext'
import { DrawerProvider } from './hooks/DrawerContext'
import { DetailsProvider } from './hooks/DetailsContext'
import MapView from './components/MapView'
import WelcomeOverlay from './components/WelcomeOverlay'
import Drawer from './components/Drawer'
import DetailsView from './components/DetailsView'

function App() {
  const [showWelcome, dismissWelcome] = useIdle(CONFIG.welcomeScreen.idleTimeoutMs)

  return (
    <RouteProvider>
      <FilterProvider>
        <DrawerProvider>
          <DetailsProvider>
            <div className="relative h-full w-full">
              <MapView />
              <Drawer />
              <DetailsView />
              {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} />}
            </div>
          </DetailsProvider>
        </DrawerProvider>
      </FilterProvider>
    </RouteProvider>
  )
}

export default App
