import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Category } from "@/types";
import { useEffect, useState } from "react";
import { createProduct, fetchCategories } from "@/lib/api";

interface VariantFormState {
  sku: string;
  name: string;
  price: string; // in dollars, typed (e.g. "9.99")
  inventory_count: string;
}

const emptyVariant = (): VariantFormState => ({
  sku: "",
  name: "",
  price: "",
  inventory_count: "",
});

export default function CreateProductPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [variants, setVariants] = useState<VariantFormState[]>([emptyVariant()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories().then((data) => data.json()).then(setCategories).catch(() => {});
  }, []);

  function updateVariant(index: number, field: keyof VariantFormState, value: string) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }
  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }
  function removeVariant(index: number) {
    setVariants((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Product name is required");
    variants.forEach((variant, i) => {
      if (!variant.sku.trim()) errs.push(`Variant ${i + 1}: SKU is required`);
      if (!variant.name.trim()) errs.push(`Variant ${i + 1}: Name is required`);
      const price = parseFloat(variant.price);
      if (variant.price === "" || isNaN(price) || price < 0) errs.push(`Variant ${i + 1}: Price must be >= 0`);
      const inventory = parseInt(variant.inventory_count, 10);
      if (variant.inventory_count === "" || isNaN(inventory) || inventory < 0) errs.push(`Variant ${i + 1}: Inventory count must be >= 0`);
    });
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const clientErrors = validate();
    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }
    
    setErrors([]);
    setSubmitting(true);

    try {
      const res = await createProduct({
        name: name.trim(),
        description: description.trim() || undefined,
        category_id: categoryId || undefined,
        status,
        variants: variants.map((variant) => ({
          sku: variant.sku.trim(),
          name: variant.name.trim(),
          price_cents: Math.round(parseFloat(variant.price) * 100),
          inventory_count: Number(variant.inventory_count),
        })),
      });

      if(!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrors([body.error || "Failed to create product"]);
        return;
      }

      const createdProduct = await res.json();
      navigate(`/products/${createdProduct.id}`);

    } catch (err) {
      console.error("Error creating product:", err);
      setErrors(["Failed to create product"]);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div>
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Create New Product
      </h1>

      {/* ----------------------------------------------------------------
          TODO: Build the create-product form here.

          The form should collect:
            - Product name (required)
            - Description (optional)
            - Category (select from existing categories)
            - Status (active / draft)
            - At least one variant with:
                - SKU (required, must be unique)
                - Variant name (required)
                - Price (>= 0)
                - Inventory count (>= 0)

          On submit, POST to /api/products (see backend route for expected body shape).
          On success, redirect to the new product's detail page.
       ---------------------------------------------------------------- */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <ul className="list-inside list-disc space-y-1">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Product Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bell Peppers"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "draft")}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Variants</h2>
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Add Variant
            </button>
          </div>

          <div className="space-y-4">
            {variants.map((variant, index) => (
              <VariantFields
                key={index}
                index={index}
                variant={variant}
                canRemove={variants.length > 1}
                onChange={updateVariant}
                onDelete={removeVariant}
              />
            ))}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#2E3330] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3a3f3c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface VariantFieldsProps {
  index: number;
  variant: VariantFormState;
  canRemove: boolean;
  onChange: (index: number, field: keyof VariantFormState, value: string) => void;
  onDelete: (index: number) => void;
}

function VariantFields({ index, variant, canRemove, onChange, onDelete }: VariantFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-md border p-4 sm:grid-cols-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          SKU <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={variant.sku}
          onChange={(e) => onChange(index, "sku", e.target.value)}
          placeholder="e.d. ABC-123"
          className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={variant.name}
          onChange={(e) => onChange(index, "name", e.target.value)}
          placeholder="e.d. 4oz (case of 20)"
          className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Price ($) <span className="text-destructive">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={variant.price}
          onChange={(e) => onChange(index, "price", e.target.value)}
          placeholder="0.00"
          className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Inventory <span className="text-destructive">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={variant.inventory_count}
          onChange={(e) => onChange(index, "inventory_count", e.target.value)}
          placeholder="0"
          className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="flex items-end justify-end">
        <button
          type="button"
          onClick={() => onDelete(index)}
          disabled={!canRemove}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-background px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    </div>
  );
}
