import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

type DetailsGalleryProps = {
  images: string[];
  alt: string;
  onClose: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-full">
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

const closeButtonClass =
  "details-gallery-close absolute right-6 top-6 z-10 flex size-12 items-center justify-center rounded-full bg-white/90 p-3 text-mayfair-navy shadow-[0_2px_6px_0_rgba(0,0,0,0.3)]";

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
      <div className="details-gallery relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-mayfair-navy/10">
        {images[0] && (
          <img src={images[0]} alt={alt} className="details-gallery-image size-full object-cover" />
        )}
        <button type="button" onClick={onClose} aria-label="Close" className={closeButtonClass}>
          <CloseIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="details-gallery relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-mayfair-navy/10">
      <div className="details-gallery-viewport size-full overflow-hidden" ref={emblaRef}>
        <div className="details-gallery-track flex size-full">
          {images.map((src, i) => (
            <div className="details-gallery-slide h-full w-full shrink-0 grow-0 basis-full" key={`${src}-${i}`}>
              <img src={src} alt={alt} className="size-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Previous image"
        className="details-gallery-prev absolute left-6 top-1/2 z-10 flex size-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-4 text-mayfair-navy shadow-[0_2px_6px_0_rgba(0,0,0,0.3)]"
      >
        <ChevronIcon className="size-full -scale-x-100" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next image"
        className="details-gallery-next absolute right-6 top-1/2 z-10 flex size-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-4 text-mayfair-navy shadow-[0_2px_6px_0_rgba(0,0,0,0.3)]"
      >
        <ChevronIcon className="size-full" />
      </button>

      <div className="details-gallery-dots absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
        {images.map((_, i) => (
          <span
            key={i}
            className={`details-gallery-dot h-2 rounded-full transition-all ${
              i === selectedIndex ? "w-6 bg-mayfair-navy" : "w-2 bg-mayfair-navy/30"
            }`}
          />
        ))}
      </div>

      <button type="button" onClick={onClose} aria-label="Close" className={closeButtonClass}>
        <CloseIcon />
      </button>
    </div>
  );
}
