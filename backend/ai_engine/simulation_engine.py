import math
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

try:
    import numpy as np
except Exception:  # pragma: no cover - environment dependent
    np = None

try:
    import sympy as sp
except Exception:  # pragma: no cover - environment dependent
    sp = None

try:
    from scipy import optimize
    from scipy import signal
except Exception:  # pragma: no cover - environment dependent
    optimize = None
    signal = None

try:
    import plotly.graph_objects as go
except Exception:  # pragma: no cover - environment dependent
    go = None

try:
    from manim import config as manim_config  # type: ignore
except Exception:  # pragma: no cover - environment dependent
    manim_config = None

try:
    import pyvista as pv  # type: ignore
except Exception:  # pragma: no cover - environment dependent
    pv = None


DEFAULT_ENGINE = "plotly"


def _keyword_engine_selector(source: str) -> str:
    text = source.lower()
    three_words = ["3d", "vector", "spatial", "surface", "geometry", "trajectory"]
    p5_words = ["count", "ratio", "step", "sequence", "algebra"]

    if any(word in text for word in three_words):
        return "three"
    if any(word in text for word in p5_words):
        return "p5"
    return DEFAULT_ENGINE


def _pick_expression(source: str) -> Tuple[str, str, Tuple[float, float]]:
    text = source.lower()

    if "trig" in text or "sin" in text or "cos" in text:
        return "sin(x)", "Trigonometric behavior explorer", (-2 * math.pi, 2 * math.pi)
    if "exponent" in text or "growth" in text or "decay" in text:
        return "exp(0.35*x)", "Exponential growth explorer", (-4.0, 4.0)
    if "quadratic" in text or "parabola" in text:
        return "x**2 - 4*x + 1", "Quadratic curve explorer", (-3.0, 7.0)
    if "linear" in text:
        return "2*x - 3", "Linear slope explorer", (-10.0, 10.0)

    return "x**2 - 1", "Concept function explorer", (-6.0, 6.0)


def _build_samples(expression: str, domain: Tuple[float, float]) -> Dict:
    left, right = domain

    if np is None or sp is None:
        fallback_x = [left, (left + right) / 2, right]
        fallback_y = [x_val * x_val - 1 for x_val in fallback_x]
        return {
            "x": [float(v) for v in fallback_x],
            "y": [float(v) for v in fallback_y],
            "latex": expression,
            "derivative_latex": "Unavailable",
            "markers": [],
        }

    x = sp.symbols("x")
    expr = sp.sympify(expression)
    derivative = sp.diff(expr, x)

    x_values = np.linspace(left, right, 140)
    fn = sp.lambdify(x, expr, "numpy")
    y_values = np.asarray(fn(x_values), dtype=float)

    finite_mask = np.isfinite(y_values)
    x_values = x_values[finite_mask]
    y_values = y_values[finite_mask]

    markers: List[Dict] = []

    if signal is not None and len(y_values) > 10:
        peaks_idx, _ = signal.find_peaks(y_values)
        if len(peaks_idx) > 0:
            p = int(peaks_idx[0])
            markers.append({
                "label": "local max",
                "x": float(x_values[p]),
                "y": float(y_values[p]),
            })

    if optimize is not None:
        min_fn = sp.lambdify(x, expr, "math")
        result = optimize.minimize_scalar(min_fn, bounds=(left, right), method="bounded")
        if result.success:
            markers.append({
                "label": "estimated minimum",
                "x": float(result.x),
                "y": float(result.fun),
            })

    return {
        "x": [float(v) for v in x_values.tolist()],
        "y": [float(v) for v in y_values.tolist()],
        "latex": sp.latex(expr),
        "derivative_latex": sp.latex(derivative),
        "markers": markers,
    }


def _build_plotly_figure(samples: Dict, title: str) -> Dict:
    if go is None:
        return {}

    figure = go.Figure()
    figure.add_trace(
        go.Scatter(
            x=samples["x"],
            y=samples["y"],
            mode="lines",
            name="f(x)",
            line={"color": "#22c55e", "width": 3},
        )
    )

    for marker in samples.get("markers", []):
        figure.add_trace(
            go.Scatter(
                x=[marker["x"]],
                y=[marker["y"]],
                mode="markers+text",
                text=[marker["label"]],
                textposition="top center",
                marker={"size": 9, "color": "#f97316"},
                name=marker["label"],
            )
        )

    figure.update_layout(
        title=title,
        template="plotly_dark",
        margin={"l": 30, "r": 20, "t": 48, "b": 30},
        xaxis={"title": "x"},
        yaxis={"title": "f(x)"},
        showlegend=False,
    )
    return figure.to_plotly_json()


