/**
 * EXMARK ARCHITECTURAL DOORS — CENTRALIZED TOLERANCE & CUTTING DEDUCTION SYNC ENGINE
 *
 * Synchronizes tolerance and clearance adjustments across:
 * 1. Admin Customization & Factory Standards
 * 2. Site Measurements Book (Desktop) & Field App (Mobile)
 * 3. Quotation & Sales Order Schedules
 * 4. Production Job Cards, CNC Trimming, 12L Barcode Stickers & Cutting Sheets
 * 5. Ready Stock Matching Engine
 */

import { getDataFilePath } from '../utils/dataPaths';
import fs from 'fs';
import { getCustomFrames } from './frameService';
import {
  FloorCondition,
  ToleranceSettings,
  DEFAULT_TOLERANCE_SETTINGS,
  AppliedDoorTolerances,
  ToleranceInput,
  cmToTapeInchFormatted,
  computeDoorTolerances as computePureDoorTolerances,
} from './toleranceCalculation';

export type { FloorCondition, ToleranceSettings, AppliedDoorTolerances, ToleranceInput };
export { DEFAULT_TOLERANCE_SETTINGS, cmToTapeInchFormatted };

function getSettingsPath(): string {
  return getDataFilePath('factory-tolerance-settings.json');
}

/**
 * Loads the active factory tolerance defaults from local JSON storage.
 */
export function getFactoryToleranceDefaults(): ToleranceSettings {
  try {
    const filePath = getSettingsPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_TOLERANCE_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('[ToleranceEngine] Falling back to default tolerance settings:', err);
  }
  return { ...DEFAULT_TOLERANCE_SETTINGS };
}

/**
 * Persists factory tolerance defaults to local JSON storage.
 */
export function saveFactoryToleranceDefaults(settings: Partial<ToleranceSettings>): ToleranceSettings {
  const current = getFactoryToleranceDefaults();
  const updated: ToleranceSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  try {
    const filePath = getSettingsPath();
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
  } catch (err) {
    console.error('[ToleranceEngine] Failed to save tolerance settings:', err);
  }
  return updated;
}

/**
 * Computes exact shutter cutting dimensions and deductions deterministically from raw measurements.
 * Automatically enriches with live Custom Frame Profile deductions when frame name/ID is supplied.
 */
export function computeDoorTolerances(
  input: ToleranceInput,
  activeDefaults?: Partial<ToleranceSettings>
): AppliedDoorTolerances {
  const defaults = activeDefaults || getFactoryToleranceDefaults();
  let enrichedInput: ToleranceInput = input;

  if (!input.frameProfile && (input.frameProfileId || input.frameTypeName)) {
    try {
      const allFrames = getCustomFrames();
      const matched = allFrames.find(
        (f) =>
          (input.frameProfileId && (f.id === input.frameProfileId || f.name === input.frameProfileId)) ||
          (input.frameTypeName &&
            (f.id === input.frameTypeName ||
              f.name.toLowerCase() === input.frameTypeName.toLowerCase() ||
              input.frameTypeName.toLowerCase().includes(f.name.toLowerCase())))
      );
      if (matched) {
        enrichedInput = {
          ...input,
          frameProfile: matched,
          rebateDepthMm: input.rebateDepthMm ?? matched.rebateDepthMm,
          frameHDeductionMm:
            input.frameHDeductionMm ??
            (matched.hDeductionCm ? Math.round(matched.hDeductionCm * 10) : undefined),
          frameWDeductionMm:
            input.frameWDeductionMm ??
            (matched.wDeductionCm ? Math.round(matched.wDeductionCm * 10) : undefined),
        };
      }
    } catch {
      // Fallback silently to input if frames store unavailable
    }
  }

  return computePureDoorTolerances(enrichedInput, defaults);
}
