// Initial content. Runs automatically on first start when the database is empty.
// Run manually with `npm run seed` (only inserts into empty tables).
const { db } = require('./db');

const categories = [
  {
    slug: 'wine-glasses-stemware',
    name: 'Wine Glasses & Stemware',
    image: '/img/glass/wine.webp',
    summary: 'Hand-blown and machine-made wine glasses, champagne flutes, goblets and cocktail stemware in lead-free crystal and soda-lime glass.',
    description: `## Wine glasses and stemware from Qixian, Shanxi

Qixian County in Shanxi Province is China's main production base for hand-blown glassware. Local factories make red and white wine glasses, champagne flutes and coupes, cocktail and martini glasses, and colored or patterned goblets for importers, wine brands, restaurant suppliers and gift retailers.

**What you can customize**
- Bowl shape and capacity (typically 150–750 ml)
- Pulled-stem (one piece) or assembled stem
- Clear, colored, ombre or two-tone glass
- Logo by decal, screen printing, sandblasting or laser engraving
- Gold or platinum rims
- Gift boxes, PVC window boxes or 6-pack export cartons

**Glass options**: soda-lime glass for value ranges, lead-free crystal (barium or titanium) for premium clarity and sound.`,
  },
  {
    slug: 'tumblers-drinking-glasses',
    name: 'Tumblers & Drinking Glasses',
    image: '/img/glass/tumbler.webp',
    summary: 'Highball, rocks, whiskey and everyday water glasses, including heavy-base, embossed, ribbed and colored designs.',
    description: `## Tumblers and drinking glasses

Everyday drinkware is the volume backbone of most glassware import programs. We source machine-pressed and hand-blown tumblers from Shanxi factories for supermarkets, hotels, coffee shops and promotional buyers.

- **Styles**: highball, rocks/old fashioned, stackable, ribbed/fluted, hammered, embossed, double-wall
- **Finishes**: clear, spray-colored, iridescent, frosted, decal printed
- **Typical MOQ**: from 1,000–3,000 pcs per design depending on process`,
  },
  {
    slug: 'borosilicate-glassware',
    name: 'Borosilicate Glassware',
    image: '/img/glass/teapot.webp',
    summary: 'Heat-resistant high-borosilicate teapots, mugs, double-wall cups, carafes and food storage, suitable for hot drinks.',
    description: `## Heat-resistant borosilicate glass

High-borosilicate glass (often called 3.3 borosilicate) has low thermal expansion, so it tolerates hot water and temperature changes much better than soda-lime glass. Shanxi now has automated production lines for borosilicate tableware alongside traditional lamp-worked items.

- Teapots with stainless or glass infusers
- Double-wall coffee and tea cups
- Carafes and pitchers
- Food storage containers with bamboo or PP lids
- Food-contact testing (LFGB/FDA) available on request`,
  },
  {
    slug: 'glass-vases-home-decor',
    name: 'Glass Vases & Home Decor',
    image: '/img/glass/vase.webp',
    summary: 'Hand-blown vases, bowls, terrariums and decorative glass in clear, colored, frosted and crackle finishes.',
    description: `## Decorative glass and vases

Hand-blown decor is where Qixian craftsmanship stands out: free-blown and mold-blown vases, bud vases, bubble bowls, terrariums, cloches and decorative bottles, made in small to medium batches for home-decor brands, florists and retail chains.

Finishes include clear, solid color, ombre, frosted, crackle, bubble, gold-leaf and hand-painted.`,
  },
  {
    slug: 'candle-holders-jars',
    name: 'Candle Holders & Candle Jars',
    image: '/img/glass/candle.webp',
    summary: 'Candle jars with lids, votives, tealight holders, hurricane glasses and pillar holders for candle makers and retailers.',
    description: `## Candle jars and holders

We supply candle manufacturers and private-label brands with heat-tolerant candle vessels: tumbler-style jars, jars with wood, metal or glass lids, votives, mercury-glass and spray-colored holders, and hurricane chimneys.

Interior spray coating, matte finishes and custom logos are available.`,
  },
  {
    slug: 'decanters-barware',
    name: 'Decanters & Barware',
    image: '/img/glass/decanter.webp',
    summary: 'Wine decanters, whiskey decanters, pitchers, shot glasses and bar accessories for hospitality and gift sets.',
    description: `## Decanters and barware

Hand-blown wine decanters (including swan and aerating designs), whiskey decanter sets with glasses, pitchers, carafes, shot glasses and cocktail mixing glasses. Ideal for gift sets combining a decanter with 2–6 glasses in a printed box.`,
  },
  {
    slug: 'glass-bottles-storage-jars',
    name: 'Glass Bottles & Storage Jars',
    image: '/img/glass/bottle.webp',
    summary: 'Water bottles, oil and vinegar bottles, kitchen storage jars and decorative bottles with cork, bamboo or metal lids.',
    description: `## Glass bottles and storage jars

Kitchen and household glass: water and juice bottles, oil and vinegar cruets, spice jars, cookie jars and stackable storage jars with airtight lids. Suitable for homeware retailers and Amazon/e-commerce sellers needing retail-ready packaging.`,
  },
];

