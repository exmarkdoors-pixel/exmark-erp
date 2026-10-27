export type NavigationTab =
  | 'dashboard'
  | 'customers'
  | 'crm'
  | 'quotations'
  | 'measurements'
  | 'sales-orders'
  | 'production'
  | 'inventory'
  | 'purchases'
  | 'accounts'
  | 'employees'
  | 'dispatch'
  | 'marketing'
  | 'reports'
  | 'settings';

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  rawNumeric?: number;
  change: string;
  isPositive: boolean;
  period: string;
  subtext: string;
  badge?: string;
  iconName: string;
  accentColor: string;
}

export type OrderStatus =
  | 'In Production'
  | 'CNC Routing'
  | 'Quality Check'
  | 'Ready to Dispatch'
  | 'Dispatched'
  | 'Delivered';

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  dealerType: 'Authorized Dealer' | 'Direct Builder' | 'Architect Partner' | 'Private Client';
  location: string;
  district: string;
  doorCategory: 'FRP Doors' | 'WPC Doors' | 'WPC Door Frames' | 'Solid Hybrid';
  doorSpecifications: string;
  units: number;
  totalAmount: number;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  paymentStatus: 'Advance Received' | '100% Paid' | 'Partially Paid' | 'Payment Pending';
  hsnCode: string;
}

export interface ProductionLine {
  id: string;
  lineName: string;
  doorType: string;
  capacityPerDay: number;
  currentUnits: number;
  utilizationRate: number;
  status: 'Operational' | 'High Load' | 'Maintenance' | 'Calibrating';
  batchCode: string;
  shiftSupervisor: string;
  temperatureOrCureTime?: string;
  lastUpdated: string;
}

export interface FollowUpReminder {
  id: string;
  client: string;
  district: string;
  purpose: string;
  priority: 'Urgent' | 'High' | 'Normal';
  dueDate: string;
  isCompleted: boolean;
  contactPerson: string;
  phone: string;
  estimatedValue?: string;
}

export interface SalesChartDataPoint {
  month: string;
  frpDoors: number;
  wpcDoors: number;
  framesAndHybrid: number;
  totalSalesLakhs: number;
}

export interface CustomerItem {
  id: string;
  name: string;
  firmName: string;
  type: 'Dealer' | 'Builder' | 'Architect' | 'Retail Client';
  district: string;
  town: string;
  phone: string;
  ordersCount: number;
  totalVolume: string;
  creditLimit: string;
  outstandingBalance: string;
  status: 'Active' | 'Under Review' | 'Priority VIP';
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: 'Resin & Chemicals' | 'Fiberglass & Mat' | 'WPC Granules' | 'Hardware & Locks' | 'Paints & PU Finishes';
  currentStock: number;
  unit: string;
  reorderLevel: number;
  status: 'In Stock' | 'Low Stock' | 'Critical Reorder';
  warehouseLocation: string;
}

export interface DoorMeasurementRecord {
  id: string;
  refNo: string;
  siteName: string;
  client: string;
  location: string;
  district: string;
  totalOpenings: number;
  measuredBy: string;
  date: string;
  frameRebateDepth: string;
  status: 'Draft' | 'Verified' | 'Sent to Production';
}
