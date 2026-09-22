type FilterChipProps = {
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
};

export default function FilterChip({ label, color, selected, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[64px] items-center gap-[10px] whitespace-nowrap rounded-full border-[3px] pl-[25.5px] pr-[31.5px] font-vision text-[24px] font-extrabold uppercase leading-none ${
        selected
          ? "border-white bg-white text-mayfair-navy shadow-[0_4px_5px_0_rgba(0,0,0,0.2)]"
          : "border-mayfair-blue text-white shadow-[0_4px_10px_0_rgba(0,0,0,0.2)]"
      }`}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span className="size-[16px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
    </button>
  );
}