const P = (o) => ({ featured: 0, sort: 0, ...o });
const products = [
  P({
    cat: 'wine-glasses-stemware', featured: 1, image: '/img/glass/wine.webp',
    name: 'Hand-Blown Lead-Free Crystal Wine Glass 550 ml',
    summary: 'Thin-rim, pulled-stem Bordeaux glass in lead-free crystal, hand-blown in Qixian. For wine brands, restaurants and premium retail.',
    material: 'Lead-free crystal glass', moq: '600 pcs per design', lead_time: 'Sample 7–10 days, mass production 30–40 days',
    specs: 'Capacity: 550 ml\nHeight: 235 mm\nRim diameter: 66 mm\nRim thickness: about 1 mm\nProcess: Hand-blown, pulled stem\nDishwasher safe: Yes\nCustom logo: Decal, sandblast, laser engraving\nPackaging: 6 pcs/inner box, 24 pcs/export carton',
    description: `A large Bordeaux bowl that opens up structured red wines, with a cut-and-polished thin rim and a seamless pulled stem.

## Why buyers choose it
- **Lead-free crystal** with high clarity and a clear ring when tapped
- **Pulled stem**: bowl and stem are drawn from one piece of glass, which is stronger than a glued stem
- Consistent weight and height across batches, checked during QC

## Customization
Capacity, height, bowl shape, colored stems, gold rims, logo engraving and branded gift boxes are all available. Send a drawing or a reference sample and we will match a suitable factory.`,
  }),
  P({
    cat: 'wine-glasses-stemware', featured: 1, image: '/img/glass/flute.webp',
    name: 'Champagne Flute with Gold Rim 200 ml',
    summary: 'Classic tall champagne flute with hand-applied gold rim, suited to weddings, hospitality and gift sets.',
    material: 'Soda-lime glass or lead-free crystal', moq: '1,000 pcs', lead_time: '35–45 days',
    specs: 'Capacity: 200 ml\nHeight: 245 mm\nRim: Real gold electroplated or decal gold\nProcess: Machine-made bowl, hand-finished rim\nPackaging: 2/4/6 pcs gift box or bulk carton',
    description: `A slim tulip flute that keeps bubbles longer, with a gold rim applied and fired for durability.

- Options: gold, rose-gold or platinum rim, colored stem, frosted base
- Popular for wedding gift sets, hotels and event rental companies
- Gold rims are not recommended for dishwashers; we can supply care labels`,
  }),
  P({
    cat: 'wine-glasses-stemware', image: '/img/glass/goblet.webp',
    name: 'Vintage Colored Goblet Glass Set',
    summary: 'Embossed vintage-style goblets in amber, green, pink and blue. Spray-colored or solid color glass.',
    material: 'Soda-lime glass', moq: '1,200 pcs per color', lead_time: '35–45 days',
    specs: 'Capacity: 300 ml\nHeight: 165 mm\nColors: Amber, green, pink, blue, smoke grey, custom Pantone\nColor process: Solid colored glass or spray coating\nPackaging: Color box of 4 or 6',
    description: `A retro embossed goblet that works for water, wine and cocktails. Ideal for home-decor retailers and table-setting brands.

Solid colored glass gives a deeper color and is fully dishwasher safe; spray coating allows lower MOQs and any Pantone color.`,
  }),
  P({
    cat: 'tumblers-drinking-glasses', featured: 1, image: '/img/glass/tumbler.webp',
    name: 'Heavy Base Whiskey Rocks Glass 300 ml',
    summary: 'Thick-bottom old fashioned glass with a solid feel, for bars, whiskey brands and corporate gifts.',
    material: 'Lead-free crystal or soda-lime glass', moq: '1,000 pcs', lead_time: '30–40 days',
    specs: 'Capacity: 300 ml\nHeight: 90 mm\nDiameter: 85 mm\nBase thickness: 15 mm\nLogo: Laser engraving, sandblast, decal\nPackaging: Single gift box or 12 pcs carton',
    description: `A straight-sided rocks glass with a heavy base that sits well in the hand.

- Popular with spirits brands for branded glassware and bottle-plus-glass gift packs
- Deep laser engraving and sandblasted logos look premium on the thick base`,
  }),
  P({
    cat: 'tumblers-drinking-glasses', image: '/img/glass/ribbed.webp',
    name: 'Ribbed Highball Glass 400 ml',
    summary: 'Fluted / ribbed tall glass for iced coffee, cocktails and water, a best-selling café and homeware design.',
    material: 'Soda-lime glass', moq: '3,000 pcs', lead_time: '30–35 days',
    specs: 'Capacity: 400 ml\nHeight: 140 mm\nDiameter: 75 mm\nProcess: Machine-blown\nColors: Clear, amber, smoke grey, iridescent\nDishwasher safe: Yes',
    description: `Vertical ribs give grip and a light-catching look. A staple for coffee shops, cocktail bars and Amazon homeware sellers.

Optional matching bamboo lids and glass straws for retail sets.`,
  }),
  P({
    cat: 'borosilicate-glassware', featured: 1, image: '/img/glass/teapot.webp',
    name: 'Borosilicate Glass Teapot with Infuser 1000 ml',
    summary: 'Heat-resistant 3.3 borosilicate teapot with stainless steel infuser; stovetop-safe on gas and electric.',
    material: 'High borosilicate glass 3.3, SS304 infuser', moq: '1,000 pcs', lead_time: '30–40 days',
    specs: 'Capacity: 1000 ml\nThermal shock resistance: ΔT 120 °C\nInfuser: Stainless steel 304 or glass\nFood contact: LFGB / FDA test available\nPackaging: Color box, 12 pcs per carton',
    description: `A clear borosilicate teapot for loose-leaf tea and blooming tea, with a removable fine-mesh infuser.

## Specifications buyers ask about
- **Glass**: 3.3 borosilicate, lower thermal expansion than soda-lime glass
- **Use**: suitable for boiling water; stovetop use on low flame
- **Testing**: food-contact reports can be arranged through third-party labs`,
  }),
  P({
    cat: 'borosilicate-glassware', image: '/img/glass/double.webp',
    name: 'Double-Wall Borosilicate Coffee Cup 250 ml',
    summary: 'Insulated double-wall cup that keeps drinks hot while the outside stays cool. Popular for coffee and tea brands.',
    material: 'High borosilicate glass', moq: '1,000 pcs', lead_time: '30–40 days',
    specs: 'Capacity: 250 ml\nProcess: Hand-made (lamp-worked)\nOptions: With handle, without handle, custom shapes\nLogo: Silk printing, decal\nMicrowave safe: Yes (no metal decoration)',
    description: `The floating-liquid look of double-wall glass works well for specialty coffee, tea brands and gift sets.

Custom inner shapes (hearts, logos, animals) are possible with mold development.`,
  }),
  P({
    cat: 'glass-vases-home-decor', featured: 1, image: '/img/glass/vase.webp',
    name: 'Hand-Blown Ombre Glass Vase',
    summary: 'Mouth-blown vase with smooth color gradient, each piece slightly unique. For home-decor brands and florists.',
    material: 'Soda-lime glass, hand-blown', moq: '300 pcs per size', lead_time: '35–50 days',
    specs: 'Sizes: H 20 / 25 / 30 cm\nColors: Blue, amber, pink, green ombre or custom\nProcess: Free-blown or mold-blown\nPackaging: Individual carton with foam / honeycomb paper',
    description: `Each vase is gathered and blown by hand, so color and form vary slightly from piece to piece, which home-decor buyers value.

Qixian workshops can produce colored, ombre, crackle, bubble and gold-leaf effects in small batches, which makes it practical to test new collections.`,
  }),
  P({
    cat: 'glass-vases-home-decor', image: '/img/glass/bowl.webp',
    name: 'Clear Glass Fish Bowl / Terrarium',
    summary: 'Round bubble bowl for terrariums, floral displays, candles and aquariums. Many sizes in stock molds.',
    material: 'Soda-lime glass', moq: '500 pcs', lead_time: '25–35 days',
    specs: 'Diameters: 10 / 15 / 20 / 25 / 30 cm\nProcess: Mold-blown\nRim: Fire-polished or cut-and-polished\nPackaging: Nested or individual boxes',
    description: `A classic round bowl used by florists, event planners, terrarium kits and candle makers.`,
  }),
  P({
    cat: 'candle-holders-jars', featured: 1, image: '/img/glass/candle.webp',
    name: 'Candle Jar with Wooden Lid 10 oz',
    summary: 'Heat-resistant tumbler-style candle vessel with wood lid; inside spray colors and matte finishes available.',
    material: 'Soda-lime glass, wood or bamboo lid', moq: '2,000 pcs', lead_time: '30–40 days',
    specs: 'Capacity: 10 oz / 300 ml\nHeight: 90 mm\nDiameter: 80 mm\nFinishes: Clear, frosted, matte black, inside spray color\nLid: Ash wood, bamboo, metal or glass\nPackaging: 24/48 pcs carton with dividers',
    description: `A thick-walled, even-bottom jar designed for container candles, ensuring a stable wick and wax pool.

Private-label services: logo printing, custom colors, matching gift boxes.`,
  }),
  P({
    cat: 'candle-holders-jars', image: '/img/glass/votive.webp',
    name: 'Mercury Glass Votive Candle Holder',
    summary: 'Antique-look votive and tealight holders with silver, gold or rose-gold mercury finish for seasonal retail.',
    material: 'Soda-lime glass with metallic coating', moq: '2,000 pcs', lead_time: '30–40 days',
    specs: 'Height: 65 / 80 / 100 mm\nFinish: Silver, gold, rose-gold mercury\nUse: Tealights, votives, LED candles',
    description: `Seasonal favorite for Christmas, weddings and restaurant tables.`,
  }),
  P({
    cat: 'decanters-barware', featured: 1, image: '/img/glass/decanter.webp',
    name: 'Hand-Blown Lead-Free Crystal Wine Decanter 1500 ml',
    summary: 'Wide-base decanter that maximizes aeration, hand-blown from lead-free crystal. Gift box available.',
    material: 'Lead-free crystal glass', moq: '300 pcs', lead_time: '35–45 days',
    specs: 'Capacity: 1500 ml (holds one 750 ml bottle at widest point)\nHeight: 250 mm\nProcess: Hand-blown\nPackaging: Gift box with foam insert',
    description: `A large-base decanter for red wine, made by skilled glassblowers. Can be paired with 2 or 4 wine glasses in a gift set.`,
  }),
  P({
    cat: 'glass-bottles-storage-jars', image: '/img/glass/jar.webp',
    name: 'Glass Storage Jar with Bamboo Lid',
    summary: 'Airtight kitchen storage jar with silicone-sealed bamboo lid, for pantry organization and e-commerce sets.',
    material: 'High borosilicate or soda-lime glass, bamboo lid', moq: '1,000 pcs', lead_time: '30–35 days',
    specs: 'Capacities: 400 / 800 / 1200 / 1800 ml\nLid: Bamboo with silicone ring\nOptions: Labels, spoon, sets of 3/4/6\nPackaging: Retail color box, drop-test ready',
    description: `Stackable storage jars for coffee, pasta, flour and snacks. We can build retail sets with labels and boxes ready for Amazon FBA.`,
  }),
  P({
    cat: 'glass-bottles-storage-jars', image: '/img/glass/bottle.webp',
    name: 'Glass Water Bottle with Sleeve 500 ml',
    summary: 'Reusable borosilicate water bottle with silicone or neoprene sleeve and leak-proof lid.',
    material: 'High borosilicate glass', moq: '1,000 pcs', lead_time: '30–40 days',
    specs: 'Capacity: 500 ml\nLid: Bamboo, stainless steel or PP\nSleeve: Silicone or neoprene, custom colors\nLogo: Printing on glass or sleeve',
    description: `A plastic-free bottle for promotional, wellness and eco-friendly brands.`,
  }),
];

