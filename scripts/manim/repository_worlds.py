import os
from manim import *


WORLD = os.getenv("THEORY_WORLD", "world02")
INDEX = int(os.getenv("THEORY_INDEX", "0"))
TITLE = os.getenv("THEORY_TITLE", "Repository concept")
SUMMARY = os.getenv("THEORY_SUMMARY", "A repository-backed course visualization.")

BG = "#07131D"
PANEL = "#102530"
PANEL_2 = "#173641"
INK = "#F4FBFA"
MUTED = "#8BB0B4"
GRID = "#21414A"
GREEN = "#42B978"
TEAL = "#39B9C1"
VIOLET = "#7B6CF0"
AMBER = "#F0B44D"
CORAL = "#EF6B67"

WORLD_STYLE = {
    "world02": ("RETRIEVAL", TEAL, VIOLET),
    "world03": ("SEQUENCES", VIOLET, TEAL),
    "world04": ("POLICIES", AMBER, CORAL),
    "world05": ("ECOSYSTEM", GREEN, TEAL),
    "world06": ("SYNTHESIS", VIOLET, GREEN),
}

config.background_color = BG
config.pixel_width = 1920
config.pixel_height = 888
config.frame_width = 15
config.frame_height = 6.9375
config.frame_rate = 30


def label(value, size=26, color=INK, weight="NORMAL"):
    return Text(value, font="DejaVu Sans", font_size=size, color=color, weight=weight)


def mono(value, size=16, color=MUTED):
    return Text(value, font="DejaVu Sans Mono", font_size=size, color=color)


def panel(width, height, color=PANEL, stroke=GRID, radius=0.16):
    return RoundedRectangle(
        width=width,
        height=height,
        corner_radius=radius,
        fill_color=color,
        fill_opacity=0.96,
        stroke_color=stroke,
        stroke_width=2,
    )


def node(title, color, subtitle="", width=1.8, height=0.76):
    shell = panel(width, height, PANEL_2, color, 0.13)
    heading = label(title, 19, INK, "BOLD")
    if heading.width > width - 0.26:
        heading.scale_to_fit_width(width - 0.26)
    if subtitle:
        detail = mono(subtitle, 11, MUTED)
        if detail.width > width - 0.24:
            detail.scale_to_fit_width(width - 0.24)
        copy = VGroup(heading, detail).arrange(DOWN, buff=0.07)
    else:
        copy = heading
    copy.move_to(shell)
    return VGroup(shell, copy)


def pill(value, color):
    copy = mono(value.upper(), 12, color)
    shell = RoundedRectangle(
        width=copy.width + 0.34,
        height=0.34,
        corner_radius=0.17,
        fill_color=color,
        fill_opacity=0.12,
        stroke_color=color,
        stroke_opacity=0.62,
        stroke_width=1.2,
    )
    copy.move_to(shell)
    return VGroup(shell, copy)


