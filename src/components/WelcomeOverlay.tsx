import welcomeTitle from "../assets/welcome-title.svg";
import TextIconCta from "./TextIconCta";
import ExploreCta from "./ExploreCta";
import { useCategories } from "../hooks/useCategories";
import { useFilter } from "../hooks/FilterContext";

type WelcomeOverlayProps = {
  /** Called when the visitor deliberately picks one of the CTA/explore buttons. */
  onDismiss: () => void;
};

// Only clicking a button should dismiss the overlay — clicks on the
// backdrop itself must not, so background activity never bubbles up to
// the window-level idle listener.
const stopBubble = (e: { stopPropagation: () => void }) => e.stopPropagation();

export default function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const categories = useCategories();
  const { setActiveCategoryId } = useFilter();

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
        {categories.map((category) => (
          <TextIconCta
            key={category.id}
            text={category.label}
            icon={category.icon}
            color={category.color}
            onClick={() => {
              setActiveCategoryId(category.id);
              onDismiss();
            }}
          />
        ))}
      </div>

      <ExploreCta onClick={onDismiss} />
    </div>
  );
}
