import type { DestinationPin } from "../hooks/useDestinationPins";
import type { Category } from "../types/pins";
import { useRoute } from "../hooks/RouteContext";
import { useDetails } from "../hooks/DetailsContext";
import LocateFlagIcon from "./LocateFlagIcon";
import iconLearnMoreArrow from "../assets/icons/learn-more-arrow.svg";

const FALLBACK_FLAG_COLOR = "#82b1dd";

type DrawerCardProps = {
  pin: DestinationPin;
  /** The pin's category — same data the welcome screen's buttons use, so the locate icon matches exactly. */
  category?: Category;
  /** Model-home only — resolved builder name, shown as the card's subtitle. */
  builderName?: string;
};

export default function DrawerCard({
  pin,
  category,
  builderName,
}: DrawerCardProps) {
  const { routeTo } = useRoute();
  const { openDetails } = useDetails();

  const title = pin.kind === "model-home" ? pin.name : pin.title;
  const subtitle =
    pin.kind === "model-home" ? (builderName ?? "") : pin.location;
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
      className="flex w-full shrink-0 cursor-pointer items-stretch gap-[36px] rounded-[10px] bg-white p-[18px] text-left shadow-[0_4px_5px_0_rgba(0,0,0,0.2)]"
    >
      <div className="h-[323px] w-[322px] shrink-0 overflow-hidden bg-mayfair-blue/20">
        {image && <img src={image} alt="" className="size-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between pb-[18px] pr-[22px] pt-[18px]">
        <div className="flex flex-col gap-[14px]">
          <p className="font-vision text-[50px] leading-[52px] text-mayfair-navy">
            {title}
          </p>
          <p className="truncate font-vision text-[20px] font-extrabold uppercase leading-none tracking-[0.05em] text-mayfair-navy">
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
            className="flex h-[42px] items-center gap-[6px] border-[1.5px] border-mayfair-blue pl-[24.5px] pr-[21.5px] font-vision text-[16px] font-extrabold uppercase leading-none tracking-[0.1em] text-mayfair-navy"
          >
            learn more
            <img src={iconLearnMoreArrow} alt="" className="h-[11px] w-[13.75px] shrink-0" />
          </button>

          <button
            type="button"
            aria-label={`Locate ${title} on the map`}
            onClick={(e) => {
              e.stopPropagation();
              routeTo(pin.id);
            }}
            // LocateFlagIcon draws its own ring; the balloon fallback needs one.
            className={`flex size-[50px] shrink-0 items-center justify-center rounded-full bg-white ${
              category?.color ? "" : "border-[1.5px] border-mayfair-blue"
            }`}
          >
            {category?.color ? (
              <LocateFlagIcon
                color={category.color ?? FALLBACK_FLAG_COLOR}
                className="size-full"
              />
            ) : (
              <img src={category?.icon} alt="" className="h-[32px] w-[16.4px]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
