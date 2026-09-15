import ButtonFlagIcon from "./ButtonFlagIcon";

type TextIconCtaProps = {
  text: string;
  /** Static glyph for a category with no flag color, e.g. model homes. */
  icon?: string;
  /** Flag color for a category using the shared flag icon. */
  color?: string;
  onClick: () => void;
};

export default function TextIconCta({ text, icon, color, onClick }: TextIconCtaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 whitespace-nowrap border-[3.5px] border-mayfair-blue px-6 py-3 text-white"
    >
      <span className="font-vision text-[15px] font-extrabold uppercase tracking-[0.1em]">
        {text}
      </span>
      {color ? (
        <ButtonFlagIcon color={color} className="h-8 w-auto shrink-0" />
      ) : (
        <img src={icon} alt="" className="h-8 w-auto shrink-0" />
      )}
    </button>
  );
}
