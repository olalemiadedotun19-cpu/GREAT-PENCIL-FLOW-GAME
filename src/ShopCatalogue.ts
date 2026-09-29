/**
 * Shop Catalogue & Cosmetic Items Definition for Pencil Flow 2.0
 */

export interface ShopItem {
  id: string;
  category: 'BALL' | 'TRAIL' | 'PENCIL' | 'WORLD';
  name: string;
  desc: string;
  priceType: 'GRAPHITE' | 'LEAD';
  price: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  colorHex: string;
  stats?: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // BALLS
  { id: 'classic', category: 'BALL', name: 'Classic Parchment', desc: 'Hand-drawn paper sphere with graphite contour lines.', priceType: 'GRAPHITE', price: 0, rarity: 'COMMON', colorHex: '#f7f5f0' },
  { id: 'marble', category: 'BALL', name: 'Marble Swirl', desc: 'Carved smooth marble with delicate graphite veins.', priceType: 'GRAPHITE', price: 300, rarity: 'COMMON', colorHex: '#e2ddd5' },
  { id: 'graphite_core', category: 'BALL', name: 'Graphite Core', desc: 'High-density compressed 4B graphite with metallic sheen.', priceType: 'GRAPHITE', price: 650, rarity: 'RARE', colorHex: '#221f1d' },
  { id: 'eraser_pink', category: 'BALL', name: 'Rubber Eraser', desc: 'Soft pink vulcanized rubber with chamfered edges.', priceType: 'GRAPHITE', price: 900, rarity: 'RARE', colorHex: '#e07272' },
  { id: 'ink_splat', category: 'BALL', name: 'Obsidian Ink', desc: 'Glossy dark Indian ink sphere that catches the light.', priceType: 'GRAPHITE', price: 1400, rarity: 'EPIC', colorHex: '#0f0e0d' },
  { id: 'blueprint', category: 'BALL', name: 'Cyan Blueprint', desc: 'Luminous cyan technical drawing sphere with isometric grid lines.', priceType: 'LEAD', price: 15, rarity: 'EPIC', colorHex: '#00b4d8' },
  { id: 'gold_leaf', category: 'BALL', name: 'Gilded Gold Leaf', desc: 'Architectural model sphere wrapped in genuine beaten 24k gold.', priceType: 'LEAD', price: 35, rarity: 'LEGENDARY', colorHex: '#dfab34' },
  { id: 'neon_sketch', category: 'BALL', name: 'Neon Wireframe', desc: 'Pulsing dual-tone neon contours etched onto paper.', priceType: 'LEAD', price: 50, rarity: 'LEGENDARY', colorHex: '#06d6a0' },

  // TRAILS
  { id: 'graphite_dust', category: 'TRAIL', name: 'Graphite Dust', desc: 'Authentic 2B pencil dust kicked up by rolling friction.', priceType: 'GRAPHITE', price: 0, rarity: 'COMMON', colorHex: '#3d3833' },
  { id: 'ink_splash', category: 'TRAIL', name: 'Ink Droplets', desc: 'Splashes of dark ink flecks echoing each turn.', priceType: 'GRAPHITE', price: 400, rarity: 'COMMON', colorHex: '#141210' },
  { id: 'paper_shavings', category: 'TRAIL', name: 'Cedar Shavings', desc: 'Curling ribbons of freshly sharpened pencil wood shavings.', priceType: 'GRAPHITE', price: 800, rarity: 'RARE', colorHex: '#d4a373' },
  { id: 'gold_shimmer', category: 'TRAIL', name: 'Gold Specks', desc: 'Glittering brass and gold leaf dust swirling behind.', priceType: 'LEAD', price: 20, rarity: 'EPIC', colorHex: '#f59e0b' },
  { id: 'blueprint_lines', category: 'TRAIL', name: 'Drafting Streaks', desc: 'Cyan dimension ticks and isometric grid particles.', priceType: 'LEAD', price: 35, rarity: 'LEGENDARY', colorHex: '#00f0ff' },

  // PENCILS
  { id: 'classic_hb', category: 'PENCIL', name: 'Classic HB No. 2', desc: 'The iconic yellow cedar pencil with aluminum ferrule.', priceType: 'GRAPHITE', price: 0, rarity: 'COMMON', colorHex: '#ebb13a' },
  { id: '2b_dark', category: 'PENCIL', name: 'Stealth 2B', desc: 'Matte black draftsman pencil with bold, velvety dark lines.', priceType: 'GRAPHITE', price: 500, rarity: 'COMMON', colorHex: '#1f1f1f' },
  { id: '4b_soft', category: 'PENCIL', name: 'Artist 4B Charcoal', desc: 'Soft artist lead producing textured, expressive graphite strokes.', priceType: 'GRAPHITE', price: 950, rarity: 'RARE', colorHex: '#4a443e' },
  { id: 'mechanical_05', category: 'PENCIL', name: 'Precision 0.5mm', desc: 'Silver knurled steel mechanical pencil for razor-sharp lines.', priceType: 'GRAPHITE', price: 1600, rarity: 'EPIC', colorHex: '#adb5bd' },
  { id: 'blueprint_stylus', category: 'PENCIL', name: 'Architect Blueprint', desc: 'Technical cyan drafting lead holder for blueprints.', priceType: 'LEAD', price: 25, rarity: 'EPIC', colorHex: '#0284c7' },
  { id: 'crimson_red', category: 'PENCIL', name: 'Editorial Crimson', desc: 'Carmine red editing pencil for striking danger marks.', priceType: 'LEAD', price: 30, rarity: 'EPIC', colorHex: '#dc2626' },
  { id: 'golden_quill', category: 'PENCIL', name: 'Royal Gold Quill', desc: 'Solid brass luxury drafting instrument with gold gilding.', priceType: 'LEAD', price: 60, rarity: 'LEGENDARY', colorHex: '#d97706' },

  // WORLDS
  { id: 'paper', category: 'WORLD', name: 'Parchment Studio', desc: 'The warm, tactile world of heavy drafting paper on an artist desk.', priceType: 'GRAPHITE', price: 0, rarity: 'COMMON', colorHex: '#f4efe6' },
  { id: 'sketch_city', category: 'WORLD', name: 'Skyscraper District', desc: 'An endless metropolis of sketched Art Deco skyscrapers and spires.', priceType: 'GRAPHITE', price: 0, rarity: 'COMMON', colorHex: '#e9ecef' },
  { id: 'mountain_sketch', category: 'WORLD', name: 'Alpine Peaks', desc: 'Towering hatched mountain ridges and misty valley horizons.', priceType: 'GRAPHITE', price: 1200, rarity: 'RARE', colorHex: '#d8dee9' },
  { id: 'blueprint_grid', category: 'WORLD', name: 'Blueprint Matrix', desc: 'Technical cyan drafting paper with glowing white alignment grids.', priceType: 'LEAD', price: 25, rarity: 'EPIC', colorHex: '#0a3254' },
  { id: 'notebook_lined', category: 'WORLD', name: 'College Ruled', desc: 'Familiar lined notebook paper with clean red margin lines.', priceType: 'LEAD', price: 35, rarity: 'EPIC', colorHex: '#fffdfa' },
  { id: 'the_void', category: 'WORLD', name: 'Blackboard Void', desc: 'Deep black slate chalkboard with striking white chalk lines.', priceType: 'LEAD', price: 50, rarity: 'LEGENDARY', colorHex: '#121212' },
];
