from manim import *


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

config.background_color = BG
config.pixel_width = 1500
config.pixel_height = 600
config.frame_width = 15
config.frame_height = 6
config.frame_rate = 30


def text(label, size=24, color=INK, weight="NORMAL"):
    return Text(label, font="DejaVu Sans", font_size=size, color=color, weight=weight)


def mono(label, size=18, color=MUTED):
    return Text(label, font="DejaVu Sans Mono", font_size=size, color=color)


def panel(width, height, color=PANEL, stroke=GRID, radius=0.18):
    return RoundedRectangle(
        width=width,
        height=height,
        corner_radius=radius,
        fill_color=color,
        fill_opacity=0.96,
        stroke_color=stroke,
        stroke_width=1.5,
    )


def node(label, color, width=1.65, height=0.72, subtitle=None):
    shell = panel(width, height, PANEL_2, color, 0.14)
    shell.set_stroke(opacity=0.72)
    title = text(label, 19, INK, "BOLD")
    if subtitle:
        sub = mono(subtitle, 11, MUTED)
        copy = VGroup(title, sub).arrange(DOWN, buff=0.08)
    else:
        copy = title
    copy.move_to(shell)
    return VGroup(shell, copy)


def pill(label, color, width=None):
    copy = mono(label.upper(), 13, color)
    shell = RoundedRectangle(
        width=width or copy.width + 0.38,
        height=0.38,
        corner_radius=0.19,
        fill_color=color,
        fill_opacity=0.12,
        stroke_color=color,
        stroke_opacity=0.58,
        stroke_width=1.2,
    )
    copy.move_to(shell)
    return VGroup(shell, copy)


def arrow_between(left, right, color=TEAL, buff=0.18):
    return Arrow(
        left.get_right(),
        right.get_left(),
        buff=buff,
        color=color,
        stroke_width=4,
        max_tip_length_to_length_ratio=0.12,
    )


class FoundationScene(Scene):
    scene_number = "00"
    scene_title = "FOUNDATIONS"
    scene_subtitle = ""

    def setup(self):
        self.camera.background_color = BG
        vertical = [
            Line([x, -3, 0], [x, 3, 0], color=GRID, stroke_width=0.6, stroke_opacity=0.2)
            for x in [i * 0.5 for i in range(-15, 16)]
        ]
        horizontal = [
            Line([-7.5, y, 0], [7.5, y, 0], color=GRID, stroke_width=0.6, stroke_opacity=0.2)
            for y in [i * 0.5 for i in range(-6, 7)]
        ]
        self.grid = VGroup(*vertical, *horizontal)
        self.add(self.grid)

    def header(self):
        marker = pill("WORLD 01 / " + self.scene_number, GREEN)
        marker.to_corner(UL, buff=0.34)
        heading = text(self.scene_title, 27, INK, "BOLD")
        heading.next_to(marker, RIGHT, buff=0.28)
        subtitle = mono(self.scene_subtitle, 13, MUTED)
        subtitle.to_corner(UR, buff=0.38)
        divider = Line([-7.15, 2.35, 0], [7.15, 2.35, 0], color=GRID, stroke_width=1.2)
        group = VGroup(marker, heading, subtitle, divider)
        self.play(FadeIn(marker, shift=RIGHT * 0.12), Write(heading), FadeIn(subtitle), Create(divider), run_time=0.65)
        return group

    def outro(self):
        self.wait(0.55)
        visible = Group(*[mob for mob in self.mobjects if mob is not self.grid])
        self.play(FadeOut(visible, shift=DOWN * 0.08), run_time=0.45)
        self.wait(0.12)


