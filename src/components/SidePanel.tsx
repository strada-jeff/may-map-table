import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useCopy } from "../hooks/useCopy";
import rotateViewRing from "../assets/icons/rotate-view-ring.svg";
import RotateArrowsIcon from "./RotateArrowsIcon";
import HelpLegend from "./HelpLegend";
import RoundCloseButton from "./RoundCloseButton";
import { useSideModal, type SideModalKey } from "../hooks/SideModalContext";
import { useRotation } from "../hooks/RotationContext";
import { useTap } from "../hooks/useTap";

const QR_SIZE_PX = 517;

/**
 * Full-screen overlay, same slot and translucent-navy treatment as
 * WelcomeOverlay — a deliberate interruption of the map, not a sidebar.
 * Help is the pin legend (HelpLegend). Signup is a pitch line and a live-generated QR (qrcode.react,
 * same library DetailsView uses for directions) instead of a fixed image,
 * so its target lives in the CMS (useCopy) instead of a baked-in asset. Rotate
 * is a confirm step for RotateControl — its CTA is what actually calls
 * RotationContext's `toggle`, not the corner button itself.
 *
 * Each closes from a RoundCloseButton under its content (Figma help_alt,
 * interest list, rotate_view), not a corner ×.
 */
export default function SidePanel() {
  const { activeModal, close } = useSideModal();
  const { toggle } = useRotation();
  const { signup } = useCopy();
  const isOpen = activeModal !== null;

  // Kept across activeModal -> null so the overlay still has content to
  // show while it fades out, instead of popping empty mid-transition —
  // same trick as DetailsView's lastPin.
  const [lastModal, setLastModal] = useState<SideModalKey | null>(null);
  if (activeModal && activeModal !== lastModal) {
    setLastModal(activeModal);
  }
  const rotateConfirmTap = useTap(() => {
    toggle();
    close();
  });

  if (!lastModal) return null;

  return (
    <div
      className={`side-panel absolute inset-0 z-50 flex flex-col items-center justify-center bg-mayfair-navy/92 px-6 text-center transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {lastModal === "signup" ? (
        <>
          <p className="side-panel-heading max-w-[470px] font-vision text-[30px] font-extrabold uppercase leading-[40px] tracking-[3px] text-white">
            {signup.heading}
          </p>

          <QRCodeSVG
            value={signup.qrValue}
            size={QR_SIZE_PX}
            fgColor="#ffffff"
            bgColor="transparent"
            className="side-panel-qr mt-[48px]"
          />

          <RoundCloseButton onClose={close} className="mt-[99px]" />
        </>
      ) : lastModal === "rotate" ? (
        <>
          {/* As tall as the close button and its gap below, so the ring
              stays centered on the screen, as in Figma. */}
          <div className="side-panel-rotate-spacer h-[283px]" aria-hidden />
          <button
            type="button"
            {...rotateConfirmTap}
            aria-label="Rotate the view"
            className="side-panel-rotate-confirm relative flex size-[341px] items-center justify-center"
          >
            <img src={rotateViewRing} alt="" className="rotate-ring-spin absolute inset-0 size-full" />
            <span className="flex size-[181px] items-center justify-center rounded-full border-[3.5px] border-mayfair-blue">
              <RotateArrowsIcon color="#ffffff" className="h-[36.5px] w-[45px]" />
            </span>
          </button>

          <RoundCloseButton onClose={close} className="mt-[151px]" />
        </>
      ) : (
        <HelpLegend onClose={close} />
      )}
    </div>
  );
}