def _python_stack_meta(latex_expr: str) -> Dict:
    return {
        "sympy": {"available": sp is not None},
        "numpy": {"available": np is not None},
        "scipy": {"available": optimize is not None and signal is not None},
        "plotly": {"available": go is not None},
        "manim": _manim_meta(latex_expr),
        "pyvista": {"available": pv is not None},
    }


def _extract_perimeter(text: str) -> float:
    lowered = text.lower()
    perimeter_patterns = [
        r"perimeter[^0-9]*(\d+(?:\.\d+)?)",
        r"p\s*=\s*(\d+(?:\.\d+)?)",
    ]
    for pattern in perimeter_patterns:
        match = re.search(pattern, lowered)
        if match:
            return float(match.group(1))
    return 0.0


def _extract_length_width_multiplier(text: str) -> float:
    lowered = text.lower()
    if "twice" in lowered:
        return 2.0
    if "thrice" in lowered:
        return 3.0

    explicit = re.search(r"length\s*(?:is|=)?\s*(\d+(?:\.\d+)?)\s*(?:times|x)\s*(?:the\s+)?width", lowered)
    if explicit:
        return float(explicit.group(1))
    return 0.0


def _build_rectangle_problem_payload(current_context: str, predicted_topic: str) -> Dict:
    text = current_context or ""
    lowered = text.lower()
    if "rectangle" not in lowered:
        return {}
    if "perimeter" not in lowered and "2l" not in lowered:
        return {}

    perimeter = _extract_perimeter(text)
    multiplier = _extract_length_width_multiplier(text)
    if perimeter <= 0 or multiplier <= 0:
        return {}

    # From P = 2l + 2w and l = m*w  =>  P = 2*(m+1)*w.
    width = perimeter / (2 * (multiplier + 1))
    length = multiplier * width
    area = length * width
    if width <= 0 or length <= 0:
        return {}

    if np is not None:
        w_values = np.linspace(max(0.1, width * 0.2), width * 2.0, 120)
        area_values = multiplier * (w_values ** 2)
        w_list = [float(v) for v in w_values.tolist()]
        a_list = [float(v) for v in area_values.tolist()]
    else:
        w_list = [width * 0.2, width * 0.8, width, width * 1.5, width * 2.0]
        a_list = [multiplier * (v ** 2) for v in w_list]

    equation_latex = f"A = {multiplier:g}w^2,\\; P = 2l + 2w = {perimeter:g},\\; l = {multiplier:g}w"
    derivative_latex = f"\\frac{{dA}}{{dw}} = {2 * multiplier:g}w"

    plotly_figure = {}
    if go is not None:
        fig = go.Figure()
        # Geometry view: actual rectangle from solved dimensions.
        fig.add_trace(
            go.Scatter(
                x=[0, length, length, 0, 0],
                y=[0, 0, width, width, 0],
                mode="lines+markers",
                line={"color": "#22c55e", "width": 3},
                fill="toself",
                fillcolor="rgba(34,197,94,0.18)",
                name="Rectangle",
            )
        )
        fig.add_annotation(x=length / 2, y=-0.35, text=f"length = {length:.2f}", showarrow=False, font={"color": "#e2e8f0"})
        fig.add_annotation(x=-0.5, y=width / 2, text=f"width = {width:.2f}", showarrow=False, textangle=-90, font={"color": "#e2e8f0"})

        # Relationship view: area as function of width under constraint l = m*w.
        fig.add_trace(
            go.Scatter(
                x=w_list,
                y=a_list,
                mode="lines",
                name="A(w)",
                line={"color": "#38bdf8", "width": 2, "dash": "dot"},
                xaxis="x2",
                yaxis="y2",
            )
        )
        fig.add_trace(
            go.Scatter(
                x=[width],
                y=[area],
                mode="markers+text",
                text=[f"w={width:.2f}, l={length:.2f}, A={area:.2f}"],
                textposition="top center",
                marker={"size": 10, "color": "#f97316"},
                name="Solved point",
                xaxis="x2",
                yaxis="y2",
            )
        )
        fig.update_layout(
            title="Rectangle Constraint Explorer",
            template="plotly_dark",
            margin={"l": 30, "r": 20, "t": 48, "b": 30},
            xaxis={"domain": [0.0, 0.48], "title": "Length axis"},
            yaxis={"domain": [0.0, 1.0], "title": "Width axis", "scaleanchor": "x", "scaleratio": 1},
            xaxis2={"domain": [0.56, 1.0], "title": "Width (w)", "anchor": "y2"},
            yaxis2={"domain": [0.0, 1.0], "title": "Area A(w)", "anchor": "x2"},
            showlegend=False,
        )
        plotly_figure = fig.to_plotly_json()

    p5_points = [{"x": x_val, "y": y_val} for x_val, y_val in zip(w_list[::2], a_list[::2])]

    return {
        "engine": "plotly",
        "title": "Rectangle Constraint Explorer",
        "learning_objective": (
            "Use perimeter and variable relationships from the given problem statement "
            "to derive width, length, and area."
        ),
        "domain": {"min": float(min(w_list)), "max": float(max(w_list))},
        "expression": f"{multiplier:g}*x**2",
        "equation_latex": equation_latex,
        "derivative_latex": derivative_latex,
        "equation_display": f"A = {multiplier:g}w^2, P = 2l + 2w = {perimeter:g}, l = {multiplier:g}w",
        "derivative_display": f"dA/dw = {2 * multiplier:g}w",
        "p5": {
            "mode": "rectangle",
            "points": p5_points,
            "x_label": "Width (w)",
            "y_label": "Area",
            "length": float(length),
            "width": float(width),
            "perimeter": float(perimeter),
            "area": float(area),
        },
        "three": _build_three_surface(),
        "plotly_figure": plotly_figure,
        "markers": [
            {"label": "solved width", "x": float(width), "y": float(area)},
            {"label": "computed length", "x": float(width), "y": float(length)},
        ],
        "python_stack": _python_stack_meta(equation_latex),
        "problem_context_hint": (predicted_topic or "").strip(),
    }


