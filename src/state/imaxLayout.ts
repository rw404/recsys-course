export const IMAX_NOTES_LAYOUT_EVENT = 'recsys-imax-notes-layout'

export const IMAX_NOTES_DESKTOP_QUERY = '(min-width: 1100px) and (pointer: fine)'

export function setImaxNotesLayoutOpen(open: boolean) {
  if (typeof window === 'undefined') return

  document.documentElement.toggleAttribute('data-imax-notes-open', open)
  window.dispatchEvent(new Event(IMAX_NOTES_LAYOUT_EVENT))
}

export function isImaxNotesLayoutOpen() {
  if (typeof window === 'undefined') return false

  return document.documentElement.hasAttribute('data-imax-notes-open')
    && window.matchMedia(IMAX_NOTES_DESKTOP_QUERY).matches
}
