import { useId } from "react";

type LocateFlagIconProps = {
  color: string;
  className?: string;
};

/** The drawer card's "CTA - locate" artwork (50x50): outlined circle with a
    stand-mounted flag masked to its inner circle, recolored per category. */
export default function LocateFlagIcon({ color, className }: LocateFlagIconProps) {
  const maskId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      fill="none"
      viewBox="0 0 50 50"
      className={className}
    >
      <circle cx="25" cy="25" r="24.25" stroke="#82b1dd" strokeWidth="1.5" />
      <mask id={maskId} width="44" height="44" x="3" y="3" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }}>
        <circle cx="25" cy="25" r="22" fill="white" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path
          fill={color}
          d="M13.3955 10C13.7397 10.0002 14.0176 10.2782 14.0176 10.6221C14.0252 10.6342 14.3813 11.1944 15.3984 11.6621C17.4376 12.5995 31.2307 10.5596 32.3574 19.7158C32.3588 19.7595 32.4595 22.8973 32.4795 25.2812C33.6346 25.929 35.2646 25.9718 37.3984 24.623C40.6872 22.5453 43.475 23.522 43.9756 25.1201C42.0852 25.5252 41.0262 27.0133 41.0176 27.0254C43.6178 27.3158 44.3109 30.2943 44.3193 30.3311C40.7262 28.2235 38.8038 32.3384 34.6035 32.5488C30.5419 32.7532 30.4854 29.3574 30.4854 29.3574V25.2686C29.4155 24.4293 27.8266 23.8079 25.7412 23.9355C21.1788 24.2145 15.3561 23.7249 14.0176 22.0713V49.5156C15.2101 49.7108 16.0935 50.4146 16.0938 51.2559C16.0938 52.2484 10.6045 52.247 10.6045 51.2559C10.6048 50.3943 11.5337 49.6744 12.7725 49.501V10.6221C12.7725 10.2781 13.0511 10 13.3955 10Z"
        />
      </g>
    </svg>
  );
}
