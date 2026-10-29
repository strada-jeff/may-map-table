import { QRCodeSVG } from "qrcode.react";
import helpMark from "../assets/icons/signup-mark.svg";
import { useCategories } from "../hooks/useCategories";
import { useBuilders } from "../hooks/useBuilders";
import { useCopy } from "../hooks/useCopy";
import { BalloonMarkerIcon, FlagMarkerIcon, MARKER_SIZE } from "./MarkerIcons";
import RoundCloseButton from "./RoundCloseButton";

const ROW_LABEL_CLASS = "help-legend-row-label shrink-0 font-vision text-[50px] leading-[52px] text-white";
const ITEM_LABEL_CLASS =
  "font-vision text-[20px] font-extrabold uppercase leading-[24px] tracking-[1px] text-white";

/**
 * Help modal body (Figma help_alt, 2093:2329): the M mark, intro copy, then
 * a legend of the map's pins — one flag per colored category and one
 * balloon per builder, the same pulsing markers the map draws, from the
 * same data — the sign-up QR and a close button. The comp has no body text
 * under the heading; the CMS's is kept there anyway.
 */
export default function HelpLegend({ onClose }: { onClose: () => void }) {
  const categories = useCategories();
  const builders = useBuilders();
  const { help, signup } = useCopy();
  const landmarkCategories = categories.filter((c) => c.color);

  return (
    <div className="help-legend flex h-full flex-col items-center pt-[209px]">
      <img src={helpMark} alt="Mayfair" className="help-legend-mark h-[149px] w-[172px]" />

      <p className="help-legend-heading mt-[31px] max-w-[961px] font-vision text-[80px] leading-[84px] text-white">
        {help.heading}
      </p>
      {help.body && (
        <p className="help-legend-body mt-[45px] max-w-[1239px] font-vision text-[30px] leading-[50px] text-white">
          {help.body}
        </p>
      )}

      <div className="help-legend-table mt-[90px] flex w-[1606px] flex-col border-y-[1.5px] border-mayfair-blue text-left">
        <div className="help-legend-row help-legend-landmarks flex h-[311px] items-start border-b-[1.5px] border-mayfair-blue pl-[47px] pt-[55px]">
          <p className={`${ROW_LABEL_CLASS} w-[411px] pt-[60px]`}>Landmarks</p>
          <div className="help-legend-flags flex gap-[118px]">
            {landmarkCategories.map((category) => (
              <div key={category.id} className="help-legend-flag flex flex-col items-center" style={{ width: MARKER_SIZE }}>
                <FlagMarkerIcon color={category.color!} />
                <p className={`help-legend-flag-label mt-[20px] whitespace-nowrap ${ITEM_LABEL_CLASS}`}>
                  {category.label.replace(/^See /i, "")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="help-legend-row help-legend-model-homes flex h-[299px] items-start pl-[46px] pt-[57px]">
          <p className={`${ROW_LABEL_CLASS} w-[303px] pr-[30px] pt-[38px]`}>Model homes</p>
          <div className="help-legend-balloons flex gap-[37px]">
            {builders.map((builder) => (
              <div key={builder.id} className="help-legend-balloon flex flex-col items-center" style={{ width: MARKER_SIZE }}>
                <BalloonMarkerIcon label={builder.abbreviation} />
                <p className={`help-legend-balloon-label mt-[16px] w-[144px] text-center ${ITEM_LABEL_CLASS}`}>
                  {builder.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="help-legend-signup mt-[74px] w-[366px] font-vision text-[26px] font-extrabold uppercase leading-[35px] tracking-[2.6px] text-white">
        sign up for the mayfair interest list
      </p>
      <QRCodeSVG
        value={signup.qrValue}
        size={200}
        fgColor="#ffffff"
        bgColor="transparent"
        className="help-legend-qr mt-[37px]"
      />

      <RoundCloseButton onClose={onClose} className="mt-[105px]" />
    </div>
  );
}
