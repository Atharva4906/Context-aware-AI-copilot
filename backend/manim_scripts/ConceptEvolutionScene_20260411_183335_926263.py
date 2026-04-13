from manim import *


class ConceptEvolutionScene(Scene):
    def construct(self):
        title = Text("Rectangle Constraint Explorer", font_size=34)
        title.to_edge(UP)

        rect = Rectangle(width=6.000, height=3.000, color=GREEN, fill_opacity=0.25)
        length_label = Text("length = 8.00", font_size=26).next_to(rect, DOWN)
        width_label = Text("width = 4.00", font_size=26).next_to(rect, LEFT)
        summary = Text("Perimeter = 24.00 | Area = 32.00", font_size=24).to_edge(DOWN)

        self.play(FadeIn(title, shift=UP * 0.2), run_time=0.7)
        self.play(Create(rect), run_time=1.2)
        self.play(Write(length_label), Write(width_label), run_time=1.0)
        self.play(Write(summary), run_time=0.8)
        self.wait(1.2)
