import ButtonFlagIcon from "./ButtonFlagIcon";

type TextIconCtaProps = {
  text: string;
  /** Static glyph for a category with no flag color, e.g. model homes. */
  icon?: string;
  /** Flag color for a category using the shared flag icon. */
  color?: string;
  onClick: () => void;
};

export default function TextIconCta({
  text,
  icon,
  color,
  onClick,
}: TextIconCtaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[78px] items-center gap-[18px] whitespace-nowrap border-[3.5px] border-mayfair-blue pl-[44px] pr-[7.5px] text-white"
    >
      <span className="font-vision text-[26px] font-extrabold uppercase leading-none tracking-[0.1em]">
        {text}
      </span>
      {/* Fixed 96x66 slot (the flag artwork's own box) so the balloon glyph
          lines up with the flags instead of shrinking the button. */}
      <span className="flex h-[66px] w-[96px] shrink-0 items-center justify-center">
        {color ? (
          <ButtonFlagIcon color={color} className="size-full" />
        ) : (
          <img src={icon} alt="" className="h-[60px] w-[31px]" />
        )}
      </span>
    </button>
  );
}
