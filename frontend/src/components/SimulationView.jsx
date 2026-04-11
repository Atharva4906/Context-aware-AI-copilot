import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Orbit, FunctionSquare, Sigma } from 'lucide-react';
import P5Simulation from './simulations/P5Simulation';
import ThreeSimulation from './simulations/ThreeSimulation';

function engineLabel(engine) {
  if (engine === 'p5') return 'p5.js';
  if (engine === 'three') return 'Three.js';
  return 'Plotly';
}

export default function SimulationView({ simulation }) {
  if (!simulation || typeof simulation !== 'object') return null;

  const [plotlyFailed, setPlotlyFailed] = useState(false);
  const engine = simulation.engine || 'plotly';
  const stack = simulation.python_stack || {};
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const manim = simulation.manim || {};
  const videoUrl = manim.video_url
    ? (manim.video_url.startsWith('http') ? manim.video_url : `${apiBaseUrl}${manim.video_url}`)
    : null;
  const plotlyFigure = useMemo(() => {
    const figure = simulation.plotly_figure;
    if (!figure || typeof figure !== 'object') return null;
    if (!Array.isArray(figure.data)) return null;
    return figure;
  }, [simulation]);
  const equationText = simulation.equation_display || simulation.equation_latex || simulation.expression;
  const derivativeText = simulation.derivative_display || simulation.derivative_latex || 'Unavailable';
  const PlotComponent = useMemo(() => {
    const candidate = Plot?.default || Plot;
    const isRenderableFunction = typeof candidate === 'function';
    const isRenderableObject = !!candidate && typeof candidate === 'object' && !!candidate.$$typeof;
    if (isRenderableFunction || isRenderableObject) {
      return candidate;
    }
    return null;
  }, []);

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-cyan-300/80">Interactive Simulation</p>
          <h4 className="text-lg font-semibold text-white">{simulation.title || 'Concept Explorer'}</h4>
        </div>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
          {engineLabel(engine)} Renderer
        </span>
      </div>

      <p className="mb-4 text-sm text-neutral-300">{simulation.learning_objective}</p>

      <div className="mb-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#0f172a] p-3">
          <div className="mb-1 flex items-center gap-2 text-cyan-300">
            <FunctionSquare className="h-4 w-4" /> Equation
          </div>
          <p className="font-mono text-neutral-200">{equationText}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0f172a] p-3">
          <div className="mb-1 flex items-center gap-2 text-cyan-300">
            <Sigma className="h-4 w-4" /> Derivative
          </div>
          <p className="font-mono text-neutral-200">{derivativeText}</p>
        </div>
      </div>

      {engine === 'three' && <ThreeSimulation spec={simulation} />}
      {engine === 'p5' && <P5Simulation spec={simulation} />}
      {engine === 'plotly' && plotlyFigure && PlotComponent && !plotlyFailed && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <PlotComponent
            data={plotlyFigure.data || []}
            layout={{ ...(plotlyFigure.layout || {}), autosize: true }}
            config={{ displaylogo: false, responsive: true }}
            onError={() => setPlotlyFailed(true)}
            useResizeHandler
            style={{ width: '100%', height: '340px' }}
          />
        </div>
      )}

      {(plotlyFailed || !PlotComponent) && simulation?.p5?.points?.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-cyan-300">Fallback Visualization</p>
          <P5Simulation spec={simulation} />
        </div>
      )}

      {simulation.markers?.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-neutral-300">
          <div className="mb-2 flex items-center gap-2 text-neutral-200">
            <Orbit className="h-4 w-4" /> Key landmarks
          </div>
          {simulation.markers.map((marker, idx) => (
            <p key={`${marker.label}-${idx}`}>{marker.label}: ({marker.x.toFixed(2)}, {marker.y.toFixed(2)})</p>
          ))}
        </div>
      )}

      {videoUrl && (
        <div className="mt-4 rounded-xl border border-cyan-400/30 bg-[#0a1220] p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-cyan-300">Auto-rendered Manim Video</p>
          <video className="w-full rounded-lg border border-white/10" src={videoUrl} controls preload="metadata" />
        </div>
      )}

      {!videoUrl && simulation?.fallback?.active === 'plotly' && (
        <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-xs text-cyan-200">
          Using Plotly fallback visualization for this answer.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(stack).map(([name, value]) => {
          const available = typeof value === 'object' ? value.available : false;
          return (
            <span
              key={name}
              className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wide ${
                available
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-400/40 bg-amber-500/10 text-amber-300'
              }`}
            >
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
