import { useMemo, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useDetails } from "../hooks/DetailsContext";
import { useDestinationPins } from "../hooks/useDestinationPins";
import { useCategories } from "../hooks/useCategories";
import { useBuilders } from "../hooks/useBuilders";
import { useRoute } from "../hooks/RouteContext";
import DetailsGallery from "./DetailsGallery";
import ButtonFlagIcon from "./ButtonFlagIcon";

function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="details-view-stat flex items-baseline gap-3 border-b border-mayfair-blue/20 py-4 font-vision text-xl text-mayfair-navy">
      {children}
    </div>
  );
}

function StatDivider() {
  return <span className="details-view-stat-divider text-mayfair-blue/40">|</span>;
}

export default function DetailsView() {
  const { activePinId, closeDetails } = useDetails();
  const { pins } = useDestinationPins();
  const categories = useCategories();
  const builders = useBuilders();
  const { routeTo } = useRoute();

  const pin = useMemo(() => pins.find((p) => p.id === activePinId) ?? null, [pins, activePinId]);

  if (!pin) return null;

  const category = categories.find((c) => c.id === pin.categoryId);
  const builderName =
    pin.kind === "model-home" ? builders.find((b) => b.id === pin.builderId)?.name : undefined;
  const title = pin.kind === "model-home" ? pin.name : pin.title;

  function showOnMap() {
    if (!pin) return;
    routeTo(pin.id);
    closeDetails();
  }

  return (
    <div className="details-view absolute inset-0 z-50 flex items-center justify-center bg-mayfair-navy/92 p-6">
      <div className="details-view-card flex max-h-full w-[min(94vw,1600px)] flex-col overflow-y-auto rounded-[10px] bg-white shadow-[0_4px_5px_0_rgba(0,0,0,0.2)]">
        <DetailsGallery images={pin.images} alt={title} onClose={closeDetails} />

        <div className="details-view-body flex flex-col gap-10 p-10 md:flex-row md:gap-14 md:p-16">
          <div className="details-view-primary flex flex-1 flex-col gap-6">
            {pin.kind === "model-home" ? (
              <div className="details-view-modelhome-info flex flex-col gap-1">
                <p className="font-vision text-xl text-mayfair-navy">{builderName}</p>
                <p className="font-vision text-4xl leading-tight text-mayfair-navy">{pin.name}</p>
                <p className="font-vision text-lg font-extrabold uppercase tracking-[0.05em] text-[#e56b59]">
                  {pin.collection}
                </p>

                <div className="details-view-stats mt-4 flex flex-col">
                  <StatRow>Square footage: {pin.squareFootage.toLocaleString()}</StatRow>
                  <StatRow>
                    <span>Beds: {pin.beds}</span>
                    <StatDivider />
                    <span>Baths: {pin.baths}</span>
                  </StatRow>
                  <StatRow>
                    <span>Garage: {pin.garage}-car</span>
                    <StatDivider />
                    <span>Stories: {pin.stories}</span>
                  </StatRow>
                  <StatRow>Price: {pin.priceText}</StatRow>
                </div>
              </div>
            ) : (
              <div className="details-view-location-info flex flex-col gap-2">
                <p className="font-vision text-4xl leading-tight text-mayfair-navy">{pin.title}</p>
                <p className="font-vision text-sm font-extrabold uppercase tracking-[0.05em] text-mayfair-navy">
                  {pin.location}
                </p>
                <p className="details-view-description mt-4 whitespace-pre-line text-lg leading-relaxed text-mayfair-navy">
                  {pin.description}
                </p>
              </div>
            )}

            <button
              type="button"
              className="details-view-keep-in-touch mt-auto flex w-fit items-center gap-3 border-[1.5px] border-mayfair-blue px-6 py-4 text-left font-vision text-sm font-extrabold uppercase tracking-[0.1em] text-mayfair-navy"
            >
              keep in touch
              <br />
              for updates &amp; invitations
            </button>
          </div>

          <div className="details-view-secondary flex w-full flex-col gap-6 border-t border-mayfair-blue/20 pt-8 md:w-[320px] md:shrink-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            {pin.kind === "model-home" ? (
              <div className="details-view-hours flex flex-col gap-2">
                <p className="font-vision text-sm font-extrabold uppercase tracking-[0.1em] text-mayfair-blue">
                  model home hours
                </p>
                <p className="font-vision text-lg font-extrabold text-mayfair-navy">{pin.hours}</p>
              </div>
            ) : (
              <div className="details-view-icon flex items-center justify-center py-4">
                {category?.color ? (
                  <ButtonFlagIcon color={category.color} className="h-28 w-auto" />
                ) : (
                  category?.icon && <img src={category.icon} alt="" className="h-28 w-auto" />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={showOnMap}
              className="details-view-show-on-map flex items-center justify-center gap-2 border-[1.5px] border-mayfair-blue px-6 py-4 font-vision text-sm font-extrabold uppercase tracking-[0.1em] text-mayfair-navy"
            >
              show on map
            </button>

            <p className="details-view-address font-vision text-lg font-extrabold text-mayfair-navy">
              {pin.address}
            </p>

            <div className="details-view-directions mt-auto flex items-center justify-between gap-4 border-t border-mayfair-blue/20 pt-6">
              <p className="font-vision text-sm font-extrabold uppercase tracking-[0.1em] text-mayfair-navy">
                send
                <br />
                directions
                <br />
                to phone
              </p>
              <QRCodeSVG
                value={pin.directionsUrl}
                size={96}
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
