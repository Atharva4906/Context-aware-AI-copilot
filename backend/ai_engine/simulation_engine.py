import math
import re
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
        "python_stack": {
            "sympy": {"available": sp is not None},
            "numpy": {"available": np is not None},
            "scipy": {"available": optimize is not None and signal is not None},
            "plotly": {"available": go is not None},
            "manim": _manim_meta(samples.get("latex", expression)),
            "pyvista": {"available": pv is not None},
        },
    }

    # Safety guard: keep rendered engine deterministic and template-bound.
    if engine not in {"p5", "three", "plotly"}:
        simulation_payload["engine"] = DEFAULT_ENGINE

    return simulation_payload
