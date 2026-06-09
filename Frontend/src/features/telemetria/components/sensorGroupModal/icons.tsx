import { useId, type SVGProps } from 'react'

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}

export function GripIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9 5h.01" />
      <path d="M9 12h.01" />
      <path d="M9 19h.01" />
      <path d="M15 5h.01" />
      <path d="M15 12h.01" />
      <path d="M15 19h.01" />
    </svg>
  )
}

export function ThermometerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
      <path
        fill="currentColor"
        stroke="none"
        d="M9 5a3 3 0 1 1 6 0v8a5 5 0 1 1-6 0zm3-1a1 1 0 0 0-1 1v8.535a1 1 0 0 1-.5.866a3 3 0 1 0 2.999 0a1 1 0 0 1-.499-.866V5a1 1 0 0 0-1-1"
      />
    </svg>
  )
}

export function DropletsIcon(props: SVGProps<SVGSVGElement>) {
  const reactId = useId().replace(/:/g, '')
  const clipPathId = `${reactId}-humidity-clip`
  const symbolId = `${reactId}-humidity-drop`

  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 512 512">
      <path d="M0 0h512v512H0z" fill="none" stroke="none" />
      <defs>
        <clipPath id={clipPathId}>
          <path
            fill="none"
            stroke="none"
            d="M302 137c-48.7 72-80 117-80 160.8s35.8 79.2 80 79.2v135H0V0h302Z"
          >
            <animateTransform
              additive="sum"
              attributeName="transform"
              calcMode="spline"
              dur="6s"
              keySplines=".42, 0, .58, 1; .42, 0, .58, 1"
              repeatCount="indefinite"
              type="scale"
              values="1 1; 1 .95; 1 1"
            />
          </path>
        </clipPath>
        <symbol id={symbolId} viewBox="0 0 175 260.9">
          <path
            fill="none"
            stroke="currentColor"
            strokeMiterlimit="10"
            strokeWidth="15"
            d="M87.5 13.4c-48.7 72-80 117-80 160.7s35.8 79.3 80 79.3s80-35.5 80-79.3s-31.3-88.8-80-160.7Z"
          />
        </symbol>
      </defs>
      <use width="175" height="260.9" href={`#${symbolId}`} transform="translate(214.5 123.62)">
        <animateTransform
          additive="sum"
          attributeName="transform"
          calcMode="spline"
          dur="6s"
          keySplines=".42, 0, .58, 1; .42, 0, .58, 1"
          repeatCount="indefinite"
          type="scale"
          values="1 1; 1 .9; 1 1"
        />
      </use>
      <g clipPath={`url(#${clipPathId})`}>
        <use width="175" height="260.9" href={`#${symbolId}`} transform="translate(122.5 123.62)">
          <animateTransform
            additive="sum"
            attributeName="transform"
            calcMode="spline"
            dur="6s"
            keySplines=".42, 0, .58, 1; .42, 0, .58, 1"
            repeatCount="indefinite"
            type="scale"
            values="1 .9; 1 1; 1 .9"
          />
        </use>
      </g>
    </svg>
  )
}

export function WindIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 8h12a3 3 0 1 0-3-3" />
      <path d="M3 12h16" />
      <path d="M3 16h10a3 3 0 1 1-3 3" />
    </svg>
  )
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 20H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  )
}

export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m12 3 1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z" />
    </svg>
  )
}

export function LayoutGridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  )
}
