/** The FluxBond mark: three networks flowing into one bond, as in the app icon (src-tauri/icons/app-icon.svg). */
export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <g strokeWidth={1.7}>
        <path d="M4 6.5C8.2 6.5 8.7 12 12.6 12" />
        <path d="M4 12H12.6" />
        <path d="M4 17.5C8.2 17.5 8.7 12 12.6 12" />
      </g>
      <path d="M12.4 12H19.6" strokeWidth={4.2} />
      <g fill="currentColor" stroke="none">
        <circle cx="4" cy="6.5" r="1.9" />
        <circle cx="4" cy="12" r="1.9" />
        <circle cx="4" cy="17.5" r="1.9" />
      </g>
    </svg>
  );
}
