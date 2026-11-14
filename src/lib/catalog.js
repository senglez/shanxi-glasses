// Buyer-facing collections. Products are assigned by item code (sku); anything without a
// listed code falls into FALLBACK, so new products never disappear from the catalog.
// Each collection also has its own landing page at /collections/<slug>.
const COLLECTIONS = Object.freeze([
  {
    key: 'core-retail-glassware',
    slug: 'hand-painted-glassware',
    label: 'Core retail glassware',
    eyebrow: 'Year-round range',
    heading: 'Hand-Painted Glassware Wholesale',
    seoTitle: 'Hand-Painted Glassware Wholesale | Mosaic & Colorful Tumblers',
    seoDescription:
      'Wholesale hand-painted glassware from Shanxi, China: mosaic, geometric, stripe and daisy tumblers, highballs and rocks glasses for retail and private label.',
    description:
      'Hand-painted mosaic, geometric and stripe drinkware for year-round tabletop shelves, including current trend designs.',
    body: `## Colorful drinkware for year-round shelves

Hand-painted glassware gives a retail range color and a handmade look that plain glass cannot. This collection brings together our year-round designs: multicolor mosaic tumblers and highballs, red-and-blue mosaic glasses, geometric diamond and starburst patterns, coastal blue stripes, and retro rainbow and daisy designs.

Most designs come in two heights, so a retailer can build a matching shelf. For example, the [Multicolor Mosaic Tumbler (TMB-MOS-001)](/products/tumblers-drinking-glasses/multicolor-mosaic-tumbler) pairs with the [Multicolor Mosaic Highball (HBG-MOS-002)](/products/tumblers-drinking-glasses/multicolor-mosaic-highball), and the [Mosaic Rocks Glass (RCK-MOS-001)](/products/tumblers-drinking-glasses/mosaic-rocks-glass) pairs with the [Mosaic Highball Glass (HBG-MOS-001)](/products/tumblers-drinking-glasses/mosaic-highball-glass). A [mosaic glass bowl](/products/glass-bowls-plates/multicolor-mosaic-glass-bowl) and [mosaic rim plate](/products/glass-bowls-plates/mosaic-rim-glass-plate) complete the tabletop set.

## Who buys this collection
- Supermarkets and homeware chains building a colorful kitchen and dining section
- Gift retailers selling boxed sets of 2 or 4
- Importers and wholesalers who want several designs in one mixed container
- Brands developing a private-label glassware line

## What to know before you order
Each piece is painted by hand, so small differences in line and color between pieces are normal. We agree an approved sample with you before production and inspect against it.

For decorated drinkware, ask which test reports are available for your market, such as lip-and-rim lead and cadmium testing for the US. Our guides explain [whether soda-lime glass is lead-free](/blog/is-soda-lime-glass-lead-free) and [whether hand-painted glasses are dishwasher safe](/blog/are-hand-painted-glasses-dishwasher-safe). For sampling, MOQ and packaging, read the [hand-painted glassware buyer’s guide](/blog/hand-painted-glassware-wholesale-buyers-guide).

MOQ, lead time, packaging and price are confirmed in each quotation. Send us your target market, quantity per design and packaging needs to get started.`,
    skus: Object.freeze([
      'TMB-MOS-001', 'HBG-MOS-002', 'RCK-MOS-001', 'HBG-MOS-001', 'TMB-HPT-001', 'TMB-CNF-001', 'TMB-STR-001',
      'HBG-DIA-001', 'HBG-MOS-003', 'TMB-STP-001', 'RCK-DIA-001', 'TMB-RNB-001', 'HBG-DSY-001',
    ]),
  },
  {
    key: 'floral-gift-glass',
    slug: 'floral-gift-glassware',
    label: 'Floral & gift glass',
    eyebrow: 'Gift-led programs',
    heading: 'Butterfly & Floral Gift Glassware',
    seoTitle: 'Butterfly & Floral Gift Glassware Wholesale | Shanxi Glassworks',
    seoDescription:
      'Wholesale butterfly, tulip and illustrated glassware for spring, Mother’s Day and gift displays, plus mosaic and gold glass plates and bowls.',
    description:
      'Butterfly, tulip and illustrated designs for spring and gift displays, plus mosaic and gold plates and bowls that complete a tabletop range.',
    body: `## Gift-led glassware for spring and home displays

Floral and butterfly designs give shoppers an easy reason to buy a gift. This collection covers hand-painted butterfly tumblers and cups, a hand-painted tulip vase, a set of four illustrated stemless cups, and decorated bowls and plates for the table.

## Designs and how retailers use them
- **Butterfly series:** the [Butterfly Pattern Tumbler (TMB-BFL-001)](/products/tumblers-drinking-glasses/butterfly-pattern-tumbler) and [Butterfly Glass Cup (CUP-BFL-001)](/products/tumblers-drinking-glasses/butterfly-glass-cup) work together on spring and Mother’s Day displays.
- **Tulip vase:** the [Hand-Painted Tulip Vase (VAS-TUL-001)](/products/glass-vases-home-decor/hand-painted-tulip-vase) suits homeware chains, florists and Northern European spring ranges.
- **Illustrated cups:** four stemless borosilicate designs, the [Heart](/products/tumblers-drinking-glasses/heart-glass-cup), [Donut](/products/tumblers-drinking-glasses/donut-glass-cup), [Purple Flower](/products/tumblers-drinking-glasses/purple-flower-glass-cup) and [Orange Flower](/products/tumblers-drinking-glasses/orange-flower-glass-cup) cups, are made for 4-piece gift boxes, supermarket promotions and cafe co-branding. The wording on each cup can be changed for your program.
- **Plates and bowls:** the [Gold Geometric Glass Plate (PLT-GLD-001)](/products/glass-bowls-plates/gold-geometric-glass-plate) suits Ramadan, Eid, weddings and Christmas tables. The mosaic bowl and plate match the mosaic drinkware.

## Planning a gift program
Gift buyers usually decide on packaging at the same time as the product. Tell us whether you need single pieces, sets of 2 or 4, window boxes or mixed-design cartons, and we will confirm options and carton data in the quotation.

Spring and Mother’s Day ranges are normally bought several months ahead. Our [holiday glassware sourcing calendar](/blog/holiday-glassware-sourcing-calendar) shows when to sample and order for each season.`,
    skus: Object.freeze([
      'TMB-BFL-001', 'CUP-BFL-001', 'VAS-TUL-001', 'TMB-HRT-001', 'TMB-DNT-001', 'TMB-FLW-004', 'TMB-FLW-005',
      'BWL-MOS-001', 'PLT-MOS-001', 'PLT-GLD-001',
    ]),
  },
  {
    key: 'seasonal-programs',
    slug: 'holiday-glassware',
    label: 'Seasonal programs',
    eyebrow: 'Seasonal complement',
    heading: 'Halloween & Christmas Glassware Wholesale',
    seoTitle: 'Halloween & Christmas Glassware Wholesale | Shanxi Glassworks',
    seoDescription:
      'Wholesale Halloween, Christmas and Valentine’s glassware: 3D pumpkin, ghost, gingerbread and candy cane tumblers and heart votives for seasonal retail.',
    description:
      'Halloween, Christmas and Valentine’s designs for seasonal buying. US holiday orders are usually confirmed 6 to 9 months ahead.',
    body: `## Seasonal glassware for holiday programs

Seasonal glassware sells in a short window, so it has to arrive on time. This collection covers our holiday designs: stemless borosilicate tumblers with raised 3D glass motifs for Halloween and Christmas, and a heart votive holder for Valentine’s Day and weddings.

## Designs by season
- **Halloween and autumn:** the [Pumpkin Glass Tumbler (TMB-PUM-001)](/products/tumblers-drinking-glasses/pumpkin-glass-tumbler) covers Halloween and Thanksgiving, so it has a longer selling season in the US. The [Ghost Glass Tumbler (TMB-GHO-001)](/products/tumblers-drinking-glasses/ghost-glass-tumbler) is for Halloween.
- **Christmas:** the [Gingerbread Man Glass Tumbler (TMB-GIN-001)](/products/tumblers-drinking-glasses/gingerbread-man-glass-tumbler) and [Candy Cane Glass Tumbler (TMB-CAN-001)](/products/tumblers-drinking-glasses/candy-cane-glass-tumbler) can be sold singly or as a holiday set.
- **Valentine’s Day and weddings:** the [Heart Votive Holder (VOT-HRT-001)](/products/candle-holders-jars/heart-votive-holder) suits table decor and candle aisles.

Other designs also fit seasonal displays. The [Red Blue Mosaic Highball](/products/tumblers-drinking-glasses/red-blue-mosaic-highball) suits the US Fourth of July, and the [Gold Geometric Glass Plate](/products/glass-bowls-plates/gold-geometric-glass-plate) suits Ramadan and Eid.

## Order early
US retailers usually confirm Halloween and Christmas orders 6 to 9 months before the holiday. Production in China also pauses around Chinese New Year, so samples should be approved before the factory break. Our [holiday glassware sourcing calendar](/blog/holiday-glassware-sourcing-calendar) sets out a month-by-month plan.

Tell us your season, quantity per design and in-store date, and we will confirm MOQ, lead time and packaging in the quotation.`,
    skus: Object.freeze(['TMB-PUM-001', 'TMB-GHO-001', 'TMB-GIN-001', 'TMB-CAN-001', 'VOT-HRT-001']),
  },
  {
    key: 'bar-hospitality',
    slug: 'bar-restaurant-glassware',
    label: 'Bar, hospitality & dessert',
    eyebrow: 'Hotels, bars & cafes',
    heading: 'Colorful Bar & Restaurant Glassware',
    seoTitle: 'Colorful Bar & Restaurant Glassware Wholesale | Shanxi Glassworks',
    seoDescription:
      'Wholesale rocks glasses, whiskey glasses, goblets, tea mugs and dessert bowls for bars, restaurants, hotels and dessert chains, sourced from Shanxi, China.',
    description:
      'Rocks glasses, goblets, mugs and dessert bowls for bars, restaurants, hotels and dessert chains, with decoration kept to the base on several designs.',
    body: `## Glassware for bars, restaurants, hotels and cafes

Hospitality buyers need glassware that looks distinctive, survives daily service and can be reordered to the same specification. This collection brings together rocks and whiskey glasses, a vintage green goblet, a glass tea mug and footed dessert bowls.

## Designs for daily service
- **Decoration kept away from the rim:** the [Colorful Swirl Base Rocks Glass (RCK-SWL-001)](/products/tumblers-drinking-glasses/colorful-swirl-base-rocks-glass), [Multicolor Base Tumbler (TMB-BAS-001)](/products/tumblers-drinking-glasses/multicolor-base-tumbler) and [Green Faceted Rocks Glass (RCK-GRN-001)](/products/tumblers-drinking-glasses/green-faceted-rocks-glass) keep the color on the lower part of the glass.
- **Whiskey and cocktail service:** the [Amber Twist Whiskey Glass (RCK-AMB-001)](/products/tumblers-drinking-glasses/amber-twist-whiskey-glass) and [Amber Swirl Rocks Glass (RCK-AMB-002)](/products/tumblers-drinking-glasses/amber-swirl-rocks-glass).
- **Banquets and events:** the [Green Stem Goblet (GBL-GRN-001)](/products/wine-glasses-stemware/green-stem-goblet) for weddings, banquets and holiday tables.
- **Desserts and tea:** the [Stemmed Dessert Bowl (DSB-STR-001)](/products/glass-bowls-plates/stemmed-dessert-bowl), [Red Stem Dessert Bowl (DSB-RED-001)](/products/glass-bowls-plates/red-stem-dessert-bowl) and [Leaf Motif Glass Mug (MUG-LEF-001)](/products/tumblers-drinking-glasses/leaf-motif-glass-mug).

## Before you standardize on a design
Commercial dishwashers run hotter and use stronger detergents than home machines, so ask for dishwasher resistance results before choosing decorated glassware for daily service. Our guide on [whether hand-painted glasses are dishwasher safe](/blog/are-hand-painted-glasses-dishwasher-safe) explains what to ask for.

Also confirm carton size, replacement stock and whether a design stacks. We quote by carton quantity and can plan repeat orders on the same approved specification.`,
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
const collectionPath = (c) => (c.slug ? '/collections/' + c.slug : null);
// Groups products into collections, keeping the order listed above. Empty groups are dropped.
// Pass { includeFallback: false } to show only the curated collections (home page).
function buildCollections(products = [], { includeFallback = true } = {}) {
  const groups = new Map([...COLLECTIONS, FALLBACK].map((c) => [c.key, { ...c, url: collectionPath(c), products: [] }]));
  products.forEach((product) => {
    const key = skuToKey.get(product.sku) || FALLBACK.key;
    groups.get(key).products.push(product);
  });
  for (const g of groups.values()) {
    if (g.key !== FALLBACK.key) g.products.sort((a, b) => skuOrder.get(a.sku) - skuOrder.get(b.sku));
  }
  return [...groups.values()].filter((g) => g.products.length > 0 && (includeFallback || g.key !== FALLBACK.key));
}
// One collection with its products, for the /collections/<slug> landing page.
function findCollection(slug, products = []) {
  const c = COLLECTIONS.find((x) => x.slug === slug);
  if (!c) return null;
  const items = products.filter((p) => skuToKey.get(p.sku) === c.key).sort((a, b) => skuOrder.get(a.sku) - skuOrder.get(b.sku));
  return { ...c, url: collectionPath(c), products: items };
}
module.exports = { COLLECTIONS, FALLBACK, buildCollections, findCollection, collectionPath };