def _build_three_surface() -> Dict:
    if np is None:
        return {"points": []}

    grid = np.linspace(-2.5, 2.5, 18)
    gx, gy = np.meshgrid(grid, grid)
    gz = 0.25 * (gx ** 2 + gy ** 2)

    points = []
    for i in range(gx.shape[0]):
        for j in range(gx.shape[1]):
            points.append([float(gx[i, j]), float(gy[i, j]), float(gz[i, j])])

    stats = {"point_count": len(points)}
    if pv is not None:
        mesh = pv.PolyData(np.array(points))
        stats["point_count"] = int(mesh.n_points)

    return {"points": points, "stats": stats}


def _manim_meta(latex_expr: str) -> Dict:
    return {
        "available": manim_config is not None,
        "scene_name": "ConceptEvolutionScene",
        "equation_latex": latex_expr,
        "render_hint": "Pre-render this scene for richer narrated explainers.",
    }


def build_simulation_payload(current_context: str, predicted_topic: str, misconception_verdict: str) -> Dict:
    statement_payload = _build_rectangle_problem_payload(current_context=current_context, predicted_topic=predicted_topic)
    if statement_payload:
        return statement_payload

    source = "\n".join([current_context or "", predicted_topic or "", misconception_verdict or ""])
    engine = _keyword_engine_selector(source)

    expression, title, domain = _pick_expression(source)
    samples = _build_samples(expression, domain)

    simulation_payload = {
        "engine": engine,
        "title": title,
        "learning_objective": f"Reinforce the topic '{predicted_topic or 'core concept'}' through visual experimentation.",
        "domain": {"min": float(domain[0]), "max": float(domain[1])},
        "expression": expression,
        "equation_latex": samples.get("latex", expression),
        "derivative_latex": samples.get("derivative_latex", "Unavailable"),
        "p5": {
            "points": [
                {"x": p_x, "y": p_y}
                for p_x, p_y in zip(samples.get("x", [])[::2], samples.get("y", [])[::2])
            ],
            "x_label": "Input",
            "y_label": "Output",
        },
        "three": _build_three_surface(),
        "plotly_figure": _build_plotly_figure(samples, title),
        "markers": samples.get("markers", []),
        "python_stack": _python_stack_meta(samples.get("latex", expression)),
    }

    # Safety guard: keep rendered engine deterministic and template-bound.
    if engine not in {"p5", "three", "plotly"}:
        simulation_payload["engine"] = DEFAULT_ENGINE

    return simulation_payload


def _sanitize_scene_name(scene_name: str) -> str:
    candidate = (scene_name or "ConceptEvolutionScene").strip()
    candidate = re.sub(r"[^A-Za-z0-9_]", "", candidate)
    if not candidate:
        return "ConceptEvolutionScene"
    if candidate[0].isdigit():
        candidate = f"Scene{candidate}"
    return candidate