class W01_00_Foundations(FoundationScene):
    scene_number = "00"
    scene_title = "A DECISION SYSTEM"
    scene_subtitle = "evidence → choice → learning"

    def construct(self):
        self.header()
        user = node("USER", GREEN, 1.45, 0.86, "partial evidence").move_to([-5.8, 0.35, 0])
        catalogue_shell = panel(3.3, 2.55, PANEL, TEAL)
        catalogue_title = mono("CATALOGUE", 14, TEAL).next_to(catalogue_shell.get_top(), DOWN, 0.22)
        tiles = VGroup(*[
            RoundedRectangle(width=0.42, height=0.31, corner_radius=0.05, fill_color=[TEAL, VIOLET, GREEN, AMBER][i % 4], fill_opacity=0.42, stroke_width=0)
            for i in range(24)
        ]).arrange_in_grid(rows=4, cols=6, buff=0.12).move_to(catalogue_shell).shift(DOWN * 0.16)
        catalogue = VGroup(catalogue_shell, catalogue_title, tiles).move_to([-2.4, 0.05, 0])
        decision = VGroup(
            Circle(radius=0.92, color=VIOLET, stroke_width=3, fill_color=VIOLET, fill_opacity=0.09),
            text("DECIDE", 20, INK, "BOLD"),
            mono("under constraints", 11, MUTED).shift(DOWN * 0.34),
        ).move_to([1.05, 0.05, 0])
        slate_shell = panel(2.8, 2.55, PANEL, GREEN)
        slate_title = mono("ORDERED SLATE", 14, GREEN).next_to(slate_shell.get_top(), DOWN, 0.22)
        slate_cards = VGroup(*[
            VGroup(
                mono(str(i + 1).zfill(2), 12, AMBER if i == 0 else MUTED),
                RoundedRectangle(width=1.65, height=0.28, corner_radius=0.05, fill_color=GREEN if i < 2 else VIOLET, fill_opacity=0.34, stroke_width=0),
            ).arrange(RIGHT, buff=0.15)
            for i in range(4)
        ]).arrange(DOWN, buff=0.14).move_to(slate_shell).shift(DOWN * 0.15)
        slate = VGroup(slate_shell, slate_title, slate_cards).move_to([4.65, 0.05, 0])
        links = VGroup(arrow_between(user, catalogue), arrow_between(catalogue, decision), arrow_between(decision, slate, GREEN))
        constraints = VGroup(*[pill(label, color) for label, color in [("SAFETY", CORAL), ("FRESHNESS", TEAL), ("VALUE", AMBER)]]).arrange(RIGHT, buff=0.16).move_to([1.05, -1.8, 0])

        self.play(FadeIn(user, shift=UP * 0.12), FadeIn(catalogue, shift=UP * 0.12), run_time=0.6)
        self.play(LaggedStart(*[GrowArrow(link) for link in links], lag_ratio=0.18), GrowFromCenter(decision), run_time=0.9)
        self.play(FadeIn(slate, shift=LEFT * 0.18), LaggedStart(*[FadeIn(item, shift=UP * 0.08) for item in constraints], lag_ratio=0.12), run_time=0.75)
        self.play(Circumscribe(slate_cards[0], color=AMBER, fade_out=True), Indicate(decision[0], color=VIOLET), run_time=0.8)
        self.outro()


