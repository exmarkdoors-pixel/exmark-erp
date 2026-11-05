# Implementation Plan: Fix Quantity Editing (Support Deleting 1, Typing 10, and Entering 0)

## 1. Goal Description
In the Quotations section ([`QuotationHub.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/quotations/QuotationHub.tsx)), users cannot delete the default quantity `1` or type numbers like `10` or `0`.

### Root Cause Analysis
In `QuotationHub.tsx`:
```tsx
<input
  type="number"
  min="1"
  value={row.qty}
  onChange={(e) => handleUpdateRow(idx, { qty: parseInt(e.target.value) || 1 })}
/>
```
1. **Snap-back on delete:** When the user presses backspace, `e.target.value` becomes `""`. `parseInt("")` evaluates to `NaN`. Because of `NaN || 1`, the value immediately resets to `1`, making it impossible to backspace or clear the field.
2. **Cannot enter `0`:** When the user types `0`, `parseInt("0")` returns `0`. In JavaScript, `0 || 1` evaluates to `1`, immediately replacing `0` with `1`.
3. **`min="1"` restriction:** Blocks values below 1 in the HTML5 number input.
4. **Calculations:** When quantity is `0`, the line total and grand total should calculate as `₹0` instead of breaking.

---

## 2. Proposed Changes

### 2.1 Quotation Hub (`QuotationHub.tsx`)
1. **Quantity State & Input Handling:**
   - Allow `qty` to accept `number | string` in the row draft or allow empty string while typing.
   - Update `onChange` handler:
     ```tsx
     <input
       type="number"
       min="0"
       value={row.qty === 0 ? '' : row.qty}
       placeholder="0"
       onChange={(e) => {
         const val = e.target.value;
         if (val === '') {
           handleUpdateRow(idx, { qty: 0 });
         } else {
           const parsed = parseInt(val, 10);
           handleUpdateRow(idx, { qty: isNaN(parsed) ? 0 : Math.max(0, parsed) });
         }
       }}
       className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-center font-bold text-white focus:border-rose-500 focus:outline-none"
     />
     ```
   - On backspace, the field clears cleanly and shows placeholder `0`.
   - The user can type `1` then `0` to get `10` without any snap-back fight.
   - If `0` is desired, leaving it blank or typing `0` evaluates to `0`.
2. **Financial Calculations Safeguard:**
   - `subtotal = quoteItemRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * r.rate, 0);`
   - `lineTotal = ((Number(row.qty) || 0) * row.rate).toLocaleString('en-IN');`
   - `totalDoors = quoteItemRows.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);`

---

### 2.2 Consistency Across Other Modules
Apply the same fix to:
- [`DoorMeasurementModal.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/DoorMeasurementModal.tsx#L1113): Update quantity input to allow clearing and typing `0` or `10+`.
- [`QuotationBuilder.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/quotations/QuotationBuilder.tsx#L286): Update quantity input to allow clearing and typing `0` or `10+`.

---

## 3. Verification Plan

### 3.1 Automated Tests (`scripts/test-quantity-editing.ts`)
Create a verification test script to simulate user typing sequences:
1. **Backspace Test:** Start with `qty = 1`, trigger backspace (`""`), verify state becomes `0` or empty without resetting to `1`.
2. **Two-Digit Typing Test:** From empty, type `1` then `0`, verify state becomes `10`.
3. **Zero Quantity Test:** Type `0`, verify state remains `0` and line total is `₹0`.
4. **Calculations with Zero:** Subtotal, GST, and Grand Total reflect only non-zero items accurately.

### 3.2 Manual Verification
- In `http://localhost:3000` under Quotations:
  - Click on the Qty field showing `10` or `1`.
  - Press Backspace: verify the box is cleared.
  - Type `10`: verify `10` is entered.
  - Type `0`: verify `0` is accepted and line total becomes ₹0.
