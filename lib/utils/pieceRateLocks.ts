export type OperationLockGroup =
  | 'MOLDING'
  | 'DOOR_CUTTING'
  | 'FRAME_CUTTING'
  | 'GRAINS_PAINTING'
  | 'SITE_FITTING';

export interface OrderPieceRateGroupLock {
  lockGroup: OperationLockGroup;
  label: string;
  isLocked: boolean;
  totalCreditedQty: number;
  totalAmountCredited: number;
  contractorName: string | null;
  contributingContractors?: Array<{
    contractorId: string;
    contractorName: string;
    quantity: number;
    amount: number;
  }>;
  remainingDoorBalance?: number;
  operationLabel: string | null;
  lastPaidDate: string | null;
  creditedDoorIds: string[];
}

export interface OrderPieceRateLockSummary {
  orderId: string;
  groups: Record<OperationLockGroup, OrderPieceRateGroupLock>;
  totalCreditedAmount: number;
  totalRecordsCount: number;
}

export const OPERATION_LOCK_GROUP_LABELS: Record<OperationLockGroup, string> = {
  MOLDING: 'Molding (Door / Frame)',
  DOOR_CUTTING: 'Door Cutting & Finishing',
  FRAME_CUTTING: 'Frame Cutting & Finishing',
  GRAINS_PAINTING: 'Grains & Painting',
  SITE_FITTING: 'Site Fitting / Installation',
};

export function getOperationLockGroup(operation: string): OperationLockGroup {
  switch (operation) {
    case 'MOLDING_DOOR_WITH_FRAME':
    case 'MOLDING_ONLY_DOOR':
    case 'MOLDING_ONLY_FRAME':
      return 'MOLDING';
    case 'DOOR_CUTTING':
      return 'DOOR_CUTTING';
    case 'FRAME_CUTTING':
      return 'FRAME_CUTTING';
    case 'DOOR_GRAINS_WITH_PAINT':
    case 'ONLY_CLEAR_COAT':
    case 'TWO_SIDE_PAINT':
      return 'GRAINS_PAINTING';
    case 'SITE_FITTING':
    default:
      return 'SITE_FITTING';
  }
}

export function getStageLockGroups(stage: string): OperationLockGroup[] {
  switch (stage) {
    case 'MOLDING':
      return ['MOLDING'];
    case 'CUTTING_FINISHING':
    case 'CNC_ROUTING':
    case 'QA_INSPECTION':
      return ['DOOR_CUTTING', 'FRAME_CUTTING'];
    case 'PAINT_SECTION':
    case 'FINISHING_GRAINS':
    case 'PU_COATING':
      return ['GRAINS_PAINTING'];
    case 'INSTALLATION':
      return ['SITE_FITTING'];
    default:
      return [];
  }
}

export function getStageLockGroup(stage: string): OperationLockGroup | null {
  return getStageLockGroups(stage)[0] || null;
}
