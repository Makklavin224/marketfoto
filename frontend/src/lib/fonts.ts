export interface EditorFont {
  family: string;       // CSS font-family name (matches @font-face)
  label: string;        // Display label in font picker (Russian-friendly)
  weights: number[];    // Available weights
  category: 'sans-serif' | 'display' | 'rounded';
}

export const EDITOR_FONTS: EditorFont[] = [
  { family: 'Inter',       label: 'Inter',        weights: [300, 400, 500, 600, 700, 800], category: 'sans-serif' },
  { family: 'Montserrat',  label: 'Montserrat',   weights: [300, 400, 500, 600, 700, 800], category: 'sans-serif' },
  { family: 'Roboto',      label: 'Roboto',       weights: [300, 400, 500, 700],           category: 'sans-serif' },
  { family: 'Open Sans',   label: 'Open Sans',    weights: [300, 400, 600, 700, 800],      category: 'sans-serif' },
  { family: 'Rubik',       label: 'Rubik',        weights: [300, 400, 500, 700],           category: 'sans-serif' },
  { family: 'Nunito',      label: 'Nunito',       weights: [300, 400, 600, 700, 800],      category: 'rounded' },
  { family: 'Golos Text',  label: 'Голос',        weights: [400, 500, 600, 700, 800],      category: 'sans-serif' },
  { family: 'Manrope',     label: 'Manrope',      weights: [300, 400, 500, 600, 700, 800], category: 'sans-serif' },
  { family: 'Raleway',     label: 'Raleway',      weights: [300, 400, 500, 600, 700, 800], category: 'sans-serif' },
  { family: 'Jost',        label: 'Jost',         weights: [300, 400, 500, 700],           category: 'sans-serif' },
  { family: 'Exo 2',       label: 'Exo 2',        weights: [300, 400, 500, 600, 700, 800], category: 'sans-serif' },
  { family: 'PT Sans',     label: 'PT Sans',      weights: [400, 700],                     category: 'sans-serif' },
  { family: 'Play',        label: 'Play',         weights: [400, 700],                     category: 'sans-serif' },
  { family: 'Comfortaa',   label: 'Comfortaa',    weights: [300, 400, 500, 600, 700],      category: 'rounded' },
];

/**
 * Preload all editor fonts using the CSS Font Loading API.
 * Call once on editor page mount to ensure fonts are ready before
 * fabric.js renders text (prevents FOUT on canvas).
 *
 * Returns a promise that resolves when all fonts are loaded.
 */
export async function loadAllFonts(): Promise<void> {
  const loadPromises = EDITOR_FONTS.flatMap((font) =>
    font.weights.map((weight) =>
      document.fonts
        .load(`${weight} 16px "${font.family}"`, 'АаБбВв')
        .catch(() => {
          // Silently skip fonts that fail to load (e.g., network issues)
          console.warn(`Font load failed: ${font.family} weight ${weight}`);
        })
    )
  );
  await Promise.allSettled(loadPromises);
}

/** Get default font for new text areas */
export function getDefaultFont(): EditorFont {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return EDITOR_FONTS[0]!; // Inter
}
