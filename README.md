# RecSys Adventure — Foundations Camp (vertical slice)

An interactive **adventure-mode** vertical slice for a Recommender Systems course.
The 3D world is not decoration — it is a **spatial progress interface**. You play a small
stylized "data porter" who walks the course with WASD; each station is a real course action,
and completing work visibly transforms the world.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build / preview:

```bash
npm run build
npm run preview  # http://localhost:4173
```

## The gameplay loop (this slice)

1. You spawn in **Foundations Camp** next to the **Metric Keeper** (guide NPC).
2. Talk to the guide (**E**) — it sets your objective.
3. Walk to the **Week 01 · Ranking & Metrics** station → **E** opens **Study Mode** (NDCG / Recall / Coverage).
4. Completing the lesson checkpoint **unlocks the Ranking Sandbox**.
5. In the **Ranking Sandbox** lab, build a slate of 4 items to maximize **NDCG@4**.
   Passing forges the **Metric Compass** artifact — it appears on your backpack.
6. The **Quiz Gate** unlocks; pass all three questions to **light the bridge** to Retrieval Valley.
7. The **Next Required Action** in the HUD updates at every step.

## Controls

| Key | Action |
|-----|--------|
| `W A S D` / arrows | Move |
| `Shift` | Run |
| `E` | Interact with the nearest station |
| `C` | Open the Catalog (no-3D fallback) |
| `Esc` | Close a panel (skips the cinematic camera) |

Accessibility: **reduced-motion** toggle (top-right) snaps the camera instead of gliding,
and the **Catalog** lets you enter any available station without walking.

## Architecture

- `src/state/progress.ts` — the single source of truth (zustand). `NODES` graph,
  `ProgressNodeState`, and `resolveNextRequiredAction`. **The 3D world only visualizes this.**
- `src/game/` — R3F world:
  - `World.tsx` — Canvas + Rapier physics.
  - `Player.tsx` — primitive-built porter, WASD via a Rapier capsule, procedural walk cycle.
  - `Camera.tsx` — damped isometric follow, cinematic push-in on interact.
  - `Environment.tsx` — lighting, fog, ground colliders, glowing route (highlights the next action).
  - `Stations.tsx` — station meshes per node state + proximity/`E` interaction system.
  - `shared.ts` — high-frequency runtime state kept out of React.
- `src/ui/` — `HUD`, `StudyMode`, `LabMode` (Ranking Sandbox), `QuizMode`, `InteractDialog`, `Catalog`.
- `src/data/course.ts` — lesson text, quiz, sandbox items, and the metric math (NDCG/Recall/Coverage).

## Design notes

- **No external/borrowed assets.** The character and props are built from Three.js primitives.
- Every station corresponds to a real course action; progress (artifacts, lit bridge, route
  highlight, station state colors) is driven entirely by `ProgressStore`.
- Stack: React + TypeScript + Vite, Three.js via `@react-three/fiber`, `@react-three/drei`,
  `@react-three/rapier`, `zustand`.

## Next (out of scope for this slice)

Retrieval Valley (two-tower / ANN / negative sampling), Sequential City, Policy Factory,
Ecosystem City, and the Final Arena — plus GLB character/props, mobile joystick, and MDX lessons.
