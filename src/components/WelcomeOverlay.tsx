import { useState } from "react";
import exploreArt from "../assets/explore-mayfair/explore.svg";
import mayfairArt from "../assets/explore-mayfair/mayfair.svg";
import pinArt from "../assets/explore-mayfair/pin.svg";
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
  // Set by whichever button dismissed the overlay. The logo only zooms up
  // toward the viewer on the way out via "view the map"; it has no
  // transition otherwise, so it snaps back to normal size when the overlay
  // returns.
  const [exitByExplore, setExitByExplore] = useState(false);
  const logoZooming = exitByExplore && !isIdle;

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col overflow-hidden items-center bg-mayfair-navy/92 px-6 pt-[440px] text-center transition-opacity duration-700 ${
        isIdle ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onPointerDown={stopBubble}
      onTouchStart={stopBubble}
      onWheel={stopBubble}
      onKeyDown={stopBubble}
    >
      {/* Figma's "Explore Mayfair logo" group, its three parts placed as laid out there. */}
      <div
        role="img"
        aria-label="Explore Mayfair"
        className={`welcome-logo relative h-[779.12px] w-[1147.54px] shrink-0 ${
          logoZooming ? "scale-250 transition-transform duration-700 ease-in" : ""
        }`}
      >
        <img
          src={mayfairArt}
          alt=""
          className="welcome-logo-mayfair absolute top-[178.77px] left-0 h-[371.1px] w-[1147.54px]"
        />
        <img
          src={exploreArt}
          alt=""
          className="welcome-logo-explore absolute top-0 left-[369.61px] h-[245.91px] w-[408.9px]"
        />
        <img
          src={pinArt}
          alt=""
          className="welcome-logo-pin absolute top-[513.86px] left-[454.84px] h-[265.27px] w-[237.83px]"
        />
      </div>

      <div className="mt-[115px] flex flex-wrap items-center justify-center gap-[30px]">
        {categories.map((category) => (
          <TextIconCta
            key={category.id}
            text={category.label}
            icon={category.icon}
            color={category.color}
            onClick={() => {
              setExitByExplore(false);
              setActiveCategoryId(category.id);
              dismiss();
            }}
          />
        ))}
      </div>

      <div className="mt-[164px]">
        <ExploreCta
          onClick={() => {
            setExitByExplore(true);
            explore();
          }}
          visible={isIdle}
        />
      </div>
    </div>
  );
}
