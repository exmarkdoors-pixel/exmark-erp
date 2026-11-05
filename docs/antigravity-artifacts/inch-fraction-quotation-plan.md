# Implementation Plan: Inch Fraction Select Options (1/16", 1/8", etc.) in Quotation Section

## 1. Overview & Objective
In door manufacturing and carpentry, measurements taken in inches rarely fall on exact whole inches; tape measurements commonly include fractions such as $1/16"$, $1/8"$, $3/16"$, $1/4"$, $5/16"$, $3/8"$, $7/16"$, $1/2"$, $9/16"$, $5/8"$, $11/16"$, $3/4"$, $13/16"$, $7/8"$, and $15/16"$.

This plan defines the addition of fraction select dropdowns for **both Height and Width** whenever the measurement unit is set to **`inch`** in the Quotation Section (`QuotationHub.tsx`), ensuring:
1. Carpenters, architects, and sales executives can select exact inch fractions alongside whole inches.
2. The square footage ($\text{Sq.Ft} = \frac{\text{Height} \times \text{Width}}{144}$) accurately computes fractional values down to 4 decimal places before rounding.
3. Quotation print previews and proforma documents render standard carpenter notation (e.g. `80 1/8" × 32 3/16" (17.92 sqft)`).
4. Smooth bi-directional unit conversion (cm $\leftrightarrow$ mm $\leftrightarrow$ inch) converts fractional inches to metric and metric to nearest 1/16th fraction.

---

## 2. Proposed Architecture & Fraction Table

### 2.1 The 16th-Inch Fraction Specification
The selector will provide 16 standard fraction options for tape measurement:

| Value (Dec) | Fraction String | Display Label | Note |
|---|---|---|---|
| `0.0000` | `'0'` | `0" (Exact)` | Whole inch only |
| `0.0625` | `'1/16'` | `+ 1/16"` | $\frac{1}{16}$ |
| `0.1250` | `'1/8'` | `+ 1/8"` | $\frac{2}{16} = \frac{1}{8}$ |
| `0.1875` | `'3/16'` | `+ 3/16"` | $\frac{3}{16}$ |
| `0.2500` | `'1/4'` | `+ 1/4"` | $\frac{4}{16} = \frac{1}{4}$ |
| `0.3125` | `'5/16'` | `+ 5/16"` | $\frac{5}{16}$ |
| `0.3750` | `'3/8'` | `+ 3/8"` | $\frac{6}{16} = \frac{3}{8}$ |
| `0.4375` | `'7/16'` | `+ 7/16"` | $\frac{7}{16}$ |
| `0.5000` | `'1/2'` | `+ 1/2"` | $\frac{8}{16} = \frac{1}{2}$ |
| `0.5625` | `'9/16'` | `+ 9/16"` | $\frac{9}{16}$ |
| `0.6250` | `'5/8'` | `+ 5/8"` | $\frac{10}{16} = \frac{5}{8}$ |
| `0.6875` | `'11/16'` | `+ 11/16"` | $\frac{11}{16}$ |
| `0.7500` | `'3/4'` | `+ 3/4"` | $\frac{12}{16} = \frac{3}{4}$ |
| `0.8125` | `'13/16'` | `+ 13/16"` | $\frac{13}{16}$ |
| `0.8750` | `'7/8'` | `+ 7/8"` | $\frac{14}{16} = \frac{7}{8}$ |
| `0.9375` | `'15/16'` | `+ 15/16"` | $\frac{15}{16}$ |

---

## 3. Detailed Changes by Component

### 3.1 Data Model Updates (`QuoteItemRow` in `QuotationHub.tsx`)
```typescript
export interface QuoteItemRow {
  id: number;
  modelId: string;
  unit: 'cm' | 'mm' | 'inch';
  height: number;
  heightFraction?: string; // '0', '1/16', '1/8', '3/16', '1/4', etc.
  width: number;
  widthFraction?: string;  // '0', '1/16', '1/8', '3/16', '1/4', etc.
  qty: number;
  rate: number;
}
```

### 3.2 Mathematical Calculation Logic
```typescript
export function parseFractionVal(fracStr?: string): number {
  if (!fracStr || fracStr === '0') return 0;
  const parts = fracStr.split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    return den > 0 ? num / den : 0;
  }
  return 0;
}

export function calculateSqFt(
  h: number,
  w: number,
  unit: 'cm' | 'mm' | 'inch',
  hFrac?: string,
  wFrac?: string
): string {
  let hInches = h;
  let wInches = w;

  if (unit === 'inch') {
    hInches = h + parseFractionVal(hFrac);
    wInches = w + parseFractionVal(wFrac);
  } else if (unit === 'cm') {
    hInches = h / 2.54;
    wInches = w / 2.54;
  } else if (unit === 'mm') {
    hInches = h / 25.4;
    wInches = w / 25.4;
  }

  return ((hInches * wInches) / 144).toFixed(2);
}
```

