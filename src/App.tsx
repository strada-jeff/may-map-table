import { useState } from 'react'
import { RouteProvider } from './hooks/RouteContext'
import { FilterProvider } from './hooks/FilterContext'
import { DrawerProvider } from './hooks/DrawerContext'
import { DetailsProvider } from './hooks/DetailsContext'
import { WelcomeProvider } from './hooks/WelcomeContext'
import { SideModalProvider } from './hooks/SideModalContext'
import { MapInstanceProvider } from './hooks/MapInstanceContext'
import MapView from './components/MapView'
import WelcomeOverlay from './components/WelcomeOverlay'
import Drawer from './components/Drawer'
import DetailsView from './components/DetailsView'
import SidePanel from './components/SidePanel'
import SignupCta from './components/SignupCta'
import HelpCta from './components/HelpCta'
import RotateControl from './components/RotateControl'
import CompassControl from './components/CompassControl'

function App() {
  const [rotated, setRotated] = useState(false)

  return (
    <RouteProvider>
      <FilterProvider>
        <DrawerProvider>
          <DetailsProvider>
            <WelcomeProvider>
              <SideModalProvider>
                <MapInstanceProvider>
                  <div
                    className="relative h-full w-full"
                    style={{ transform: rotated ? 'rotate(180deg)' : undefined }}
                  >
                    <MapView />
                    <Drawer />
                    <DetailsView />
                    <SidePanel />
                    <CompassControl />
                    <SignupCta />
                    <RotateControl rotated={rotated} onToggle={() => setRotated((r) => !r)} />
                    <HelpCta />
                    <WelcomeOverlay />
                  </div>
                </MapInstanceProvider>
              </SideModalProvider>
            </WelcomeProvider>
          </DetailsProvider>
        </DrawerProvider>
      </FilterProvider>
    </RouteProvider>
  )
}

export default App
