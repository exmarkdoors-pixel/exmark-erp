================================================================================
EXMARK ERP — OFFLINE SQL SERVER INSTALLATION & DEPLOYMENT GUIDE
(Enterprise PostgreSQL 16 Relational Database Setup)
================================================================================

This guide explains how to set up any central Windows PC as a 100% OFFLINE SQL SERVER
for EXMARK ERP, completely air-gapped without needing any internet connection.

All other PCs (Counter, Accounts, Factory Floor) connect to this server over your local Wi-Fi or network switch.

--------------------------------------------------------------------------------
PART 1: PREPARATION ON A PEN DRIVE (FROM ANY CONNECTED PC)
--------------------------------------------------------------------------------
Copy the following files to your USB Pen Drive:
1. `postgresql-16.x-windows-x64.exe` (Download from https://www.postgresql.org/download/windows/)
2. `EXMARK ERP Setup 1.2.3.exe` (from C:\EXMARK-Releases\)
3. `setup-offline-sql-server.bat`
4. `backup-offline-sql.bat`

--------------------------------------------------------------------------------
PART 2: INSTALLATION ON THE CENTRAL SERVER PC (5 MINUTES)
--------------------------------------------------------------------------------
STEP 1: Install PostgreSQL 16
  - Double-click `postgresql-16.x-windows-x64.exe`
  - Choose installation path: C:\Program Files\PostgreSQL\16
  - Set password as: `postgres`
  - Set port as: `5432`
  - Click Next through the wizard and complete the installation.
  - PostgreSQL will now run permanently as a background Windows Service.

STEP 2: Install EXMARK ERP Application
  - Double-click `EXMARK ERP Setup 1.2.3.exe`
  - If Windows Defender SmartScreen pops up: click "More info" -> "Run anyway".
  - The application installs cleanly in ~15 seconds.

STEP 3: Run Automated Database Setup
  - Right-click `setup-offline-sql-server.bat` and select "Run as Administrator".
  - The script will automatically:
      * Verify the PostgreSQL service is running
      * Create the `exmark_erp` relational database
      * Deploy all 30+ tables, foreign keys, and indexes
      * Configure Windows Firewall for Port 4000 and 5432
      * Detect the Server's LAN IP address (e.g. 192.168.1.50)
      * Schedule an automatic daily backup at 9:00 PM

STEP 4: Launch EXMARK ERP
  - Double-click the EXMARK ERP icon on your desktop.
  - Log in with default admin credentials:
      Username: admin
      Password: Exmark@2026 (or admin123)

--------------------------------------------------------------------------------
PART 3: CONNECTING OTHER PCS ACROSS YOUR FACTORY (MULTI-USER)
--------------------------------------------------------------------------------
Connect your other computers (Sales Counter PC, Accounts PC, Factory Tablets)
to the same Wi-Fi router or network switch as the Server PC. (No internet needed!)

On each client PC:
  1. Open Google Chrome or Microsoft Edge.
  2. Type the Server PC's IP address:
     http://<SERVER-IP>:4000   (for example: http://192.168.1.50:4000)
  3. The complete ERP dashboard loads instantly.
  4. Every quotation, cutting measurement, and payment saved on any PC is
     immediately saved into the central SQL database on the main server PC.

--------------------------------------------------------------------------------
PART 4: DAILY BACKUP & DISASTER RECOVERY
--------------------------------------------------------------------------------
1. The server automatically takes an atomic SQL snapshot every night at 9:00 PM
   and stores it in `C:\EXMARK-ERP-DATA\backups\`.
2. To make a USB backup at the end of the day:
   - Insert any USB pen drive into the Server PC.
   - Double-click `backup-offline-sql.bat`.
   - The script will automatically detect the USB drive and copy a compressed
     backup snapshot into `[USB]:\EXMARK-Backups\`.
3. If the server computer ever crashes or needs replacement, this single backup
   file can be restored to any new computer with 100% zero data loss.

================================================================================
EXMARK DOORS PRIVATE LIMITED — Factory Technical Support
================================================================================
