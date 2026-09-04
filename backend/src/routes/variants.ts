import { Router } from "express";
import db from "../db.js";

const router = Router();

/**
 * GET /api/variants/:id
 * Get a single variant.
 */
router.get("/:id", (req, res) => {
  try {
    const variant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(Number(req.params.id));

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    res.json(variant);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/variants/:id
 * Update a variant's price and/or inventory.
 *
 * Expected body (all fields optional):
 * {
 *   "name": "Updated Name",
 *   "sku": "NEW-SKU",
 *   "price_cents": 1999,
 *   "inventory_count": 50
 * }
 */
router.put("/:id", (_req, res) => {
  // TODO: Implement variant update
  // 1. Validate that the variant exists
  // 2. Validate: price_cents >= 0, inventory_count >= 0, sku is unique (if changed)
  // 3. Update the variant in the database
  // 4. Return the updated variant

  try {
    const id = Number(_req.params.id);
    const { name, sku, price_cents, inventory_count } = _req.body;

    const existing = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!existing) {
      return res.status(404).json({ error: "Variant not found" });
    }

    if (price_cents !== undefined && (typeof price_cents !== "number" || price_cents < 0)) {
      return res.status(400).json({ error: "price_cents must be a number >= 0" });
    }
    if (inventory_count !== undefined && (typeof inventory_count !== "number" || inventory_count < 0)) {
      return res.status(400).json({ error: "inventory_count must be a number >= 0" });
    }
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }
    if (sku !== undefined) {
      if (typeof sku !== "string" || !sku.trim()) {
        return res.status(400).json({ error: "sku must be a non-empty string" });
      }
      const clash = db
        .prepare("SELECT id FROM variants WHERE sku = ? and id != ?")
        .get(sku.trim(), id);
      if (clash) {
        return res.status(400).json({ error: "SKU already exists" });
      }
    }

    db.prepare(
      `UPDATE variants
      SET name = COALESCE(?, name),
          sku = COALESCE(?, sku),
          price_cents = COALESCE(?, price_cents),
          inventory_count = COALESCE(?, inventory_count),
          updated_at = datetime('now')
        WHERE id = ?`
    ).run(
      name?.trim(),
      sku?.trim(),
      price_cents ?? null,
      inventory_count ?? null,
      id
    );

    const updated = db.prepare("SELECT * FROM variants WHERE id = ?").get(id);
    res.json(updated);
  
  } catch (err: any) {
    if (typeof err?.code === "string" && err.code.startsWith("SQLITE_CONSTRAINT")) {
      return res.status(400).json({ error: "A variant SKU already exists" });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send(message);
  }
});

/**
 * DELETE /api/variants/:id
 * Delete a variant permanently.
 */
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const variant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    // Prevent deleting the last variant of a product
    const siblingCount = db
      .prepare(
        "SELECT COUNT(*) AS count FROM variants WHERE product_id = ?"
      )
      .get(variant.product_id as number) as { count: number };

    if (siblingCount.count <= 1) {
      return res
        .status(400)
        .json({ error: "Cannot delete the last variant of a product" });
    }

    db.prepare("DELETE FROM variants WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
