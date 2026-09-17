import { RouteProvider } from './hooks/RouteContext'
import { FilterProvider } from './hooks/FilterContext'
import { DrawerProvider } from './hooks/DrawerContext'
import { DetailsProvider } from './hooks/DetailsContext'
import { WelcomeProvider } from './hooks/WelcomeContext'
import MapView from './components/MapView'
import WelcomeOverlay from './components/WelcomeOverlay'
import Drawer from './components/Drawer'
import DetailsView from './components/DetailsView'

function App() {
  return (
    <RouteProvider>
      <FilterProvider>
        <DrawerProvider>
          <DetailsProvider>
            <WelcomeProvider>
              <div className="relative h-full w-full">
                <MapView />
                <Drawer />
                <DetailsView />
                <WelcomeOverlay />
              </div>
            </WelcomeProvider>
          </DetailsProvider>
        </DrawerProvider>
      </FilterProvider>
    </RouteProvider>
  )
}

export default App
