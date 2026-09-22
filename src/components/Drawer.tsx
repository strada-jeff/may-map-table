import { useMemo } from "react";
import { useDestinationPins } from "../hooks/useDestinationPins";
import { useCategories } from "../hooks/useCategories";
import { useBuilders } from "../hooks/useBuilders";
import { useFilter } from "../hooks/FilterContext";
import { useDrawer } from "../hooks/DrawerContext";
import DrawerCard from "./DrawerCard";
import FilterChip from "./FilterChip";
import iconHideChevrons from "../assets/icons/drawer-hide-chevrons.svg";
import iconShowChevrons from "../assets/icons/drawer-show-chevrons.svg";

// model-homes has no flag color of its own (it uses the balloon icon, not
// the flag) — this is only the dot shown on its filter chip.
const MODEL_HOMES_CHIP_COLOR = "#82b1dd";
const ALL_CHIP_COLOR = "#82b1dd";

export default function Drawer() {
  const { open, setOpen } = useDrawer();
  const { pins } = useDestinationPins();
  const categories = useCategories();
  const builders = useBuilders();
  const { activeCategoryId, setActiveCategoryId } = useFilter();

  const builderNameById = useMemo(
    () => new Map(builders.map((b) => [b.id, b.name])),
    [builders],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const visiblePins = activeCategoryId
    ? pins.filter((pin) => pin.categoryId === activeCategoryId)
    : pins;

  return (
    <div
      className="absolute left-0 top-0 z-[45] h-full transition-transform duration-300 ease-out"
      style={{
        transform: open ? "translateX(0)" : "translateX(calc(-100% + 35px))",
      }}
    >
      <div className="flex h-full w-[826px] flex-col bg-mayfair-navy">
        <div className="relative min-h-0 flex-1">
          <div className="drawer-scroll ml-[31px] flex h-full flex-col gap-[14px] overflow-y-auto pb-[152px] pl-[34px] pr-[64px] pt-[51px]">
            {visiblePins.map((pin) => (
              <DrawerCard
                key={pin.id}
                pin={pin}
                category={categoryById.get(pin.categoryId)}
                builderName={
                  pin.kind === "model-home"
                    ? builderNameById.get(pin.builderId)
                    : undefined
                }
              />
            ))}
          </div>

          {/* The gradient span of Figma's fade; below it the panel's own
              navy behind the chips is the fade's solid part. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[152px] bg-gradient-to-b from-mayfair-navy/0 to-mayfair-navy" />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-[20px] gap-y-[25px] pb-[63px] pl-[82px] pr-[60px] pt-[6px]">
          <FilterChip
            label="all"
            color={ALL_CHIP_COLOR}
            selected={activeCategoryId === null}
            onClick={() => setActiveCategoryId(null)}
          />
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              label={category.label.replace(/^See /i, "")}
              color={category.color ?? MODEL_HOMES_CHIP_COLOR}
              selected={activeCategoryId === category.id}
              onClick={() => setActiveCategoryId(category.id)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        // Tucks 60px under the panel's right edge; pl centers the label on
        // x=63 like Figma, straddling the panel edge rather than the tab.
        className="absolute left-[766px] top-[939px] flex h-[206px] w-[95px] flex-col items-center justify-center gap-[12px] rounded-full bg-mayfair-navy pl-[31px]"
      >
        <span className="font-vision text-[24px] font-extrabold uppercase leading-none text-white [writing-mode:vertical-rl]">
          {open ? "hide" : "show"}
        </span>
        {/* Both assets point up; rotating 90deg aims them right (show),
            flipping first aims them left (hide). */}
        <span aria-hidden="true" className="flex h-[21px] w-[16px] items-center justify-center">
          <img
            src={open ? iconHideChevrons : iconShowChevrons}
            alt=""
            className={`h-[16px] w-[21px] max-w-none rotate-90 ${open ? "-scale-y-100" : ""}`}
          />
        </span>
      </button>
    </div>
  );
}