class W01_01_UsefulSlate(FoundationScene):
    scene_number = "01"
    scene_title = "CHOOSE A USEFUL SLATE"
    scene_subtitle = "maximize value, not clicks alone"

    def construct(self):
        self.header()
        catalogue = VGroup(*[
            VGroup(
                RoundedRectangle(width=0.78, height=0.92, corner_radius=0.1, fill_color=[TEAL, GREEN, VIOLET, AMBER, CORAL][i % 5], fill_opacity=0.2, stroke_color=[TEAL, GREEN, VIOLET, AMBER, CORAL][i % 5], stroke_opacity=0.6),
                mono(str(i + 1).zfill(2), 12, INK),
            )
            for i in range(10)
        ]).arrange_in_grid(rows=2, cols=5, buff=0.18).move_to([-3.9, 0.15, 0])
        lens = VGroup(
            Circle(radius=1.03, color=VIOLET, stroke_width=3, fill_color=VIOLET, fill_opacity=0.1),
            Circle(radius=0.72, color=TEAL, stroke_width=1.5, stroke_opacity=0.65),
            text("VALUE", 20, INK, "BOLD"),
        ).move_to([0.35, 0.2, 0])
        slate = VGroup(*[
            VGroup(
                RoundedRectangle(width=2.25, height=0.52, corner_radius=0.1, fill_color=PANEL_2, fill_opacity=1, stroke_color=GREEN if i == 0 else GRID),
                mono("#" + str(i + 1), 13, AMBER if i == 0 else MUTED).shift(LEFT * 0.78),
                RoundedRectangle(width=0.95 - i * 0.08, height=0.12, corner_radius=0.04, fill_color=GREEN, fill_opacity=0.8, stroke_width=0).shift(RIGHT * 0.28),
            )
            for i in range(4)
        ]).arrange(DOWN, buff=0.14).move_to([4.55, 0.2, 0])
        equation = VGroup(
            mono("slate* = arg max", 18, MUTED),
            text("EXPECTED USER VALUE", 19, GREEN, "BOLD"),
        ).arrange(RIGHT, buff=0.18).move_to([0.2, -1.75, 0])
        chips = VGroup(*[pill(label, color) for label, color in [("LONG TERM", TEAL), ("SAFE", CORAL), ("FRESH", AMBER)]]).arrange(RIGHT, buff=0.12).next_to(equation, DOWN, 0.2)

        self.play(LaggedStart(*[FadeIn(item, scale=0.78) for item in catalogue], lag_ratio=0.06), run_time=0.9)
        self.play(GrowFromCenter(lens), FadeIn(equation, shift=UP * 0.12), run_time=0.65)
        selected = [catalogue[i].copy() for i in [1, 4, 6, 8]]
        self.add(*selected)
        self.play(*[selected[i].animate.scale(0.55).move_to(slate[i].get_center()) for i in range(4)], run_time=0.9)
        self.remove(*selected)
        self.play(FadeIn(slate), LaggedStart(*[FadeIn(chip, shift=UP * 0.07) for chip in chips], lag_ratio=0.1), run_time=0.65)
        self.play(Circumscribe(slate, color=GREEN), run_time=0.65)
        self.outro()


class W01_02_CoreEntities(FoundationScene):
    scene_number = "02"
    scene_title = "FIVE CORE ENTITIES"
    scene_subtitle = "keep the decision vocabulary precise"

    def construct(self):
        self.header()
        center = node("REQUEST", VIOLET, 1.75, 0.8, "decision moment")
        specs = [
            ("USER", GREEN, [-4.6, 1.18, 0]),
            ("ITEM", TEAL, [4.6, 1.18, 0]),
            ("INTERACTION", AMBER, [-4.8, -1.25, 0]),
            ("CONTEXT", VIOLET, [0, -1.65, 0]),
            ("CATALOGUE", CORAL, [4.8, -1.25, 0]),
        ]
        entities = VGroup(*[node(label, color, 1.85, 0.74).move_to(pos) for label, color, pos in specs])
        lines = VGroup(*[
            Line(entity.get_center(), center.get_center(), color=color, stroke_width=2.2, stroke_opacity=0.55)
            for entity, (_, color, _) in zip(entities, specs)
        ])
        badges = VGroup(
            pill("WHO", GREEN), pill("WHAT", TEAL), pill("WHAT HAPPENED", AMBER), pill("WHEN + WHERE", VIOLET), pill("WHAT IS ELIGIBLE", CORAL)
        )
        for badge, entity in zip(badges, entities):
            badge.next_to(entity, DOWN, 0.1)

        self.play(GrowFromCenter(center), run_time=0.45)
        self.play(LaggedStart(*[Create(line) for line in lines], lag_ratio=0.08), LaggedStart(*[FadeIn(entity, scale=0.8) for entity in entities], lag_ratio=0.1), run_time=1.1)
        self.play(LaggedStart(*[FadeIn(badge, shift=UP * 0.06) for badge in badges], lag_ratio=0.08), run_time=0.7)
        self.play(LaggedStart(*[Indicate(entity[0], color=specs[i][1], scale_factor=1.04) for i, entity in enumerate(entities)], lag_ratio=0.08), run_time=0.95)
        self.outro()