class RepositoryConceptScene(Scene):
    def setup(self):
        self.camera.background_color = BG
        vertical = [
            Line([x, -3, 0], [x, 3, 0], color=GRID, stroke_width=0.7, stroke_opacity=0.2)
            for x in [i * 0.5 for i in range(-15, 16)]
        ]
        horizontal = [
            Line([-7.5, y, 0], [7.5, y, 0], color=GRID, stroke_width=0.7, stroke_opacity=0.2)
            for y in [i * 0.5 for i in range(-6, 7)]
        ]
        self.add(VGroup(*vertical, *horizontal))

    def header(self, world_name, accent):
        marker = pill(f"{WORLD.upper()} / {INDEX:02d}", accent).to_corner(UL, buff=0.34)
        heading = label(TITLE.upper(), 31, INK, "BOLD")
        if heading.width > 8.3:
            heading.scale_to_fit_width(8.3)
        heading.next_to(marker, RIGHT, buff=0.28)
        summary = SUMMARY if len(SUMMARY) <= 74 else SUMMARY[:71] + "..."
        subtitle = mono(summary, 13, MUTED)
        if subtitle.width > 4.1:
            subtitle.scale_to_fit_width(4.1)
        subtitle.to_corner(UR, buff=0.38)
        divider = Line([-7.15, 2.35, 0], [7.15, 2.35, 0], color=GRID, stroke_width=1.5)
        self.play(
            FadeIn(marker, shift=RIGHT * 0.12),
            Write(heading),
            FadeIn(subtitle),
            Create(divider),
            run_time=0.65,
        )

    def construct(self):
        world_name, accent, secondary = WORLD_STYLE.get(WORLD, ("COURSE", TEAL, VIOLET))
        self.header(world_name, accent)
        {
            "world02": self.retrieval,
            "world03": self.sequence,
            "world04": self.policy,
            "world05": self.ecosystem,
            "world06": self.synthesis,
        }.get(WORLD, self.synthesis)(accent, secondary)
        self.wait(1.35)

    def retrieval(self, accent, secondary):
        query = VGroup(
            Circle(radius=0.78, color=accent, stroke_width=3, fill_color=accent, fill_opacity=0.1),
            label("QUERY", 18, INK, "BOLD"),
        ).move_to([-5.75, 0.15, 0])
        points = VGroup()
        for i in range(30):
            x = -3.55 + (i % 6) * 0.62 + ((i // 6) % 2) * 0.12
            y = -1.28 + (i // 6) * 0.58
            color = [accent, secondary, GREEN, AMBER][(i + INDEX) % 4]
            points.add(Dot([x, y, 0], radius=0.075, color=color, fill_opacity=0.72))
        graph_edges = VGroup(*[
            Line(points[i].get_center(), points[i + 1].get_center(), color=GRID, stroke_width=1.2, stroke_opacity=0.55)
            for i in range(len(points) - 1)
            if i % 6 != 5
        ])
        selected_indices = [((INDEX * 3) + offset * 7) % len(points) for offset in range(4)]
        candidates = VGroup(*[
            node(f"#{rank + 1}", GREEN if rank == 0 else secondary, f"sim 0.{94 - rank * 5}", 1.7, 0.56)
            for rank in range(4)
        ]).arrange(DOWN, buff=0.15).move_to([5.2, 0.1, 0])
        rays = VGroup(*[
            Line(query.get_right(), points[item].get_center(), color=accent, stroke_width=2.2, stroke_opacity=0.62)
            for item in selected_indices
        ])
        result_links = VGroup(*[
            Arrow(points[item].get_center(), candidates[rank].get_left(), buff=0.12, color=secondary, stroke_width=2.2)
            for rank, item in enumerate(selected_indices)
        ])
        metrics = VGroup(pill("RECALL@K", secondary), pill("LATENCY", AMBER), pill("BLEND", GREEN)).arrange(RIGHT, buff=0.18).move_to([0.7, -2.08, 0])

        self.play(FadeIn(query, scale=0.8), LaggedStart(*[FadeIn(dot, scale=0.4) for dot in points], lag_ratio=0.025), run_time=0.9)
        self.play(Create(graph_edges), LaggedStart(*[Create(ray) for ray in rays], lag_ratio=0.08), run_time=0.75)
        self.play(
            *[points[item].animate.scale(1.9).set_color(GREEN) for item in selected_indices],
            LaggedStart(*[GrowArrow(link) for link in result_links], lag_ratio=0.1),
            run_time=0.9,
        )
        self.play(FadeIn(candidates, shift=LEFT * 0.15), LaggedStart(*[FadeIn(metric, shift=UP * 0.06) for metric in metrics], lag_ratio=0.1), run_time=0.7)

    def sequence(self, accent, secondary):
        tokens = VGroup(*[
            VGroup(
                RoundedRectangle(width=0.82, height=0.72, corner_radius=0.1, fill_color=PANEL_2, fill_opacity=1, stroke_color=accent if i == 7 else GRID),
                mono(f"t{i + 1}", 13, INK if i == 7 else MUTED),
            )
            for i in range(8)
        ]).arrange(RIGHT, buff=0.22).move_to([0, 1.15, 0])
        active = 7 - (INDEX % 3)
        arcs = VGroup(*[
            ArcBetweenPoints(tokens[active].get_bottom(), tokens[i].get_bottom(), angle=0.55, color=secondary, stroke_width=2.2)
            for i in range(active)
        ])
        matrix_shell = panel(4.35, 2.4, PANEL, accent).move_to([-2.25, -0.82, 0])
        matrix = VGroup()
        for row in range(6):
            for col in range(6):
                allowed = col <= row
                opacity = (0.18 + 0.1 * ((row + col + INDEX) % 5)) if allowed else 0.05
                matrix.add(Square(side_length=0.25, fill_color=accent if allowed else MUTED, fill_opacity=opacity, stroke_width=0))
        matrix.arrange_in_grid(rows=6, cols=6, buff=0.08).move_to(matrix_shell)
        context = node("CONTEXT", GREEN, "next-item state", 2.25, 0.88).move_to([4.35, -0.72, 0])
        heads = VGroup(*[pill(f"HEAD {i + 1}", [accent, secondary, GREEN, AMBER][i]) for i in range(4)]).arrange(RIGHT, buff=0.12).move_to([1.6, -2.08, 0])

        self.play(LaggedStart(*[FadeIn(token, shift=RIGHT * 0.08) for token in tokens], lag_ratio=0.08), run_time=0.9)
        self.play(LaggedStart(*[Create(arc) for arc in arcs], lag_ratio=0.07), Indicate(tokens[active], color=accent), run_time=0.85)
        self.play(FadeIn(matrix_shell), LaggedStart(*[FadeIn(cell, scale=0.4) for cell in matrix], lag_ratio=0.01), run_time=0.8)
        self.play(FadeIn(context, shift=LEFT * 0.15), LaggedStart(*[FadeIn(head, shift=UP * 0.06) for head in heads], lag_ratio=0.1), run_time=0.7)

    def policy(self, accent, secondary):
        policy = VGroup(
            Circle(radius=0.92, color=accent, stroke_width=3, fill_color=accent, fill_opacity=0.1),
            label("POLICY", 19, INK, "BOLD"),
        ).move_to([-5.25, 0.15, 0])
        arms = VGroup()
        for i in range(5):
            height = 0.55 + ((i * 3 + INDEX) % 5) * 0.27
            bar = Rectangle(width=0.58, height=height, fill_color=secondary if i != INDEX % 5 else GREEN, fill_opacity=0.76, stroke_width=0)
            uncertainty = Line(UP * 0.24, DOWN * 0.24, color=AMBER, stroke_width=3).next_to(bar, UP, buff=0.04)
            arm = VGroup(bar, uncertainty, mono(chr(65 + i), 12, MUTED).next_to(bar, DOWN, buff=0.12))
            arms.add(arm)
        arms.arrange(RIGHT, buff=0.5, aligned_edge=DOWN).move_to([-0.9, -0.1, 0])
        reward = node("REWARD", GREEN, f"r = {0.42 + (INDEX % 5) * 0.09:.2f}", 2.0, 0.9).move_to([4.9, 0.15, 0])
        decision_link = Arrow(policy.get_right(), arms.get_left(), buff=0.18, color=accent, stroke_width=3)
        reward_link = Arrow(arms.get_right(), reward.get_left(), buff=0.18, color=GREEN, stroke_width=3)
        trail = VGroup(*[
            Dot(radius=0.07, color=GREEN if i % 3 else CORAL).move_to([-3.0 + i * 0.47, -1.65 + 0.12 * ((i + INDEX) % 3), 0])
            for i in range(14)
        ])
        controls = VGroup(pill("EXPLORE", AMBER), pill("EXPLOIT", accent), pill("CONSTRAINTS", CORAL)).arrange(RIGHT, buff=0.18).move_to([2.6, -1.95, 0])

        self.play(GrowFromCenter(policy), LaggedStart(*[FadeIn(arm, shift=UP * 0.14) for arm in arms], lag_ratio=0.1), run_time=0.9)
        self.play(GrowArrow(decision_link), Indicate(arms[INDEX % 5], color=GREEN), run_time=0.7)
        self.play(GrowArrow(reward_link), FadeIn(reward, shift=LEFT * 0.12), LaggedStart(*[FadeIn(dot, scale=0.4) for dot in trail], lag_ratio=0.04), run_time=0.85)
        self.play(LaggedStart(*[FadeIn(control, shift=UP * 0.06) for control in controls], lag_ratio=0.12), Circumscribe(reward, color=GREEN), run_time=0.7)

    def ecosystem(self, accent, secondary):
        center = node("POLICY", VIOLET, "allocates exposure", 2.0, 0.82)
        labels = [("EXPOSURE", TEAL), ("BEHAVIOR", GREEN), ("LOGS", AMBER), ("SUPPLY", CORAL)]
        positions = [[4.3, 1.25, 0], [4.3, -1.2, 0], [-4.3, -1.2, 0], [-4.3, 1.25, 0]]
        stages = VGroup(*[node(name, color, "", 1.8, 0.68).move_to(position) for (name, color), position in zip(labels, positions)])
        loop = VGroup(
            CurvedArrow(center.get_right(), stages[0].get_left(), angle=0.28, color=TEAL, stroke_width=3),
            CurvedArrow(stages[0].get_bottom(), stages[1].get_top(), angle=-0.18, color=GREEN, stroke_width=3),
            CurvedArrow(stages[1].get_left(), stages[2].get_right(), angle=-0.22, color=AMBER, stroke_width=3),
            CurvedArrow(stages[2].get_top(), stages[3].get_bottom(), angle=-0.18, color=CORAL, stroke_width=3),
            CurvedArrow(stages[3].get_right(), center.get_left(), angle=0.28, color=VIOLET, stroke_width=3),
        )
        catalogue = VGroup(*[
            Dot(radius=0.12 + (i % 3) * 0.02, color=[accent, secondary, VIOLET, AMBER, CORAL][(i + INDEX) % 5])
            for i in range(18)
        ]).arrange_in_grid(rows=3, cols=6, buff=0.22).move_to([0, -1.55, 0])
        health = VGroup(pill("DIVERSITY", GREEN), pill("FAIRNESS", TEAL), pill("LONG TERM", AMBER)).arrange(RIGHT, buff=0.16).move_to([0, 2.0, 0])

        self.play(GrowFromCenter(center), LaggedStart(*[FadeIn(stage, scale=0.8) for stage in stages], lag_ratio=0.1), run_time=0.85)
        self.play(LaggedStart(*[Create(arrow) for arrow in loop], lag_ratio=0.12), run_time=1.0)
        self.play(LaggedStart(*[FadeIn(item, scale=0.4) for item in catalogue], lag_ratio=0.04), run_time=0.7)
        self.play(LaggedStart(*[FadeIn(tag, shift=DOWN * 0.06) for tag in health], lag_ratio=0.12), Indicate(center[0], color=VIOLET), run_time=0.7)

    def synthesis(self, accent, secondary):
        specs = [
            ("EVIDENCE", TEAL),
            ("FEATURES", GREEN),
            ("RETRIEVE", VIOLET),
            ("RANK", AMBER),
            ("POLICY", CORAL),
            ("SERVE", accent),
        ]
        stages = VGroup(*[node(name, color, "", 1.55, 0.72) for name, color in specs]).arrange(RIGHT, buff=0.38).move_to([0, 0.45, 0])
        links = VGroup(*[
            Arrow(stages[i].get_right(), stages[i + 1].get_left(), buff=0.08, color=specs[i + 1][1], stroke_width=3)
            for i in range(len(stages) - 1)
        ])
        contracts = VGroup(*[
            pill(name, color) for name, color in [
                ("LINEAGE", TEAL),
                ("METRICS", GREEN),
                ("LATENCY", AMBER),
                ("FALLBACK", CORAL),
            ]
        ]).arrange(RIGHT, buff=0.22).move_to([0, -1.65, 0])
        packets = VGroup(*[Dot(radius=0.07, color=INK) for _ in range(6)]).arrange(RIGHT, buff=0.08)
        packets.move_to(stages[0].get_left() + LEFT * 0.45)
        path = VMobject().set_points_smoothly([stage.get_center() for stage in stages])

        self.play(LaggedStart(*[FadeIn(stage, shift=UP * 0.12) for stage in stages], lag_ratio=0.08), run_time=0.85)
        self.play(LaggedStart(*[GrowArrow(link) for link in links], lag_ratio=0.1), FadeIn(packets), run_time=0.75)
        self.play(LaggedStart(*[MoveAlongPath(packet, path) for packet in packets], lag_ratio=0.07), run_time=1.2)
        self.play(LaggedStart(*[FadeIn(contract, shift=UP * 0.07) for contract in contracts], lag_ratio=0.12), Circumscribe(stages[-1], color=accent), run_time=0.75)
