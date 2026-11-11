const COLLECTIONS = Object.freeze([
  {
    key: 'core-retail-glassware',
    label: 'Core retail glassware',
    eyebrow: 'Year-round range',
    description: 'Current tableware, drinkware, tea and home glass from the published catalog for everyday retail programs.',
    slugs: Object.freeze([
      'hand-blown-lead-free-crystal-wine-glass-550-ml',
      'champagne-flute-with-gold-rim-200-ml',
      'vintage-colored-goblet-glass-set',
      'heavy-base-whiskey-rocks-glass-300-ml',
      'ribbed-highball-glass-400-ml',
      'borosilicate-glass-teapot-with-infuser-1000-ml',
      'double-wall-borosilicate-coffee-cup-250-ml',
      'clear-glass-fish-bowl-terrarium',
      'hand-blown-lead-free-crystal-wine-decanter-1500-ml',
      'glass-storage-jar-with-bamboo-lid',
      'glass-water-bottle-with-sleeve-500-ml',
    ]),
  },
  {
    key: 'floral-gift-glass',
    label: 'Floral & gift glass',
    eyebrow: 'Gift-led programs',
    description: 'Existing vases and fragrance or skincare packaging that can support floral, gifting and display-led retail ranges.',
    confirmationNote:
      'Flower and butterfly gift forms are not present in the current product snapshot. Please ask us to confirm availability before planning a range around them.',
    slugs: Object.freeze([
      'hand-blown-ombre-glass-vase',
      'clear-heavy-base-glass-perfume-bottle-100-ml',
      'square-thick-base-perfume-bottle-50-ml',
      'air-bubble-glass-perfume-bottle-90-ml',
      'polished-faceted-glass-perfume-bottle-100-ml',
      'hot-fused-decorative-perfume-bottle-80-ml',
      'spray-coated-gradient-perfume-bottle-100-ml',
      'hand-made-artisan-glass-perfume-bottle',
      'frosted-glass-serum-dropper-bottle-30-ml',
      'gradient-glass-lotion-pump-bottle-100-ml',
      'thick-wall-glass-cream-jar-50-g',
      'skincare-glass-packaging-set-toner-lotion-cream',
      'heavy-base-perfume-bottle-with-gold-leaf-bubble',
    ]),
  },
  {
    key: 'seasonal-programs',
    label: 'Seasonal programs',
    eyebrow: 'Seasonal complement',
    description: 'Existing candle, votive and aroma-vessel records for seasonal and home-fragrance programs.',
    confirmationNote:
      'Pumpkin, ghost and gingerbread products are not present in the current product snapshot. Please ask us to confirm seasonal availability before planning those forms.',
    slugs: Object.freeze([
      'candle-jar-with-wooden-lid-10-oz',
      'mercury-glass-votive-candle-holder',
      'heavy-glass-reed-diffuser-bottle-150-ml',
      'round-aroma-diffuser-bottle-100-ml',
    ]),
  },
]);

const FALLBACK = Object.freeze({
  key: 'other-current-products',
  label: 'Other current products',
  eyebrow: 'Published catalog',
  description: 'Published products not yet assigned to a buyer-facing collection.',
  slugs: Object.freeze([]),
});

const slugToKey = new Map(COLLECTIONS.flatMap((collection) => collection.slugs.map((slug) => [slug, collection.key])));

function buildCollections(products = []) {
  const groups = new Map(
    [...COLLECTIONS, FALLBACK].map((collection) => [collection.key, { ...collection, products: [] }])
  );

  products.forEach((product) => {
    const key = slugToKey.get(product.slug) || FALLBACK.key;
    groups.get(key).products.push(product);
  });

  return [...groups.values()].filter((group) => group.products.length > 0);
}

module.exports = { COLLECTIONS, FALLBACK, buildCollections };
