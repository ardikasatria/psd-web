export function NotFoundIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="psd-404-grid" x1="0" y1="0" x2="320" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4572b7" stopOpacity="0.18" />
          <stop offset="1" stopColor="#14b8a6" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect x="24" y="24" width="272" height="152" rx="20" fill="url(#psd-404-grid)" />
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => {
          const x = 52 + col * 44
          const y = 52 + row * 32
          const missing = row === 1 && col === 3
          return (
            <g key={`${row}-${col}`}>
              <circle
                cx={x}
                cy={y}
                r={missing ? 10 : 6}
                fill={missing ? '#f09394' : '#4572b7'}
                fillOpacity={missing ? 0.35 : 0.55}
              />
              {!missing && col < 4 && (
                <line
                  x1={x + 8}
                  y1={y}
                  x2={x + 36}
                  y2={y}
                  stroke="#4572b7"
                  strokeOpacity="0.25"
                  strokeWidth="2"
                  strokeDasharray={row === 2 && col === 2 ? '4 6' : undefined}
                />
              )}
            </g>
          )
        })
      )}
      <circle cx="248" cy="52" r="28" fill="white" fillOpacity="0.9" className="dark:fill-neutral-800" />
      <circle cx="248" cy="52" r="18" stroke="#4572b7" strokeWidth="3" />
      <line x1="262" y1="66" x2="276" y2="80" stroke="#4572b7" strokeWidth="3" strokeLinecap="round" />
      <text
        x="160"
        y="178"
        textAnchor="middle"
        fill="#4572b7"
        fillOpacity="0.45"
        fontSize="11"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.2em"
      >
        DATA NOT FOUND
      </text>
    </svg>
  )
}
