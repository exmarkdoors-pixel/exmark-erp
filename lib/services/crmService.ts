import fs from 'fs';
import path from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

export type LeadStage = 'NEW' | 'MEASUREMENT_SCHEDULED' | 'QUOTE_SENT' | 'NEGOTIATION' | 'WON' | 'LOST';
export type FollowUpType = 'CALL' | 'VISIT' | 'EMAIL' | 'WHATSAPP';

export interface FollowUp {
  id: string;
  leadId: string;
  followUpDate: string;
  type: FollowUpType;
  notes: string;
  completedAt?: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  leadCode: string;
  customerId?: string | null;
  title: string;
  contactPerson: string;
  phone: string;
  district: string;
  stage: LeadStage;
  estimatedValue?: number | null;
  assignedToId?: string | null;
  notes?: string;
  followUps: FollowUp[];
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export type LeadCreateInput = Omit<Lead, 'id' | 'leadCode' | 'followUps' | 'createdAt' | 'updatedAt' | '_demo'>;
export type LeadUpdateInput = Partial<LeadCreateInput>;

export interface LeadFilter {
  stage?: LeadStage;
  district?: string;
  customerId?: string;
}

export type FollowUpCreateInput = Omit<FollowUp, 'id' | 'leadId' | 'createdAt'>;

// ── Store helpers ─────────────────────────────────────────────────────────────

const STORE_PATH = path.join(process.cwd(), 'data', 'leads-store.json');

function readStore(): Lead[] {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Lead[]) : [];
  } catch {
    return [];
  }
}

function writeStore(leads: Lead[]): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(leads, null, 2), 'utf8');
  } catch (err) {
    console.error('[crmService] Failed to write store:', err);
  }
}

function generateLeadCode(count: number): string {
  const num = String(count + 1).padStart(3, '0');
  return `LEAD-2026-${num}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listLeads(filter?: LeadFilter): Promise<Lead[]> {
  const all = readStore();
  return all.filter((l) => {
    if (filter?.stage && l.stage !== filter.stage) return false;
    if (filter?.district && l.district.toLowerCase() !== filter.district.toLowerCase()) return false;
    if (filter?.customerId && l.customerId !== filter.customerId) return false;
    return true;
  });
}

export async function getLead(id: string): Promise<Lead | null> {
  const all = readStore();
  return all.find((l) => l.id === id) ?? null;
}

export async function createLead(data: LeadCreateInput): Promise<Lead> {
  const all = readStore();
  const newLead: Lead = {
    ...data,
    id: generateId('lead-api'),
    leadCode: generateLeadCode(all.length),
    followUps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(newLead);
  writeStore(all);
  return newLead;
}

export async function updateLead(id: string, data: LeadUpdateInput): Promise<Lead> {
  const all = readStore();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error(`Lead ${id} not found`);
  const updated: Lead = {
    ...all[idx],
    ...data,
    id: all[idx].id,
    leadCode: all[idx].leadCode,
    followUps: all[idx].followUps,
    createdAt: all[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeStore(all);
  return updated;
}

export async function updateLeadStage(id: string, stage: LeadStage): Promise<Lead> {
  return updateLead(id, { stage });
}

export async function deleteLead(id: string): Promise<boolean> {
  const all = readStore();
  const filtered = all.filter((l) => l.id !== id);
  if (filtered.length === all.length) return false;
  writeStore(filtered);
  return true;
}

export async function addFollowUp(leadId: string, followUpData: FollowUpCreateInput): Promise<FollowUp> {
  const all = readStore();
  const idx = all.findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error(`Lead ${leadId} not found`);
  const followUp: FollowUp = {
    ...followUpData,
    id: generateId('fu'),
    leadId,
    createdAt: new Date().toISOString(),
  };
  all[idx].followUps.push(followUp);
  all[idx].updatedAt = new Date().toISOString();
  writeStore(all);
  return followUp;
}

export async function listFollowUps(leadId: string): Promise<FollowUp[]> {
  const all = readStore();
  const lead = all.find((l) => l.id === leadId);
  return lead ? lead.followUps : [];
}
