import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useTap } from "../hooks/useTap";
import iconNext from "../assets/icons/gallery-next.svg";

type DetailsGalleryProps = {
  images: string[];
  alt: string;
};

// Figma's side fades: 40% black easing to clear, 872px in from each edge of
// its 2160px panel (kept as that share of the width, so the two don't meet
// in the middle on a narrower panel) — what keeps the white arrow glyphs
// legible over bright photos, so only a multi-photo gallery has them.
const fadeClass =
  "details-gallery-fade pointer-events-none absolute inset-y-0 w-[40.37%] opacity-40";

const MAX_DOTS = 5;
// Each dot is centered in a fixed slot, so it grows and shrinks about its
// own center without nudging its neighbors.
const DOT_SLOT_PX = 70.5;

type DotKind = "selected" | "normal" | "small" | "hidden";

/**
 * The window of dots for `count` photos: up to MAX_DOTS slots, always
 * centered on the selected one — at the first or last photo the slots on
 * that side just stay empty. An end dot with more photos beyond it is
 * drawn small, as a hint rather than a count — Instagram's indicator.
 */
function dotWindow(count: number, selected: number) {
  const reach = Math.min(count - 1, Math.floor(MAX_DOTS / 2));
  const kind = (index: number): DotKind => {
    const offset = Math.abs(index - selected);
    if (offset === 0) return "selected";
    if (offset > reach) return "hidden";
    if (offset === reach && (index === selected - reach ? index > 0 : index < count - 1)) return "small";
    return "normal";
  };
  // translateX of the row that puts the selected dot in the middle slot.
  return { slots: 2 * reach + 1, offsetPx: (reach - selected) * DOT_SLOT_PX, kind };
}

const dotClass: Record<DotKind, string> = {
  selected: "h-[20px] w-[78.5px] bg-mayfair-navy",
  normal: "h-[20px] w-[40.5px] bg-[#d9d9d9]/50",
  small: "h-[12px] w-[24px] bg-[#d9d9d9]/50",
  hidden: "h-0 w-0 bg-[#d9d9d9]/50 opacity-0",
};

function GalleryFades() {
  return (
    <>
      <div className={`${fadeClass} left-0 bg-gradient-to-r from-black to-transparent`} />
      <div className={`${fadeClass} right-0 bg-gradient-to-l from-black to-transparent`} />
    </>
  );
}

export default function DetailsGallery({ images, alt }: DetailsGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lastIndex = images.length - 1;

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const prevTap = useTap(scrollPrev);
  const dots = dotWindow(images.length, selectedIndex);
  const nextTap = useTap(scrollNext);

  if (images.length <= 1) {
    return (
      <div className="details-gallery relative h-[1222px] w-full shrink-0 overflow-hidden bg-mayfair-navy/10">
        {images[0] && (
          <img src={images[0]} alt={alt} className="details-gallery-image size-full object-cover" />
        )}
      </div>
    );
  }

  return (
    // Not overflow-hidden: the dots hang below the image, over the body
    // (the viewport does the slide clipping).
    <div className="details-gallery relative h-[1222px] w-full shrink-0 bg-mayfair-navy/10">
      <div className="details-gallery-viewport size-full overflow-hidden" ref={emblaRef}>
        <div className="details-gallery-track flex size-full">
          {images.map((src, i) => (
            <div className="details-gallery-slide h-full w-full shrink-0 grow-0 basis-full" key={`${src}-${i}`}>
              <img src={src} alt={alt} className="details-gallery-slide-image size-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      <GalleryFades />

      <button
        type="button"
        {...prevTap}
        aria-label="Previous image"
        className={`details-gallery-prev absolute left-[39px] top-1/2 z-10 size-[86px] -translate-y-1/2 transition-opacity duration-300 ${
          selectedIndex === 0 ? "pointer-events-none opacity-0" : ""
        }`}
      >
        <img src={iconNext} alt="" className="details-gallery-prev-icon size-full -scale-x-100" />
      </button>
      <button
        type="button"
        {...nextTap}
        aria-label="Next image"
        className={`details-gallery-next absolute right-[40px] top-1/2 z-10 size-[86px] -translate-y-1/2 transition-opacity duration-300 ${
          selectedIndex === lastIndex ? "pointer-events-none opacity-0" : ""
        }`}
      >
        <img src={iconNext} alt="" className="details-gallery-next-icon size-full" />
      </button>

      {/* White pill backs the dots so they stay legible when the body scrolls
          under them; mt + py still lands the dots 48px below the photo. The
          whole row of dots slides behind a window centered on the selected
          one, so as the selection moves the dots glide along rather than
          jumping a slot; ones leaving the window shrink away, clipped at the
          pill. The gallery doesn't loop, so the row never has to sweep from
          the last photo back to the first.
          The selected pill runs 4px past its slot on each side, into the
          gaps. */}
      <div className="details-gallery-dots absolute left-1/2 top-full z-10 mt-[36px] -translate-x-1/2 overflow-hidden rounded-full bg-white px-[16px] py-[12px]">
        <div className="details-gallery-dots-window relative h-[20px]" style={{ width: dots.slots * DOT_SLOT_PX }}>
          <div
            className="details-gallery-dots-row absolute left-0 top-0 flex transition-transform duration-750 ease-out"
            style={{ transform: `translateX(${dots.offsetPx}px)` }}
          >
            {images.map((_, i) => (
              <span
                key={i}
                className="details-gallery-dot-slot flex h-[20px] shrink-0 items-center justify-center"
                style={{ width: DOT_SLOT_PX }}
              >
                <span
                  className={`details-gallery-dot shrink-0 rounded-full transition-all duration-750 ease-out ${dotClass[dots.kind(i)]}`}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
