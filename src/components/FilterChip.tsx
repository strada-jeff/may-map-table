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
      className={`flex items-center gap-2 whitespace-nowrap rounded-full border-[3px] px-5 py-2.5 font-vision text-sm font-extrabold uppercase tracking-wide ${
        selected
          ? "border-white bg-white text-mayfair-navy shadow-[0_4px_5px_0_rgba(0,0,0,0.2)]"
          : "border-mayfair-blue text-white shadow-[0_4px_10px_0_rgba(0,0,0,0.2)]"
      }`}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
    </button>
  );
}
