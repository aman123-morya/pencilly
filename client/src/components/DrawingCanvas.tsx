import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Check, CircleHelp, Eraser, Maximize2, PenLine, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { socket } from '../lib/socket';
import type { Point, RoomState, Stroke, Tool } from '../types';

const PALETTE = [
  '#1a2338', '#ffffff', '#f54e58', '#ff9b42', '#ffc940',
  '#65bc64', '#24afbd', '#2f74df', '#8559c5', '#ea7db8',
  '#8a5138', '#b0b7c2',
];
type DrawData = {
  action: 'start' | 'move' | 'end'; stroke?: Stroke;
  strokeId?: string; point?: Point;
};

export function DrawingCanvas({ room, canDraw }: { room: RoomState; canDraw: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const pointerRef = useRef<{ previous: Point; id: number } | null>(null);
  const [color, setColor] = useState('#1a2338');
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState<Tool>('pen');
  const [clearConfirm, setClearConfirm] = useState(false);

  const paintStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, startAt = 0) => {
    const { width, height } = ctx.canvas.getBoundingClientRect();
    if (!stroke.points.length) return;
    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const baseWidth = Math.max(1, stroke.size * (Math.min(width / 720, height / 480) * 1.12));
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = baseWidth;

    if (stroke.points.length === 1) {
      const pt = stroke.points[0];
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, baseWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const start = Math.max(0, startAt - 1);
      for (let i = start; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    }
    ctx.restore();
  }, []);
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const stroke of strokesRef.current) paintStroke(ctx, stroke);
  }, [paintStroke]);

  useEffect(() => {
    strokesRef.current = room.strokes.map(stroke => ({ ...stroke, points: [...stroke.points] }));
    redraw();
  }, [room.id, room.turn, room.phase, redraw]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver(redraw);
    observer.observe(canvasRef.current);
    redraw();
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    const onDrawData = ({ action, stroke, strokeId, point }: DrawData) => {
      if (action === 'start' && stroke) {
        if (canDraw) return; // The local artist paints optimistically for responsiveness.
        strokesRef.current.push({ ...stroke, points: [...stroke.points] });
        redraw();
      }
      if (action === 'move' && strokeId && point && !canDraw) {
        const current = strokesRef.current.find(item => item.id === strokeId);
        if (!current) return;
        current.points.push(point);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) paintStroke(ctx, current, current.points.length - 1);
      }
      if (action === 'end' && stroke) {
        const index = strokesRef.current.findIndex(item => item.id === stroke.id);
        const finalStroke = { ...stroke, points: [...stroke.points] };
        if (index === -1) strokesRef.current.push(finalStroke);
        else strokesRef.current[index] = finalStroke;
        redraw();
      }
    };
    const onSnapshot = ({ strokes }: { strokes: Stroke[] }) => {
      strokesRef.current = strokes.map(stroke => ({ ...stroke, points: [...stroke.points] }));
      redraw();
    };
    socket.on('draw_data', onDrawData);
    socket.on('canvas_snapshot', onSnapshot);
    return () => { socket.off('draw_data', onDrawData); socket.off('canvas_snapshot', onSnapshot); };
  }, [canDraw, redraw, paintStroke]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    let pressure = 0.5;
    if (event.pointerType === 'pen' && typeof event.pressure === 'number' && event.pressure > 0) {
      pressure = Math.max(0.1, Math.min(1, Number(event.pressure.toFixed(3))));
    } else if (event.pointerType === 'touch' && typeof event.pressure === 'number' && event.pressure > 0 && event.pressure !== 0.5) {
      pressure = Math.max(0.1, Math.min(1, Number(event.pressure.toFixed(3))));
    }
    return { x, y, pressure };
  };
  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || event.button !== 0 || pointerRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    pointerRef.current = { previous: point, id: event.pointerId };
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintStroke(ctx, { id: 'local', color, size, tool, points: [point] });
    socket.emit('draw_start', { ...point, color, size, tool });
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = pointerRef.current;
    if (!current || current.id !== event.pointerId || !canDraw) return;
    const point = pointFromEvent(event);
    if (Math.abs(current.previous.x - point.x) + Math.abs(current.previous.y - point.y) < 0.001) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintStroke(ctx, { id: 'local', color, size, tool, points: [current.previous, point] });
    pointerRef.current = { ...current, previous: point };
    socket.emit('draw_move', point);
  };
  const end = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current || pointerRef.current.id !== event.pointerId) return;
    pointerRef.current = null;
    socket.emit('draw_end');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  useEffect(() => {
    if (!canDraw) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z'
        && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault(); socket.emit('draw_undo');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canDraw]);
  const fullscreen = async () => {
    if (canvasRef.current?.parentElement && document.fullscreenEnabled) {
      await canvasRef.current.parentElement.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <div className="drawing-area">
      <div className="drawing-surface">
        <canvas ref={canvasRef} aria-label="Real-time drawing board" className={`drawing-canvas ${canDraw ? 'can-draw' : ''}`}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
        <div className="canvas-corner-label"><span className="label-dot" /> {canDraw ? 'YOUR CANVAS' : 'LIVE CANVAS'}</div>
        <button className="canvas-fullscreen" type="button" title="Expand canvas" onClick={() => void fullscreen()}><Maximize2 size={17}/></button>
        {!room.strokes.length && room.phase === 'choosing' && <div className="waiting-on-canvas"><div className="waiting-pencil">&#9998;</div><strong>Waiting for artist</strong><span>The round will start once a word is chosen.</span></div>}
      </div>
      <div className={`toolbox ${!canDraw ? 'toolbox-disabled' : ''}`} aria-label="Drawing tools">
        <div className="tools-group">
          <button type="button" disabled={!canDraw} title="Pen" className={`tool-button ${tool === 'pen' ? 'tool-active' : ''}`} onClick={() => setTool('pen')}><PenLine size={19}/><span>Pen</span></button>
          <button type="button" disabled={!canDraw} title="Eraser" className={`tool-button ${tool === 'eraser' ? 'tool-active' : ''}`} onClick={() => setTool('eraser')}><Eraser size={19}/><span>Eraser</span></button>
        </div>
        <div className="colors-group" role="group" aria-label="Brush colours">{PALETTE.map(hex => (
          <button type="button" title={hex} aria-label={`Brush colour ${hex}`} key={hex} disabled={!canDraw}
            className={`color-swatch ${tool === 'pen' && color === hex ? 'swatch-selected' : ''}`}
            style={{ background: hex }} onClick={() => { setColor(hex); setTool('pen'); }}/>
        ))}</div>
        <div className="size-tool" title="Brush size"><span className="brush-dot" style={{ width: size + 3, height: size + 3 }}/>
          <input aria-label="Brush size" type="range" disabled={!canDraw} min={2} max={28} value={size} onChange={e => setSize(Number(e.target.value))} /></div>
        <div className="tool-actions"><button type="button" disabled={!canDraw} title="Undo (Ctrl+Z)" onClick={() => socket.emit('draw_undo')}><Undo2 size={19}/></button>
          <button type="button" disabled={!canDraw} title="Clear canvas" onClick={() => setClearConfirm(true)}><Trash2 size={18}/></button></div>
      </div>
      {clearConfirm && <div className="clear-popover" role="alertdialog" aria-label="Clear drawing?"><CircleHelp size={19}/><span>Clear canvas?</span>
        <button type="button" onClick={() => setClearConfirm(false)}>Cancel</button>
        <button type="button" onClick={() => { socket.emit('canvas_clear'); setClearConfirm(false); }}><Check size={15}/> Clear</button></div>}
      <div className="drawing-mini-footer"><RotateCcw size={13}/> Normalized touch, stylus, and mouse input. Press Ctrl+Z to undo.</div>
    </div>
  );
}
