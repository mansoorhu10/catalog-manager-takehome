import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Package, Check, X } from "lucide-react";
import { fetchProduct, deleteProduct, updateVariant } from "@/lib/api";
import type { ProductDetail, Variant } from "@/types";
import { formatPrice, cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);

  function loadProduct() {
    if (!id) return;
    fetchProduct(Number(id))
      .then((r) => r.json())
      .then(setProduct)
      .catch(console.error);
  }

  useEffect(() => {
    loadProduct();
  }, [id]);

  // Delete handler — sends soft-delete request.
  // FIXME: The button does not disable while the request is in flight,
  //        so rapid clicks can send multiple DELETE requests.
  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    await deleteProduct(Number(id));
    navigate("/products");
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      {/* Product header — card style */}
      <div className="mb-6 rounded-lg border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {product.name}
            </h1>
            {product.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {product.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  product.status === "active"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : product.status === "draft"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-gray-100 text-gray-600"
                )}
              >
                {product.status}
              </span>
              {product.category_name && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {product.category_name}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Variants table — card wrapped like CatalogList */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Variants ({product.variants.length})
        </h2>

        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b bg-muted/50 transition-colors">
                  <th className="h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Price
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Inventory
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {product.variants.map((v) => (
                  <VariantRow key={v.id} variant={v} onUpdated={loadProduct} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VariantRow({ variant, onUpdated }: { variant: Variant; onUpdated: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [price, setPrice] = useState((variant.price_cents / 100).toFixed(2));
  const [inventory, setInventory] = useState(variant.inventory_count.toString());
  const[error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const lowStock =
    variant.inventory_count > 0 && variant.inventory_count <= 10;
  const outOfStock = variant.inventory_count === 0;

  function startEdit() {
    setPrice((variant.price_cents / 100).toFixed(2));
    setInventory(String(variant.inventory_count));
    setError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setError(null);
  }

  async function handleSave() {
    const priceValue = parseFloat(price);
    const inventoryValue = parseInt(inventory, 10);
    if (price === "" || isNaN(priceValue) || priceValue < 0) {
      setError("Price must be a number >= 0");
      return;
    }
    if (inventory === "" || isNaN(inventoryValue) || inventoryValue < 0) {
      setError("Inventory count must be a number >= 0");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const res = await updateVariant(variant.id, {
        price_cents: Math.round(priceValue * 100),
        inventory_count: inventoryValue,
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to update variant.");
        return;
      }
      
      setIsEditing(false);
      onUpdated();
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <tr className="border-b bg-muted/30">
        <td className="p-4 align-middle font-mono text-xs">{variant.sku}</td>
        <td className="p-4 align-middle font-medium">{variant.name}</td>
        <td className="p-4 text-right align-middle">
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-8 w-24 rounded-md border border-input bg-background px-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </td>
        <td className="p-4 text-right align-middle">
          <input
            type="number"
            step="1"
            min="0"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            className="h-8 w-20 rounded-md border border-input bg-background px-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </td>
        <td className="p-4 align-middle">
          <div className="flex items-center justify-end gap-2">
            {error && (
              <span className="text-xs text-destructive">{error}</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300/50 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-3 w-3" />
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle font-mono text-xs">
        {variant.sku}
      </td>
      <td className="p-4 align-middle font-medium">{variant.name}</td>
      <td className="p-4 text-right align-middle tabular-nums">
        {formatPrice(variant.price_cents)}
      </td>
      <td className="p-4 text-right align-middle tabular-nums">
        <span
          className={cn(
            outOfStock && "text-destructive",
            lowStock && "text-amber-600"
          )}
        >
          {variant.inventory_count}
          {outOfStock && (
            <Package className="ml-1 inline h-3.5 w-3.5 text-destructive/60" />
          )}
        </span>
      </td>
      <td className="p-4 text-right align-middle">
        <button
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={startEdit}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </td>
    </tr>
  );
}