const faqs = [
  ['What is your minimum order quantity (MOQ)?', 'Hand-blown items usually start from **300–600 pieces per design**; machine-made items from **1,000–3,000 pieces**. Stock designs with your own logo or packaging can start lower. Tell us your quantity and we will find a factory that fits.'],
  ['Can I get samples before ordering?', 'Yes. Existing designs ship as samples in **3–7 days**; new custom designs take **7–15 days** for sampling. Sample fees are usually refunded once the bulk order is placed. Express shipping is paid by the buyer.'],
  ['What is the typical production lead time?', 'Most orders take **30–45 days** after sample approval and deposit. Hand-blown, colored or decorated items and peak season (August–November) may take longer. We give a confirmed schedule with the proforma invoice.'],
  ['Are you a factory or a trading company?', 'We are a sourcing and export company based in Qixian, Shanxi, the center of China’s hand-blown glassware industry. We work with a network of vetted local factories and match each product to the factory best suited for it, then manage samples, production follow-up, quality inspection and shipping for you.'],
  ['Where are the products made?', 'Mainly in **Qixian County, Jinzhong, Shanxi Province**, which produces more than 60% of China’s hand-blown glassware and exports over 70% of its output to 80+ countries (Xinhua, 2026). Some machine-made and borosilicate lines come from other Shanxi factories.'],
  ['Can you customize logo, color and packaging?', 'Yes. Logos by decal, screen printing, sandblasting, etching or laser engraving; any Pantone color by spray coating or solid colored glass; gold/platinum rims; and custom gift boxes, color boxes, PVC boxes or export cartons with your barcode.'],
  ['How do you control quality?', 'We inspect at three stages: raw glass and first articles, in-line during production, and pre-shipment (AQL 2.5 / 4.0 by default). We check dimensions, capacity, bubbles, stones, cords, thickness, decoration and packing. Photos and videos are sent before shipping. Third-party inspection (SGS, BV, Intertek) is welcome.'],
  ['Are your glasses food safe and lead-free?', 'Our soda-lime, borosilicate and crystal glass ranges are lead-free. We can arrange food-contact testing to **FDA, LFGB or EU 1935/2004** requirements, and dishwasher or thermal-shock tests, through accredited labs.'],
  ['What payment terms do you accept?', 'Standard terms are **30% deposit by T/T and 70% before shipment** (against copy of B/L for established customers). L/C at sight and PayPal for samples are also accepted.'],
  ['How do you pack glass to avoid breakage?', 'Each piece is wrapped or separated by paper dividers, packed in inner boxes, then in 5-ply export cartons that pass drop tests. Fragile items can be palletized. Breakage within agreed tolerance is compensated or replaced in the next order.'],
  ['Which shipping terms and ports do you use?', 'We quote **EXW, FOB Tianjin/Qingdao, CIF/CFR** or **DDP** to many countries. Sea freight is most common for full or LCL loads; air and express for urgent or small orders.'],
];

