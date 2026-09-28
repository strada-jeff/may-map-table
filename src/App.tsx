import { CONFIG } from './config'
import { resolveMapPoint } from './routing'
import { centeredTransform, zoomToScale } from './hooks/mapTransform'
import { MapControlsProvider } from './hooks/MapControlsContext'
import { RouteProvider } from './hooks/RouteContext'
import { FilterProvider } from './hooks/FilterContext'
import { DrawerProvider } from './hooks/DrawerContext'
import { DetailsProvider } from './hooks/DetailsContext'
import { WelcomeProvider } from './hooks/WelcomeContext'
import { SideModalProvider } from './hooks/SideModalContext'
import { RotationProvider, useRotation } from './hooks/RotationContext'
import MapView from './components/MapView'
import WelcomeOverlay from './components/WelcomeOverlay'
import IdleResetEffect from './components/IdleResetEffect'
import Drawer from './components/Drawer'
import DetailsView from './components/DetailsView'
import SidePanel from './components/SidePanel'
import SignupCta from './components/SignupCta'
import HelpCta from './components/HelpCta'
import RotateControl from './components/RotateControl'
import CompassControl from './components/CompassControl'
import { useRotatedInputCorrection } from './hooks/useRotatedInputCorrection'

function App() {
  return (
    <RouteProvider>
      <FilterProvider>
        <DrawerProvider>
          <DetailsProvider>
            <WelcomeProvider>
              <SideModalProvider>
                <RotationProvider>
                  <MapExperience />
                </RotationProvider>
              </SideModalProvider>
            </WelcomeProvider>
          </DetailsProvider>
        </DrawerProvider>
      </FilterProvider>
    </RouteProvider>
  )
}

/**
 * Split out from App so it can read RotationContext (a component can't
 * consume a context it also renders the provider for).
 */
function MapExperience() {
  const { rotated } = useRotation()
  useRotatedInputCorrection(rotated)

  return (
    <div className="h-full w-full">
      <MapControlsProvider initialTransform={idleTransform}>
        <div
          className="relative h-full w-full transition-transform duration-500 ease-in-out"
          style={{ transform: rotated ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <MapView rotated={rotated} />
          <Drawer />
          <DetailsView />
          <SidePanel />
          <CompassControl />
          <SignupCta />
          <RotateControl />
          <HelpCta />
          <WelcomeOverlay />
          <IdleResetEffect />
        </div>
      </MapControlsProvider>
    </div>
  )
}

/**
 * The welcome screen is up on first paint, so the map opens already showing
 * its idle (zoomed-out) view rather than fitting the whole artwork. See
 * InitialViewEffect for the transitions after this.
 */
function idleTransform(wrapperSize: { width: number; height: number }) {
  return centeredTransform(
    wrapperSize,
    resolveMapPoint(CONFIG.map.initialCenter),
    zoomToScale(CONFIG.map.initialZoom - CONFIG.map.idleZoomOffset),
  )
}

export default App
