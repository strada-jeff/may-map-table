import welcomeTitle from "../assets/welcome-title.svg";
import iconModelHomes from "../assets/icons/model-homes.svg";
import iconAmenities from "../assets/icons/amenities.svg";
import iconCommercial from "../assets/icons/commercial.svg";
import iconParksTrails from "../assets/icons/parks-trails.svg";
import iconSchools from "../assets/icons/schools.svg";
import TextIconCta from "./TextIconCta";
import ExploreCta from "./ExploreCta";

type WelcomeCta = {
  label: string;
  icon: string;
};

const WELCOME_CTAS: WelcomeCta[] = [
  { label: "See model homes", icon: iconModelHomes },
  { label: "See amenities", icon: iconAmenities },
  { label: "See commercial", icon: iconCommercial },
  { label: "See parks & trails", icon: iconParksTrails },
  { label: "See schools", icon: iconSchools },
];

type WelcomeOverlayProps = {
  /** Called when the visitor deliberately picks one of the CTA/explore buttons. */
  onDismiss: () => void;
};

// Only clicking a button should dismiss the overlay — clicks on the
// backdrop itself must not, so background activity never bubbles up to
// the window-level idle listener.
const stopBubble = (e: { stopPropagation: () => void }) => e.stopPropagation();

export default function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-mayfair-navy/92 px-6 text-center"
      onPointerDown={stopBubble}
      onTouchStart={stopBubble}
      onWheel={stopBubble}
      onKeyDown={stopBubble}
    >
      <img
        src={welcomeTitle}
        alt="Welcome to Mayfair"
        className="h-auto w-[clamp(320px,47vw,900px)]"
      />

      <div className="flex flex-wrap items-center justify-center gap-4">
        {WELCOME_CTAS.map((cta) => (
          <TextIconCta
            key={cta.label}
            text={cta.label}
            icon={cta.icon}
            onClick={() => {
              alert(cta.label);
              onDismiss();
            }}
          />
        ))}
      </div>

      <ExploreCta
        onClick={() => {
          alert("Explore the map");
          onDismiss();
        }}
      />
    </div>
  );
}
