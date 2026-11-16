/**
 * EXMARK ERP — Project Risk & Profit Calculation Service
 */

import {
  ProjectRiskInput,
  ProjectRiskResult,
  ProjectRiskFactor,
  ProjectRiskLevel,
  ProjectCostInput,
  ProjectCostProfitResult,
  ProjectCostBreakdown,
} from '@/lib/types/projectRiskProfit';

export interface KeralaDistrictLogisticsProfile {
  district: string;
  distanceKm: number;
  terrainType: 'PLAIN' | 'COASTAL' | 'HIGHLAND_GHAT';
  baseFreightLumpSum: number;
  transitRiskScore: number;
}

export const KERALA_DISTRICT_LOGISTICS: Record<string, KeralaDistrictLogisticsProfile> = {
  'Malappuram': { district: 'Malappuram', distanceKm: 25, terrainType: 'PLAIN', baseFreightLumpSum: 1200, transitRiskScore: 3 },
  'Kozhikode': { district: 'Kozhikode', distanceKm: 50, terrainType: 'COASTAL', baseFreightLumpSum: 2200, transitRiskScore: 6 },
  'Palakkad': { district: 'Palakkad', distanceKm: 75, terrainType: 'PLAIN', baseFreightLumpSum: 2800, transitRiskScore: 7 },
  'Thrissur': { district: 'Thrissur', distanceKm: 95, terrainType: 'PLAIN', baseFreightLumpSum: 3500, transitRiskScore: 9 },
  'Wayanad': { district: 'Wayanad', distanceKm: 115, terrainType: 'HIGHLAND_GHAT', baseFreightLumpSum: 4800, transitRiskScore: 18 },
  'Kannur': { district: 'Kannur', distanceKm: 140, terrainType: 'COASTAL', baseFreightLumpSum: 4500, transitRiskScore: 12 },
  'Ernakulam': { district: 'Ernakulam', distanceKm: 165, terrainType: 'COASTAL', baseFreightLumpSum: 5200, transitRiskScore: 13 },
  'Idukki': { district: 'Idukki', distanceKm: 195, terrainType: 'HIGHLAND_GHAT', baseFreightLumpSum: 6500, transitRiskScore: 22 },
  'Kottayam': { district: 'Kottayam', distanceKm: 220, terrainType: 'PLAIN', baseFreightLumpSum: 6200, transitRiskScore: 15 },
  'Alappuzha': { district: 'Alappuzha', distanceKm: 230, terrainType: 'COASTAL', baseFreightLumpSum: 6400, transitRiskScore: 16 },
  'Kasaragod': { district: 'Kasaragod', distanceKm: 215, terrainType: 'COASTAL', baseFreightLumpSum: 6800, transitRiskScore: 17 },
  'Pathanamthitta': { district: 'Pathanamthitta', distanceKm: 265, terrainType: 'HIGHLAND_GHAT', baseFreightLumpSum: 7500, transitRiskScore: 20 },
  'Kollam': { district: 'Kollam', distanceKm: 300, terrainType: 'COASTAL', baseFreightLumpSum: 8200, transitRiskScore: 21 },
  'Thiruvananthapuram': { district: 'Thiruvananthapuram', distanceKm: 370, terrainType: 'COASTAL', baseFreightLumpSum: 9800, transitRiskScore: 24 },
};

/**
 * Standard Haversine formula to compute great-circle distance between two coordinates in meters
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates Project Risk Index (0 - 100) and actionable safeguards
 */
