import iconExploreMark from "../assets/icons/explore-mark.svg";
import { useTap } from "../hooks/useTap";

type ExploreCtaProps = {
  onClick: () => void;
};

export default function ExploreCta({ onClick }: ExploreCtaProps) {
  const tap = useTap(onClick);

  return (
    <button
      type="button"
      {...tap}
      className="flex size-[299px] flex-col items-center gap-[18px] rounded-full border-[3.5px] border-mayfair-blue pt-[73px] text-white"
    >
      <span className="font-vision text-[34px] font-extrabold uppercase leading-[42px] tracking-[0.1em]">
        Explore
        <br />
        the map
      </span>
      <img src={iconExploreMark} alt="" className="h-[74px] w-[89px]" />
    </button>
  );
}