const posts = [
  {
    slug: 'qixian-shanxi-china-hand-blown-glassware-capital',
    title: 'Qixian, Shanxi: A Buyer’s Guide to China’s Hand-Blown Glassware Capital',
    author: 'Sourcing Team',
    excerpt: 'Qixian County in Shanxi produces over 60% of China’s hand-blown glassware and exports more than 70% of it to 80+ countries. Here is what that means for importers.',
    body: `**Short answer:** Qixian County (祁县) in Jinzhong, Shanxi Province, is China’s core production area for hand-blown glassware. It accounts for more than 60% of national hand-blown output, and over 70% of its products are exported to more than 80 countries and regions, according to a February 2026 Xinhua report.

## Key facts about the Qixian glassware cluster

| Fact | Figure | Source |
|---|---|---|
| Share of China’s hand-blown glassware output | over 60% | Xinhua, Feb 2026 |
| Share of output exported | over 70% | Xinhua, Feb 2026 |
| Export destinations | 80+ countries and regions | Xinhua, Feb 2026 |
| Glassware manufacturers | 62, plus 230+ upstream/downstream firms | Xinhua, Feb 2026 |
| Local workers in glass-blowing | about 30,000 | Xinhua, Feb 2026 |
| Quality infrastructure | national-level glassware quality inspection center | Xinhua, Feb 2026 |

## How the industry started
Local historians trace the craft to Shanxi merchants who traded along the Ming–Qing "tea road" across Eurasia and brought glass-blowing techniques back home. More than a century later the county has a full supply chain: raw materials, molds, furnaces, decoration, packaging and export logistics.

## What Qixian is good at
- **Hand-blown stemware and decanters**: thin rims, pulled stems and complex shapes that machines cannot make economically
- **Colored and decorative glass**: ombre, overlay, patterned stems, gold decoration, styles popular in Europe and the Middle East
- **Small-batch flexibility**: hand production allows lower MOQs and faster design changes than fully automated plants
- **Borosilicate**: newer automated lines now produce heat-resistant glassware at scale

## What to check before you order
1. **Process match**: hand-blown, mold-blown or machine-pressed? Each factory specializes.
2. **Glass type**: soda-lime, lead-free crystal or borosilicate, which affects clarity, weight and price.
3. **Tolerance**: hand-made items vary slightly; agree on acceptable ranges for height, weight and capacity.
4. **Packaging**: glass needs drop-tested export cartons; confirm this in the quotation.
5. **Inspection**: insist on pre-shipment QC with photos.

## Why work with a local sourcing partner
With dozens of factories each focusing on different processes, the fastest route is a local team that already knows which workshop makes which product well. We visit the factories, compare quotations, follow production and inspect goods before they leave Shanxi.

*Source: Xinhua, "Glass-blowing craft thrives in China's ancient county", 21 Feb 2026.*`,
  },
  {
    slug: 'hand-blown-vs-machine-made-glassware',
    title: 'Hand-Blown vs Machine-Made Glassware: Which Is Right for Your Market?',
    author: 'Sourcing Team',
    excerpt: 'Choose hand-blown glass for premium, thin-rim or small-batch designs; choose machine-made for high volume, consistent sizes and lower unit cost.',
    body: `**Short answer:** Hand-blown glassware suits premium positioning, thin rims, unusual shapes and small batches. Machine-made glassware suits high volumes, tight size consistency and the lowest unit cost.

## Side-by-side comparison

| Factor | Hand-blown | Machine-made |
|---|---|---|
| Typical MOQ | 300–1,000 pcs | 3,000–10,000+ pcs |
| Unit cost | Higher | Lower |
| Rim | Can be very thin (≈1 mm), cut and polished | Usually thicker, rolled or fire-polished |
| Size consistency | Small variations | Very consistent |
| Design flexibility | High, quick changes | Needs molds; changes cost more |
| Lead time | 35–50 days | 25–40 days |
| Best for | Wine brands, premium retail, decor | Supermarkets, hotels, promotions |

## When to choose hand-blown
- You sell on look and feel: crystal stemware, decanters, art vases
- You need colored, ombre or overlay effects
- You want to test a new collection without a large commitment

## When to choose machine-made
- You need 10,000+ identical pieces for chain stores or hospitality
- Stackability and exact capacity matter
- Price is the main purchase driver

## A mixed approach
Many buyers combine both: a machine-made core range for volume, plus hand-blown hero items for margin and brand image. We can source both from Shanxi and consolidate them into one shipment.`,
  },
  {
    slug: 'borosilicate-vs-soda-lime-vs-crystal-glass',
    title: 'Borosilicate vs Soda-Lime vs Lead-Free Crystal: A Glass Material Guide for Importers',
    author: 'Sourcing Team',
    excerpt: 'Soda-lime is the low-cost everyday glass; borosilicate resists heat and thermal shock; lead-free crystal gives the best clarity and brilliance for stemware.',
    body: `**Short answer:** Use **soda-lime glass** for everyday tumblers and jars, **borosilicate glass** for hot drinks and cookware, and **lead-free crystal** for premium wine glasses and decanters.

## Comparison

| Property | Soda-lime | Borosilicate 3.3 | Lead-free crystal |
|---|---|---|---|
| Main use | Tumblers, jars, vases | Teapots, mugs, storage, labware | Wine glasses, decanters, barware |
| Heat resistance | Low; avoid boiling water shocks | High (thermal shock ΔT ≈ 120 °C+) | Low–medium |
| Clarity and brilliance | Good | Good, slightly lighter feel | Excellent, higher refractive index |
| Weight | Medium | Light | Medium |
| Relative cost | $ | $$ | $$–$$$ |

## Soda-lime glass
Soda-lime is the most widely manufactured type of glass. It is inexpensive, recyclable and easy to color. It is not designed for sudden temperature changes.

## Borosilicate glass
Boron oxide lowers thermal expansion, so borosilicate tolerates hot liquids and temperature changes. It is the right choice for teapots, double-wall cups, coffee carafes and oven-safe containers.

## Lead-free crystal
Modern crystal replaces lead oxide with barium, zinc or titanium oxides. It gives high clarity, a fine ring and allows very thin rims. It is the preferred material for premium stemware.

## Compliance tips
- Ask for **food-contact test reports** (FDA for the US, LFGB for Germany, EU 1935/2004 for the EU)
- For decorated glass, test the **lip and rim area** for lead and cadmium release
- Specify the glass type in the purchase contract`,
  },
];

