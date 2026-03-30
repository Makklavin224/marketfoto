import { useEffect, useRef, useCallback } from 'react';
import {
  Canvas,
  Rect,
  IText,
  FabricImage,
  Line,
  Group,
  FabricText,
  Shadow,
  Gradient,
  FabricObject,
} from 'fabric';
import type { TemplateConfig, DecorationBadge } from '../../types/editor';
import { useEditorStore } from '../../stores/editor';

// fabric.js v7 does not expose a `data` property in its TypeScript types.
// We attach custom metadata by assigning to the object at runtime and use
// a typed helper to read it back.
interface ObjectMeta {
  type: 'product' | 'text' | 'badge';
  areaId?: string;
}

function setMeta(obj: FabricObject, meta: ObjectMeta) {
  (obj as FabricObject & { _meta: ObjectMeta })._meta = meta;
}

function getMeta(obj: FabricObject): ObjectMeta | undefined {
  return (obj as FabricObject & { _meta?: ObjectMeta })._meta;
}

interface FabricCanvasProps {
  templateConfig: TemplateConfig;
  productImageUrl: string | null;
}

export default function FabricCanvas({ templateConfig, productImageUrl }: FabricCanvasProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const productImgRef = useRef<FabricImage | null>(null);
  // Guard against running buildCanvas while it is already running
  const buildingRef = useRef(false);
  // Track dimensions to skip redundant rebuilds
  const prevDimsRef = useRef<{ w: number; h: number } | null>(null);

  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const zoom = useEditorStore((s) => s.zoom);
  const textOverrides = useEditorStore((s) => s.textOverrides);
  const badgeEnabled = useEditorStore((s) => s.badgeEnabled);
  const badgeText = useEditorStore((s) => s.badgeText);
  const selectedTextAreaId = useEditorStore((s) => s.selectedTextAreaId);

  const setSelectedObject = useEditorStore((s) => s.setSelectedObject);
  const updateTextOverride = useEditorStore((s) => s.updateTextOverride);

  // ---- Build / rebuild canvas contents ----
  const buildCanvas = useCallback(async (
    canvas: Canvas,
    config: TemplateConfig,
    imgUrl: string | null,
    width: number,
    height: number,
  ) => {
    if (buildingRef.current) return;
    buildingRef.current = true;

    try {
      canvas.clear();
      canvas.setDimensions({ width, height });

      // 1. Background
      const bg = config.background;
      const bgRect = new Rect({
        left: 0,
        top: 0,
        width,
        height,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
      });

      if (bg.type === 'gradient' && bg.from && bg.to) {
        bgRect.set('fill', new Gradient({
          type: 'linear',
          gradientUnits: 'pixels',
          coords: { x1: 0, y1: 0, x2: 0, y2: height },
          colorStops: [
            { offset: 0, color: bg.from },
            { offset: 1, color: bg.to },
          ],
        }));
      } else {
        bgRect.set('fill', bg.color || '#FFFFFF');
      }

      canvas.add(bgRect);

      // 2. Decorations: lines (render before product so they appear behind)
      if (config.decorations) {
        for (const dec of config.decorations) {
          if (dec.type === 'line') {
            const line = new Line([dec.x1, dec.y1, dec.x2, dec.y2], {
              stroke: dec.color,
              strokeWidth: dec.width,
              selectable: false,
              evented: false,
            });
            canvas.add(line);
          }
        }
      }

      // 3. Product image
      const shadowDec = config.decorations?.find((d) => d.type === 'shadow');

      if (imgUrl) {
        try {
          const img = await FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' });
          const pa = config.product_area;
          img.set({
            left: pa.x,
            top: pa.y,
            scaleX: pa.width / (img.width || 1),
            scaleY: pa.height / (img.height || 1),
            hasControls: true,
            hasBorders: true,
          });
          setMeta(img, { type: 'product' });

          if (shadowDec && shadowDec.type === 'shadow') {
            img.set('shadow', new Shadow({
              offsetX: shadowDec.offsetX,
              offsetY: shadowDec.offsetY,
              blur: shadowDec.blur,
              color: shadowDec.color,
            }));
          }

          canvas.add(img);
          productImgRef.current = img;
        } catch (err) {
          console.warn('Failed to load product image:', err);
        }
      }

      // 4. Text areas
      const overrides = useEditorStore.getState().textOverrides;
      for (const ta of config.text_areas) {
        const override = overrides[ta.id];
        const itext = new IText(override?.content || ta.label, {
          left: ta.x,
          top: ta.y,
          width: ta.width,
          fontSize: override?.fontSize || ta.fontSize,
          fill: override?.color || ta.color,
          fontFamily: override?.fontFamily || 'Inter',
          fontWeight: (override?.fontWeight || ta.fontWeight || 'normal') as string,
          textAlign: ta.align,
          editable: true,
        });
        setMeta(itext, { type: 'text', areaId: ta.id });
        canvas.add(itext);
      }

      // 5. Decorations: badges
      if (config.decorations) {
        const currentBadgeEnabled = useEditorStore.getState().badgeEnabled;
        const currentBadgeText = useEditorStore.getState().badgeText;

        for (const dec of config.decorations) {
          if (dec.type === 'badge') {
            const badge = dec as DecorationBadge;
            const badgeRect = new Rect({
              width: badge.width,
              height: badge.height,
              fill: badge.bg,
              rx: badge.borderRadius,
              ry: badge.borderRadius,
              originX: 'center',
              originY: 'center',
            });
            const badgeLabel = new FabricText(currentBadgeText || badge.text, {
              fontSize: badge.fontSize,
              fill: badge.color,
              fontFamily: 'Inter',
              fontWeight: 'bold',
              originX: 'center',
              originY: 'center',
            });
            const group = new Group([badgeRect, badgeLabel], {
              left: badge.x,
              top: badge.y,
              selectable: false,
              evented: false,
              visible: currentBadgeEnabled,
            });
            setMeta(group, { type: 'badge' });
            canvas.add(group);
          }
        }
      }

      canvas.renderAll();
    } finally {
      buildingRef.current = false;
    }
  }, []);

  // ---- Initialize canvas ----
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    const canvas = new Canvas(el, {
      width: canvasWidth,
      height: canvasHeight,
      selection: false, // disable group selection
    });
    canvasRef.current = canvas;

    // Event: selection
    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (!active) {
        setSelectedObject(null);
        return;
      }
      const meta = getMeta(active);
      if (!meta) {
        setSelectedObject(null);
        return;
      }
      if (meta.type === 'product') {
        setSelectedObject('product');
      } else if (meta.type === 'text') {
        setSelectedObject('text', meta.areaId);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));

    // Event: text changed (inline editing on canvas)
    canvas.on('text:changed', (e) => {
      const target = e.target;
      if (target instanceof IText) {
        const meta = getMeta(target);
        if (meta?.areaId) {
          updateTextOverride(meta.areaId, { content: target.text || '' });
        }
      }
    });

    // Event: object modified (product image moved/resized)
    canvas.on('object:modified', (e) => {
      const target = e.target;
      if (target instanceof FabricImage) {
        const meta = getMeta(target);
        if (meta?.type === 'product') {
          productImgRef.current = target;
        }
      }
    });

    // Build initial canvas
    if (templateConfig) {
      buildCanvas(canvas, templateConfig, productImageUrl, canvasWidth, canvasHeight);
      prevDimsRef.current = { w: canvasWidth, h: canvasHeight };
    }

    return () => {
      canvas.dispose();
      canvasRef.current = null;
      productImgRef.current = null;
    };
    // Only run on mount/unmount - template changes handled by separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Rebuild on template config or marketplace dimension changes ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateConfig) return;

    // Skip if dimensions haven't actually changed and this is not the first render
    if (prevDimsRef.current &&
        prevDimsRef.current.w === canvasWidth &&
        prevDimsRef.current.h === canvasHeight) {
      return;
    }

    prevDimsRef.current = { w: canvasWidth, h: canvasHeight };
    buildCanvas(canvas, templateConfig, productImageUrl, canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight, templateConfig, productImageUrl, buildCanvas]);

  // ---- Sync text overrides from store -> canvas ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => {
      const meta = getMeta(obj);
      if (meta?.type === 'text' && meta.areaId) {
        const override = textOverrides[meta.areaId];
        if (override && obj instanceof IText) {
          obj.set({
            text: override.content,
            fontSize: override.fontSize,
            fill: override.color,
            fontFamily: override.fontFamily,
            fontWeight: override.fontWeight === 'bold' ? 'bold' : 'normal',
          });
        }
      }
    });
    canvas.renderAll();
  }, [textOverrides]);

  // ---- Sync badge visibility ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => {
      const meta = getMeta(obj);
      if (meta?.type === 'badge') {
        obj.set('visible', badgeEnabled);
      }
    });
    canvas.renderAll();
  }, [badgeEnabled]);

  // ---- Sync badge text ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => {
      const meta = getMeta(obj);
      if (meta?.type === 'badge' && obj instanceof Group) {
        const textObj = obj.getObjects().find((o) => o instanceof FabricText);
        if (textObj && textObj instanceof FabricText) {
          textObj.set('text', badgeText);
        }
      }
    });
    canvas.renderAll();
  }, [badgeText]);

  // ---- Highlight selected text area ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedTextAreaId) return;

    const textObj = canvas.getObjects().find((obj) => {
      const meta = getMeta(obj);
      return meta?.type === 'text' && meta.areaId === selectedTextAreaId;
    });
    if (textObj) {
      canvas.setActiveObject(textObj);
      canvas.renderAll();
    }
  }, [selectedTextAreaId]);

  // ---- Calculate display scale to fit container ----
  const displayScale = zoom;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center overflow-auto bg-gray-100 p-4">
      <div
        style={{
          width: canvasWidth * displayScale,
          height: canvasHeight * displayScale,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            transform: `scale(${displayScale})`,
            transformOrigin: 'top left',
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          <canvas ref={canvasElRef} />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => useEditorStore.getState().zoomOut()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-lg font-bold"
          title="Zoom out"
        >
          -
        </button>
        <span className="text-sm text-gray-600 min-w-[4rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => useEditorStore.getState().zoomIn()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-lg font-bold"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
