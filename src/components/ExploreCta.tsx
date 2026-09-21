import iconExploreMark from "../assets/icons/explore-mark.svg";

type ExploreCtaProps = {
  onClick: () => void;
};

export default function ExploreCta({ onClick }: ExploreCtaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[160px] w-[160px] flex-col items-center justify-center gap-3 rounded-full border-2 border-mayfair-blue/70 text-white"
    >
      <span className="font-vision text-[17px] font-extrabold uppercase leading-tight tracking-[0.1em]">
        Explore
        <br />
        the map
      </span>
      <img src={iconExploreMark} alt="" className="h-6 w-9" />
    </button>
  );
}
