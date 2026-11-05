# EXMARK ERP — Phase 2: Core Sales & Measurements Implementation Plan

## What We're Building

Phase 2 fills in the real functional backend for the 4 most critical sales modules:
1. **Customers** — CRUD API + connected UI (replaces demo data)
2. **CRM & Leads** — Pipeline CRUD API + connected Kanban UI
3. **Quotations** — Quote builder with FRP pricing, 18% GST + PDF-ready UI
4. **BOQ Management** — BOQ master with line items, import, revision

## Architecture

```
app/api/
  customers/         GET (list+search), POST (create)
    [id]/            GET (detail), PUT (update), DELETE (archive)
  crm/
    leads/           GET (list+filter), POST (create)
      [id]/          GET, PUT, DELETE
    follow-ups/      GET, POST
  quotations/        GET (list), POST (create)
    [id]/            GET, PUT, DELETE
    [id]/convert/    POST (to sales order)
  boq/               GET, POST
    [id]/            GET, PUT, DELETE
    [id]/items/      GET, POST
    [id]/convert/    POST (to quotation)

lib/services/
  customerService.ts   — Customer CRUD, dual-write (PostgreSQL + JSON fallback)
  crmService.ts        — Lead CRUD, pipeline stages, follow-ups
  quotationService.ts  — Quote builder, GST calc (18%, HSN 3925.20.00), line items
  boqService.ts        — BOQ master, items, import, revisions

components/modules/
  customers/
    CustomerFormModal.tsx   — Add/Edit customer form
    CustomerDetailPanel.tsx — Customer full profile view
  crm/
    LeadFormModal.tsx       — Add/Edit lead
    FollowUpModal.tsx       — Schedule follow-up
  quotations/
    QuotationBuilder.tsx    — Full quote builder with item rows + GST
    QuotationPreview.tsx    — A4 PDF-ready preview
  boq/
    BoqBuilder.tsx          — BOQ line item editor
    BoqImport.tsx           — CSV import

data/
  customers-store.json    — JSON fallback store
  leads-store.json        — JSON fallback store
  quotations-store.json   — JSON fallback store
  boq-store.json          — JSON fallback store

scripts/
  test-phase2.ts          — Automated test suite
```

## Key Business Rules

- **Square-foot pricing**: `area_sqft = (height_mm / 304.8) × (width_mm / 304.8)`
- **GST**: 18% on FRP doors (HSN 3925.20.00); CGST 9% + SGST 9% for Kerala intra-state
- **Customer Decision vs Internal Order Status**: These are SEPARATE fields — never conflate
- **Advance payment required**: Production release blocked until advance payment recorded
- **WPC filter**: When WPC is OFF, hide WPC options from quotes and BOQ
- **Lead stages**: NEW → MEASUREMENT_SCHEDULED → QUOTE_SENT → NEGOTIATION → WON/LOST