class W01_03_SignalsEvidence(FoundationScene):
    scene_number = "03"
    scene_title = "SIGNALS ARE EVIDENCE"
    scene_subtitle = "exposure comes before response"

    def construct(self):
        self.header()
        impression = node("IMPRESSION", TEAL, 2.2, 0.86, "item was shown").move_to([-5.25, 0.35, 0])
        event_nodes = VGroup(
            node("CLICK", GREEN, 1.55, 0.68),
            node("WATCH", VIOLET, 1.55, 0.68),
            node("RATING", AMBER, 1.55, 0.68),
        ).arrange(DOWN, buff=0.26).move_to([-1.65, 0.25, 0])
        evidence = node("EVIDENCE", GREEN, 2.1, 0.86, "observed behavior").move_to([2.05, 0.35, 0])
        truth = node("PREFERENCE", CORAL, 2.15, 0.86, "latent + contextual").move_to([5.45, 0.35, 0])
        not_equal = text("≠", 44, CORAL, "BOLD").move_to([3.8, 0.35, 0])
        event_links = VGroup(*[arrow_between(impression, event, TEAL) for event in event_nodes])
        evidence_links = VGroup(*[arrow_between(event, evidence, GREEN) for event in event_nodes])
        record = panel(9.7, 0.64, PANEL, GRID).move_to([0, -1.65, 0])
        record_text = mono("LOG  user · item · event · time · context · exposure", 17, MUTED).move_to(record)
        exposure_tag = pill("EXPOSURE REQUIRED", TEAL).move_to(record.get_right() + LEFT * 1.25)

        self.play(FadeIn(impression, shift=RIGHT * 0.15), run_time=0.45)
        self.play(LaggedStart(*[GrowArrow(link) for link in event_links], lag_ratio=0.1), LaggedStart(*[FadeIn(event, shift=RIGHT * 0.12) for event in event_nodes], lag_ratio=0.12), run_time=0.9)
        self.play(LaggedStart(*[GrowArrow(link) for link in evidence_links], lag_ratio=0.08), FadeIn(evidence), run_time=0.75)
        self.play(FadeIn(not_equal, scale=0.6), FadeIn(truth, shift=LEFT * 0.12), run_time=0.55)
        self.play(FadeIn(record, shift=UP * 0.08), Write(record_text), run_time=0.65)
        self.play(Transform(record_text, exposure_tag), Circumscribe(impression, color=TEAL), run_time=0.8)
        self.outro()


class W01_04_ProductionPipeline(FoundationScene):
    scene_number = "04"
    scene_title = "NARROW IN STAGES"
    scene_subtitle = "each stage owns a contract"

    def construct(self):
        self.header()
        specs = [
            ("CATALOGUE", "1,000,000", TEAL),
            ("RETRIEVE", "1,000", VIOLET),
            ("RANK", "100", AMBER),
            ("RE-RANK", "20", CORAL),
            ("SERVE", "10", GREEN),
        ]
        stages = VGroup(*[node(label, color, 2.0, 1.02, count + " items") for label, count, color in specs]).arrange(RIGHT, buff=0.52).move_to([0, 0.35, 0])
        links = VGroup(*[arrow_between(stages[i], stages[i + 1], specs[i + 1][2], 0.08) for i in range(len(stages) - 1)])
        contracts = VGroup(*[
            pill(label, color) for label, color in [("RECALL", VIOLET), ("UTILITY", AMBER), ("CONSTRAINTS", CORAL), ("LATENCY", GREEN)]
        ]).arrange(RIGHT, buff=0.58).move_to([0.65, -1.3, 0])
        particles = VGroup(*[Dot(radius=0.065, color=TEAL) for _ in range(7)])
        particles.arrange(RIGHT, buff=0.08).move_to(stages[0].get_left() + LEFT * 0.55)

        self.play(LaggedStart(*[FadeIn(stage, shift=UP * 0.1) for stage in stages], lag_ratio=0.1), run_time=0.9)
        self.play(LaggedStart(*[GrowArrow(link) for link in links], lag_ratio=0.1), run_time=0.7)
        self.play(FadeIn(particles), run_time=0.2)
        path = VMobject().set_points_smoothly([stages[0].get_center(), stages[1].get_center(), stages[2].get_center(), stages[3].get_center(), stages[4].get_center()])
        self.play(LaggedStart(*[MoveAlongPath(dot, path) for dot in particles], lag_ratio=0.07), LaggedStart(*[FadeIn(tag, shift=UP * 0.08) for tag in contracts], lag_ratio=0.12), run_time=1.35)
        self.play(Circumscribe(stages[-1], color=GREEN), run_time=0.55)
        self.outro()


