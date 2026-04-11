from manim import *
import numpy as np


class ConceptEvolutionScene(Scene):
    def construct(self):
        title = Text("Trigonometric behavior explorer", font_size=36)
        title.to_edge(UP)

        axes = Axes(
            x_range=[-6.283, 6.283, (12.566)/8],
            y_range=[-10, 10, 2],
            x_length=9,
            y_length=5.2,
            axis_config={"include_numbers": True, "font_size": 20},
            tips=False,
        )
        labels = axes.get_axis_labels(x_label="x", y_label="f(x)")

        curve = axes.plot(lambda x: sin(x), x_range=[-6.283, 6.283], color=GREEN)
        formula = MathTex(r"f(x) = \sin{\left(x \right)}")
        formula.scale(0.85)
        formula.next_to(axes, DOWN)

        self.play(FadeIn(title, shift=DOWN * 0.2), run_time=0.8)
        self.play(Create(axes), FadeIn(labels), run_time=1.4)
        self.play(Create(curve), run_time=1.8)
        self.play(Write(formula), run_time=1.0)
        self.wait(1.4)