### 3.3 Seamless Bi-directional Unit Conversion
When a row's unit changes in `handleUpdateRow`:
1. **Inch $\to$ Metric (`cm` or `mm`):**
   - $H_{\text{total}} = \text{height} + \text{parseFractionVal}(\text{heightFraction})$
   - $W_{\text{total}} = \text{width} + \text{parseFractionVal}(\text{widthFraction})$
   - If target is `cm`: $H_{\text{cm}} = \text{round}(H_{\text{total}} \times 2.54, 1)$, $W_{\text{cm}} = \text{round}(W_{\text{total}} \times 2.54, 1)$
   - If target is `mm`: $H_{\text{mm}} = \text{round}(H_{\text{total}} \times 25.4, 0)$, $W_{\text{mm}} = \text{round}(W_{\text{total}} \times 25.4, 0)$
   - Reset fractions to `'0'`.
2. **Metric (`cm` or `mm`) $\to$ Inch:**
   - Convert metric to decimal inches: $H_{\text{in}} = \text{val} / 2.54$ (or $/ 25.4$).
   - Decompose into whole inch and nearest $1/16$ fraction:
     ```typescript
     function decimalToInchFraction(decimalInches: number): { whole: number; fraction: string } {
       const whole = Math.floor(decimalInches);
       const rem = decimalInches - whole;
       const sixteenths = Math.round(rem * 16);
       if (sixteenths === 0) return { whole, fraction: '0' };
       if (sixteenths === 16) return { whole: whole + 1, fraction: '0' };
       // Simplify to common fraction
       if (sixteenths % 8 === 0) return { whole, fraction: `${sixteenths / 8}/2` }; // e.g. 1/2
       if (sixteenths % 4 === 0) return { whole, fraction: `${sixteenths / 4}/4` }; // e.g. 1/4, 3/4
       if (sixteenths % 2 === 0) return { whole, fraction: `${sixteenths / 2}/8` }; // e.g. 1/8, 3/8, 5/8, 7/8
       return { whole, fraction: `${sixteenths}/16` };
     }
     ```

### 3.4 Quotations Table UI (`QuotationHub.tsx`)
In the **Dimensions (H × W)** table column:
- If `row.unit !== 'inch'`:
  - Retain the clean dual numeric inputs: `[ Height ] × [ Width ] (sqft)`
- If `row.unit === 'inch'`:
  - **Height Group:**
    - Number input for whole inches (e.g. `80`)
    - Compact styled `<select>` for height fraction (e.g. `[ 1/8" ▾ ]`)
  - **Separator:** `×`
  - **Width Group:**
    - Number input for whole inches (e.g. `32`)
    - Compact styled `<select>` for width fraction (e.g. `[ 3/16" ▾ ]`)
  - **Area Pill:** `(17.92 sqft)`

### 3.5 Proforma Invoice & Print Preview Formatting
In `#printableQuoteArea` and preview modals:
- Helper function `formatDimension(val: number, frac?: string, unit?: string)`:
  - If unit is `'inch'`:
    - If `frac && frac !== '0'`: returns `${val} ${frac}"`
    - Else: returns `${val}"`
  - If metric: returns `${val} cm` or `${val} mm`.
- Output in table: `80 1/8" × 32 3/16" (17.92 sqft)`.

---

## 4. Verification & Testing Plan
1. **Automated Unit Test (`scripts/test-quotation-fractions.ts`):**
   - Test 1: $80\frac{1}{8}" \times 32\frac{3}{16}" = 80.125 \times 32.1875 / 144 = 17.91$ sq.ft.
   - Test 2: $78\frac{1}{2}" \times 30" = 78.5 \times 30 / 144 = 16.35$ sq.ft.
   - Test 3: Metric to Inch conversion preserves fractions accurately (e.g. 203.2 cm $\to$ 80").
   - Test 4: Inch to Metric conversion preserves total decimal dimension.
2. **TypeScript Type Check:**
   - Run `node_modules\.bin\tsc.cmd --noEmit` to verify type safety across the application.
3. **Localhost & Visual Verification:**
   - Verify `http://localhost:3000` quotation builder allows selecting fractions and dynamically recomputes sqft and proforma display.
4. **Git Commit & Push:**
   - Commit changes and push to `origin main`.