class W01_05_LabelsFeaturesScores(FoundationScene):
    scene_number = "05"
    scene_title = "LABELS → FEATURES → SCORES"
    scene_subtitle = "an estimate is not a fact"

    def construct(self):
        self.header()
        label_box = node("LABEL", AMBER, 2.0, 0.95, "click / watch / retain").move_to([-5.2, 0.65, 0])
        feature_box = node("FEATURES", TEAL, 2.2, 0.95, "user · item · context").move_to([-2.1, 0.65, 0])
        model = VGroup(
            Circle(radius=0.92, color=VIOLET, stroke_width=3, fill_color=VIOLET, fill_opacity=0.12),
            text("fθ", 30, INK, "BOLD"),
        ).move_to([1.15, 0.65, 0])
        score_box = node("SCORE", GREEN, 2.0, 0.95, "estimated utility").move_to([4.45, 0.65, 0])
        links = VGroup(arrow_between(label_box, feature_box, AMBER), arrow_between(feature_box, model, TEAL), arrow_between(model, score_box, GREEN))
        formula = mono("score(u, i, c)  ≈  P(label = 1 | user, item, context)", 18, INK).move_to([0, -0.78, 0])
        bars = VGroup(*[
            VGroup(
                mono(label, 12, MUTED),
                Rectangle(width=width, height=0.16, fill_color=color, fill_opacity=0.88, stroke_width=0),
                mono(value, 12, color),
            ).arrange(RIGHT, buff=0.16)
            for label, width, value, color in [("A", 2.0, "0.82", GREEN), ("B", 1.45, "0.61", TEAL), ("C", 0.88, "0.34", VIOLET)]
        ]).arrange(DOWN, buff=0.16, aligned_edge=LEFT).move_to([0, -1.65, 0])

        self.play(FadeIn(label_box, shift=RIGHT * 0.12), FadeIn(feature_box, shift=RIGHT * 0.12), run_time=0.55)
        self.play(LaggedStart(*[GrowArrow(link) for link in links], lag_ratio=0.16), GrowFromCenter(model), FadeIn(score_box, shift=LEFT * 0.12), run_time=1.0)
        self.play(Write(formula), run_time=0.75)
        self.play(LaggedStart(*[FadeIn(bar, shift=RIGHT * 0.12) for bar in bars], lag_ratio=0.12), run_time=0.75)
        self.play(Indicate(score_box[0], color=GREEN), Circumscribe(formula, color=VIOLET), run_time=0.65)
        self.outro()


