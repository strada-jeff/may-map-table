import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import iconClose from "../assets/icons/close.svg";
import iconNext from "../assets/icons/gallery-next.svg";

type DetailsGalleryProps = {
  images: string[];
  alt: string;
  onClose: () => void;
};

// Figma's side fades: 40% black easing to clear, 872px in from each edge —
// what keeps the white close/arrow glyphs legible over bright photos.
const fadeClass =
  "details-gallery-fade pointer-events-none absolute inset-y-0 w-[872px] opacity-40";

function GalleryChrome({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className={`${fadeClass} left-0 bg-gradient-to-r from-black to-transparent`} />
      <div className={`${fadeClass} right-0 bg-gradient-to-l from-black to-transparent`} />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="details-gallery-close absolute right-[54px] top-[50px] z-10 h-[57px] w-[58px]"
      >
        <img src={iconClose} alt="" className="details-gallery-close-icon size-full" />
      </button>
    </>
  );
}

export default function DetailsGallery({ images, alt, onClose }: DetailsGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  if (images.length <= 1) {
    return (
      <div className="details-gallery relative h-[1222px] w-full shrink-0 overflow-hidden bg-mayfair-navy/10">
        {images[0] && (
          <img src={images[0]} alt={alt} className="details-gallery-image size-full object-cover" />
        )}
        <GalleryChrome onClose={onClose} />
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

      <GalleryChrome onClose={onClose} />

      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Previous image"
        className="details-gallery-prev absolute left-[39px] top-1/2 z-10 size-[86px] -translate-y-1/2"
      >
        <img src={iconNext} alt="" className="details-gallery-prev-icon size-full -scale-x-100" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next image"
        className="details-gallery-next absolute right-[40px] top-1/2 z-10 size-[86px] -translate-y-1/2"
      >
        <img src={iconNext} alt="" className="details-gallery-next-icon size-full" />
      </button>

      {/* White pill backs the dots so they stay legible when the body scrolls
          under them; mt + py still lands the dots 48px below the photo. */}
      <div className="details-gallery-dots absolute left-1/2 top-full z-10 mt-[36px] flex -translate-x-1/2 items-center gap-[20px] rounded-full bg-white px-[20px] py-[12px]">
        {images.map((_, i) => (
          <span
            key={i}
            className={`details-gallery-dot h-[20px] rounded-full transition-all ${
              i === selectedIndex ? "w-[78.5px] bg-mayfair-navy" : "w-[40.5px] bg-[#d9d9d9]/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
