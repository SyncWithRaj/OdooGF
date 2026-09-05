const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAiEngine() {
  console.log('🔬 === DEALFLOW360 AI RECOMMENDATION DEEP AUDIT & MATH VERIFICATION ===\n');

  // 1. Fetch transactions directly from database
  const pastQuotes = await prisma.quotation.findMany({
    select: {
      id: true,
      quoteNumber: true,
      lines: {
        select: {
          productId: true,
          product: {
            select: { sku: true, name: true, baseCost: true, basePrice: true, isPromoted: true }
          }
        }
      }
    },
    take: 500,
  });

  const baskets = pastQuotes
    .map(q => Array.from(new Set(q.lines.map(l => l.productId))))
    .filter(b => b.length > 0);

  const multiItemBaskets = baskets.filter(b => b.length > 1);

  console.log(`📊 Total Quotation Baskets: ${baskets.length}`);
  console.log(`📦 Multi-item Baskets (>=2 products): ${multiItemBaskets.length}`);

  // Product catalog lookup
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, category: true, baseCost: true, basePrice: true, isPromoted: true },
  });
  const prodMap = new Map(products.map(p => [p.id, p]));

  // Pick a target base product: Laptop Pro 14
  const laptop = products.find(p => p.sku === 'HW-LAP-PRO14') || products[0];
  console.log(`\n🎯 Testing Base Product: ${laptop.name} [SKU: ${laptop.sku}] (ID: ${laptop.id})`);

  // Count how many baskets contain Laptop
  const laptopBaskets = baskets.filter(b => b.includes(laptop.id));
  console.log(`   Appearances in transactions: ${laptopBaskets.length} / ${baskets.length} (Support = ${(laptopBaskets.length / baskets.length).toFixed(4)})`);

  // Check co-occurring products
  const coOccurrences = new Map();
  for (const b of laptopBaskets) {
    for (const pid of b) {
      if (pid === laptop.id) continue;
      coOccurrences.set(pid, (coOccurrences.get(pid) || 0) + 1);
    }
  }

  console.log(`\n📈 Direct Co-Occurrence Frequencies with ${laptop.name}:`);
  const sortedCo = Array.from(coOccurrences.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedCo.length === 0) {
    console.log('   ⚠️ No historical multi-product quotes contain this item yet.');
  } else {
    for (const [pid, count] of sortedCo.slice(0, 5)) {
      const p = prodMap.get(pid);
      const suppAB = count / baskets.length;
      const suppA = laptopBaskets.length / baskets.length;
      const suppB = baskets.filter(b => b.includes(pid)).length / baskets.length;
      const confidence = suppAB / suppA;
      const lift = confidence / (suppB || 0.0001);
      const marginPct = p ? (((p.basePrice - p.baseCost) / p.basePrice) * 100).toFixed(1) : 0;
      const promoBoost = p?.isPromoted ? 1.3 : 1.0;
      const compositeScore = (lift * (marginPct / 100) * promoBoost * 10).toFixed(2);

      console.log(`   → ${p?.name || pid}:`);
      console.log(`       Co-purchases: ${count} times`);
      console.log(`       Support(A ∩ B): ${(suppAB * 100).toFixed(2)}%`);
      console.log(`       Confidence(A → B): ${(confidence * 100).toFixed(1)}%`);
      console.log(`       Lift: ${lift.toFixed(2)}x ${lift > 1 ? '(Positive Affinity)' : '(Independent)'}`);
      console.log(`       Gross Margin: ${marginPct}% (Price: $${p?.basePrice}, Cost: $${p?.baseCost})`);
      console.log(`       Promoted Flag: ${p?.isPromoted ? 'YES (1.3x Boost)' : 'NO'}`);
      console.log(`       ⭐ DealFlow360 Composite Score: ${compositeScore}`);
    }
  }

  // 2. Check Admin Curated Rules
  const curated = await prisma.adminCuratedUpsell.findMany({
    where: { baseProductId: laptop.id, isActive: true },
    include: { recommendedProduct: true },
    orderBy: { rank: 'asc' },
  });

  console.log(`\n👑 Admin Curated Rules for ${laptop.name}: ${curated.length} rules found`);
  for (const c of curated) {
    console.log(`   Rank ${c.rank}: ${c.recommendedProduct.name} [${c.recommendedProduct.sku}] (Status: Active)`);
  }

  // 3. Check Warehouse Stock Availability Filter
  console.log(`\n🏢 Warehouse Stock Availability for Candidates:`);
  const sampleCandidates = [products[1], products[2], products[4]].filter(Boolean);
  for (const cand of sampleCandidates) {
    const stockAgg = await prisma.warehouseStock.aggregate({
      where: { productId: cand.id },
      _sum: { available: true, inStock: true, reserved: true },
    });
    const totalAvail = stockAgg._sum.available || 0;
    console.log(`   - ${cand.name} (${cand.category}): Total Available Stock = ${totalAvail} units across all warehouses`);
  }

  await prisma.$disconnect();
}

verifyAiEngine().catch(e => {
  console.error(e);
  process.exit(1);
});