class W01_06_FeedbackLoop(FoundationScene):
    scene_number = "06"
    scene_title = "THE POLICY SHAPES ITS DATA"
    scene_subtitle = "observe the feedback loop"

    def construct(self):
        labels = [("POLICY", VIOLET), ("EXPOSURE", TEAL), ("BEHAVIOR", GREEN), ("LOGS", AMBER)]
        positions = [[0, 1.35, 0], [4.1, 0.1, 0], [0, -1.42, 0], [-4.1, 0.1, 0]]
        nodes = VGroup(*[node(label, color, 1.95, 0.74).move_to(pos) for (label, color), pos in zip(labels, positions)])
        arrows = VGroup(
            CurvedArrow(nodes[0].get_right(), nodes[1].get_top(), angle=-TAU / 8, color=TEAL, stroke_width=3),
            CurvedArrow(nodes[1].get_bottom(), nodes[2].get_right(), angle=-TAU / 8, color=GREEN, stroke_width=3),
            CurvedArrow(nodes[2].get_left(), nodes[3].get_bottom(), angle=-TAU / 8, color=AMBER, stroke_width=3),
            CurvedArrow(nodes[3].get_top(), nodes[0].get_left(), angle=-TAU / 8, color=VIOLET, stroke_width=3),
        )
        center = VGroup(
            Circle(radius=0.95, color=CORAL, stroke_width=2, stroke_opacity=0.65, fill_color=CORAL, fill_opacity=0.06),
            text("BIAS", 22, CORAL, "BOLD"),
            mono("amplifies", 11, MUTED).shift(DOWN * 0.34),
        )
        intervention = pill("EXPLORATION + DEBIASING", GREEN).move_to([0, -2.18, 0])

        self.header()
        self.play(LaggedStart(*[FadeIn(item, scale=0.82) for item in nodes], lag_ratio=0.1), run_time=0.8)
        self.play(LaggedStart(*[Create(item) for item in arrows], lag_ratio=0.12), run_time=1.0)
        self.play(GrowFromCenter(center), run_time=0.55)
        self.play(Indicate(nodes[0], color=VIOLET), Indicate(nodes[1], color=TEAL), Indicate(nodes[2], color=GREEN), Indicate(nodes[3], color=AMBER), run_time=0.75)
        self.play(FadeIn(intervention, shift=UP * 0.12), center.animate.set_opacity(0.35), run_time=0.65)
        self.outro()


class W01_07_ColdStart(FoundationScene):
    scene_number = "07"
    scene_title = "COLD START, HONEST BASELINES"
    scene_subtitle = "begin with what is actually known"

    def construct(self):
        self.header()
        profile_shell = panel(2.75, 2.65, PANEL, GREEN).move_to([0.3, 0.05, 0])
        profile_title = mono("NEW USER PROFILE", 14, GREEN).next_to(profile_shell.get_top(), DOWN, 0.24)
        empty = VGroup(*[Rectangle(width=1.8, height=0.2, fill_color=GRID, fill_opacity=0.65, stroke_width=0) for _ in range(4)]).arrange(DOWN, buff=0.25).move_to(profile_shell).shift(DOWN * 0.2)
        profile = VGroup(profile_shell, profile_title, empty)
        inputs = VGroup(
            node("ONBOARDING", TEAL, 2.1, 0.72),
            node("ITEM METADATA", VIOLET, 2.1, 0.72),
            node("POPULARITY", AMBER, 2.1, 0.72),
            node("EXPLORATION", CORAL, 2.1, 0.72),
        ).arrange(DOWN, buff=0.22).move_to([-4.45, 0.05, 0])
        links = VGroup(*[arrow_between(item, profile, color) for item, color in zip(inputs, [TEAL, VIOLET, AMBER, CORAL])])
        baseline = node("BASELINE", GREEN, 2.15, 0.9, "fast · robust · measurable").move_to([4.55, 0.05, 0])
        final_link = arrow_between(profile, baseline, GREEN)
        filled = VGroup(*[
            Rectangle(width=width, height=0.2, fill_color=color, fill_opacity=0.9, stroke_width=0)
            for width, color in [(1.3, TEAL), (1.65, VIOLET), (1.05, AMBER), (0.72, CORAL)]
        ])
        for source, target in zip(filled, empty):
            source.move_to(target.get_left(), aligned_edge=LEFT)

        self.play(FadeIn(profile, scale=0.88), LaggedStart(*[FadeIn(item, shift=RIGHT * 0.12) for item in inputs], lag_ratio=0.1), run_time=0.9)
        self.play(LaggedStart(*[GrowArrow(link) for link in links], lag_ratio=0.1), run_time=0.8)
        self.play(*[Transform(empty[i], filled[i]) for i in range(4)], run_time=0.85)
        self.play(GrowArrow(final_link), FadeIn(baseline, shift=LEFT * 0.14), run_time=0.65)
        self.play(Circumscribe(baseline, color=GREEN), run_time=0.55)
        self.outro()