export function calculateProjectRisk(input: ProjectRiskInput): ProjectRiskResult {
  const factors: ProjectRiskFactor[] = [];
  const mitigations: string[] = [];

  // 1. Credit & Advance Risk (Max 30 pts)
  const adv = Number(input.advancePercent ?? 50);
  let creditScore = 5;
  let creditLevel: ProjectRiskLevel = 'LOW';
  let creditDesc = `Standard factory advance deposit of ${adv}% committed.`;

  if (adv < 25) {
    creditScore = 30;
    creditLevel = 'CRITICAL';
    creditDesc = `High credit risk: Advance deposit is only ${adv}%, below factory material break-even threshold.`;
    mitigations.push('Enforce minimum 50% advance deposit before releasing chemical resin for moulding.');
  } else if (adv < 40) {
    creditScore = 20;
    creditLevel = 'HIGH';
    creditDesc = `Advance deposit of ${adv}% covers basic chemicals but leaves labor and frames exposed.`;
    mitigations.push('Collect 40% dispatch milestone deposit before loading doors onto delivery truck.');
  } else if (adv < 50) {
    creditScore = 12;
    creditLevel = 'MEDIUM';
    creditDesc = `Advance deposit of ${adv}% is acceptable; balance payable against delivery inspection.`;
  } else {
    creditScore = 5;
    creditLevel = 'LOW';
  }

  factors.push({
    key: 'credit-risk',
    category: 'CREDIT',
    title: 'Client Payment & Advance Deposit Risk',
    score: creditScore,
    maxScore: 30,
    level: creditLevel,
    description: creditDesc,
    mitigation: creditScore > 10 ? 'Require stage-locked payment milestones (50% booking, 40% dispatch, 10% post-fitting).' : 'Standard credit terms approved.',
  });

  // 2. Kerala District Logistics & Terrain Risk (Max 25 pts)
  const rawDist = input.district || 'Malappuram';
  const matchedDist = Object.keys(KERALA_DISTRICT_LOGISTICS).find(
    (d) => d.toLowerCase() === rawDist.toLowerCase() || rawDist.toLowerCase().includes(d.toLowerCase())
  );
  const distProfile = matchedDist ? KERALA_DISTRICT_LOGISTICS[matchedDist] : KERALA_DISTRICT_LOGISTICS['Malappuram'];

  let logScore = distProfile.transitRiskScore;
  let logDesc = `${distProfile.district} (${distProfile.distanceKm} km from Malappuram factory).`;

  if (input.roadAccessibility === 'HILL_HAIRPIN_TERRAIN' || distProfile.terrainType === 'HIGHLAND_GHAT') {
    logScore = Math.min(25, logScore + 6);
    logDesc += ' High range ghat section (hairpin bends, vibration risk).';
    mitigations.push('Equip transport with foam-cushioned side battens and heavy-duty corner guards for ghat road transit.');
  } else if (input.roadAccessibility === 'PICKUP_NARROW') {
    logScore = Math.min(25, logScore + 4);
    logDesc += ' Narrow rural site road requiring multiple pickup shuttle trips.';
    mitigations.push('Plan transshipment using small 1.5-ton pickup from local hub.');
  }

  const logRiskLevel: ProjectRiskLevel =
    logScore >= 20 ? 'CRITICAL' : logScore >= 14 ? 'HIGH' : logScore >= 8 ? 'MEDIUM' : 'LOW';

  factors.push({
    key: 'logistics-risk',
    category: 'LOGISTICS',
    title: 'Kerala Transport & Terrain Risk',
    score: logScore,
    maxScore: 25,
    level: logRiskLevel,
    description: logDesc,
    mitigation: logScore >= 14 ? 'Require dedicated factory lorry with trained handling crew; avoid third-party parcel transit.' : 'Standard direct plant delivery.',
  });

  // 3. Custom Sizing & Manufacturing Complexity Risk (Max 25 pts)
  let customScore = 4;
  let nonStdCount = 0;
  if (Array.isArray(input.itemRows) && input.itemRows.length > 0) {
    for (const row of input.itemRows) {
      const h = Number(row.heightInches || (row.unit === 'cm' ? (row.height || 0) / 2.54 : row.height || 0));
      const w = Number(row.widthInches || (row.unit === 'cm' ? (row.width || 0) / 2.54 : row.width || 0));
      if (h > 84 || w > 39 || (row.thicknessLabel && row.thicknessLabel.includes('35mm'))) {
        nonStdCount++;
      }
    }
  }

  if (nonStdCount > 0) {
    customScore = Math.min(25, 6 + nonStdCount * 4);
    mitigations.push(`Re-verify ${nonStdCount} oversized / custom thickness doors with physical site opening inspection before casting.`);
  }

  const customRiskLevel: ProjectRiskLevel =
    customScore >= 18 ? 'HIGH' : customScore >= 10 ? 'MEDIUM' : 'LOW';

  factors.push({
    key: 'custom-spec-risk',
    category: 'CUSTOMIZATION',
    title: 'Custom Dimensions & Spec Complexity Risk',
    score: customScore,
    maxScore: 25,
    level: customRiskLevel,
    description: nonStdCount > 0
      ? `${nonStdCount} custom oversized / special door items detected in schedule.`
      : 'All items conform to standard factory mold dimensions.',
    mitigation: nonStdCount > 0
      ? 'Perform laser measurement verification & obtain signed site opening signoff.'
      : 'Standard automated mold production.',
  });

  // 4. Site Readiness & Weather / Monsoon Risk (Max 20 pts)
  let siteScore = 3;
  let siteDesc = 'Civil opening ready and cured for door frame installation.';

  if (input.siteReadiness === 'UNFINISHED_CIVIL') {
    siteScore = 18;
    siteDesc = 'Civil work incomplete: Wet plaster, flooring unpaved, risk of frame cement staining.';
    mitigations.push('Delay final door installation until civil floor tiles and final plastering are complete to prevent lock scratching.');
  } else if (input.siteReadiness === 'PARTIAL_PLASTERING') {
    siteScore = 10;
    siteDesc = 'Partial plastering done; site requires protective wrap on WPC frames.';
    mitigations.push('Apply protective PVC masking tape on all frame rebate surfaces.');
  }

  if (input.isMonsoonSeason) {
    siteScore = Math.min(20, siteScore + 5);
    siteDesc += ' Active Kerala monsoon season (high humidity, transport rain exposure).';
    mitigations.push('Wrap all door bundles with shrink film waterproof stretch packaging.');
  }

  const siteRiskLevel: ProjectRiskLevel =
    siteScore >= 15 ? 'CRITICAL' : siteScore >= 10 ? 'HIGH' : siteScore >= 6 ? 'MEDIUM' : 'LOW';

  factors.push({
    key: 'site-weather-risk',
    category: 'SITE_WEATHER',
    title: 'Site Readiness & Monsoon Exposure Risk',
    score: siteScore,
    maxScore: 20,
    level: siteRiskLevel,
    description: siteDesc,
    mitigation: siteScore >= 10 ? 'Schedule pre-dispatch video call or site engineer clearance before dispatch.' : 'Standard dispatch schedule.',
  });

  // Aggregate overall risk score
  const overallScore = Math.min(100, factors.reduce((sum, f) => sum + f.score, 0));

  let overallLevel: ProjectRiskLevel = 'LOW';
  let riskColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  let recommendedContingencyBufferPct = 2;
  let recommendedAdvancePercent = 50;
  let recommendedPackaging = 'Standard 3-Ply Corrugated Edge Guard & Stretch Film';

  if (overallScore >= 70) {
    overallLevel = 'CRITICAL';
    riskColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    recommendedContingencyBufferPct = 8;
    recommendedAdvancePercent = 70;
    recommendedPackaging = 'Heavy-Duty 5-Ply Wooden Crate + Air-Bubble Wrap + Waterproof Tarpaulin';
  } else if (overallScore >= 50) {
    overallLevel = 'HIGH';
    riskColor = 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    recommendedContingencyBufferPct = 6;
    recommendedAdvancePercent = 60;
    recommendedPackaging = 'Double Bubble-Wrap + Reinforced Corner Protectors';
  } else if (overallScore >= 30) {
    overallLevel = 'MEDIUM';
    riskColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    recommendedContingencyBufferPct = 4;
    recommendedAdvancePercent = 50;
    recommendedPackaging = 'Foam Sheet Cushioning + Corrugated Edge Guards';
  }

  return {
    overallScore,
    riskLevel: overallLevel,
    riskColor,
    factors,
    recommendedContingencyBufferPct,
    recommendedAdvancePercent,
    recommendedPackaging,
    mitigations,
  };
}

