export function PlanArt() {
  return <svg viewBox="0 0 480 240" fill="none" aria-hidden="true" className="h-full w-full" focusable="false">
    <path fill="#18181b" d="M0 0h480v240H0z" />
    <circle cx="380" cy="44" r="130" fill="var(--primary)" opacity=".08" />
    <circle cx="64" cy="218" r="120" fill="var(--primary)" opacity=".06" />
    <g transform="translate(123 27) rotate(-8 120 90)">
      <rect x="0" y="15" width="230" height="150" rx="18" fill="#27272a" stroke="#52525b" />
      <path d="M24 46h84M24 59h51" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" />
      <path d="M24 127h63" stroke="#fafafa" strokeWidth="7" strokeLinecap="round" />
      <g fill="var(--primary)">
        <circle cx="30" cy="91" r="10" /><circle cx="64" cy="91" r="10" /><circle cx="98" cy="91" r="10" />
      </g>
      <circle cx="132" cy="91" r="10" stroke="#71717a" strokeDasharray="3 3" />
      <circle cx="166" cy="91" r="10" stroke="#71717a" strokeDasharray="3 3" />
      <path d="m183 125 8 8 16-18" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <rect x="310" y="143" width="66" height="66" rx="20" fill="var(--primary)" />
    <path d="M328 176h30m-15-15v30" stroke="var(--primary-foreground)" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}