// Internal supplier list. Kept out of Git: put it in private/factories.json (see README).
function loadPrivateFactories() {
  const file = require('path').join(__dirname, '..', 'private', 'factories.json');
  if (!require('fs').existsSync(file)) return [];
  const rows = JSON.parse(require('fs').readFileSync(file, 'utf8'));
  const cols = ['name', 'name_en', 'location', 'products', 'capability', 'contact_person', 'phone', 'wechat', 'email', 'rating', 'source', 'notes'];
  return rows.filter((r) => r && r.name).map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? (c === 'rating' ? 0 : '')])));
}

function insertAll(table, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`);
  db.transaction(() => rows.forEach((r) => stmt.run(r)))();
}

function isEmpty(table) {
  return !db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
}

function run() {
  if (isEmpty('categories')) insertAll('categories', categories.map((c, i) => ({ ...c, sort: i })));
  if (isEmpty('products')) {
    const catId = Object.fromEntries(db.prepare('SELECT id, slug FROM categories').all().map((c) => [c.slug, c.id]));
    const { slugify } = require('./lib/util');
    insertAll(
      'products',
      products.map(({ cat, ...p }) => ({ ...p, slug: slugify(p.name), category_id: catId[cat] || null, gallery: '[]' }))
    );
  }
  if (isEmpty('faqs')) insertAll('faqs', faqs.map(([question, answer], i) => ({ question, answer, sort: i })));
  if (isEmpty('posts')) {
    const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 19).replace('T', ' ');
    insertAll('posts', posts.map((p, i) => ({ ...p, cover: '', published_at: day(i * 7 + 1) })));
  }
  if (isEmpty('factories')) {
    const rows = loadPrivateFactories();
    insertAll('factories', rows);
    if (rows.length) console.log(`[seed] imported ${rows.length} factories from private/factories.json`);
  }
  console.log('[seed] content ready');
}

// Prefer the committed content snapshot (content/*.json) over the built-in defaults.
function runFromContentOrDefaults() {
  const content = require('./lib/content');
  if (content.hasSnapshot()) {
    content.importSnapshot();
    if (isEmpty('factories')) run(); // factories are internal and never in the snapshot
  } else run();
}

module.exports = { run, runFromContentOrDefaults };
if (require.main === module) runFromContentOrDefaults();