/**
 * Calculates Project Cost and Profitability Breakdown
 */
export function calculateProjectCostProfit(input: ProjectCostInput): ProjectCostProfitResult {
  const totalDoors = Math.max(1, Number(input.totalDoors || input.itemRows?.length || 1));
  const rawDist = input.district || 'Malappuram';
  const matchedDist = Object.keys(KERALA_DISTRICT_LOGISTICS).find(
    (d) => d.toLowerCase() === rawDist.toLowerCase() || rawDist.toLowerCase().includes(d.toLowerCase())
  );
  const distProfile = matchedDist ? KERALA_DISTRICT_LOGISTICS[matchedDist] : KERALA_DISTRICT_LOGISTICS['Malappuram'];

  // 1. Direct Material Costs (per door averages calibrated with Kerala factory BOQ)
  // Resin (Isophthalic + General Purpose): ~11.5 kg @ ₹195/kg = ~₹2,242
  // Gelcoat + Color Pigment: ~1.8 kg @ ₹280/kg = ~₹504
  // Fiberglass Mat (CSM 450 + 300): ~4.2 kg @ ₹185/kg = ~₹777
  // Internal Stiffener Core (Timber / Honeycomb): ~₹480
  // WPC Frame Profile & Extrusions: ~₹1,450
  // Lock Hardware, SS Hinges & Screws: ~₹380
  const resinChemicalsCost = Math.round(2242 * totalDoors);
  const gelcoatPigmentCost = Math.round(504 * totalDoors);
  const fiberglassMatCost = Math.round(777 * totalDoors);
  const internalCoreCost = Math.round(480 * totalDoors);
  const framesWpcWoodCost = Math.round(1450 * totalDoors);
  const hardwareLocksHingesCost = Math.round(380 * totalDoors);

  const totalDirectMaterials =
    resinChemicalsCost +
    gelcoatPigmentCost +
    fiberglassMatCost +
    internalCoreCost +
    framesWpcWoodCost +
    hardwareLocksHingesCost;

  // 2. Direct Piece-Rate Gang Labor (per door factory standards)
  // Moulding Gang: ₹380/door
  // Trimming & Edge Routing Gang: ₹140/door
  // Surface Finishing & PU Paint Gang: ₹320/door
  // Assembly & Lock Fitting Gang: ₹210/door
  const moldingGangCost = Math.round(380 * totalDoors);
  const trimmingGangCost = Math.round(140 * totalDoors);
  const finishingPaintGangCost = Math.round(320 * totalDoors);
  const assemblyFittingCost = Math.round(210 * totalDoors);

  const totalDirectLabor =
    moldingGangCost +
    trimmingGangCost +
    finishingPaintGangCost +
    assemblyFittingCost;

  // 3. District Logistics & Freight
  const distanceKm = distProfile.distanceKm;
  const mileageRatePerKm = 18; // ₹18/km standard factory diesel/driver rate
  const transitPackagingCost = Math.round(95 * totalDoors);
  const baseFreightCost = distProfile.baseFreightLumpSum;
  const totalLogisticsFreight = baseFreightCost + Math.round(distanceKm * mileageRatePerKm) + transitPackagingCost;

  // 4. Installation Gang Labor
  let installationGangLabor = 0;
  if (input.includeInstallation) {
    if (input.installationMode === 'FIXED_LUMP_SUM') {
      installationGangLabor = Number(input.installationRate || 2500);
    } else {
      const perDoorRate = Number(input.installationRate || 450);
      installationGangLabor = Math.round(perDoorRate * totalDoors);
    }
  }

  // 5. Factory Fixed Overhead Absorption (₹350/door towards plant shed, power, machine amortisation)
  const fixedOverheadAbsorption = Math.round(350 * totalDoors);

  // 6. Contingency & Safety Buffer (derived from risk score)
  const riskScore = input.riskScore ?? 35;
  const bufferRate = riskScore >= 70 ? 0.08 : riskScore >= 50 ? 0.06 : riskScore >= 30 ? 0.04 : 0.02;
  const subCostBeforeBuffer =
    totalDirectMaterials +
    totalDirectLabor +
    totalLogisticsFreight +
    installationGangLabor +
    fixedOverheadAbsorption;
  const contingencyRiskBuffer = Math.round(subCostBeforeBuffer * bufferRate);

  const totalProjectCost = subCostBeforeBuffer + contingencyRiskBuffer;

  const costBreakdown: ProjectCostBreakdown = {
    resinChemicalsCost,
    gelcoatPigmentCost,
    fiberglassMatCost,
    internalCoreCost,
    framesWpcWoodCost,
    hardwareLocksHingesCost,
    totalDirectMaterials,
    moldingGangCost,
    trimmingGangCost,
    finishingPaintGangCost,
    assemblyFittingCost,
    totalDirectLabor,
    baseFreightCost,
    distanceKm,
    mileageRatePerKm,
    transitPackagingCost,
    totalLogisticsFreight,
    installationGangLabor,
    fixedOverheadAbsorption,
    contingencyRiskBuffer,
    totalProjectCost,
  };

  // Quoted Revenue baseline
  // Standard market pricing in Kerala: ~₹8,200 to ₹8,900 per complete FRP unit
  const avgSellingPrice = 8450;
  let netQuotedRevenue = Math.round(totalDoors * avgSellingPrice + installationGangLabor);
  if (input.additionalDiscount) {
    netQuotedRevenue = Math.max(0, netQuotedRevenue - Number(input.additionalDiscount));
  }

  const directCostsOnly = totalDirectMaterials + totalDirectLabor + totalLogisticsFreight + installationGangLabor;
  const grossContributionMargin = netQuotedRevenue - directCostsOnly;
  const grossMarginPct = netQuotedRevenue > 0 ? (grossContributionMargin / netQuotedRevenue) * 100 : 0;

  const netProjectProfit = netQuotedRevenue - totalProjectCost;
  const netMarginPct = netQuotedRevenue > 0 ? (netProjectProfit / netQuotedRevenue) * 100 : 0;

  const breakEvenContractPrice = totalProjectCost;
  const targetPrice25Pct = Math.round(totalProjectCost / 0.75);
  const targetPrice30Pct = Math.round(totalProjectCost / 0.70);

  let marginHealth: 'EXCELLENT' | 'HEALTHY' | 'MARGINAL' | 'LOSS_WARNING' = 'HEALTHY';
  if (netMarginPct >= 28) marginHealth = 'EXCELLENT';
  else if (netMarginPct >= 18) marginHealth = 'HEALTHY';
  else if (netMarginPct >= 8) marginHealth = 'MARGINAL';
  else marginHealth = 'LOSS_WARNING';

  return {
    netQuotedRevenue,
    costBreakdown,
    totalCost: totalProjectCost,
    grossContributionMargin,
    grossMarginPct: Number(grossMarginPct.toFixed(1)),
    netProjectProfit,
    netMarginPct: Number(netMarginPct.toFixed(1)),
    breakEvenContractPrice,
    targetPrice25Pct,
    targetPrice30Pct,
    marginHealth,
  };
}
