import { QRCodeSVG } from "qrcode.react";
import { CONFIG } from "../config";
import helpLogo from "../assets/icons/help-logo.svg";
import { useCategories } from "../hooks/useCategories";
import { useBuilders } from "../hooks/useBuilders";
import DestinationFlagIcon from "./DestinationFlagIcon";

// legend-balloon.svg is model-home-balloon.svg with a white string cropped
// short (48x111); the abbreviation sits on the envelope's centre, same as
// ModelHomeMarker's label.
const BALLOON_ICON = "/icons/legend-balloon.svg";
const BALLOON_LABEL_TOP_PERCENT = (34 / 111) * 100;

const ROW_LABEL_CLASS =
  "help-legend-row-label w-[297px] shrink-0 font-vision text-[50px] leading-[52px] text-white";
const ITEM_LABEL_CLASS =
  "font-vision text-[20px] font-extrabold uppercase leading-[24px] tracking-[0.05em] text-white";

/**
 * Help modal body (Figma help_alt): logo, intro copy, then a legend of the
 * map's pins — one flag per colored category and one balloon per builder,
 * both straight from the same data the map markers use — and the sign-up QR.
 */
export default function HelpLegend() {
  const categories = useCategories();
  const builders = useBuilders();
  const landmarkCategories = categories.filter((c) => c.color);

  return (
    <div className="help-legend flex h-full flex-col items-center pt-[160px]">
      <img src={helpLogo} alt="Mayfair, New Braunfels, Texas" className="help-legend-logo h-[286px] w-[546px]" />

      <p className="help-legend-heading mt-[91px] max-w-[1101px] font-vision text-[80px] leading-[84px] text-white">
        {CONFIG.help.heading}
      </p>
      <p className="help-legend-body mt-[45px] max-w-[1239px] font-vision text-[30px] leading-[50px] text-white">
        {CONFIG.help.body}
      </p>

      <div className="help-legend-table mt-[164px] flex w-[1606px] flex-col border-y-[1.5px] border-mayfair-blue text-left">
        <div className="help-legend-row help-legend-landmarks flex items-center border-b-[1.5px] border-mayfair-blue pb-[50px] pl-[47px] pt-[46px]">
          <p className={ROW_LABEL_CLASS}>Landmarks</p>
          <div className="help-legend-flags ml-[43px] flex gap-[30px]">
            {landmarkCategories.map((category) => (
              <div key={category.id} className="help-legend-flag relative h-[215px] w-[227px]">
                <DestinationFlagIcon
                  color={category.color!}
                  baseColor="#ffffff"
                  className="help-legend-flag-icon h-[215px] w-[172px]"
                />
                {/* Sits right of the pole, under the fabric, like Figma. */}
                <p className={`help-legend-flag-label absolute left-[45px] top-[165px] whitespace-nowrap ${ITEM_LABEL_CLASS}`}>
                  {category.label.replace(/^See /i, "")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="help-legend-row help-legend-model-homes flex items-center pb-[29px] pl-[46px] pt-[50px]">
          <p className={ROW_LABEL_CLASS}>Model homes</p>
          <div className="help-legend-balloons flex items-start gap-[27px]">
            {builders.map((builder) => (
              <div key={builder.id} className="help-legend-balloon flex w-[144px] flex-col items-center gap-[26px]">
                <div className="help-legend-balloon-icon relative h-[132px] w-[57px]">
                  <img src={BALLOON_ICON} alt="" className="help-legend-balloon-image size-full" />
                  <span
                    className="help-legend-balloon-abbr absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-vision text-[30px] font-extrabold uppercase leading-none tracking-[-0.05em] text-white"
                    style={{ top: `${BALLOON_LABEL_TOP_PERCENT}%` }}
                  >
                    {builder.abbreviation}
                  </span>
                </div>
                <p className={`help-legend-balloon-label text-center ${ITEM_LABEL_CLASS}`}>{builder.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="help-legend-signup mt-[74px] w-[366px] font-vision text-[26px] font-extrabold uppercase leading-[35px] tracking-[0.1em] text-white">
        sign up for the mayfair interest list
      </p>
      <QRCodeSVG
        value={CONFIG.signup.qrValue}
        size={200}
        fgColor="#ffffff"
        bgColor="transparent"
        className="help-legend-qr mt-[37px]"
      />
    </div>
  );
}
