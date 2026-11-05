# Implementation Plan: Bidirectional Stage Progression (Advance, Reverse & Follow-up) across CRM, Quotation, and Production

## 1. Goal Description
In daily door manufacturing and sales operations, leads, quotations, orders, and plant jobs do not always move in a straight forward line:
- A customer may request revised sizes or prices during final negotiation, requiring a rollback to the measurement or quotation stage.
- A door batch may fail water-submersion or dimension tolerance testing at QA inspection, requiring a rollback to the CNC routing or press/coating stage for rework.
- A sales order may need to revert to specs locked or negotiation if site conditions change.

Currently, the CRM, Quotation Hub, and Production modules only provide forward movement (`Advance Stage &rarr;`). This plan implements **bidirectional stage-by-stage progression**:
1. **Advance Stage (`&rarr;`)**: Progress to next milestone.
2. **Reverse Stage / Rollback (`&larr;`)**: Move backward to prior milestone with reasons/rework notes.
3. **Follow-up Action**: Log notes and activities at any stage without changing the stage.

---

## 2. Stage Progression Flowcharts

### 2.1 CRM / Leads Pipeline
```
[ Inquiries ]  ⇄  [ Measurement Scheduled ]  ⇄  [ Quotation Submitted ]  ⇄  [ Final Negotiation ]
                                                                                   ⇵ (Convert / Rollback)
                                                                             [ Sales Orders ]
```

### 2.2 Quotation / Sales Order Tracker
```
[ 0. Order Confirmed & Specs Locked ]
                 ⇅
[ 1. 50% Advance Received ]
                 ⇅
[ 2. In Production (FRP Press / WPC Line) ]
                 ⇅
[ 3. QC Passed (IS 14856:2000) ]
                 ⇅
[ 4. Dispatched & Installed ]
```

### 2.3 Factory Production Floor
```
[ QUEUED ] ⇄ [ MOLDING ] ⇄ [ CNC_ROUTING ] ⇄ [ PU_COATING ] ⇄ [ QA_INSPECTION ] ⇄ [ COMPLETED ]
```

---

## 3. Proposed Changes by Module

### 3.1 CRM Pipeline ([`components/modules/crm/LeadsPipeline.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/crm/LeadsPipeline.tsx))
- **`handleReverseLead(e, leadId)`**:
  - Moves lead to the previous stage in `PIPELINE_STAGES` (`negotiation` $\to$ `quotation` $\to$ `measurement` $\to$ `inquiries`).
  - Logs audit notice: `Lead rolled back to: [Stage Name]`.
- **`reverseSalesOrderStep(orderId)`**:
  - Reverts order step from $4 \to 3 \to 2 \to 1 \to 0$.
  - When reversing below Step 1, updates advance status to `'Pending 50% Advance'`.
  - When reversing at Step 0, provides option to restore order back to CRM `Final Negotiation`.
- **UI Enhancements**:
  - Lead card action row renders dual controls:
    `[ ↺ Reverse ] [ Follow-up / Notes ] [ Advance → ]`
  - Sales Order tracker renders dual step controls:
    `[ ↺ Rollback Step ] [ Advance Step → ]`

---

### 3.2 Quotations Hub ([`components/modules/quotations/QuotationHub.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/quotations/QuotationHub.tsx))
- **`handleReverseLead(leadId)`**:
  - Rolls back lead stage in the active pipeline board.
- **`handleReverseSalesOrder(orderId)`**:
  - Decrements `order.stepIndex` by 1.
  - Updates advance and production statuses accordingly.
- **UI Updates in Pipeline & Sales Order Views**:
  - Adds backward button alongside advance button in the card and detailed view modals.

---

### 3.3 Production Schedule ([`components/modules/ModuleViews.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/ModuleViews.tsx))
- **`handleReverseStage(orderId, currentStage)`**:
  - Rolls back stage according to `STAGE_ORDER` (`COMPLETED` $\to$ `QA_INSPECTION` $\to$ `PU_COATING` $\to$ `CNC_ROUTING` $\to$ `MOLDING` $\to$ `QUEUED`).
  - Sends `PUT /api/production/[id]` with `{ stage: previousStage }`.
- **UI Updates**:
  - Production Card action bar renders:
    ```tsx
    {order.status !== 'QUEUED' && (
      <button
        onClick={() => handleReverseStage(order.id, order.status)}
        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
        title="Rollback stage for rework or revision"
      >
        <span>&larr; Reverse / Rework</span>
      </button>
    )}
    {order.status !== 'COMPLETED' && (
      <button
        onClick={() => handleAdvanceStage(order.id, order.status)}
        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
      >
        <span>Advance Stage &rarr;</span>
      </button>
    )}
    ```

---

## 4. Verification Plan

### 4.1 Automated Tests (`scripts/test-stage-advance-reverse.ts`)
1. **CRM Pipeline Progression & Reversal:**
   - Test `inquiries` $\to$ `measurement` $\to$ `quotation` $\to$ `negotiation`.
   - Test reversing `negotiation` $\to$ `quotation` $\to$ `measurement` $\to$ `inquiries`.
2. **Sales Order Step Progression & Reversal:**
   - Test advancing Step $0 \to 1 \to 2 \to 3 \to 4$.
   - Test reversing Step $4 \to 3 \to 2 \to 1 \to 0$.
   - Test status synchronization (`50% Advance Verified` vs `Pending Advance`).
3. **Production Stage Progression & Reversal:**
   - Test advancing through all 6 stages.
   - Test reversing from `QA_INSPECTION` to `CNC_ROUTING` or `MOLDING` for rework.

### 4.2 Application Verification
- Verify `http://localhost:3000` under CRM, Quotations, and Production views.
- Test clicking "Reverse" on each stage and verify smooth state update and toast feedback.
