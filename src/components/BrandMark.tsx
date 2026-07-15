export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 64 64"
    >
      <path
        d="M7 20h9M7 20v31c9-1 17 1 25 8 8-7 16-9 25-8V20h-9M32 25v34"
        fill="none"
        stroke="var(--mc-accent)"
        strokeLinecap="square"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M17 42V10l15 15 15-15v32"
        fill="none"
        stroke="var(--mc-accent)"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="5"
      />
      <path d="m32 49-8-5 4-1-2-7 5 4 1-7 1 7 5-4-2 7 4 1z" fill="var(--mc)" />
    </svg>
  );
}
