# Manim clip contract

Upload World 01 replacements to `public/video/manim/world01/`.

Each concept needs the same basename in both formats:

```text
W01_00_Foundations.mp4
W01_00_Foundations.webm
...
W01_10_RecallCoverage.mp4
W01_10_RecallCoverage.webm
```

Recommended master settings:

- `1920x888`, 30 fps, matching the curved screen's 9.2:4.25 aspect ratio
- 5-9 seconds per concept
- no audio and no baked playback controls
- large type, short labels and high contrast
- keep titles and labels inside a 6% horizontal safe area for the curved edges
- keep the complete explanatory result visible for at least 1.3 seconds at the end
- do not bake a loop or fade to black; the site plays once and provides a spatial replay control

To render the bundled Manim source locally:

```bash
./scripts/render-world01-manim.sh
```

The script writes both browser formats to the correct directory. MP4 is used on Safari/iOS;
VP9 WebM is preferred where supported.
