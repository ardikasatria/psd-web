import localFont from 'next/font/local'

export const sinteca = localFont({
  src: [
    {
      path: '../../assets/fonts/sinteca/Sinteca-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../assets/fonts/sinteca/Sinteca-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../assets/fonts/sinteca/Sinteca-Italic.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-sinteca',
  display: 'swap',
})
