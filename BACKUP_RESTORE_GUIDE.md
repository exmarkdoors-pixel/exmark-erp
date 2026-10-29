# EXMARK ERP — Backup & Disaster Recovery Guide

**Workstation, Cloud & Offline Storage Protection Procedures**

---

## 1. Automated Windows Backup Agent

The EXMARK ERP Backup Agent is codified in [`scripts/backup-agent.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/scripts/backup-agent.ts) and can be executed anytime via:

```powershell
cmd /c npm run backup
```

### Backup Capabilities:
1. **Full Point-in-Time Snapshot:** Captures all 16 JSON business data stores into `backups/EXM-BAK-[TIMESTAMP]-SCH/`.
2. **Cryptographic Integrity:** Computes SHA-256 hashes of every file and stores a master ledger in `backups/backup-ledger.json`.
3. **Automated Verification:** Immediately re-reads every archived store and verifies hashes against the original disk.
4. **Retention Management:** Retains up to 30 rolling recovery checkpoints automatically.

---

## 2. Recovery Procedures

### Scenario A: Local Workstation Data Recovery
1. Select a verified snapshot ID from `backups/backup-ledger.json` (e.g. `EXM-BAK-20261029171932-SCH`).
2. Copy files from `backups/[SNAPSHOT_ID]/` back into `data/`.
3. Run `cmd /c npm run test:master` to verify consistency.

### Scenario B: Cloud Database Recovery (Supabase)
1. Supabase performs automatic daily backups with Point-In-Time Recovery (PITR) up to 7 days.
2. In Supabase Dashboard &rarr; **Project Settings &rarr; Database &rarr; Backups**:
   - Select recovery checkpoint.
   - Click **Restore to this point**.
3. Re-run `cmd /c npx tsx scripts/verify-cloud-staging.ts` to confirm cloud health.