def _safe_expression(expr: str) -> str:
    expression = (expr or "x**2 - 1").strip()
    allowed = re.compile(r"^[A-Za-z0-9_\s\+\-\*\/\(\)\.,]+$")
    if not allowed.match(expression):
        return "x**2 - 1"
    return expression


def build_manim_script(simulation: Dict, scene_name: str = "ConceptEvolutionScene") -> Dict:
    safe_scene = _sanitize_scene_name(scene_name)
    expression = _safe_expression(simulation.get("expression", "x**2 - 1"))
    domain = simulation.get("domain", {})
    x_min = float(domain.get("min", -6.0))
    x_max = float(domain.get("max", 6.0))
    title = (simulation.get("title") or "Concept Explorer").replace("\"", "")

    script = f'''from manim import *
import numpy as np


class {safe_scene}(Scene):
    def construct(self):
        title = Text("{title}", font_size=36)
        title.to_edge(UP)

        axes = Axes(
            x_range=[{x_min:.3f}, {x_max:.3f}, ({x_max - x_min:.3f})/8],
            y_range=[-10, 10, 2],
            x_length=9,
            y_length=5.2,
            axis_config={{"include_numbers": True, "font_size": 20}},
            tips=False,
        )
        labels = axes.get_axis_labels(x_label="x", y_label="f(x)")

        curve = axes.plot(lambda x: {expression}, x_range=[{x_min:.3f}, {x_max:.3f}], color=GREEN)
        formula = MathTex(r"f(x) = {simulation.get("equation_latex", expression)}")
        formula.scale(0.85)
        formula.next_to(axes, DOWN)

        self.play(FadeIn(title, shift=DOWN * 0.2), run_time=0.8)
        self.play(Create(axes), FadeIn(labels), run_time=1.4)
        self.play(Create(curve), run_time=1.8)
        self.play(Write(formula), run_time=1.0)
        self.wait(1.4)
'''

    return {
        "scene_name": safe_scene,
        "script": script,
    }


def _tail(text: str, max_len: int = 700) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) <= max_len:
        return text
    return text[-max_len:]


def render_manim_video(
    simulation: Dict,
    scene_name: str = "ConceptEvolutionScene",
    env_name: str = "manim_env",
    timeout_seconds: int = 150,
) -> Dict:
    manim_bundle = build_manim_script(simulation=simulation, scene_name=scene_name)
    safe_scene = manim_bundle["scene_name"]
    script = manim_bundle["script"]

    scripts_dir = Path(__file__).resolve().parents[1] / "manim_scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    script_name = f"{safe_scene}_{timestamp}.py"
    script_path = scripts_dir / script_name
    script_path.write_text(script, encoding="utf-8")

    explicit_manim_python = os.environ.get("MANIM_PYTHON_EXE", "").strip()
    if explicit_manim_python:
        cmd = [
            explicit_manim_python,
            "-m",
            "manim",
            script_name,
            safe_scene,
            "-ql",
            "--format=mp4",
        ]
    else:
        conda_exe = os.environ.get("CONDA_EXE", "conda")
        cmd = [
            conda_exe,
            "run",
            "-n",
            env_name,
            "python",
            "-m",
            "manim",
            script_name,
            safe_scene,
            "-ql",
            "--format=mp4",
        ]

    try:
        run_result = subprocess.run(
            cmd,
            cwd=str(scripts_dir),
            capture_output=True,
            text=True,
            timeout=max(30, int(timeout_seconds)),
            check=False,
        )
    except Exception as e:
        return {
            "status": "failed",
            "script_name": script_name,
            "scene_name": safe_scene,
            "error": str(e),
            "command": " ".join(cmd),
        }

    output_tail = _tail(f"{run_result.stdout}\n{run_result.stderr}")
    if run_result.returncode != 0:
        return {
            "status": "failed",
            "script_name": script_name,
            "scene_name": safe_scene,
            "return_code": run_result.returncode,
            "command": " ".join(cmd),
            "error": output_tail or "Manim render failed.",
        }

    video_root = scripts_dir / "media" / "videos" / script_path.stem
    candidates = sorted(
        video_root.glob(f"**/{safe_scene}.mp4"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        return {
            "status": "failed",
            "script_name": script_name,
            "scene_name": safe_scene,
            "command": " ".join(cmd),
            "error": "Render completed but output video was not found.",
        }

    video_path = candidates[0]
    relative_video_path = str(video_path.relative_to(scripts_dir)).replace("\\", "/")

    return {
        "status": "rendered",
        "script_name": script_name,
        "scene_name": safe_scene,
        "command": " ".join(cmd),
        "video_relative_path": relative_video_path,
        "render_log_tail": output_tail,
    }
