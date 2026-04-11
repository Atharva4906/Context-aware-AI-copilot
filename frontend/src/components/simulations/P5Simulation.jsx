import React, { useEffect, useRef } from 'react';
import p5 from 'p5';

export default function P5Simulation({ spec }) {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const mode = spec?.p5?.mode || 'curve';

    if (mode === 'rectangle') {
      let rectInstance;
      const rectangleSketch = (s) => {
        const width = 760;
        const height = 320;
        const pad = 40;
        const rectLength = Number(spec?.p5?.length || 1);
        const rectWidth = Number(spec?.p5?.width || 1);
        const scale = Math.min((width - pad * 2) / Math.max(rectLength, 1), (height - pad * 2) / Math.max(rectWidth, 1));
        const drawW = rectLength * scale;
        const drawH = rectWidth * scale;
        const left = (width - drawW) / 2;
        const top = (height - drawH) / 2;

        s.setup = () => {
          s.createCanvas(width, height);
          s.noLoop();
        };

        s.draw = () => {
          s.background('#0b1220');

          s.stroke('#22c55e');
          s.strokeWeight(3);
          s.fill(34, 197, 94, 40);
          s.rect(left, top, drawW, drawH, 8);

          s.noStroke();
          s.fill('#e2e8f0');
          s.textSize(13);
          s.textAlign(s.CENTER, s.BOTTOM);
          s.text(`length = ${rectLength.toFixed(2)}`, left + drawW / 2, top - 8);

          s.push();
          s.translate(left - 10, top + drawH / 2);
          s.rotate(-Math.PI / 2);
          s.textAlign(s.CENTER, s.TOP);
          s.text(`width = ${rectWidth.toFixed(2)}`, 0, 0);
          s.pop();

          s.textAlign(s.LEFT, s.TOP);
          s.text(`Perimeter: ${(spec?.p5?.perimeter ?? 0).toFixed(2)}`, 16, 14);
          s.text(`Area: ${(spec?.p5?.area ?? 0).toFixed(2)}`, 16, 32);
        };
      };

      rectInstance = new p5(rectangleSketch, hostRef.current);
      return () => {
        rectInstance?.remove();
      };
    }

    const points = spec?.p5?.points || [];
    if (!points.length) return;

    let instance;
    const sketch = (s) => {
      const width = 760;
      const height = 320;
      const padding = 36;

      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      const yMin = Math.min(...ys);
      const yMax = Math.max(...ys);

      const mapX = (v) => s.map(v, xMin, xMax, padding, width - padding);
      const mapY = (v) => s.map(v, yMin, yMax, height - padding, padding);

      s.setup = () => {
        s.createCanvas(width, height);
        s.noLoop();
      };

      s.draw = () => {
        s.background('#0b1220');

        s.stroke('#1f2937');
        s.strokeWeight(1);
        s.line(padding, height - padding, width - padding, height - padding);
        s.line(padding, padding, padding, height - padding);

        s.noFill();
        s.stroke('#22c55e');
        s.strokeWeight(2.4);
        s.beginShape();
        points.forEach((point) => {
          s.vertex(mapX(point.x), mapY(point.y));
        });
        s.endShape();

        s.noStroke();
        s.fill('#cbd5e1');
        s.textSize(11);
        s.text(spec?.p5?.x_label || 'x', width - padding - 14, height - padding + 18);
        s.text(spec?.p5?.y_label || 'y', padding - 10, padding - 8);
      };
    };

    instance = new p5(sketch, hostRef.current);
    return () => {
      instance?.remove();
    };
  }, [spec]);

  return <div ref={hostRef} className="w-full overflow-hidden rounded-xl border border-white/10" />;
}
