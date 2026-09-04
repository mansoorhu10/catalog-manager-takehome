# Submission

**Candidate name:** Mansoor Syed
**Date:** September 4, 2026
**Time spent:** _Approximate hours_

---

## Completed Tasks

Check off what you finished:

- [ ] Task 1 — Create Product
- [ ] Task 2 — Update Variant
- [x] Task 3 — Fix soft-delete bug
- [ ] Task 4 — Loading & error states
- [ ] Task 5 — Input validation

---

## Approach & Decisions

_Briefly describe the approach you took for each task. Mention any trade-offs you made or alternative approaches you considered._

### Task 1

### Task 2

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
