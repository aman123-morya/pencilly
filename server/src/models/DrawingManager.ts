import crypto from 'node:crypto';
import type { Point, Stroke, Tool } from '../types.js';

export class DrawingManager {
  private strokes: Stroke[] = [];
  private activeStroke: Stroke | null = null;
  static readonly MAX_STROKES_PER_TURN = 1000;
  static readonly MAX_POINTS_PER_STROKE = 15000;

  static clampPoint(raw: unknown): Point | null {
    if (!raw || typeof raw !== 'object') return null;
    const p = raw as Record<string, unknown>;
    const x = Number(p.x);
    const y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const pt: Point = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
    if (p.pressure !== undefined && Number.isFinite(Number(p.pressure))) {
      const press = Number(p.pressure);
      if (press >= 0 && press <= 1) {
        pt.pressure = Number(press.toFixed(3));
      }
    }
    return pt;
  }

  static sanitizeColor(raw: unknown): string {
    if (typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw)) {
      return raw.toLowerCase();
    }
    return '#1a2338';
  }

  static sanitizeSize(raw: unknown): number {
    const num = Number(raw);
    return Number.isFinite(num) ? Math.max(2, Math.min(32, Math.round(num))) : 6;
  }

  static sanitizeTool(raw: unknown): Tool {
    return raw === 'eraser' ? 'eraser' : 'pen';
  }

  startStroke(point: Point, color: string, size: number, tool: Tool): Stroke | null {
    if (this.strokes.length >= DrawingManager.MAX_STROKES_PER_TURN) {
      return null;
    }
    const stroke: Stroke = {
      id: crypto.randomUUID(),
      color: DrawingManager.sanitizeColor(color),
      size: DrawingManager.sanitizeSize(size),
      tool: DrawingManager.sanitizeTool(tool),
      points: [point],
    };
    this.activeStroke = stroke;
    this.strokes.push(stroke);
    return stroke;
  }

  addPoint(point: Point): { strokeId: string; point: Point } | null {
    if (!this.activeStroke) return null;
    if (this.activeStroke.points.length >= DrawingManager.MAX_POINTS_PER_STROKE) {
      return null;
    }
    this.activeStroke.points.push(point);
    return { strokeId: this.activeStroke.id, point };
  }

  endStroke(): Stroke | null {
    const stroke = this.activeStroke;
    this.activeStroke = null;
    return stroke;
  }

  undo(): Stroke[] {
    this.strokes.pop();
    this.activeStroke = null;
    return this.getStrokes();
  }

  clear(): void {
    this.strokes = [];
    this.activeStroke = null;
  }

  getStrokes(): Stroke[] {
    return this.strokes.map(s => ({ ...s, points: [...s.points] }));
  }

  getActiveStroke(): Stroke | null {
    return this.activeStroke;
  }

  reset(): void {
    this.clear();
  }
}
