import type { DestinationPin } from "../hooks/useDestinationPins";
import type { Category } from "../types/pins";
import { useRoute } from "../hooks/RouteContext";
import { useDetails } from "../hooks/DetailsContext";
import ButtonFlagIcon from "./ButtonFlagIcon";

const FALLBACK_FLAG_COLOR = "#82b1dd";

type DrawerCardProps = {
  pin: DestinationPin;
  /** The pin's category — same data the welcome screen's buttons use, so the locate icon matches exactly. */
  category?: Category;
  /** Model-home only — resolved builder name, shown as the card's subtitle. */
  builderName?: string;
};

export default function DrawerCard({ pin, category, builderName }: DrawerCardProps) {
  const { routeTo } = useRoute();
  const { openDetails } = useDetails();

  const title = pin.kind === "model-home" ? pin.name : pin.title;
  const subtitle = pin.kind === "model-home" ? (builderName ?? "") : pin.location;
  const image = pin.images[0];

  function showDetails() {
    openDetails(pin.id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={showDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") showDetails();
      }}
      className="flex w-full shrink-0 cursor-pointer items-stretch gap-4 rounded-[10px] bg-white p-3 text-left shadow-[0_4px_5px_0_rgba(0,0,0,0.2)]"
    >
      <div className="aspect-square w-[150px] shrink-0 overflow-hidden rounded-[6px] bg-mayfair-blue/20">
        {image && <img src={image} alt="" className="size-full object-cover" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div className="flex flex-col gap-1">
          <p className="truncate font-vision text-xl leading-tight text-mayfair-navy">{title}</p>
          <p className="truncate font-vision text-xs font-extrabold uppercase tracking-[0.05em] text-mayfair-navy">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showDetails();
            }}
            className="flex items-center gap-2 border-[1.5px] border-mayfair-blue px-4 py-2 font-vision text-xs font-extrabold uppercase tracking-[0.1em] text-mayfair-navy"
          >
            learn more
            <span aria-hidden="true">&rarr;</span>
          </button>

          <button
            type="button"
            aria-label={`Locate ${title} on the map`}
            onClick={(e) => {
              e.stopPropagation();
              routeTo(pin.id);
            }}
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-mayfair-blue bg-white shadow-[0_2px_6px_0_rgba(0,0,0,0.3)]"
          >
            {category?.color ? (
              <ButtonFlagIcon color={category.color ?? FALLBACK_FLAG_COLOR} className="h-7 w-auto" />
            ) : (
              <img src={category?.icon} alt="" className="h-8 w-auto" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
