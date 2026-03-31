import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Canvas,
  Rect,
  Circle,
  IText,
  FabricImage,
  Line,
  Group,
  FabricText,
  Shadow,
  Gradient,
  FabricObject,
} from 'fabric';
import type {
  TemplateConfig,
  DecorationBadge,
  DecorationRect,
  DecorationCircleIcon,
  DecorationText,
} from '../../types/editor';
import { useEditorStore } from '../../stores/editor';
import { MARKETPLACE_SIZES, type MarketplaceId } from '../../types/editor';

// fabric.js v7 does not expose a `data` property in its TypeScript types.
// We attach custom metadata by assigning to the object at runtime and use
// a typed helper to read it back.
interface ObjectMeta {
  type: 'product' | 'text' | 'badge' | 'watermark';
  areaId?: string;
}

function setMeta(obj: FabricObject, meta: ObjectMeta) {
  (obj as FabricObject & { _meta: ObjectMeta })._meta = meta;
}

function getMeta(obj: FabricObject): ObjectMeta | undefined {
  return (obj as FabricObject & { _meta?: ObjectMeta })._meta;
}

export interface FabricCanvasHandle {
  /** Export the canvas as a data URL (PNG or JPEG). Adds watermark for free plan if needed. */
  exportImage: (options?: { format?: 'png' | 'jpeg'; quality?: number; addWatermark?: boolean }) => string | null;
  /** Get the raw fabric.Canvas instance */
  getCanvas: () => Canvas | null;
}

interface FabricCanvasProps {
  templateConfig: TemplateConfig;
  productImageUrl: string | null;
}

const FabricCanvas = forwardRef<FabricCanvasHandle, FabricCanvasProps>(function FabricCanvas({ templateConfig, productImageUrl }, ref) {
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

  // ---- Expose canvas handle to parent via ref ----
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    exportImage: (options) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const format = options?.format ?? 'png';
      const quality = options?.quality ?? 1;
      const addWatermark = options?.addWatermark ?? false;

      // Deselect all objects so selection borders don't appear in export
      canvas.discardActiveObject();
      canvas.renderAll();

      // Get current marketplace dimensions for export at full size
      const editorState = useEditorStore.getState();
      const mp = editorState.marketplace as MarketplaceId;
      const dims = MARKETPLACE_SIZES[mp];

      // The canvas is already at full marketplace dimensions internally,
      // the zoom is only CSS transform. So we export at multiplier 1.
      let watermarkObj: FabricText | null = null;

      if (addWatermark) {
        // Add watermark to bottom-right before export
        const wmFontSize = Math.round(dims.width * 0.03);
        watermarkObj = new FabricText('MarketFoto.ru', {
          fontSize: wmFontSize,
          fill: 'rgba(255, 255, 255, 0.5)',
          fontFamily: 'Inter',
          fontWeight: 'bold',
          left: dims.width - 20,
          top: dims.height - 20,
          originX: 'right',
          originY: 'bottom',
          selectable: false,
          evented: false,
          shadow: new Shadow({
            color: 'rgba(0, 0, 0, 0.5)',
            blur: 4,
            offsetX: 1,
            offsetY: 1,
          }),
        });
        setMeta(watermarkObj, { type: 'watermark' });
        canvas.add(watermarkObj);
        canvas.renderAll();
      }

      const dataUrl = canvas.toDataURL({
        format,
        quality,
        multiplier: 1,
      });

      // Remove watermark after export so editor stays clean
      if (watermarkObj) {
        canvas.remove(watermarkObj);
        canvas.renderAll();
      }

      return dataUrl;
    },
  }), []);

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

      // 2. Background decorations: rects, lines, static text (render BEFORE product)
      //    These form the styled backdrop — pill shapes, accent bars, frames, etc.
      if (config.decorations) {
        for (const dec of config.decorations) {
          if (dec.type === 'rect') {
            const d = dec as DecorationRect;
            const rect = new Rect({
              left: d.x,
              top: d.y,
              width: d.width,
              height: d.height,
              fill: d.fill,
              rx: d.rx ?? 0,
              ry: d.ry ?? 0,
              stroke: d.stroke ?? undefined,
              strokeWidth: d.strokeWidth ?? 0,
              opacity: d.opacity ?? 1,
              selectable: false,
              evented: false,
            });
            canvas.add(rect);
          } else if (dec.type === 'line') {
            const line = new Line([dec.x1, dec.y1, dec.x2, dec.y2], {
              stroke: dec.color,
              strokeWidth: dec.width,
              selectable: false,
              evented: false,
            });
            canvas.add(line);
          } else if (dec.type === 'text') {
            const d = dec as DecorationText;
            const txt = new FabricText(d.text, {
              left: d.x,
              top: d.y,
              fontSize: d.fontSize,
              fill: d.color,
              fontFamily: d.fontFamily ?? 'Inter',
              fontWeight: (d.fontWeight ?? 'normal') as string,
              selectable: false,
              evented: false,
            });
            canvas.add(txt);
          }
        }
      }

      // 3. Product image(s)
      const shadowDec = config.decorations?.find((d) => d.type === 'shadow');
      const applyShadow = (img: FabricImage) => {
        if (shadowDec && shadowDec.type === 'shadow') {
          img.set('shadow', new Shadow({
            offsetX: shadowDec.offsetX,
            offsetY: shadowDec.offsetY,
            blur: shadowDec.blur,
            color: shadowDec.color,
          }));
        }
      };

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
          setMeta(img, { type: 'product', areaId: 'product_1' });
          applyShadow(img);
          canvas.add(img);
          productImgRef.current = img;
        } catch (err) {
          console.warn('Failed to load product image:', err);
        }

        // Second product area (for collage templates)
        if (config.product_area_2) {
          try {
            const img2 = await FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' });
            const pa2 = config.product_area_2;
            img2.set({
              left: pa2.x,
              top: pa2.y,
              scaleX: pa2.width / (img2.width || 1),
              scaleY: pa2.height / (img2.height || 1),
              hasControls: true,
              hasBorders: true,
            });
            setMeta(img2, { type: 'product', areaId: 'product_2' });
            applyShadow(img2);
            canvas.add(img2);
          } catch (err) {
            console.warn('Failed to load product image for area 2:', err);
          }
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

      // 5. Foreground decorations: badges, circle icons (render AFTER text so they overlay)
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
          } else if (dec.type === 'circle_icon') {
            const d = dec as DecorationCircleIcon;
            const circle = new Circle({
              radius: d.radius,
              fill: d.fill,
              originX: 'center',
              originY: 'center',
            });
            const iconText = new FabricText(d.icon, {
              fontSize: d.iconFontSize,
              fill: d.iconColor,
              fontFamily: 'Inter',
              fontWeight: 'bold',
              originX: 'center',
              originY: 'center',
            });
            const group = new Group([circle, iconText], {
              left: d.x,
              top: d.y,
              selectable: false,
              evented: false,
            });
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
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center overflow-auto p-4" style={{ background: 'var(--bg-secondary, #18181b)' }}>
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
          className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-secondary)',
          }}
          title="Уменьшить"
        >
          -
        </button>
        <span className="text-sm min-w-[4rem] text-center" style={{ color: 'var(--text-tertiary)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => useEditorStore.getState().zoomIn()}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-secondary)',
          }}
          title="Увеличить"
        >
          +
        </button>
      </div>
    </div>
  );
});

export default FabricCanvas;
