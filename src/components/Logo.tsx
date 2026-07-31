/** Logo hacker moderna: escudo + terminal ">_" com brilho verde. */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22ff77" />
          <stop offset="1" stopColor="#00e5ff" />
        </linearGradient>
        <filter id="lg-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* escudo */}
      <path
        d="M32 3 L56 12 V30 C56 46 45 56 32 61 C19 56 8 46 8 30 V12 Z"
        fill="#04160b"
        stroke="url(#lg-g)"
        strokeWidth="2.5"
      />
      {/* terminal >_ */}
      <g filter="url(#lg-glow)" stroke="url(#lg-g)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 24 L30 32 L22 40" fill="none" />
        <path d="M34 41 H43" />
      </g>
    </svg>
  );
}
