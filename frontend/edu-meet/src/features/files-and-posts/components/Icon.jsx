// Line icons used across the Files & Blogs screens.
const PATHS = {
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  edit: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 15l1-3 6-6 2 2-6 6z" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></>,
  download: <path d="M12 4v11M7 10l5 5 5-5M4 15v5h16v-5" />,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  folder: <path d="M3 6h6l2 2h10v11H3z" />,
  mega: <><path d="M3 10v4h4l6 4V6L7 10z" /><path d="M16 9a4 4 0 010 6" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
  missing: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4M9 9l4 4M13 9l-4 4" /></>,
  done: <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  bell: <><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></>,
  back: <path d="M15 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pin: <><path d="M9 4h6l-1 6 3 3H7l3-3z" /><path d="M12 13v7" /></>,
  clip: <path d="M20 12l-7.5 7.5a5 5 0 01-7-7L13 5a3.5 3.5 0 015 5l-7.5 7.5a2 2 0 01-3-3L14 8" />,
  video: <><rect x="2" y="6" width="13" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3z" /></>,
}

export default function Icon({ name, size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
