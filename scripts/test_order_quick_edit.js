const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = 'devx-pos-secure-jwt-secret-key-32chars-minimum!';
const token = jwt.sign(
  {
    id: 'cmvrtax2v00000swqrpleclyr',
    email: 'devxub@gmail.com',
    name: 'jubayer',
    role: 'admin',
  },
  JWT_SECRET,
);

async function runTests() {
  console.log('=== STARTING ORDER QUICK EDIT VERIFICATION SUITE ===\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      process.exitCode = 1;
    }
  }

  // Find a test order (ORD_1)
  const order1 = await prisma.order.findFirst({
    where: { orderCode: 'ORD_1' },
    include: { items: { include: { product: true } } },
  });

  if (!order1) {
    console.error('Order ORD_1 not found');
    return;
  }

  const initialItem = order1.items[0];
  const prod1Id = initialItem.productId;

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Quick Edit without changing products
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 1: Quick Edit without changing products ---');
  const p1Before = await prisma.product.findUnique({ where: { id: prod1Id } });
  const res1 = await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [
        {
          orderItemId: initialItem.id,
          productId: initialItem.productId,
          name: initialItem.name,
          code: initialItem.code,
          quantity: initialItem.quantity,
          price: Number(initialItem.price),
          subtotal: Number(initialItem.subtotal),
        },
      ],
    }),
  });

  assert(res1.status === 200, 'Test 1: Status 200 on unchanged quick edit');
  const o1After = await prisma.order.findUnique({
    where: { id: order1.id },
    include: { items: true },
  });
  assert(o1After.items[0].id === initialItem.id, 'Test 1: Order item ID preserved without delete/recreate');
  const p1After = await prisma.product.findUnique({ where: { id: prod1Id } });
  assert(p1After.quantity === p1Before.quantity, 'Test 1: Stock remains completely untouched');

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Update quantity and price
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Update quantity and price ---');
  const currentStock2 = p1After.quantity;
  const newQty = initialItem.quantity + 2; // +2 units
  const newPrice = 80;
  const newSubtotal = newQty * newPrice;

  const res2 = await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [
        {
          orderItemId: initialItem.id,
          productId: initialItem.productId,
          name: initialItem.name,
          code: initialItem.code,
          quantity: newQty,
          price: newPrice,
          subtotal: newSubtotal,
        },
      ],
    }),
  });

  assert(res2.status === 200, 'Test 2: Status 200 on quantity & price update');
  const data2 = await res2.json();
  assert(Number(data2.subtotal) === newSubtotal, 'Test 2: Subtotal calculated correctly');
  const p2After = await prisma.product.findUnique({ where: { id: prod1Id } });
  assert(p2After.quantity === currentStock2 - 2, 'Test 2: Product inventory decremented by 2');

  const stockMove2 = await prisma.stockMovement.findFirst({
    where: { orderId: order1.id },
    orderBy: { createdAt: 'desc' },
  });
  assert(stockMove2 && stockMove2.type === 'SALE' && stockMove2.quantity === -2, 'Test 2: SALE stock movement created for +2 ordered');

  // Restore back to original quantity
  await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [
        {
          orderItemId: initialItem.id,
          productId: initialItem.productId,
          name: initialItem.name,
          code: initialItem.code,
          quantity: initialItem.quantity,
          price: Number(initialItem.price),
          subtotal: Number(initialItem.subtotal),
        },
      ],
    }),
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Add and remove products
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Add and remove products ---');
  // Find second product PROD_2
  const prod2 = await prisma.product.findFirst({ where: { productCode: 'PROD_2' } });
  const p2InitialStock = prod2.quantity;

  // Add PROD_2 as second item to ORD_1
  const res3Add = await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [
        {
          orderItemId: initialItem.id,
          productId: initialItem.productId,
          name: initialItem.name,
          code: initialItem.code,
          quantity: initialItem.quantity,
          price: Number(initialItem.price),
          subtotal: Number(initialItem.subtotal),
        },
        {
          productId: prod2.id,
          name: prod2.productName,
          code: prod2.productCode,
          quantity: 1,
          price: Number(prod2.salePrice || prod2.regularPrice),
          subtotal: Number(prod2.salePrice || prod2.regularPrice),
        },
      ],
    }),
  });

  assert(res3Add.status === 200, 'Test 3: Status 200 on adding second product');
  const o3AfterAdd = await prisma.order.findUnique({
    where: { id: order1.id },
    include: { items: true },
  });
  assert(o3AfterAdd.items.length === 2, 'Test 3: Order now contains 2 items');
  const p2AfterAdd = await prisma.product.findUnique({ where: { id: prod2.id } });
  assert(p2AfterAdd.quantity === p2InitialStock - 1, 'Test 3: Added product stock decremented by 1');

  // Now remove PROD_2 from ORD_1
  const res3Remove = await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [
        {
          orderItemId: initialItem.id,
          productId: initialItem.productId,
          name: initialItem.name,
          code: initialItem.code,
          quantity: initialItem.quantity,
          price: Number(initialItem.price),
          subtotal: Number(initialItem.subtotal),
        },
      ],
    }),
  });

  assert(res3Remove.status === 200, 'Test 3: Status 200 on removing second product');
  const o3AfterRemove = await prisma.order.findUnique({
    where: { id: order1.id },
    include: { items: true },
  });
  assert(o3AfterRemove.items.length === 1, 'Test 3: Order is back to 1 item');
  const p2AfterRemove = await prisma.product.findUnique({ where: { id: prod2.id } });
  assert(p2AfterRemove.quantity === p2InitialStock, 'Test 3: Removed product stock restored back to inventory');

  const stockMove3 = await prisma.stockMovement.findFirst({
    where: { orderId: order1.id, productId: prod2.id },
    orderBy: { createdAt: 'desc' },
  });
  assert(stockMove3 && stockMove3.type === 'RETURN' && stockMove3.quantity === 1, 'Test 3: RETURN stock movement created for removed product');

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Try saving with a deleted / invalid product
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Try saving with deleted or invalid product ---');
  // 4a. Bogus non-existent product ID
  const res4Invalid = await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [
        {
          productId: 'bogus_non_existent_cuid_1234567890',
          name: 'Phantom Item',
          quantity: 1,
          price: 50,
          subtotal: 50,
        },
      ],
    }),
  });

  assert(res4Invalid.status === 400, 'Test 4a: Status 400 for non-existent product ID');
  const err4Data = await res4Invalid.json();
  assert(err4Data.error === 'Invalid product' && err4Data.invalidProductId === 'bogus_non_existent_cuid_1234567890', 'Test 4a: Clear validation error identifying invalid product');

  // 4b. Soft-deleted product
  const deletedProd = await prisma.product.findFirst({ where: { isDeleted: true } });
  if (deletedProd) {
    const res4Deleted = await fetch(`http://localhost:3000/api/orders/${order1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [
          {
            productId: deletedProd.id,
            name: deletedProd.productName,
            quantity: 1,
            price: 50,
            subtotal: 50,
          },
        ],
      }),
    });

    assert(res4Deleted.status === 400, 'Test 4b: Status 400 for adding soft-deleted product');
    const errDelData = await res4Deleted.json();
    assert(errDelData.error === 'Product unavailable', 'Test 4b: Clear validation error for archived product');
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Verify database records remain consistent
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Verify database records remain consistent ---');
  const finalOrder = await prisma.order.findUnique({
    where: { id: order1.id },
    include: { items: { include: { product: true } } },
  });
  assert(finalOrder.items.length === 1, 'Test 5: Order item count consistent');
  assert(finalOrder.items[0].productId === prod1Id, 'Test 5: Valid Product foreign key preserved');

  console.log(`\n=== TEST RESULTS: ${passed}/${total} PASSED ===\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
