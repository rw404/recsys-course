# Manim clip contract

Upload rendered clips to the folder matching the world:

```text
public/video/manim/world01/  Foundations
public/video/manim/world02/  Retrieval
public/video/manim/world03/  Sequential models
public/video/manim/world04/  Policies and RL
public/video/manim/world05/  Feedback ecosystems
public/video/manim/world06/  System synthesis
```

World 01 ships with rendered clips. Worlds 02-06 use their themed real-time Three.js
storyboards until matching video files are present. A missing file falls back without breaking the
lesson; refreshing the page after an upload makes the new render available.

Each concept needs the same basename in both formats:

```text
W01_00_Foundations.mp4
W01_00_Foundations.webm
...
W01_10_RecallCoverage.mp4
W01_10_RecallCoverage.webm
```

The authoritative basenames for every concept live in `src/game/SignalTheoryStage.tsx` under
`THEORY_MANIM_CLIPS`. For example, the first Retrieval concept is uploaded as:

```text
public/video/manim/world02/W02_00_RetrievalSystems.mp4
public/video/manim/world02/W02_00_RetrievalSystems.webm
```

Use the same page order as the lesson. Worlds 02-05 contain clips `00` through `08`; World 06
contains clips `00` through `07`.

Recommended master settings:

- `1920x888`, 30 fps, matching the curved screen's 9.2:4.25 aspect ratio
- 5-9 seconds per concept
- no audio and no baked playback controls
- large type, short labels and high contrast
- keep titles and labels inside a 6% horizontal safe area for the curved edges
- animate one teaching claim per clip and reveal no more than five primary objects at once
- use the world's accent as a semantic highlight, not as a full-screen tint
- keep the complete explanatory result visible for at least 1.3 seconds at the end
- do not bake a loop or fade to black; the site plays once and provides a spatial replay control

To render the bundled Manim source locally:

```bash
./scripts/render-world01-manim.sh
```

The script writes both browser formats to the correct directory. MP4 is used on Safari/iOS;
VP9 WebM is preferred where supported.
