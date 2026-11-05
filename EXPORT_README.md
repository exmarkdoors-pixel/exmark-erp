# EXMARK ERP — Exported Workspace Guide for Antigravity & Development

This package contains the complete production-grade source code, configuration, assets, database models, and documentation artifacts for **EXMARK DOORS ERP & CRM**.

---

## 1. Quick Start in Google Antigravity (Target Account)

1. **Extract Archive**:
   Extract `exmark-erp-export.zip` into your desired working directory (e.g. `C:\Users\<YourUser>\EXMARK-Projects\exmark-erp` or `~/projects/exmark-erp`).

2. **Open in Antigravity**:
   - Launch Antigravity logged in with your Gmail account.
   - Go to **File / Projects** > **Open Folder...** and select the extracted `exmark-erp` folder.
   - Antigravity will automatically detect the project rules, workspace structure, and context.

3. **Install Dependencies**:
   Open a terminal in Antigravity or PowerShell / Bash and run:
   ```bash
   npm install
   ```

4. **Environment Setup**:
   The required environment variables are already configured in `.env` and `.env.development`.
   If setting up fresh:
   ```bash
   cp .env.example .env
   ```

5. **Initialize Database Models**:
   ```bash
   npx prisma generate
   ```

6. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Access the full ERP application at: **http://localhost:3000**

---

## 2. GitHub Access (Alternative / Continuous Sync)

If you prefer pulling directly from GitHub using your Gmail / GitHub account:
- **Repository URL**: `https://github.com/exmarkdoors-pixel/exmark-erp.git`
- To clone:
  ```bash
  git clone https://github.com/exmarkdoors-pixel/exmark-erp.git
  cd exmark-erp
  npm install
  npm run dev
  ```
- To request write access, ask the owner to add your GitHub username / Gmail as a collaborator under `exmarkdoors-pixel/exmark-erp` repository Settings -> Collaborators.

---

## 3. Included Features & Modules

- **CRM & WhatsApp Integration**:
  - Leads Pipeline with Kanban stages.
  - Interactive WhatsApp Lead Modal with dynamic templates (`inquiry_welcome`, `measurement_booking`, `quote_submitted`, `advance_request`, `production_update`, `dispatch_alert`, `custom`).
  - Automatic follow-up activity logging.
- **Factory Production Floor**:
  - Production tracking, batch allocation, status transitions.
  - Pure Vector PDF Engine for 12L Compact Shutter Stickers & 4"x2" Thermal Single Labels.
- **RBAC & Security**:
  - Super Admin, Plant Supervisor, Site Engineer, Accounts, QC Inspector roles.
- **Complete Documentation & Conversation Artifacts**:
  - Found under `docs/antigravity-artifacts/` containing all architectural plans, walkthroughs, test assertions, and integration guides.

---

## 4. Verification & Testing

To run the master ERP test suite:
```bash
npm run erp:full-audit
```
All 87 enterprise verification assertions will run and report 100% pass status.
