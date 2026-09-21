type RotateArrowsIconProps = {
  color: string;
  className?: string;
};

/**
 * Just the two curved arrows from rotate-icon.svg, no backing circle —
 * that asset bakes in a white disc meant to float directly on the map, but
 * the rotate-confirm overlay's CTA draws its own outlined circle instead
 * (see SidePanel), so the icon needs to be recolorable and disc-free.
 */
export default function RotateArrowsIcon({ color, className }: RotateArrowsIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 36.57" fill="none" className={className}>
      <path
        d="M36.5586 18.4493C37.0078 12.1514 33.2495 6.07381 27.0113 3.85327C22.5918 2.28017 17.914 2.99393 14.2709 5.38038"
        stroke={color}
        strokeWidth={5}
      />
      <path
        d="M36.9092 24.9256C36.7101 25.2096 36.2899 25.2096 36.0908 24.9256L30.6514 17.1678C30.4192 16.8365 30.6569 16.3807 31.0615 16.3807L41.9385 16.3807C42.3431 16.3807 42.5808 16.8365 42.3486 17.1678L36.9092 24.9256Z"
        fill={color}
        stroke={color}
      />
      <path
        d="M8.44327 17.9185C7.99411 24.2163 11.7524 30.2939 17.9906 32.5144C22.7647 34.2138 27.8402 33.2445 31.5873 30.3809"
        stroke={color}
        strokeWidth={5}
      />
      <path
        d="M8.09082 11.4423C8.28991 11.1583 8.7101 11.1583 8.90918 11.4423L14.3486 19.2001C14.5808 19.5314 14.3431 19.9872 13.9385 19.9872L3.06152 19.9872C2.65689 19.9872 2.41919 19.5314 2.65137 19.2001L8.09082 11.4423Z"
        fill={color}
        stroke={color}
      />
    </svg>
  );
}
