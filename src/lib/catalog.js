// Buyer-facing collections. Products are assigned by item code (sku); anything without a
// listed code falls into FALLBACK, so new products never disappear from the catalog.
const COLLECTIONS = Object.freeze([
  {
    key: 'core-retail-glassware',
    label: 'Core retail glassware',
    eyebrow: 'Year-round range',
    description:
      'Hand-painted mosaic, geometric and stripe drinkware for year-round tabletop shelves, including current trend designs.',
    skus: Object.freeze([
      'TMB-MOS-001', 'HBG-MOS-002', 'RCK-MOS-001', 'HBG-MOS-001', 'TMB-HPT-001', 'TMB-CNF-001', 'TMB-STR-001',
      'HBG-DIA-001', 'HBG-MOS-003', 'TMB-STP-001', 'RCK-DIA-001', 'TMB-RNB-001', 'HBG-DSY-001',
    ]),
  },
  {
    key: 'floral-gift-glass',
    label: 'Floral & gift glass',
    eyebrow: 'Gift-led programs',
    description:
      'Butterfly, tulip and illustrated designs for spring and gift displays, plus mosaic and gold plates and bowls that complete a tabletop range.',
    skus: Object.freeze([
      'TMB-BFL-001', 'CUP-BFL-001', 'VAS-TUL-001', 'TMB-HRT-001', 'TMB-DNT-001', 'TMB-FLW-004', 'TMB-FLW-005',
      'BWL-MOS-001', 'PLT-MOS-001', 'PLT-GLD-001',
    ]),
  },
  {
    key: 'seasonal-programs',
    label: 'Seasonal programs',
    eyebrow: 'Seasonal complement',
    description:
      'Halloween, Christmas and Valentine’s designs for seasonal buying. US holiday orders are usually confirmed 6 to 9 months ahead.',
    skus: Object.freeze(['TMB-PUM-001', 'TMB-GHO-001', 'TMB-GIN-001', 'TMB-CAN-001', 'VOT-HRT-001']),
  },
  {
    key: 'bar-hospitality',
    label: 'Bar, hospitality & dessert',
    eyebrow: 'Hotels, bars & cafes',
    description:
      'Rocks glasses, goblets, mugs and dessert bowls for bars, restaurants, hotels and dessert chains, with decoration kept to the base on several designs.',
    skus: Object.freeze([
      'RCK-SWL-001', 'TMB-BAS-001', 'RCK-AMB-001', 'RCK-AMB-002', 'RCK-GRN-001', 'GBL-GRN-001', 'DSB-STR-001',
      'DSB-RED-001', 'MUG-LEF-001',
    ]),
  },
]);
const FALLBACK = Object.freeze({
  key: 'other-current-products',
  label: 'More glassware & packaging',
  eyebrow: 'Published catalog',
  description: 'Stemware, borosilicate, candle, storage and fragrance or cosmetic glass from the wider catalog.',
  skus: Object.freeze([]),
});
const skuToKey = new Map(COLLECTIONS.flatMap((c) => c.skus.map((sku) => [sku, c.key])));
const skuOrder = new Map(COLLECTIONS.flatMap((c) => c.skus.map((sku, i) => [sku, i])));
// Groups products into collections, keeping the order listed above. Empty groups are dropped.
// Pass { includeFallback: false } to show only the curated collections (home page).
function buildCollections(products = [], { includeFallback = true } = {}) {
  const groups = new Map([...COLLECTIONS, FALLBACK].map((c) => [c.key, { ...c, products: [] }]));
  products.forEach((product) => {
    const key = skuToKey.get(product.sku) || FALLBACK.key;
    groups.get(key).products.push(product);
  });
  for (const g of groups.values()) {
    if (g.key !== FALLBACK.key) g.products.sort((a, b) => skuOrder.get(a.sku) - skuOrder.get(b.sku));
  }
  return [...groups.values()].filter((g) => g.products.length > 0 && (includeFallback || g.key !== FALLBACK.key));
}
module.exports = { COLLECTIONS, FALLBACK, buildCollections };
