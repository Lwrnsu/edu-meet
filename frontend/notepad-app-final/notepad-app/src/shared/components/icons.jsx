export const P = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  trash: <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  edit: <><path d="M14 4.5l4.5 4.5L9 18.5H4.5V14z" /><path d="M11 21h10" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5h4" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  undo: <><path d="M9 8H4V3" /><path d="M4.5 8A9 9 0 1112 21" /></>,
  redo: <><path d="M15 8h5V3" /><path d="M19.5 8A9 9 0 1012 21" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  doc: <><path d="M6 3h9l4 4v14H6z" /><path d="M9 11h7M9 15h7" /></>,
  noteAdd: <><path d="M4 3h10a2 2 0 012 2v6H8v5H4z" fill="currentColor" stroke="none" /><path d="M4 3h10a2 2 0 012 2v5.5M4 3v16a2 2 0 002 2h5" fill="currentColor" stroke="none" /><path d="M7 8h6M7 11.5h6M7 15h3" stroke="#ECEEFF" /><circle cx="17.5" cy="17.5" r="5" fill="currentColor" stroke="#ECEEFF" strokeWidth="1.4" /><path d="M17.5 15v5M15 17.5h5" stroke="#fff" /></>,
  notes: <><rect x="5" y="5" width="14" height="16" rx="2.5" /><path d="M9 3v4M12 3v4M15 3v4M8.5 12h7M8.5 16h5" /></>,
  spark: <path d="M10 4l1.8 5.2L17 11l-5.2 1.8L10 18l-1.8-5.2L3 11l5.2-1.8zM18 14l.9 2.6 2.6.9-2.6.9L18 21l-.9-2.6-2.6-.9 2.6-.9z" strokeWidth="1.5" />,
  pin: <><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z" /><path d="M12 14v7" /></>,
  pad: <><path d="M12 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-6" /><path d="M18.5 3.5l2.5 2.5L12 15l-3.5 1 1-3.5z" fill="currentColor" /></>,
}
export const I = ({ n, x = '' }) => (
  <svg className={`ic ${x}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{P[n]}</svg>
)
