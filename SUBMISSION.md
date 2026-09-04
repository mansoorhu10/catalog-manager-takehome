# Submission

**Candidate name:** Mansoor Syed
**Date:** September 4, 2026
**Time spent:** 4 hours (lost 45 minutes to environment setup bugs)

---

## Completed Tasks

Check off what you finished:

- [x] Task 1 — Create Product
- [x] Task 2 — Update Variant
- [x] Task 3 — Fix soft-delete bug
- [ ] Task 4 — Loading & error states
- [x] Task 5 — Input validation

---

## Approach & Decisions

_Briefly describe the approach you took for each task. Mention any trade-offs you made or alternative approaches you considered._

### Task 1

Kept the create-product-form logic in `CreateProductPage.tsx` instead of extracting it into a seperate `CreateProductForm` component. As of now, only one page uses this form, so I believe it is alright to put the product form in the product page directly. Given the time constraints, I decided it would be easier now to wire in everything in the page itself. If required in the future, this could be refactored to extract out the form for reuse and instead use props. Also, I decided to make it so that when creating a product, the user can create multiple variants and add them at once. This was mainly for better UX so that the user would not have to create one variant with their product, and then later update or add on to the existing product just to add more variants. Additionally, I decided to do parts of task 5 while developing task 1 since it made more sense to save time by adding validation while I am creating the form and API endpoint.

### Task 2

The API route's docstring for update mentioned that name/sku are optional update fields so I kept the full-contract server-side even though task 2's scope in README is limited strictly to price and inventory updates. I decided to build inline row-editing for the variants instead of a modal since building the modal would have to be from scratch since there aren't any existing modal components in the codebase. With inline-editing I can resuse the existing table structure. I decided to extract out loading the product into a function that is called when the component loads the first time with a useEffect as well as everytime the variants are updated since managing local state since it's simpler to implement given the time constraints. 

### Task 3

To fix this bug, I noticed that there is an existing piece of code that shows how products should be queried in `categories.ts`. The GET query left joins with the products table but uses "AND p.deleted_at IS NULL" to ensure that products that are soft-deleted are not included in the query. I knew I had to apply this to product querying, but simply adding the "AND p.deleted_at IS NULL" to the query itself might mess up how search and filtering products by categories works. I decided to edit the conditions array to automatically always ensure that products being queried must not be null alongside any serach or filter conditions.

### Task 4

### Task 5

---

## What I'd improve with more time

_What would you add, refactor, or fix if you had another couple of hours?_

The soft-delete bug could potentially affect the GET request by ID for products as well. If I had more time I would look into this and try to fix it. 

---

## Anything else?

_Optional — anything you want the reviewer to know (e.g. bugs you noticed, improvements you'd suggest to the existing code, etc.)._

I would suggest improving delete confirmation from being an HTML alert to an actual React component so that it fits with the design of the app.

I think the "View" button on each product item is redundant and a simpler design that indicates that each product is clickable leads to a better UX experience where each product card is not overcrowded. Additionally, there are ways to improve accessibility for each product card without having to include the word "View" in the product card itself. 

I noticed an edge case where trying to create a new product with a variant SKU that is the same of an SKU variant that was apart of a deleted product throws the unique SKU error. There could be a valid reason to keep variant SKUs in the database even if they are apart of a deleted product, since in the rea world, products may still keep their unique SKUs and freeing up an SKU might lead to conflicts later on. At the same time, a user who deletes a product and tries to re-create it with an SKU that is not attached to an existing product may get confused since there is no visible SKU variant that they can see attached to a different product. I decided against trying to fix this since it's not immediately clear whether it's intended or not.