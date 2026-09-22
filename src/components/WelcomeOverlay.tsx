import welcomeTitle from "../assets/welcome-title.svg";
import TextIconCta from "./TextIconCta";
import ExploreCta from "./ExploreCta";
import { useCategories } from "../hooks/useCategories";
import { useFilter } from "../hooks/FilterContext";
import { useWelcome } from "../hooks/WelcomeContext";

// Only clicking a button should dismiss the overlay — clicks on the
// backdrop itself must not, so background activity never bubbles up to
// the window-level idle listener.
const stopBubble = (e: { stopPropagation: () => void }) => e.stopPropagation();

export default function WelcomeOverlay() {
  const { isIdle, dismiss, explore } = useWelcome();
  const categories = useCategories();
  const { setActiveCategoryId } = useFilter();

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center bg-mayfair-navy/92 px-6 pt-[482px] text-center transition-opacity duration-700 ${
        isIdle ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onPointerDown={stopBubble}
      onTouchStart={stopBubble}
      onWheel={stopBubble}
      onKeyDown={stopBubble}
    >
      <img
        src={welcomeTitle}
        alt="Welcome to Mayfair"
        className="h-[568px] w-[1810px]"
      />

      <div className="mt-[214px] flex flex-wrap items-center justify-center gap-[30px]">
        {categories.map((category) => (
          <TextIconCta
            key={category.id}
            text={category.label}
            icon={category.icon}
            color={category.color}
            onClick={() => {
              setActiveCategoryId(category.id);
              dismiss();
            }}
          />
        ))}
      </div>

      <div className="mt-[157px]">
        <ExploreCta onClick={explore} />
      </div>
    </div>
  );
}
