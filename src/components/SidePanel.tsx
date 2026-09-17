import { useSideModal } from "../hooks/SideModalContext";

const PANEL_WIDTH_PX = 480;

const TITLE_BY_MODAL = {
  signup: "Sign up",
  help: "Help",
} as const;

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-full">
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

/**
 * Anchored to the right — opposite DetailsView, which owns the left —
 * so the two never compete for the same edge. Signup and help are
 * placeholders for now (per the ask): just the modal chrome and a word,
 * content to come later.
 */
export default function SidePanel() {
  const { activeModal, close } = useSideModal();
  const isOpen = activeModal !== null;
  const title = TITLE_BY_MODAL[activeModal ?? "signup"];

  return (
    <div className="side-panel pointer-events-none absolute inset-0 z-50 flex h-full justify-end overflow-hidden">
      <div
        style={{
          width: PANEL_WIDTH_PX,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          opacity: isOpen ? 1 : 0,
        }}
        className={`side-panel-card flex h-full max-w-[50%] flex-col bg-white shadow-[0_4px_5px_0_rgba(0,0,0,0.2)] transition-[transform,opacity] duration-300 ease-out ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div className="side-panel-header flex items-center justify-between p-6">
          <p className="font-vision text-2xl text-mayfair-navy">{title}</p>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="side-panel-close flex size-12 items-center justify-center rounded-full bg-mayfair-navy/10 p-3 text-mayfair-navy"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="side-panel-body flex flex-1 items-center justify-center p-6">
          <p className="font-vision text-4xl capitalize text-mayfair-navy">{activeModal}</p>
        </div>
      </div>
    </div>
  );
}
