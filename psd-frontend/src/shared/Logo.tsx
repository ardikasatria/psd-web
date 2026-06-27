import clsx from 'clsx'
import Link from 'next/link'
import React from 'react'

interface Props extends React.SVGProps<SVGSVGElement> {
  className?: string
  size?: string
}

const Logo: React.FC<Props> = ({ className, size = 'size-12 sm:size-14', ...props }) => {
  return (
    <Link
        href="/"
        className={clsx(
          'inline-block shrink-0 text-primary-600 dark:text-primary-500',
          className,
          size
        )}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <defs>
            <linearGradient id="linear-gradient" x1="469.45" y1="-15.96" x2="124.11" y2="360.31" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f19090" />
              <stop offset="0.23" stopColor="#c6899a" />
              <stop offset="0.76" stopColor="#687ab0" />
              <stop offset="1" stopColor="#4375ba" />
            </linearGradient>
            <linearGradient id="linear-gradient1" x1="362.15" y1="227.19" x2="362.16" y2="227.19" xlinkHref="#linear-gradient" />
            <linearGradient id="linear-gradient2" x1="394.65" y1="-76.69" x2="54.79" y2="293.6" xlinkHref="#linear-gradient" />
            <linearGradient id="linear-gradient3" x1="545.24" y1="51.81" x2="202.6" y2="425.14" xlinkHref="#linear-gradient" />
          </defs>
          <g>
            <polygon fill="url(#linear-gradient)" points="434.45 12.19 434.45 68.1 362.15 68.1 362.15 255.15 137.84 255.15 137.84 199.22 302.09 199.22 302.09 12.19 434.45 12.19" />
            <rect fill="url(#linear-gradient1)" x="362.15" y="199.22" width="0" height="55.93" />
            <path fill="url(#linear-gradient2)" d="M65.54,82.77v358.52h60.06V182h164.23V13.09h-149.46c-41.33,0-74.84,31.19-74.84,69.67ZM229.78,126.08h-104.17v-57.07h104.17v57.07Z" />
            <path fill="url(#linear-gradient3)" d="M374.39,79.06v192.03h-236.55v170.19h221.78c41.33,0,74.83-31.43,74.83-70.2V79.06h-60.06ZM374.39,384.94h-176.49v-57.5h176.49v57.5Z" />
          </g>
          <text
            fill="#21409a"
            fontFamily="Vox-Semibold, Vox"
            fontSize="47.35"
            fontWeight="600"
            transform="translate(60.62 492.21)"
          >
          </text>
        </svg>
    </Link>

  )
}

export default Logo
