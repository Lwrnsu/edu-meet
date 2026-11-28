/* ---------- icons ---------- */
export const P = {
  trash: <><path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6" /></>,
  edit: <><path d="M14 4.5l4.5 4.5L9 18.5H4.5V14z" /><path d="M11 21h10" /></>,
  play: <><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4z" fill="currentColor" /></>,
  start: <><circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity=".25" /><path d="M10 8l6 4-6 4z" fill="currentColor" /></>,
  add: <><circle cx="12" cy="12" r="10" /><path d="M12 7v10M7 12h10" /></>,
  back: <><circle cx="12" cy="12" r="11" fill="#fff" stroke="none" /><path d="M14 8l-5 4 5 4z" fill="#8B63E0" stroke="none" /></>,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  tile: <><path d="M5 2.5h9l5 5V13H5z" fill="currentColor" stroke="none" /><path d="M5 12h6v9H5z" fill="currentColor" stroke="none" /><circle cx="15.5" cy="17" r="5.2" fill="currentColor" stroke="#fff" strokeWidth="1.4" /><path d="M14 14.8l3.6 2.2-3.6 2.2z" fill="#fff" stroke="none" /></>,
  cls: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 17V7h5a3 3 0 010 6H8" /></>,
  deck: <><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M6 3.5h12M3 12h18M7 16h4" /></>,
  title: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18" /><circle cx="15" cy="15" r="3.4" fill="currentColor" /><path d="M14 13.8l2 1.2-2 1.2z" fill="#5B2FC9" stroke="none" /></>,
  quiz: <><rect x="7" y="3" width="14" height="14" rx="2.5" /><path d="M3.5 7v10a3.5 3.5 0 003.5 3.5h10" /><path d="M11.5 8.5a2.5 2.5 0 115 0c0 1.8-2.5 1.8-2.5 3.5M14 14.6h.01" /></>,
  fcard: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h5" /></>,
  leave: <><path d="M13 4H6.5A1.5 1.5 0 005 5.5v13A1.5 1.5 0 006.5 20H13" fill="currentColor" fillOpacity=".25" /><path d="M11 12h10M18 8.5L21.5 12 18 15.5" /></>,
  prev: <><path d="M6.5 6v12" /><path d="M18 6.5L10 12l8 5.5z" fill="currentColor" /></>,
  next: <><path d="M17.5 6v12" /><path d="M6 6.5L14 12 6 17.5z" fill="currentColor" /></>,
  file: <><path d="M6 2.5h8l5 5v14H6z" fill="currentColor" stroke="none" /><rect x="8.2" y="11.5" width="7.2" height="5.6" rx="1.3" stroke="#fff" /><rect x="11" y="14" width="7" height="5.4" rx="1.3" fill="#9250DA" stroke="#fff" /></>,
  upload: <><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4 14v4.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V14" /></>,
  checkCircle: <><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></>,
  sparkle: <path d="M10 4l1.8 5.2L17 11l-5.2 1.8L10 18l-1.8-5.2L3 11l5.2-1.8zM18 14l.9 2.6 2.6.9-2.6.9L18 21l-.9-2.6-2.6-.9 2.6-.9z" />,
}
export const I = ({ n, x = '' }) => (
  <svg className={`ic ${x}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{P[n]}</svg>
)
