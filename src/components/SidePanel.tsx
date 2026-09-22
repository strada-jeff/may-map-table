import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CONFIG } from "../config";
import signupMark from "../assets/icons/signup-mark.svg";
import iconClose from "../assets/icons/close.svg";
import RotateArrowsIcon from "./RotateArrowsIcon";
import HelpLegend from "./HelpLegend";
import { useSideModal, type SideModalKey } from "../hooks/SideModalContext";
import { useRotation } from "../hooks/RotationContext";

const QR_SIZE_PX = 517;

/**
 * Full-screen overlay, same slot and translucent-navy treatment as
 * WelcomeOverlay — a deliberate interruption of the map, not a sidebar.
 * Help is the pin legend (HelpLegend). Signup is a pitch line and a live-generated QR (qrcode.react,
 * same library DetailsView uses for directions) instead of a fixed image,
 * so its target lives in CONFIG.signup instead of a baked-in asset. Rotate
 * is a confirm step for RotateControl — its CTA is what actually calls
 * RotationContext's `toggle`, not the corner button itself.
 */
export default function SidePanel() {
  const { activeModal, close } = useSideModal();
  const { toggle } = useRotation();
  const isOpen = activeModal !== null;

  // Kept across activeModal -> null so the overlay still has content to
  // show while it fades out, instead of popping empty mid-transition —
  // same trick as DetailsView's lastPin.
  const [lastModal, setLastModal] = useState<SideModalKey | null>(null);
  if (activeModal && activeModal !== lastModal) {
    setLastModal(activeModal);
  }
  if (!lastModal) return null;

  return (
    <div
      className={`side-panel absolute inset-0 z-50 flex flex-col items-center justify-center bg-mayfair-navy/92 px-6 text-center transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="side-panel-close absolute right-[50px] top-[50px] h-[57px] w-[58px]"
      >
        <img src={iconClose} alt="" className="side-panel-close-icon size-full" />
      </button>

      {lastModal === "signup" ? (
        <>
          <p className="side-panel-heading max-w-[470px] font-vision text-[30px] font-extrabold uppercase leading-[40px] tracking-[3px] text-white">
            {CONFIG.signup.heading}
          </p>

          <QRCodeSVG
            value={CONFIG.signup.qrValue}
            size={QR_SIZE_PX}
            fgColor="#ffffff"
            bgColor="transparent"
            className="side-panel-qr mt-[56px]"
          />

          <img src={signupMark} alt="" className="side-panel-mark mt-[79px] h-[149px] w-[172px]" />
        </>
      ) : lastModal === "rotate" ? (
        <>
          <p className="side-panel-heading max-w-[1041px] font-vision text-[80px] leading-[84px] text-white">
            This will rotate the screen view 180º, continue?
          </p>

          <button
            type="button"
            onClick={() => {
              toggle();
              close();
            }}
            aria-label="Confirm rotation"
            className="side-panel-rotate-confirm mt-[95px] flex size-[181px] items-center justify-center rounded-full border-[3.5px] border-mayfair-blue"
          >
            <RotateArrowsIcon color="#ffffff" className="h-[36.5px] w-[45px]" />
          </button>
        </>
      ) : (
        <HelpLegend />
      )}
    </div>
  );
}
