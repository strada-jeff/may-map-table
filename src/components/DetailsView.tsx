import { useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CONFIG } from "../config";
import { useDetails } from "../hooks/DetailsContext";
import { useDestinationPins, type DestinationPin } from "../hooks/useDestinationPins";
import { useCategories } from "../hooks/useCategories";
import { useBuilders } from "../hooks/useBuilders";
import { useRoute } from "../hooks/RouteContext";
import { useSideModal } from "../hooks/SideModalContext";
import DetailsGallery from "./DetailsGallery";
import ButtonFlagIcon from "./ButtonFlagIcon";
import iconNewsletter from "../assets/icons/newsletter.svg";

function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="details-view-stat flex h-[70px] items-center gap-[45px] border-b-[1.5px] border-mayfair-blue font-vision text-[40px] leading-[70px] text-mayfair-navy first:border-t-[1.5px]">
      {children}
    </div>
  );
}

function StatDivider() {
  return <span className="details-view-stat-divider h-[40px] w-[1.5px] shrink-0 bg-mayfair-blue" />;
}

export default function DetailsView() {
  const { activePinId, closeDetails } = useDetails();
  const { pins } = useDestinationPins();
  const categories = useCategories();
  const builders = useBuilders();
  const { routeTo } = useRoute();
  const { open: openSideModal } = useSideModal();

  // Kept across activePinId -> null so the panel still has content to show
  // while it animates out, instead of popping empty/blank mid-transition.
  // Set during render (not an effect) per React's "adjusting state when a
  // prop changes" pattern — this is a derived value, not a side effect.
  const [lastPin, setLastPin] = useState<DestinationPin | null>(null);
  const activePin = pins.find((p) => p.id === activePinId) ?? null;
  if (activePin && activePin !== lastPin) {
    setLastPin(activePin);
  }

  const isOpen = activePinId !== null;
  const pin = lastPin;

  if (!pin) return null;

  const category = categories.find((c) => c.id === pin.categoryId);
  const builderName =
    pin.kind === "model-home" ? builders.find((b) => b.id === pin.builderId)?.name : undefined;
  const title = pin.kind === "model-home" ? pin.name : pin.title;

  function showOnMap() {
    if (!pin) return;
    // No explicit closeDetails() — DetailsProvider closes itself as soon
    // as a route actually starts (see there), so this stays in sync with
    // routeTo() being called from anywhere else too (e.g. a drawer card's
    // locate button).
    routeTo(pin.id);
  }

  return (
    <div className="details-view pointer-events-none absolute inset-0 z-50 flex h-full overflow-hidden">
      <div
        style={{
          width: CONFIG.details.panelWidthPx,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          opacity: isOpen ? 1 : 0,
        }}
        className={`details-view-card flex h-full shrink-0 flex-col bg-white shadow-[0_4px_10px_0_rgba(0,0,0,0.2)] transition-[transform,opacity] duration-300 ease-out ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <DetailsGallery images={pin.images} alt={title} onClose={closeDetails} />

        {/* Only the body scrolls; the photo above stays put. */}
        <div className="details-view-body flex min-h-0 flex-1 overflow-y-auto">
          <div className="details-view-primary flex min-w-0 flex-1 flex-col pb-[84px] pl-[154px] pr-[131px]">
            {pin.kind === "model-home" ? (
              <div className="details-view-modelhome-info flex flex-col pt-[160px]">
                <p className="details-view-builder font-vision text-[40px] leading-[54px] text-mayfair-navy">{builderName}</p>
                <p className="details-view-title font-vision text-[70px] leading-[84px] text-mayfair-navy">{pin.name}</p>
                <p className="details-view-collection font-vision text-[30px] font-extrabold uppercase leading-[54px] tracking-[0.05em] text-[#e56b59]">
                  {pin.collection}
                </p>

                <div className="details-view-stats mt-[51px] flex w-[1260px] max-w-full flex-col">
                  <StatRow>Square footage: {pin.squareFootage.toLocaleString()}</StatRow>
                  <StatRow>
                    <span className="details-view-stat-item">Beds: {pin.beds}</span>
                    <StatDivider />
                    <span className="details-view-stat-item">Baths: {pin.baths}</span>
                  </StatRow>
                  <StatRow>
                    <span className="details-view-stat-item">Garage: {pin.garage}-car</span>
                    <StatDivider />
                    <span className="details-view-stat-item">Stories: {pin.stories}</span>
                  </StatRow>
                  <StatRow>Price: {pin.priceText}</StatRow>
                </div>
              </div>
            ) : (
              <div className="details-view-location-info flex max-w-[1116px] flex-col pt-[155px]">
                <p className="details-view-title font-vision text-[70px] leading-[84px] text-mayfair-navy">{pin.title}</p>
                <p className="details-view-location mt-[10px] font-vision text-[30px] font-extrabold uppercase leading-[54px] tracking-[0.05em] text-mayfair-navy">
                  {pin.location}
                </p>
                <div className="details-view-description mt-[47px] flex flex-col gap-[20px] font-vision text-[30px] leading-[50px] text-mayfair-navy">
                  {pin.description.split(/\n\s*\n/).map((paragraph, i) => (
                    <p key={i} className="details-view-description-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => openSideModal("signup")}
              className="details-view-keep-in-touch mt-auto flex h-[102px] w-[478px] shrink-0 items-center justify-between border-[1.5px] border-mayfair-blue pl-[44.5px] pr-[34.5px] text-left font-vision text-[26px] font-extrabold leading-[27px] text-mayfair-navy"
            >
              <span className="details-view-keep-in-touch-text flex flex-col">
                <span className="details-view-keep-in-touch-heading uppercase tracking-[0.1em]">keep in touch</span>
                <span className="details-view-keep-in-touch-sub tracking-[0.04em]">For Updates &amp; Invitations</span>
              </span>
              <img src={iconNewsletter} alt="" className="details-view-keep-in-touch-icon h-[29.4px] w-[34.3px] shrink-0" />
            </button>
          </div>

          <div
            className={`details-view-secondary flex w-[615px] shrink-0 flex-col border-l-[1.5px] border-mayfair-blue pl-[114.5px] pr-[123px] ${
              pin.kind === "model-home" ? "pt-[102px]" : "pt-[89px]"
            }`}
          >
            {pin.kind === "model-home" ? (
              <div className="details-view-hours flex h-[221px] flex-col gap-[17px]">
                <p className="details-view-hours-label font-vision text-[26px] font-extrabold uppercase leading-[35px] tracking-[0.1em] text-mayfair-blue">
                  model home hours
                </p>
                <p className="details-view-hours-text whitespace-pre-line font-vision text-[30px] font-extrabold leading-[42px] text-mayfair-navy">
                  {pin.hours}
                </p>
              </div>
            ) : (
              <div className="details-view-icon flex h-[244px] items-center justify-center">
                {pin.illustration ? (
                  <img src={pin.illustration} alt="" className="details-view-illustration h-[244px] w-[362px] object-contain" />
                ) : category?.color ? (
                  <ButtonFlagIcon color={category.color} className="h-[180px] w-[262px]" />
                ) : (
                  category?.icon && <img src={category.icon} alt="" className="h-[180px] w-[92px]" />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={showOnMap}
              className={`details-view-show-on-map flex h-[78px] w-full shrink-0 items-center justify-between border-[1.5px] border-mayfair-blue pl-[35.5px] pr-[9.5px] font-vision text-[26px] font-extrabold uppercase leading-none tracking-[0.1em] text-mayfair-navy ${
                pin.kind === "model-home" ? "mt-[68px]" : "mt-[58px]"
              }`}
            >
              show on map
              <span className="details-view-show-on-map-icon flex h-[66px] w-[96px] shrink-0 items-center justify-center">
                {category?.color ? (
                  <ButtonFlagIcon color={category.color} className="size-full" />
                ) : (
                  category?.icon && <img src={category.icon} alt="" className="h-[60px] w-[31px]" />
                )}
              </span>
            </button>

            <p className="details-view-address mt-[34px] whitespace-pre-line font-vision text-[30px] font-extrabold leading-[42px] text-mayfair-navy">
              {pin.address}
            </p>

            <div className="details-view-directions mt-[33px] flex items-center justify-between border-t-[1.5px] border-mayfair-blue pt-[55px]">
              <p className="details-view-directions-label w-[212px] font-vision text-[26px] font-extrabold uppercase leading-[35px] tracking-[0.1em] text-mayfair-navy">
                send
                <br />
                directions
                <br />
                to phone
              </p>
              <QRCodeSVG
                value={pin.directionsUrl}
                size={155}
                fgColor="#254a5d"
                className="details-view-qr shrink-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
