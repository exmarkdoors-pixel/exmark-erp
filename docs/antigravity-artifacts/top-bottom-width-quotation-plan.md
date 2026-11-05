# Implementation Plan: Top Width & Bottom Width Option in Quotation Section

## 1. Goal Description
In door manufacturing, masonry openings and door frames frequently exhibit wall tapering or out-of-plumb variation where the **Top Width** differs from the **Bottom Width**. 

Currently, the Quotation Section (`QuotationHub.tsx`) specifies a single width field. This plan enhances the width option in `QuotationHub.tsx` to support **Top Width** ($W_{\text{Top}}$) and **Bottom Width** ($W_{\text{Bottom}}$) with independent whole-number inputs and 16th-inch fraction select dropdowns when the unit is set to `inch`.

---

## 2. User Review Required

> [!IMPORTANT]
> **Square Footage (Area) Calculation Choice:**
> When Top Width and Bottom Width differ (e.g. Top = $32"$, Bottom = $32\frac{1}{8}"$):
> - **Option A (Industry Standard - Recommended):** Average Width $W_{\text{eff}} = \frac{W_{\text{Top}} + W_{\text{Bottom}}}{2}$ for exact surface area (matching `DoorMeasurementModal.tsx`).
> - **Option B (Bounding Box):** $\max(W_{\text{Top}}, W_{\text{Bottom}})$ representing the raw rectangular sheet blanking from which the door is CNC-trimmed.
>
> *Defaulting to Option A (Average Width), with both Top and Bottom dimensions preserved for production cutting schedules.*

> [!TIP]
> **Smart Auto-Sync:**
> To keep data entry fast for standard rectangular doors:
> When typing into **Top Width**, if **Bottom Width** has not been modified separately, it automatically mirrors Top Width. When a door has tapered jambs, changing Bottom Width decouples it for precise customization.

---

## 3. Proposed Changes

### 3.1 Data Model Updates (`QuoteItemRow` in `QuotationHub.tsx`)
```typescript
export interface QuoteItemRow {
  id: number;
  modelId: string;
  unit: 'cm' | 'mm' | 'inch';
  height: number;
  heightFraction?: string;
  
  // Width specification: Top & Bottom
  widthTop: number;
  widthTopFraction?: string;      // e.g. '0', '1/16', '1/8', ...
  widthBottom: number;
  widthBottomFraction?: string;   // e.g. '0', '1/16', '1/8', ...
  
  // Backward compatibility legacy accessors
  width: number;
  widthFraction?: string;
  
  qty: number;
  rate: number;
}
```

---

### 3.2 Area Calculation Logic (`calculateSqFt`)
```typescript
export const calculateSqFt = (
  h: number,
  wTop: number,
  wBottom: number,
  unit: 'cm' | 'mm' | 'inch',
  hFrac?: string,
  wTopFrac?: string,
  wBottomFrac?: string
): string => {
  let hInches = h;
  let wTopInches = wTop;
  let wBottomInches = wBottom || wTop; // Fallback to wTop if wBottom not provided

  if (unit === 'inch') {
    hInches = h + parseInchFraction(hFrac);
    wTopInches = wTop + parseInchFraction(wTopFrac);
    wBottomInches = wBottom + parseInchFraction(wBottomFrac || wTopFrac);
  } else if (unit === 'cm') {
    hInches = h / 2.54;
    wTopInches = wTop / 2.54;
    wBottomInches = wBottom / 2.54;
  } else if (unit === 'mm') {
    hInches = h / 25.4;
    wTopInches = wTop / 25.4;
    wBottomInches = wBottom / 25.4;
  }

  const avgWidthInches = (wTopInches + wBottomInches) / 2;
  return ((hInches * avgWidthInches) / 144).toFixed(2);
};
```

---

### 3.3 UI Layout in Quotation Items Table
In `QuotationHub.tsx`, the **Dimensions (H × W)** cell will render:

```
┌────────────────────────────────────────────────────────┐
│ Height (H):    [ 80  ]  [ + 1/8"  ▾ ]                 │
│ Width (Top):   [ 32  ]  [   0"    ▾ ]                 │
│ Width (Bottom):[ 32  ]  [ + 3/16" ▾ ]  (17.88 sqft)   │
└────────────────────────────────────────────────────────┘
```

- When `unit !== 'inch'` (`cm` or `mm`):
  - Height: `[ 205 ]`
  - Width Top: `[ 75 ]` | Width Btm: `[ 75.2 ]`
  - Area: `(16.57 sqft)`

- **Sync Helper:**
  When editing `widthTop`, if `widthBottom === prevWidthTop`, `widthBottom` automatically updates to match unless specifically changed.

---

### 3.4 Proforma Invoice & Print Preview Formatting
In `#printableQuoteArea` and Quote Preview Modal:
- If $W_{\text{Top}} == W_{\text{Bottom}}$:
  `80 1/8" × 32" (17.81 sqft)`
- If $W_{\text{Top}} \neq W_{\text{Bottom}}$:
  `80 1/8" × [Top: 32" / Btm: 32 3/16"] (17.88 sqft)`
  *(Provides factory cutting operators and site carpenters complete taper tolerance data on the printout).*

---

## 4. Verification Plan

### 4.1 Automated Test Suite (`scripts/test-quotation-top-bottom-width.ts`)
1. **Identical Top & Bottom Widths:**
   - $80" \times (32" \text{ Top} + 32" \text{ Bottom}) = 80 \times 32 / 144 = 17.78$ sqft.
2. **Tapered Width with Fractions:**
   - Height: $80\frac{1}{8}"$ ($80.125$)
   - Top Width: $32"$ ($32.0$)
   - Bottom Width: $32\frac{3}{16}"$ ($32.1875$)
   - Average Width: $(32 + 32.1875) / 2 = 32.09375"$
   - Area: $80.125 \times 32.09375 / 144 = 17.857... \to 17.86$ sqft.
3. **Unit Conversions:**
   - Metric (`cm`, `mm`) to Inch with fractions converts both Top and Bottom dimensions.
   - Inch with fractions to Metric preserves Top and Bottom dimensions.
4. **Formatting Tests:**
   - Equal width renders clean single width: `80 1/8" × 32"`.
   - Unequal width renders dual width: `80 1/8" × [Top: 32" / Btm: 32 3/16"]`.

### 4.2 Application Verification
- Run `tsc --noEmit` to verify type safety.
- Verify `http://localhost:3000` quotation table and live preview.
- Commit and push to git `origin main`.
