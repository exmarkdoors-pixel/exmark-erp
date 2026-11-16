export type ProductionStage =
  | 'QUEUED'
  | 'MOLDING'
  | 'CUTTING_FINISHING'
  | 'FINISHING_GRAINS'
  | 'CNC_ROUTING'
  | 'QA_INSPECTION'
  | 'PAINT_SECTION'
  | 'PU_COATING'
  | 'PACKING'
  | 'DELIVERY'
  | 'INSTALLATION'
  | 'COMPLETED';

export interface ProductionStageAssignment {
  stage: ProductionStage;
  gangId?: string;
  gangName?: string;
  operation?: string;
  amount?: number;
  isRework?: boolean;
  reworkReason?: string;
  pieceRateSkippedReason?: string;
  completedAt: string;
}

export const ACTIVE_BOARD_STAGES: ProductionStage[] = [
  'QUEUED',
  'MOLDING',
  'CUTTING_FINISHING',
  'PAINT_SECTION',
  'PACKING',
  'DELIVERY',
  'INSTALLATION',
];

export const STAGE_DISPLAY_LABELS: Record<ProductionStage, string> = {
  QUEUED: 'Queued',
  MOLDING: 'Molding',
  CUTTING_FINISHING: 'Cutting & Finishing',
  FINISHING_GRAINS: 'Finishing & PU Painting',
  CNC_ROUTING: 'Cutting & Finishing',
  QA_INSPECTION: 'Cutting & Finishing',
  PAINT_SECTION: 'Finishing & PU Painting',
  PU_COATING: 'Finishing & PU Painting',
  PACKING: 'Packing',
  DELIVERY: 'Delivery',
  INSTALLATION: 'Site Installation',
  COMPLETED: 'Completed',
};

const BASE_FLOW: ProductionStage[] = [
  'QUEUED',
  'MOLDING',
  'CUTTING_FINISHING',
  'PAINT_SECTION',
  'PACKING',
  'DELIVERY',
];

/**
 * Computes the next production stage based on conditional site installation flag.
 * Orders without site installation complete immediately upon Delivery.
 */
export function getNextProductionStage(order: {
  status: ProductionStage;
  includeInstallation?: boolean;
}): ProductionStage {
  const current = order.status;
  if (current === 'QA_INSPECTION' || current === 'CNC_ROUTING') return 'PAINT_SECTION';
  if (current === 'FINISHING_GRAINS' || current === 'PU_COATING') return 'PACKING';
  if (current === 'DELIVERY') {
    return order.includeInstallation ? 'INSTALLATION' : 'COMPLETED';
  }
  if (current === 'INSTALLATION' || current === 'COMPLETED') {
    return 'COMPLETED';
  }
  const idx = BASE_FLOW.indexOf(current);
  if (idx === -1) return 'MOLDING';
  return BASE_FLOW[idx + 1] || (order.includeInstallation ? 'INSTALLATION' : 'COMPLETED');
}

export function getPrevProductionStage(order: {
  status: ProductionStage;
  includeInstallation?: boolean;
}): ProductionStage | null {
  const current = order.status;
  if (current === 'COMPLETED') {
    return order.includeInstallation ? 'INSTALLATION' : 'DELIVERY';
  }
  if (current === 'INSTALLATION') return 'DELIVERY';
  if (current === 'QA_INSPECTION' || current === 'CNC_ROUTING') return 'MOLDING';
  if (current === 'FINISHING_GRAINS' || current === 'PU_COATING') return 'CUTTING_FINISHING';
  const idx = BASE_FLOW.indexOf(current);
  if (idx <= 0) return null;
  return BASE_FLOW[idx - 1];
}
