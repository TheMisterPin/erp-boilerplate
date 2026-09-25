import type { SVGProps } from "react"

/** Flat modular mark: three linked operational building blocks. */
export function ProductMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <path
        d="M24 4 41 14v20L24 44 7 34V14L24 4Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="m24 10 10 6-10 6-10-6 10-6Z" fill="currentColor" />
      <path d="m12 23 10 6v10l-10-6V23Z" fill="currentColor" opacity=".78" />
      <path d="m36 23-10 6v10l10-6V23Z" fill="currentColor" opacity=".58" />
    </svg>
  )
}
