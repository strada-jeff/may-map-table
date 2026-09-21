import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CONFIG } from "../config";
import exploreMark from "../assets/icons/explore-mark.svg";
import RotateArrowsIcon from "./RotateArrowsIcon";
import { useSideModal, type SideModalKey } from "../hooks/SideModalContext";
import { useRotation } from "../hooks/RotationContext";

const QR_SIZE_PX = 517;

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="size-full"
    >
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

/**
 * Full-screen overlay, same slot and translucent-navy treatment as
 * WelcomeOverlay — a deliberate interruption of the map, not a sidebar.
 * Help is still a placeholder (per the ask): just the word, content to
 * come later. Signup is a pitch line and a live-generated QR (qrcode.react,
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
      className={`side-panel absolute inset-0 z-50 flex flex-col items-center justify-center gap-16 bg-mayfair-navy/92 px-6 text-center transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="side-panel-close absolute right-12 top-12 flex size-14 items-center justify-center text-white"
      >
        <CloseIcon />
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
            className="side-panel-qr"
          />

          <img src={exploreMark} alt="" className="side-panel-mark h-[150px] w-auto" />
        </>
      ) : lastModal === "rotate" ? (
        <>
          <p className="side-panel-heading max-w-[700px] font-vision text-[80px] leading-[84px] text-white">
            This will rotate the screen view 180º, continue?
          </p>

          <button
            type="button"
            onClick={() => {
              toggle();
              close();
            }}
            aria-label="Confirm rotation"
            className="side-panel-rotate-confirm flex size-[181px] items-center justify-center rounded-full border-[3.5px] border-mayfair-blue"
          >
            <RotateArrowsIcon color="#ffffff" className="h-9 w-auto" />
          </button>
        </>
      ) : (
        <p className="side-panel-body font-vision text-4xl capitalize text-white">{lastModal}</p>
      )}
    </div>
  );
}
