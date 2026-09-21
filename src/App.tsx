import { useState } from 'react'
import { TransformWrapper } from 'react-zoom-pan-pinch'
import { CONFIG } from './config'
import { resolveMapPoint } from './routing'
import { centeredTransform, zoomToScale } from './hooks/mapTransform'
import { RouteProvider } from './hooks/RouteContext'
import { FilterProvider } from './hooks/FilterContext'
import { DrawerProvider } from './hooks/DrawerContext'
import { DetailsProvider } from './hooks/DetailsContext'
import { WelcomeProvider } from './hooks/WelcomeContext'
import { SideModalProvider } from './hooks/SideModalContext'
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
  const [rotated, setRotated] = useState(false)
  useRotatedInputCorrection(rotated)

  return (
    <RouteProvider>
      <FilterProvider>
        <DrawerProvider>
          <DetailsProvider>
            <WelcomeProvider>
              <SideModalProvider>
                <TransformWrapper
                  minScale={zoomToScale(CONFIG.map.minZoom)}
                  maxScale={zoomToScale(CONFIG.map.maxZoom)}
                  initialScale={zoomToScale(CONFIG.map.initialZoom - CONFIG.map.idleZoomOffset)}
                  limitToBounds
                  centerOnInit={false}
                  doubleClick={{ disabled: true }}
                  velocityAnimation={{ sensitivityTouch: 1.5, sensitivityMouse: 1.5 }}
                  // The welcome screen is up on first paint, so the map should
                  // already be showing its idle (zoomed-out) view rather than
                  // fitting the whole artwork — onInit fires once the wrapper's
                  // real size is measured, so this lands exactly centered
                  // rather than guessed from window size. See
                  // InitialViewEffect for the transitions after this.
                  onInit={(ref) => {
                    const wrapper = ref.instance.wrapperComponent;
                    if (!wrapper) return;
                    const { width, height } = wrapper.getBoundingClientRect();
                    const scale = zoomToScale(CONFIG.map.initialZoom - CONFIG.map.idleZoomOffset);
                    const target = centeredTransform(
                      { width, height },
                      resolveMapPoint(CONFIG.map.initialCenter),
                      scale,
                    );
                    ref.setTransform(target.x, target.y, target.scale, 0);
                  }}
                >
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
                    <RotateControl rotated={rotated} onToggle={() => setRotated((r) => !r)} />
                    <HelpCta />
                    <WelcomeOverlay />
                    <IdleResetEffect />
                  </div>
                </TransformWrapper>
              </SideModalProvider>
            </WelcomeProvider>
          </DetailsProvider>
        </DrawerProvider>
      </FilterProvider>
    </RouteProvider>
  )
}

export default App
