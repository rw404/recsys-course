/**
 * Touch/virtual controls shared between the DOM overlay (joystick + interact button)
 * and the R3F loop (Player, InteractionSystem). Kept out of React state to avoid
 * per-frame re-renders — same pattern as `runtime`.
 */
export const touchControls = {
  moveX: 0, // -1..1 strafe (right positive)
  moveY: 0, // -1..1 forward (up/away positive)
  interactEdge: false, // consumed by InteractionSystem, like the E key
  jumpEdge: false, // consumed by Player, like the Space key
}

export function resetTouchMove() {
  touchControls.moveX = 0
  touchControls.moveY = 0
}
