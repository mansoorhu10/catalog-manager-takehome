import { Router } from "express";
import db from "../db.js";

const router = Router();

/**
 * GET /api/products
 * List all products with category name, variant count, and price/inventory aggregates.
 * Supports optional query params: ?search=term&category_id=1
 */
router.get("/", (req, res) => {
  try {
    const { search, category_id } = req.query;

    let query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.category_id,
        c.name AS category_name,
        p.status,
        p.deleted_at,
        p.created_at,
        p.updated_at,
        COUNT(v.id) AS variant_count,
        MIN(v.price_cents) AS min_price_cents,
        MAX(v.price_cents) AS max_price_cents,
        COALESCE(SUM(v.inventory_count), 0) AS total_inventory
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN variants v ON v.product_id = p.id
    `;

    const conditions: string[] = ["p.deleted_at IS NULL"];
    const params: unknown[] = [];

    if (search) {
      conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category_id) {
      conditions.push("p.category_id = ?");
      params.push(Number(category_id));
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " GROUP BY p.id ORDER BY p.created_at DESC";

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err: unknown) {
    // FIXME: sends plain text error — should this be JSON to match other responses?
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send(message);
  }
});

/**
 * GET /api/products/:id
 * Get a single product with its variants.
 */
router.get("/:id", (req, res) => {
  try {
    const product = db
      .prepare(
        `SELECT p.*, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(Number(req.params.id)) as Record<string, unknown> | undefined;

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const variants = db
      .prepare(
        `SELECT * FROM variants WHERE product_id = ? ORDER BY created_at ASC`
      )
      .all(Number(req.params.id));

    res.json({ ...product, variants });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send(message);
  }
});

/**
 * POST /api/products
 * Create a new product with at least one variant.
 *
 * Expected body:
 * {
 *   "name": "Product Name",
 *   "description": "Optional description",
 *   "category_id": 1,
 *   "status": "active",
 *   "variants": [
 *     { "sku": "SKU-001", "name": "Default", "price_cents": 999, "inventory_count": 10 }
 *   ]
 * }
 */
router.post("/", (_req, res) => {
  // TODO: Implement product creation
  // 1. Validate required fields (name is required, variants array must have at least one entry)
  // 2. Validate each variant (sku required + unique, price_cents >= 0, inventory_count >= 0)
  // 3. Insert product and variants inside a transaction
  // 4. Return the created product with its variants
  try {
    const { name, description, category_id, status, variants } = _req.body;

    // Product validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }
    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ error: "At least one variant is required" });
    }

    // Per-variant validation
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (!variant.sku || typeof variant.sku !== "string" || !variant.sku.trim()) {
        return res.status(400).json({ error: `Variant at index ${i} is missing a valid SKU` });
      }
      if (!variant?.name || typeof variant.name !== "string" || !variant.name.trim()) {
        return res.status(400).json({ error: `Variant at index ${i} is missing a valid name` });
      }
      if (typeof variant.price_cents !== "number" || variant.price_cents < 0) {
        return res.status(400).json({ error: `Variant at index ${i} has an invalid price (price_cents must be >= 0)` });
      }
      if (typeof variant.inventory_count !== "number" || variant.inventory_count < 0) {
        return res.status(400).json({ error: `Variant at index ${i} has an invalid inventory count (inventory_count must be >= 0)` });
      }
    }

    // SKU uniqueness check
    const skus: string[] = variants.map((variant) => variant.sku.trim());
    if (new Set(skus).size !== skus.length) {
      return res.status(400).json({ error: "Duplicate SKUs found in variants" });
    }
    const placeholders = skus.map(() => "?").join(",");
    const clashes = db
      .prepare(`SELECT sku FROM variants WHERE sku IN (${placeholders})`)
      .all(...skus);
    if (clashes.length > 0) {
      return res.status(400).json({ error: "One or more SKUs already exist in the database" });
    }

    // Insert product and variants in a transaction
    const insertProduct = db.prepare(
      `INSERT INTO products (name, description, category_id, status) VALUES (?, ?, ?, ?)`
    );
    const insertVariant = db.prepare(
      `INSERT INTO variants (product_id, sku, name, price_cents, inventory_count) VALUES (?, ?, ?, ?, ?)`
    );

    const createProductTx = db.transaction(() => {
      const result = insertProduct.run(
        name.trim(),
        description ?? null,
        category_id ?? null,
        status ?? "active"
      );
      const productId = Number(result.lastInsertRowid);
      for (const variant of variants) {
        insertVariant.run(
          productId,
          variant.sku.trim(),
          variant.name.trim(),
          variant.price_cents,
          variant.inventory_count
        );
      }
        return productId;
      });

      const productId = createProductTx();

      // Return with the expected shape
      const product = db
        .prepare(
          `SELECT p.*, c.name AS category_name FROM products p
          LEFT JOIN categories c on p.category_id = c.id WHERE p.id = ?`
        )
        .get(productId);
      const createdVariants = db
        .prepare(`SELECT * FROM variants WHERE product_id = ? ORDER BY created_at ASC`)
        .all(productId);
      
      res.status(201).json({ ...(product as Record<string, unknown>), variants: createdVariants });
    } catch (err: any) {
      if (typeof err?.code === "string" && err.code.startsWith("SQLITE_CONSTRAINT")) {
        return res.status(400).json({ error: "A variant SKU already exists" });
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).send(message);
    }
});

/**
 * PUT /api/products/:id
 * Update a product's basic information.
 */
router.put("/:id", (req, res) => {
  try {
    const { name, description, category_id, status } = req.body;
    const id = Number(req.params.id);

    const existing = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    db.prepare(
      `UPDATE products
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           category_id = COALESCE(?, category_id),
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(name ?? null, description ?? null, category_id ?? null, status ?? null, id);

    const updated = db
      .prepare(
        `SELECT p.*, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(id);

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send(message);
  }
});

/**
 * DELETE /api/products/:id
 * Soft-delete a product (sets deleted_at timestamp).
 */
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);

  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  if (!product) {
    // FIXME: Returns plain text — not JSON like other error responses
    return res.status(404).send("Product not found");
  }

  db.prepare(
    `UPDATE products SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(id);

  res.json({ success: true });
});

export default router;
