import { create } from 'zustand';
import type { MarketplaceId, OverlayData, TemplateConfig, TemplateDetail } from '../types/editor';
import { MARKETPLACE_SIZES } from '../types/editor';

interface EditorState {
  // Template
  template: TemplateDetail | null;
  templateConfig: TemplateConfig | null;

  // Marketplace / canvas dimensions
  marketplace: MarketplaceId;
  canvasWidth: number;
  canvasHeight: number;

  // Zoom
  zoom: number;

  // Product image URL (the bg-removed image from Phase 4)
  productImageUrl: string | null;

  // Text overrides: area_id -> { content, fontSize, color, fontFamily, fontWeight }
  textOverrides: Record<string, { content: string; fontSize: number; color: string; fontFamily: string; fontWeight: string }>;

  // Badge state
  badgeEnabled: boolean;
  badgeText: string;

  // Selected object tracking
  selectedObjectType: 'product' | 'text' | null;
  selectedTextAreaId: string | null;

  // Actions
  setTemplate: (template: TemplateDetail) => void;
  setMarketplace: (mp: MarketplaceId) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setProductImageUrl: (url: string) => void;
  updateTextOverride: (areaId: string, updates: Partial<{ content: string; fontSize: number; color: string; fontFamily: string; fontWeight: string }>) => void;
  setBadgeEnabled: (enabled: boolean) => void;
  setBadgeText: (text: string) => void;
  setSelectedObject: (type: 'product' | 'text' | null, textAreaId?: string | null) => void;
  getOverlayData: () => OverlayData | null;
  reset: () => void;
}

const INITIAL_STATE = {
  template: null as TemplateDetail | null,
  templateConfig: null as TemplateConfig | null,
  marketplace: 'wb' as MarketplaceId,
  canvasWidth: 900,
  canvasHeight: 1200,
  zoom: 1,
  productImageUrl: null as string | null,
  textOverrides: {} as Record<string, { content: string; fontSize: number; color: string; fontFamily: string; fontWeight: string }>,
  badgeEnabled: true,
  badgeText: '',
  selectedObjectType: null as 'product' | 'text' | null,
  selectedTextAreaId: null as string | null,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...INITIAL_STATE,

  setTemplate: (template) => {
    const config = template.config as TemplateConfig;
    // Initialize text overrides from template defaults
    const textOverrides: Record<string, { content: string; fontSize: number; color: string; fontFamily: string; fontWeight: string }> = {};
    for (const ta of config.text_areas) {
      textOverrides[ta.id] = {
        content: ta.label,  // default text = label placeholder
        fontSize: ta.fontSize,
        color: ta.color,
        fontFamily: 'Inter',
        fontWeight: ta.fontWeight || 'normal',
      };
    }
    // Initialize badge from decorations
    const badgeDecoration = config.decorations?.find(d => d.type === 'badge');
    set({
      template,
      templateConfig: config,
      textOverrides,
      badgeEnabled: !!badgeDecoration,
      badgeText: badgeDecoration?.type === 'badge' ? badgeDecoration.text : '',
    });
  },

  setMarketplace: (mp) => {
    const dims = MARKETPLACE_SIZES[mp];
    set({ marketplace: mp, canvasWidth: dims.width, canvasHeight: dims.height });
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(2, +(s.zoom + 0.1).toFixed(1)) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.25, +(s.zoom - 0.1).toFixed(1)) })),

  setProductImageUrl: (url) => set({ productImageUrl: url }),

  updateTextOverride: (areaId, updates) =>
    set((s) => {
      const current = s.textOverrides[areaId];
      if (!current) return {};
      return {
        textOverrides: {
          ...s.textOverrides,
          [areaId]: {
            content: updates.content ?? current.content,
            fontSize: updates.fontSize ?? current.fontSize,
            color: updates.color ?? current.color,
            fontFamily: updates.fontFamily ?? current.fontFamily,
            fontWeight: updates.fontWeight ?? current.fontWeight,
          },
        },
      };
    }),

  setBadgeEnabled: (enabled) => set({ badgeEnabled: enabled }),
  setBadgeText: (text) => set({ badgeText: text }),

  setSelectedObject: (type, textAreaId = null) =>
    set({ selectedObjectType: type, selectedTextAreaId: textAreaId }),

  getOverlayData: () => {
    const state = get();
    if (!state.templateConfig) return null;
    const pa = state.templateConfig.product_area;
    return {
      product: { x: pa.x, y: pa.y, width: pa.width, height: pa.height, rotation: 0 },
      texts: Object.entries(state.textOverrides).map(([area_id, data]) => ({
        area_id,
        content: data.content,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        color: data.color,
        fontWeight: data.fontWeight,
      })),
      badge: { enabled: state.badgeEnabled, text: state.badgeText },
    };
  },

  reset: () => set(INITIAL_STATE),
}));
