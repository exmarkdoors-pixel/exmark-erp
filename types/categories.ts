export interface ProductCategoryConfig {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  isPrimary: boolean;
  description: string;
  fields: string[];
  pricing: {
    baseRateSqFt: number;
    standardGstPercent: number;
    hsnCode: string;
    minimumOrderSqFt?: number;
  };
  production: {
    lineCode: string;
    lineName: string;
    cycleTimeMinutes: number;
    defaultTemperatureC?: number;
    qcCheckpoints: string[];
  };
  reportingVisibility: boolean;
  updatedAt: string;
}
