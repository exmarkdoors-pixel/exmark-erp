import {
  BoqDoorInput,
  BoqMaterialRatesConfig,
  calculateDoorBatchBoq,
  DEFAULT_BOQ_MATERIAL_RATES,
} from '@/lib/utils/boqFormulaEngine';
import { CustomFrameProfile, DEFAULT_FRAME_PROFILES } from '@/lib/utils/frameDefaults';
import type { ContractorRateCard } from '@/lib/services/contractorService';

export const DEFAULT_PROFIT_CONTRACTOR_RATES: ContractorRateCard = {
  id: 'RC-DEFAULT-2026',
  name: 'Standard Factory Contractor Piece-Rate Card',
  moldingDoorWithFrame: 500,
  moldingOnlyDoor: 380,
  moldingOnlyFrame: 125,
  doorCutting: 100,
  frameCutting: 100,
  doorGrainsWithPaint: 300,
  onlyClearCoat: 150,
  twoSidePaint: 500,
  siteFitting: 400,
  updatedAt: '',
};

export interface QuotationProfitRowInput {
  id: string;
  modelId?: string;
  modelTitle?: string;
  unit: 'cm' | 'mm' | 'inch';
  height: number;
  widthTop?: number;
  width?: number;
  qty: number;
  rate: number;
  frameTypeId?: string;
  frameTypeName?: string;
  frameCostPrice?: number;
  lockId?: string;
  lockName?: string;
  lockCostPrice?: number;
  colourId?: string;
  colourName?: string;
  withoutAccessories?: boolean;
  withoutFrame?: boolean;
  supplyMode?: 'FULL_SET' | 'NO_ACCESSORIES' | 'SHUTTER_ONLY';
}

export interface QuotationProfitRowEstimate {
  rowId: string;
  label: string;
  qty: number;
  sqFtTotal: number;
  revenue: number;
  materialCost: number;
  laborCost: number;
  profit: number;
  marginPct: number;
}

export interface QuotationProfitEstimate {
  totalDoors: number;
  totalSqFt: number;
  doorsRevenue: number;
  installationRevenue: number;
  discountAmount: number;
  netRevenue: number;
  chemicalAndFoamCost: number;
  timberCost: number;
  lockBoxCost: number;
  paintCost: number;
  totalMaterialCost: number;
  moldingLaborCost: number;
  doorCuttingLaborCost: number;
  frameCuttingLaborCost: number;
  paintingLaborCost: number;
  siteFittingLaborCost: number;
  totalLaborCost: number;
  totalEstimatedCost: number;
  estimatedNetProfit: number;
  estimatedMarginPct: number;
  rowEstimates: QuotationProfitRowEstimate[];
}

function toCm(val: number, unit: 'cm' | 'mm' | 'inch'): number {
  const n = Number(val) || 0;
  if (unit === 'mm') return n / 10;
  if (unit === 'inch') return n * 2.54;
  return n;
}

export function isRowWithoutFrame(row: {
  withoutFrame?: boolean;
  frameTypeId?: string;
  frameTypeName?: string;
  supplyMode?: 'FULL_SET' | 'NO_ACCESSORIES' | 'SHUTTER_ONLY';
}): boolean {
  if (row.supplyMode === 'SHUTTER_ONLY') return true;
  if (row.withoutFrame) return true;
  if ((row.frameTypeId || '').toUpperCase() === 'FRM-005') return true;
  const fn = (row.frameTypeName || '').toLowerCase();
  return fn.includes('without frame') || fn.includes('shutter only');
}

