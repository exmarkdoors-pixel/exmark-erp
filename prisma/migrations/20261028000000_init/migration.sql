-- EXMARK ERP — Initial Schema Migration (20261028000000_init)
-- Version-controlled DDL for Central PostgreSQL Deployment
-- Covers all 29 relational models for Kerala FRP Architectural Door Manufacturing

-- 1. Authentication & RBAC
CREATE TABLE IF NOT EXISTS "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "Permission_module_action_key" UNIQUE ("module", "action")
);

CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
    "permissionId" TEXT NOT NULL REFERENCES "Permission"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RolePermission_roleId_permissionId_key" UNIQUE ("roleId", "permissionId")
);

CREATE TABLE IF NOT EXISTS "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeCode" TEXT NOT NULL UNIQUE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "dateOfJoining" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL REFERENCES "Role"("id"),
    "employeeId" TEXT UNIQUE REFERENCES "Employee"("id"),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "expires" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. CRM & Customers
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerCode" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "firmName" TEXT,
    "type" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "address" TEXT,
    "gstin" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadCode" TEXT NOT NULL UNIQUE,
    "customerId" TEXT REFERENCES "Customer"("id"),
    "title" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "estimatedValue" DECIMAL(12,2),
    "assignedToId" TEXT REFERENCES "User"("id"),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 3. BOQ & Quotations
CREATE TABLE IF NOT EXISTS "BoqMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boqNumber" TEXT NOT NULL UNIQUE,
    "customerId" TEXT REFERENCES "Customer"("id"),
    "customerName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "siteAddress" TEXT,
    "district" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalDoors" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "originalImport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "BoqItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boqId" TEXT NOT NULL REFERENCES "BoqMaster"("id") ON DELETE CASCADE,
    "itemCode" TEXT NOT NULL,
    "productCategory" TEXT NOT NULL DEFAULT 'FRP',
    "model" TEXT NOT NULL,
    "description" TEXT,
    "frameDetails" TEXT,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "areaSqFt" DOUBLE PRECISION NOT NULL,
    "unitRate" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "transportRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "installationRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL UNIQUE,
    "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "leadId" TEXT REFERENCES "Lead"("id"),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "gstAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL REFERENCES "User"("id"),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL REFERENCES "Quotation"("id") ON DELETE CASCADE,
    "doorCategory" TEXT NOT NULL,
    "doorModel" TEXT NOT NULL,
    "heightMm" INTEGER NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "thicknessMm" INTEGER NOT NULL,
    "coreType" TEXT,
    "finishColor" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 4. Site Measurements
CREATE TABLE IF NOT EXISTS "DoorMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "refNumber" TEXT NOT NULL UNIQUE,
    "customerId" TEXT REFERENCES "Customer"("id"),
    "customerName" TEXT,
    "orderRef" TEXT,
    "siteName" TEXT NOT NULL,
    "siteAddress" TEXT,
    "district" TEXT NOT NULL,
    "totalOpenings" INTEGER NOT NULL,
    "measuredById" TEXT REFERENCES "Employee"("id"),
    "engineerName" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rebateDepthMm" TEXT,
    "wallThicknessMm" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "DoorMeasurementItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "measurementId" TEXT NOT NULL REFERENCES "DoorMeasurement"("id") ON DELETE CASCADE,
    "doorNumber" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "frameType" TEXT NOT NULL,
    "colour" TEXT NOT NULL,
    "hingeSide" TEXT NOT NULL,
    "lockType" TEXT NOT NULL,
    "measurementUnit" TEXT NOT NULL DEFAULT 'MM',
    "heightLeft" DECIMAL(10,2) NOT NULL,
    "heightRight" DECIMAL(10,2) NOT NULL,
    "widthTop" DECIMAL(10,2) NOT NULL,
    "widthBottom" DECIMAL(10,2) NOT NULL,
    "wallThickness" TEXT,
    "rebateDepth" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 5. Sales Orders & Production
CREATE TABLE IF NOT EXISTS "SalesOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL UNIQUE,
    "quotationId" TEXT REFERENCES "Quotation"("id"),
    "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDeliveryDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "advanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12,2) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "orderStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "hsnCode" TEXT NOT NULL DEFAULT '3925.20.00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "ProductionOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prodOrderNumber" TEXT NOT NULL UNIQUE,
    "salesOrderId" TEXT NOT NULL REFERENCES "SalesOrder"("id"),
    "doorCategory" TEXT NOT NULL,
    "specifications" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineAssigned" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "batchNumber" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 6. Inventory & Purchases
CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemCode" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "currentStock" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "minThreshold" DECIMAL(12,2) NOT NULL,
    "reorderQuantity" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "warehouseLocation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poNumber" TEXT NOT NULL UNIQUE,
    "supplierName" TEXT NOT NULL,
    "supplierGstin" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "gstAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL REFERENCES "Purchase"("id") ON DELETE CASCADE,
    "inventoryItemId" TEXT NOT NULL REFERENCES "InventoryItem"("id"),
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 7. Invoices & Payments
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL UNIQUE,
    "salesOrderId" TEXT NOT NULL REFERENCES "SalesOrder"("id"),
    "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "cgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "eWayBillNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNumber" TEXT NOT NULL UNIQUE,
    "invoiceId" TEXT REFERENCES "Invoice"("id"),
    "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 8. Logistics & Fulfillment
CREATE TABLE IF NOT EXISTS "Dispatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchNumber" TEXT NOT NULL UNIQUE,
    "salesOrderId" TEXT NOT NULL REFERENCES "SalesOrder"("id"),
    "invoiceId" TEXT REFERENCES "Invoice"("id"),
    "vehicleNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "dispatchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedArrival" TIMESTAMP(3),
    "deliveryDistrict" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "eWayBillNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Installation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "installationNumber" TEXT NOT NULL UNIQUE,
    "salesOrderId" TEXT NOT NULL REFERENCES "SalesOrder"("id"),
    "siteAddress" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL REFERENCES "Employee"("id"),
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "clientSignoffName" TEXT,
    "clientFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 9. Product Categories & Settings
CREATE TABLE IF NOT EXISTS "ProductCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "fieldsConfig" TEXT,
    "pricingConfig" TEXT,
    "productionConfig" TEXT,
    "reportingVisibility" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 10. Financial Targets, WhatsApp & Report Templates
CREATE TABLE IF NOT EXISTS "FinancialTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetPeriod" TEXT NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "targetDimension" TEXT NOT NULL DEFAULT 'COMPANY',
    "dimensionValue" TEXT,
    "salesRevenueTarget" DECIMAL(14,2) NOT NULL,
    "orderBookingTarget" DECIMAL(14,2) NOT NULL,
    "collectionsTarget" DECIMAL(14,2) NOT NULL,
    "frpDoorQuantityTarget" INTEGER NOT NULL,
    "grossProfitTarget" DECIMAL(14,2),
    "operatingProfitTarget" DECIMAL(14,2),
    "netProfitTarget" DECIMAL(14,2),
    "expenseBudget" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "baselineSnapshot" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientPhone" TEXT NOT NULL,
    "recipientName" TEXT,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT,
    "templateName" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "providerMsgId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" TEXT,
    "errorMessage" TEXT,
    "sentByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "ReportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportCode" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "columnsConfig" TEXT NOT NULL,
    "defaultFilters" TEXT,
    "pdfLayout" TEXT,
    "rolePermissions" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
