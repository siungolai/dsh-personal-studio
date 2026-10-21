/**
 * The workbench's own icon set.
 *
 * The DSH plugin rules forbid loading a Harness client package as a module,
 * so the artwork is copied in here rather than imported. The paths and the
 * 16×16 grid are the host's own drawings, so the workbench's icons sit next
 * to the host's without a second visual language.
 *
 * Every icon paints with `currentColor` and inherits the surrounding text
 * colour, which is what keeps the panel re-theming with the host's skin.
 */
import type { SVGProps } from 'react'

/** The props every icon accepts. */
export interface IconProps {
  /** The icon's edge length in px. */
  size?: number
  /** Extra class names for the `<svg>`. */
  className?: string
}

type PathSpec = { d: string; fill?: 'currentColor'; stroke?: 'currentColor' }

function icon(size: number, viewBox: string, paths: PathSpec[], extra?: SVGProps<SVGSVGElement>) {
  return function Icon({ size: sizeProp, className, ...rest }: IconProps & SVGProps<SVGSVGElement>) {
    return (
      <svg
        width={sizeProp ?? size}
        height={sizeProp ?? size}
        className={className}
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        strokeWidth={1}
        {...extra}
        {...rest}
      >
        {paths.map((path) => (
          <path
            key={path.d}
            d={path.d}
            stroke={path.stroke}
            fill={path.fill}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    )
  }
}

/** The todo panel's icon. */
export const IconChecklist = icon(14, '0 0 16 16', [
  { d: 'M3.75 6.25C4.7165 6.25 5.5 5.4665 5.5 4.5C5.5 3.5335 4.7165 2.75 3.75 2.75C2.7835 2.75 2 3.5335 2 4.5C2 5.4665 2.7835 6.25 3.75 6.25Z', stroke: 'currentColor' },
  { d: 'M7.5 4.5H13.5', stroke: 'currentColor' },
  { d: 'M3.75 13.25C4.7165 13.25 5.5 12.4665 5.5 11.5C5.5 10.5335 4.7165 9.75 3.75 9.75C2.7835 9.75 2 10.5335 2 11.5C2 12.4665 2.7835 13.25 3.75 13.25Z', stroke: 'currentColor' },
  { d: 'M7.5 11.5H13.5', stroke: 'currentColor' },
])

/** The notes panel's icon. */
export const IconNote = icon(16, '0 0 16 16', [
  { d: 'M4.9375 5.90295H11.0625', stroke: 'currentColor' },
  { d: 'M4.9375 9.02991H8.27841', stroke: 'currentColor' },
  { d: 'M12.5 1.32617C13.3039 1.32617 14 1.95171 14 2.77637V7.61328L13 8.68164V2.77637C13 2.55186 12.8007 2.32617 12.5 2.32617H3.5C3.1993 2.32617 3 2.55186 3 2.77637V13.2246C3.00044 13.4489 3.19963 13.6738 3.5 13.6738H8.32812L7.39258 14.6738H3.5C2.69637 14.6738 2.00042 14.0489 2 13.2246V2.77637C2 1.95171 2.69613 1.32617 3.5 1.32617H12.5Z', fill: 'currentColor' },
])

/** The bookmarks panel's icon. */
export const IconBookmark = icon(16, '0 0 16 16', [
  { d: 'M6.59961 9.40051C6.82779 9.6334 7.10015 9.81842 7.40074 9.94472C7.70132 10.071 8.02409 10.1361 8.35013 10.1361C8.67618 10.1361 8.99894 10.071 9.29953 9.94472C9.60011 9.81842 9.87247 9.6334 10.1007 9.40051L12.9015 6.59967C13.3658 6.13541 13.6266 5.50572 13.6266 4.84915C13.6266 4.19258 13.3658 3.56289 12.9015 3.09863C12.4372 2.63436 11.8075 2.37354 11.151 2.37354C10.4944 2.37354 9.86472 2.63436 9.40045 3.09863L9.05034 3.44873', stroke: 'currentColor' },
  { d: 'M9.40051 6.59959C9.17233 6.3667 8.89997 6.18169 8.59939 6.05538C8.2988 5.92907 7.97603 5.86401 7.64999 5.86401C7.32395 5.86401 7.00118 5.92907 6.70059 6.05538C6.40001 6.18169 6.12765 6.3667 5.89946 6.59959L3.09863 9.40043C2.63436 9.8647 2.37354 10.4944 2.37354 11.151C2.37354 11.8075 2.63436 12.4372 3.09863 12.9015C3.56289 13.3657 4.19258 13.6266 4.84915 13.6266C5.50572 13.6266 6.13541 13.3657 6.59967 12.9015L6.94978 12.5514', stroke: 'currentColor' },
])

/** The server-status panel's icon. */
export const IconGauge = icon(16, '0 0 16 16', [
  { d: 'M3.4041 13.096C2.49514 12.187 1.87614 11.0288 1.62537 9.76798C1.37459 8.50716 1.50331 7.20028 1.99525 6.01261C2.48719 4.82494 3.32025 3.80981 4.3891 3.09557C5.45795 2.38134 6.71458 2.00008 8.0001 2C9.28563 2.00008 10.5423 2.38134 11.6111 3.09557C12.68 3.80981 13.513 4.82494 14.005 6.01261C14.4969 7.20028 14.6256 8.50716 14.3748 9.76798C14.1241 11.0288 13.5051 12.187 12.5961 13.096', stroke: 'currentColor' },
  { d: 'M8 8.49994L11.6114 4.88855', stroke: 'currentColor' },
  { d: 'M8 9.75C8.69036 9.75 9.25 9.19036 9.25 8.5C9.25 7.80964 8.69036 7.25 8 7.25C7.30964 7.25 6.75 7.80964 6.75 8.5C6.75 9.19036 7.30964 9.75 8 9.75Z', fill: 'currentColor' },
])

/** The session-stats panel's icon. */
export const IconClock = icon(16, '0 0 16 16', [
  { d: 'M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z', stroke: 'currentColor' },
  { d: 'M8 4.31V8.46L11 10.08', stroke: 'currentColor' },
])

/** The add button's icon. */
export const IconPlus = icon(16, '0 0 16 16', [
  { d: 'M8 2V14', stroke: 'currentColor' },
  { d: 'M2 8H14', stroke: 'currentColor' },
])

/** The delete button's icon. */
export const IconTrash = icon(16, '0 0 16 16', [
  { d: 'M1.28149 3.88831H14.7187', stroke: 'currentColor' },
  { d: 'M5.41602 3.88833V2.47962C5.41602 2.29282 5.52492 2.11366 5.71876 1.98157C5.9126 1.84948 6.17551 1.77527 6.44964 1.77527H9.55053C9.82466 1.77527 10.0876 1.84948 10.2814 1.98157C10.4753 2.11366 10.5842 2.29282 10.5842 2.47962V3.88833', stroke: 'currentColor' },
  { d: 'M2.57349 3.88831L3.19366 13.2943C3.21937 13.5502 3.33952 13.7872 3.53065 13.9593C3.72178 14.1313 3.97016 14.2259 4.22729 14.2246H11.7728C12.0299 14.2259 12.2783 14.1313 12.4694 13.9593C12.6605 13.7872 12.7807 13.5502 12.8064 13.2943L13.4266 3.88831', stroke: 'currentColor' },
  { d: 'M6.44946 6.98926V11.1238', stroke: 'currentColor' },
  { d: 'M9.55054 6.98926V11.1238', stroke: 'currentColor' },
])

/** The refresh button's icon. */
export const IconRefresh = icon(16, '0 0 16 16', [
  { d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1', stroke: 'currentColor' },
  { d: 'M14.4999 1.5V5.1H10.8999', stroke: 'currentColor' },
])

/** The expand / collapse chevron. */
export const IconChevronRight = icon(14, '0 0 16 16', [
  { d: 'M6 12L9.29289 8.70711C9.68342 8.31658 9.68342 7.68342 9.29289 7.29289L6 4', stroke: 'currentColor' },
])

/** The expand / collapse chevron, pointing down. */
export const IconChevronDown = icon(14, '0 0 16 16', [
  { d: 'M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6', stroke: 'currentColor' },
])

/** The check mark. */
export const IconCheck = icon(16, '0 0 16 16', [
  { d: 'M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4', stroke: 'currentColor' },
])

/** The close button's icon. */
export const IconClose = icon(16, '0 0 16 16', [
  { d: 'M2.5 2.5L13.5 13.5', stroke: 'currentColor' },
  { d: 'M13.5 2.5L2.5 13.5', stroke: 'currentColor' },
])

/** The notes panel's folder icon. */
export const IconFolder = icon(16, '0 0 16 16', [
  { d: 'M12.3994 13.5986H2.04956C1.49728 13.5986 1.04956 13.1509 1.04956 12.5986V3.40137C1.04956 2.84908 1.49728 2.40137 2.04956 2.40137H4.76632C5.01016 2.40137 5.24561 2.49046 5.42836 2.6519L6.94088 3.98799C7.12364 4.14943 7.35908 4.23852 7.60293 4.23852H12.3994C12.9517 4.23852 13.3994 4.68624 13.3994 5.23852V7.16991', stroke: 'currentColor' },
  { d: 'M2.55911 7.93683C2.67584 7.49906 3.07229 7.19446 3.52536 7.19446H13.6491C14.3061 7.19446 14.7846 7.81725 14.6153 8.45209L13.4411 12.856C13.3244 13.2938 12.9279 13.5984 12.4748 13.5984H2.35113C1.69411 13.5984 1.21562 12.9756 1.38489 12.3407L2.55911 7.93683Z', stroke: 'currentColor' },
])

/** The warning icon, for an overdue todo. */
export const IconWarning = icon(16, '0 0 16 16', [
  { d: 'M6.87 2.6a1.33 1.33 0 0 1 2.26 0l5.34 9.33A1.33 1.33 0 0 1 13.33 14H2.67a1.33 1.33 0 0 1-1.14-2.07Z', stroke: 'currentColor' },
  { d: 'M8 6v3m0 2.33h.01', stroke: 'currentColor' },
])

/** The info icon, for a hint. */
export const IconInfo = icon(14, '0 0 14 14', [
  { d: 'M12.5757 7.00012C12.5757 3.92085 10.0794 1.42463 7.00012 1.42456C3.9208 1.42456 1.42456 3.9208 1.42456 7.00012C1.42463 10.0794 3.92085 12.5757 7.00012 12.5757C10.0793 12.5756 12.5756 10.0793 12.5757 7.00012ZM13.8002 7.00012C13.8001 10.7559 10.7559 13.8001 7.00012 13.8002C3.2443 13.8002 0.199291 10.7559 0.199219 7.00012C0.199219 3.24426 3.24426 0.199219 7.00012 0.199219C10.7559 0.199291 13.8002 3.24426 13.8002 7.00012Z', fill: 'currentColor' },
  { d: 'M7.6127 3.18921V4.55986H6.38735V3.18921H7.6127Z', fill: 'currentColor' },
  { d: 'M7.6127 5.68921V10.8109H6.38735V5.68921H7.6127Z', fill: 'currentColor' },
])

/** The edit button's icon. */
export const IconEdit = icon(16, '0 0 16 16', [
  { d: 'M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z', fill: 'currentColor' },
  { d: 'M7.7849 8.23878L13.888 2.13574', stroke: 'currentColor' },
])
