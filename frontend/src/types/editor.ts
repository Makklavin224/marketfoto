// --- Template Config types (match backend seed_templates.py exactly) ---
export interface TemplateBackground {
  type: 'solid' | 'gradient';
  color?: string;       // for solid
  from?: string;        // for gradient
  to?: string;          // for gradient
}

export interface ProductArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextArea {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight?: string;
  color: string;
  align: 'left' | 'center' | 'right';
}

export interface DecorationBadge {
  type: 'badge';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bg: string;
  color: string;
  fontSize: number;
  borderRadius: number;
}

export interface DecorationLine {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}

export interface DecorationShadow {
  type: 'shadow';
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

/** Rounded rectangle decoration — used for text pill backgrounds, dividers, etc. */
export interface DecorationRect {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rx?: number;         // border-radius x
  ry?: number;         // border-radius y
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

/** Small circle with icon text — used for checkmark bullets, etc. */
export interface DecorationCircleIcon {
  type: 'circle_icon';
  x: number;
  y: number;
  radius: number;
  fill: string;
  icon: string;          // single character like "✓", "★"
  iconColor: string;
  iconFontSize: number;
}

/** Styled text label — decorative static text (not editable) */
export interface DecorationText {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontWeight?: string;
  color: string;
  fontFamily?: string;
}

export type Decoration = DecorationBadge | DecorationLine | DecorationShadow | DecorationRect | DecorationCircleIcon | DecorationText;

export interface TemplateConfig {
  background: TemplateBackground;
  product_area: ProductArea;
  product_area_2?: ProductArea;  // for collage-two template
  text_areas: TextArea[];
  decorations?: Decoration[];
}

// --- Full template detail (matches GET /api/templates/{id} response) ---
export interface TemplateDetail {
  id: string;
  name: string;
  slug: string;
  category: string;
  preview_url: string;
  config: TemplateConfig;
  is_premium: boolean;
  marketplace: string[];
  sort_order: number;
}

// --- overlay_data: what gets sent to POST /api/renders (Phase 7) ---
export interface OverlayProductData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface OverlayTextData {
  area_id: string;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
}

export interface OverlayBadgeData {
  enabled: boolean;
  text: string;
}

export interface OverlayData {
  product: OverlayProductData;
  texts: OverlayTextData[];
  badge: OverlayBadgeData;
}

// --- Marketplace dimension constants ---
export type MarketplaceId = 'wb' | 'ozon' | 'ym';

export interface MarketplaceDimensions {
  width: number;
  height: number;
  label: string;
}

export const MARKETPLACE_SIZES: Record<MarketplaceId, MarketplaceDimensions> = {
  wb:   { width: 900,  height: 1200, label: 'Wildberries' },
  ozon: { width: 1200, height: 1200, label: 'Ozon' },
  ym:   { width: 800,  height: 800,  label: 'Яндекс Маркет' },
};