export function calculateQuotationProfit(params: {
  rows: QuotationProfitRowInput[];
  includeInstallation?: boolean;
  installationAmount?: number;
  discount?: number;
  boqRates?: Partial<BoqMaterialRatesConfig> | null;
  customFrames?: CustomFrameProfile[];
  contractorRates?: Partial<ContractorRateCard> | null;
}): QuotationProfitEstimate {
  const rates: ContractorRateCard = {
    ...DEFAULT_PROFIT_CONTRACTOR_RATES,
    ...(params.contractorRates || {}),
  };
  const frames = params.customFrames && params.customFrames.length > 0 ? params.customFrames : DEFAULT_FRAME_PROFILES;
  const boqRates = params.boqRates || DEFAULT_BOQ_MATERIAL_RATES;

  const activeRows = (params.rows || []).filter((r) => (Number(r.qty) || 0) > 0);
  if (activeRows.length === 0) {
    return {
      totalDoors: 0,
      totalSqFt: 0,
      doorsRevenue: 0,
      installationRevenue: 0,
      discountAmount: 0,
      netRevenue: 0,
      chemicalAndFoamCost: 0,
      timberCost: 0,
      lockBoxCost: 0,
      paintCost: 0,
      totalMaterialCost: 0,
      moldingLaborCost: 0,
      doorCuttingLaborCost: 0,
      frameCuttingLaborCost: 0,
      paintingLaborCost: 0,
      siteFittingLaborCost: 0,
      totalLaborCost: 0,
      totalEstimatedCost: 0,
      estimatedNetProfit: 0,
      estimatedMarginPct: 0,
      rowEstimates: [],
    };
  }

  const doorsRevenue = Math.round(
    activeRows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0)
  );
  const installationRevenue = params.includeInstallation
    ? Math.max(0, Math.round(Number(params.installationAmount) || 0))
    : 0;
  const discountAmount = Math.max(0, Math.round(Number(params.discount) || 0));
  const netRevenue = Math.max(0, doorsRevenue + installationRevenue - discountAmount);

  const boqInputs: BoqDoorInput[] = activeRows.map((row, idx) => {
    const hCm = toCm(row.height, row.unit) || 210;
    const wCm = toCm(row.widthTop ?? row.width ?? 80, row.unit) || 80;
    const noFrame = isRowWithoutFrame(row);
    return {
      doorNumber: row.modelTitle || `Row-${idx + 1}`,
      widthCm: wCm,
      heightCm: hCm,
      frameTypeId: noFrame ? 'FRM-005' : row.frameTypeId,
      frameTypeName: noFrame ? 'Without Frame (Shutter Only)' : row.frameTypeName,
      frameCostPrice: row.frameCostPrice,
      finishColor: row.colourName || 'Standard',
      lockId: row.lockId,
      lockType: row.lockName,
      lockCostPrice: row.lockCostPrice,
      quantity: Math.max(1, Number(row.qty) || 1),
    };
  });

  const batchBoq = calculateDoorBatchBoq(boqInputs, frames, boqRates);
  const totalDoors = batchBoq.totalDoors;
  const totalSqFt = Number(batchBoq.totalSqFt.toFixed(2));

  // If Without Accessories (-₹500), reduce estimated accessory kit allowance proportionally when lock box included common kit
  const withoutAccDoors = activeRows.reduce(
    (s, r) => s + (r.supplyMode === 'NO_ACCESSORIES' || r.supplyMode === 'SHUTTER_ONLY' || r.withoutAccessories ? Math.max(0, Number(r.qty) || 0) : 0),
    0
  );
  const accessoriesCostCredit = Math.min(batchBoq.totalLockBoxCost, withoutAccDoors * 200);

  const chemicalAndFoamCost = Math.round(batchBoq.totalChemicalCost + batchBoq.foamCost);
  const timberCost = Math.round(batchBoq.totalWoodCost);
  const lockBoxCost = Math.max(0, Math.round(batchBoq.totalLockBoxCost - accessoriesCostCredit));
  const paintCost = Math.round(totalSqFt * 75);
  const totalMaterialCost = chemicalAndFoamCost + timberCost + lockBoxCost + paintCost;

  let moldingLaborCost = 0;
  let doorCuttingLaborCost = 0;
  let frameCuttingLaborCost = 0;
  let paintingLaborCost = 0;

  const rowEstimates: QuotationProfitRowEstimate[] = activeRows.map((row, idx) => {
    const qty = Math.max(1, Number(row.qty) || 1);
    const noFrame = isRowWithoutFrame(row);

    const singleBatch = calculateDoorBatchBoq([boqInputs[idx]], frames, boqRates);
    const lineAccCredit = (row.supplyMode === 'NO_ACCESSORIES' || row.supplyMode === 'SHUTTER_ONLY' || row.withoutAccessories) ? Math.min(singleBatch.totalLockBoxCost, qty * 200) : 0;
    const lineMatCost = Math.round(
      Math.max(0, singleBatch.grandTotalCost - lineAccCredit) + singleBatch.totalSqFt * 75
    );

    const lineMolding = qty * (noFrame ? rates.moldingOnlyDoor : rates.moldingDoorWithFrame);
    const lineDoorCut = qty * rates.doorCutting;
    const lineFrameCut = noFrame ? 0 : qty * rates.frameCutting;
    const linePaint = qty * rates.doorGrainsWithPaint;

    moldingLaborCost += lineMolding;
    doorCuttingLaborCost += lineDoorCut;
    frameCuttingLaborCost += lineFrameCut;
    paintingLaborCost += linePaint;

    const lineLabor = Math.round(lineMolding + lineDoorCut + lineFrameCut + linePaint);
    const lineRev = Math.round(qty * (Number(row.rate) || 0));
    const lineProfit = lineRev - lineMatCost - lineLabor;
    const lineMargin = lineRev > 0 ? Number(((lineProfit / lineRev) * 100).toFixed(1)) : 0;

    return {
      rowId: row.id,
      label: row.modelTitle || `Item #${idx + 1}`,
      qty,
      sqFtTotal: Number(singleBatch.totalSqFt.toFixed(2)),
      revenue: lineRev,
      materialCost: lineMatCost,
      laborCost: lineLabor,
      profit: lineProfit,
      marginPct: lineMargin,
    };
  });

  const siteFittingLaborCost = params.includeInstallation
    ? Math.round(totalDoors * rates.siteFitting)
    : 0;

  const totalLaborCost = Math.round(
    moldingLaborCost +
      doorCuttingLaborCost +
      frameCuttingLaborCost +
      paintingLaborCost +
      siteFittingLaborCost
  );

  const totalEstimatedCost = totalMaterialCost + totalLaborCost;
  const estimatedNetProfit = netRevenue - totalEstimatedCost;
  const estimatedMarginPct =
    netRevenue > 0 ? Number(((estimatedNetProfit / netRevenue) * 100).toFixed(1)) : 0;

  return {
    totalDoors,
    totalSqFt,
    doorsRevenue,
    installationRevenue,
    discountAmount,
    netRevenue,
    chemicalAndFoamCost,
    timberCost,
    lockBoxCost,
    paintCost,
    totalMaterialCost,
    moldingLaborCost: Math.round(moldingLaborCost),
    doorCuttingLaborCost: Math.round(doorCuttingLaborCost),
    frameCuttingLaborCost: Math.round(frameCuttingLaborCost),
    paintingLaborCost: Math.round(paintingLaborCost),
    siteFittingLaborCost,
    totalLaborCost,
    totalEstimatedCost,
    estimatedNetProfit,
    estimatedMarginPct,
    rowEstimates,
  };
}