class W01_08_OrderMatters(FoundationScene):
    scene_number = "08"
    scene_title = "ORDER CHANGES VALUE"
    scene_subtitle = "top positions receive more attention"

    def construct(self):
        self.header()
        positions = VGroup(*[mono("#" + str(i + 1), 14, MUTED) for i in range(5)]).arrange(DOWN, buff=0.28).move_to([-4.8, 0.05, 0])
        values = [1, 3, 0, 2, 1]
        colors = [TEAL, GREEN, CORAL, AMBER, VIOLET]
        cards = VGroup(*[
            VGroup(
                RoundedRectangle(width=4.8, height=0.45, corner_radius=0.08, fill_color=PANEL_2, fill_opacity=1, stroke_color=color, stroke_opacity=0.45),
                text("ITEM " + chr(65 + i), 15, INK, "BOLD").shift(LEFT * 1.55),
                mono("rel " + str(value), 13, color).shift(RIGHT * 1.55),
            )
            for i, (value, color) in enumerate(zip(values, colors))
        ]).arrange(DOWN, buff=0.17).move_to([-1.65, 0.05, 0])
        attention = VGroup(*[
            Rectangle(width=2.2 * weight, height=0.16, fill_color=GREEN, fill_opacity=0.85, stroke_width=0)
            for weight in [1.0, 0.72, 0.56, 0.45, 0.38]
        ]).arrange(DOWN, buff=0.46, aligned_edge=LEFT).move_to([4.05, 0.05, 0])
        attention_label = mono("POSITION WEIGHT", 14, GREEN).next_to(attention, UP, 0.28)
        note = pill("SAME ITEMS · DIFFERENT OUTCOME", AMBER).move_to([0, -2.22, 0])

        self.play(FadeIn(positions), LaggedStart(*[FadeIn(card, shift=RIGHT * 0.12) for card in cards], lag_ratio=0.09), run_time=0.9)
        self.play(FadeIn(attention_label), LaggedStart(*[GrowFromEdge(bar, LEFT) for bar in attention], lag_ratio=0.08), run_time=0.75)
        self.play(Circumscribe(cards[0], color=GREEN), run_time=0.45)
        targets = [cards[1].get_center(), cards[3].get_center(), cards[0].get_center(), cards[4].get_center(), cards[2].get_center()]
        self.play(*[cards[i].animate.move_to(targets[i]) for i in range(5)], FadeIn(note, shift=UP * 0.1), run_time=1.0)
        self.play(Circumscribe(cards[1], color=GREEN), run_time=0.5)
        self.outro()


class W01_09_NDCG(FoundationScene):
    scene_number = "09"
    scene_title = "NDCG@K"
    scene_subtitle = "graded relevance, discounted by position"

    def construct(self):
        self.header()
        relevance = [3, 1, 2, 0, 1]
        colors = [GREEN, TEAL, AMBER, CORAL, VIOLET]
        bars = VGroup(*[
            VGroup(
                Rectangle(width=0.72, height=0.42 + rel * 0.46, fill_color=color, fill_opacity=0.86, stroke_width=0),
                mono("rel " + str(rel), 12, color),
                mono("#" + str(i + 1), 11, MUTED),
            ).arrange(DOWN, buff=0.11)
            for i, (rel, color) in enumerate(zip(relevance, colors))
        ]).arrange(RIGHT, buff=0.44, aligned_edge=DOWN).move_to([-2.8, -0.05, 0])
        discounts = VGroup(*[mono(value, 12, MUTED) for value in ["1.00", "0.63", "0.50", "0.43", "0.39"]]).arrange(RIGHT, buff=0.65).next_to(bars, DOWN, 0.18)
        discount_label = mono("position discount", 12, MUTED).next_to(discounts, DOWN, 0.14)
        score = VGroup(
            mono("NDCG@5", 16, VIOLET),
            text("0.73", 44, INK, "BOLD"),
        ).arrange(DOWN, buff=0.18).move_to([3.35, 0.45, 0])
        ideal = pill("NORMALIZED BY IDEAL ORDER", GREEN).next_to(score, DOWN, 0.35)
        formula = mono("DCG = Σ gain(relevance) / log₂(position + 1)", 15, MUTED).move_to([0, -2.1, 0])

        self.play(LaggedStart(*[GrowFromEdge(bar, DOWN) for bar in bars], lag_ratio=0.1), run_time=0.95)
        self.play(FadeIn(discounts), FadeIn(discount_label), FadeIn(score, shift=LEFT * 0.12), run_time=0.7)
        self.play(Write(formula), FadeIn(ideal, shift=UP * 0.1), run_time=0.75)
        perfect_score = text("1.00", 44, GREEN, "BOLD").move_to(score[1])
        self.play(Transform(score[1], perfect_score), Circumscribe(bars[0], color=GREEN), run_time=0.9)
        self.outro()


