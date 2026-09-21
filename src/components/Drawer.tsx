import { useMemo } from "react";
import { useDestinationPins } from "../hooks/useDestinationPins";
import { useCategories } from "../hooks/useCategories";
import { useBuilders } from "../hooks/useBuilders";
import { useFilter } from "../hooks/FilterContext";
import { useDrawer } from "../hooks/DrawerContext";
import DrawerCard from "./DrawerCard";
import FilterChip from "./FilterChip";

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
        transform: open ? "translateX(0)" : "translateX(calc(-100% + 10px))",
      }}
    >
      <div className="flex h-full w-[456px] max-w-[85vw] flex-col bg-mayfair-navy shadow-[0_4px_5px_0_rgba(0,0,0,0.2)]">
        <div className="relative flex-1 overflow-hidden">
          <div className="drawer-scroll flex h-full flex-col gap-4 overflow-y-auto p-4 pr-3">
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

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-mayfair-navy to-transparent" />
        </div>

        <div className="flex flex-wrap items-center gap-3 p-4">
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
        className="absolute left-full top-1/2 flex h-[130px] w-7 -translate-y-1/2 items-center justify-start rounded-r-[40px] bg-mayfair-navy shadow-[0_4px_5px_0_rgba(0,0,0,0.2)]"
      >
        <span className="flex flex-col items-center">
          <span className="font-vision text-sm font-extrabold uppercase tracking-[0.15em] text-white [writing-mode:vertical-rl]">
            {open ? "hide" : "show"}
          </span>
          <span aria-hidden="true" className="text-lg text-white">
            {open ? "«" : "»"}
          </span>
        </span>
      </button>
    </div>
  );
}