class W01_10_RecallCoverage(FoundationScene):
    scene_number = "10"
    scene_title = "RECALL ≠ COVERAGE"
    scene_subtitle = "survival and breadth are different"

    def construct(self):
        self.header()
        recall_shell = panel(6.1, 3.55, PANEL, TEAL).move_to([-3.55, 0.05, 0])
        recall_title = text("RECALL@K", 21, TEAL, "BOLD").next_to(recall_shell.get_top(), DOWN, 0.26)
        relevant = VGroup(*[Circle(radius=0.28, color=GREEN, fill_color=GREEN, fill_opacity=0.18) for _ in range(5)]).arrange(RIGHT, buff=0.24).move_to([-3.55, 0.42, 0])
        checks = VGroup(*[text("✓" if i < 4 else "×", 20, GREEN if i < 4 else CORAL, "BOLD").move_to(dot) for i, dot in enumerate(relevant)])
        recall_score = VGroup(mono("relevant items preserved", 13, MUTED), text("4 / 5", 31, INK, "BOLD")).arrange(DOWN, buff=0.14).move_to([-3.55, -0.92, 0])
        coverage_shell = panel(6.1, 3.55, PANEL, VIOLET).move_to([3.55, 0.05, 0])
        coverage_title = text("CATALOGUE COVERAGE", 21, VIOLET, "BOLD").next_to(coverage_shell.get_top(), DOWN, 0.26)
        catalogue = VGroup(*[
            RoundedRectangle(width=0.37, height=0.29, corner_radius=0.05, fill_color=VIOLET if i in [0, 1, 3, 6, 8, 12, 15, 18] else GRID, fill_opacity=0.88 if i in [0, 1, 3, 6, 8, 12, 15, 18] else 0.55, stroke_width=0)
            for i in range(20)
        ]).arrange_in_grid(rows=4, cols=5, buff=0.13).move_to([3.55, 0.24, 0])
        coverage_score = VGroup(mono("catalogue reached", 13, MUTED), text("8 / 20", 31, INK, "BOLD")).arrange(DOWN, buff=0.14).move_to([3.55, -1.15, 0])
        footer = VGroup(pill("CAN RANKER SEE GOOD ITEMS?", TEAL), pill("DOES THE SYSTEM HAVE BREADTH?", VIOLET)).arrange(RIGHT, buff=1.0).move_to([0, -2.27, 0])

        self.play(FadeIn(recall_shell), FadeIn(coverage_shell), Write(recall_title), Write(coverage_title), run_time=0.7)
        self.play(LaggedStart(*[GrowFromCenter(dot) for dot in relevant], lag_ratio=0.08), LaggedStart(*[FadeIn(tile, scale=0.7) for tile in catalogue], lag_ratio=0.03), run_time=0.85)
        self.play(LaggedStart(*[FadeIn(mark, scale=0.6) for mark in checks], lag_ratio=0.08), FadeIn(recall_score, shift=UP * 0.1), FadeIn(coverage_score, shift=UP * 0.1), run_time=0.75)
        self.play(LaggedStart(*[FadeIn(item, shift=UP * 0.08) for item in footer], lag_ratio=0.12), run_time=0.6)
        self.play(Circumscribe(recall_score, color=TEAL), Circumscribe(coverage_score, color=VIOLET), run_time=0.7)
        self.outro()
