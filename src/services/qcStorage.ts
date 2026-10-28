/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductMaster,
  InspectionStandardItem,
  InspectionPlan,
  StandardRevision,
  InspectionTask,
  QualityAnomaly,
  ReleaseRecord,
  LotTraceabilityData,
  CustomerComplaint,
  MeasurementAuditLog,
  SystemAuditEntry,
  UserRole,
  UserProfile,
} from '../types/qc';
import {
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_STANDARDS,
  INITIAL_PLANS,
  INITIAL_REVISIONS,
  INITIAL_TASKS,
  INITIAL_ANOMALIES,
  INITIAL_RELEASES,
  INITIAL_TRACEABILITY,
  INITIAL_COMPLAINTS,
} from '../data/mockData';

const STORAGE_KEYS = {
  CURRENT_USER: 'qc_current_user',
  PRODUCTS: 'qc_products',
  STANDARDS: 'qc_standards',
  PLANS: 'qc_plans',
  REVISIONS: 'qc_revisions',
  TASKS: 'qc_tasks',
  ANOMALIES: 'qc_anomalies',
  RELEASES: 'qc_releases',
  TRACEABILITY: 'qc_traceability',
  COMPLAINTS: 'qc_complaints',
  AUDIT_LOGS: 'qc_audit_logs',
  MEASUREMENT_AUDIT: 'qc_measurement_audit',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Storage read error:', e);
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

export const qcStorage = {
  // Current User & Role
  getCurrentUser(): UserProfile {
    return safeGet<UserProfile>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
  },
  setCurrentUser(user: UserProfile): void {
    safeSet(STORAGE_KEYS.CURRENT_USER, user);
  },
  switchRole(role: UserRole): UserProfile {
    const target = INITIAL_USERS.find((u) => u.role === role) || INITIAL_USERS[0];
    this.setCurrentUser(target);
    return target;
  },

  // Products
  getProducts(): ProductMaster[] {
    return safeGet<ProductMaster[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },
  saveProduct(product: ProductMaster): void {
    const list = this.getProducts();
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      list[idx] = product;
    } else {
      list.unshift(product);
    }
    safeSet(STORAGE_KEYS.PRODUCTS, list);
  },

  // Standards
  getStandards(productId?: string): InspectionStandardItem[] {
    const all = safeGet<InspectionStandardItem[]>(STORAGE_KEYS.STANDARDS, INITIAL_STANDARDS);
    return productId ? all.filter((s) => s.productId === productId) : all;
  },
  saveStandard(item: InspectionStandardItem): void {
    const all = safeGet<InspectionStandardItem[]>(STORAGE_KEYS.STANDARDS, INITIAL_STANDARDS);
    const idx = all.findIndex((s) => s.id === item.id);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.push(item);
    }
    safeSet(STORAGE_KEYS.STANDARDS, all);
  },

  // Plans
  getPlans(productId?: string): InspectionPlan[] {
    const all = safeGet<InspectionPlan[]>(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    return productId ? all.filter((p) => p.productId === productId) : all;
  },

  // Revisions
  getRevisions(productId?: string): StandardRevision[] {
    const all = safeGet<StandardRevision[]>(STORAGE_KEYS.REVISIONS, INITIAL_REVISIONS);
    return productId ? all.filter((r) => r.productId === productId) : all;
  },

  // Tasks
  getTasks(): InspectionTask[] {
    return safeGet<InspectionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
  },
  getTaskById(id: string): InspectionTask | undefined {
    return this.getTasks().find((t) => t.id === id);
  },
  saveTask(task: InspectionTask): void {
    const list = this.getTasks();
    const idx = list.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      list[idx] = task;
    } else {
      list.unshift(task);
    }
    safeSet(STORAGE_KEYS.TASKS, list);
  },

  // Anomalies / NCR
  getAnomalies(): QualityAnomaly[] {
    return safeGet<QualityAnomaly[]>(STORAGE_KEYS.ANOMALIES, INITIAL_ANOMALIES);
  },
  saveAnomaly(anomaly: QualityAnomaly): void {
    const list = this.getAnomalies();
    const idx = list.findIndex((a) => a.id === anomaly.id);
    if (idx >= 0) {
      list[idx] = anomaly;
    } else {
      list.unshift(anomaly);
    }
    safeSet(STORAGE_KEYS.ANOMALIES, list);
    this.addAuditEntry({
      userId: this.getCurrentUser().badgeNumber,
      userName: this.getCurrentUser().name,
      userRole: this.getCurrentUser().role,
      action: idx >= 0 ? '更新異常案件' : '新建異常案件 (NCR)',
      module: '異常通報與處置',
      lotNumber: anomaly.lotNumber,
      details: `${anomaly.ncrNumber} - ${anomaly.defectItem} (${anomaly.severity})`,
    });
  },

  // Releases (出貨放行)
  getReleases(): ReleaseRecord[] {
    return safeGet<ReleaseRecord[]>(STORAGE_KEYS.RELEASES, INITIAL_RELEASES);
  },
  saveRelease(release: ReleaseRecord): void {
    const list = this.getReleases();
    const idx = list.findIndex((r) => r.id === release.id);
    if (idx >= 0) {
      list[idx] = release;
    } else {
      list.unshift(release);
    }
    safeSet(STORAGE_KEYS.RELEASES, list);
  },

  // Traceability
  getTraceability(lotNumber: string): LotTraceabilityData | undefined {
    const map = safeGet<Record<string, LotTraceabilityData>>(STORAGE_KEYS.TRACEABILITY, INITIAL_TRACEABILITY);
    return map[lotNumber];
  },
  getAllTraceabilityLots(): string[] {
    const map = safeGet<Record<string, LotTraceabilityData>>(STORAGE_KEYS.TRACEABILITY, INITIAL_TRACEABILITY);
    return Object.keys(map);
  },

  // Complaints
  getComplaints(): CustomerComplaint[] {
    return safeGet<CustomerComplaint[]>(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
  },

  // Measurement change audit (UAT-07)
  getMeasurementAudits(): MeasurementAuditLog[] {
    return safeGet<MeasurementAuditLog[]>(STORAGE_KEYS.MEASUREMENT_AUDIT, [
      {
        id: 'aud_001',
        taskNumber: 'INSP-20261026-04',
        lotNumber: 'LOT-20261026-D4',
        itemName: '外徑外尺寸 (Outer Diameter)',
        previousValue: '50.018',
        newValue: '50.012',
        changeReason: '三豐量規零點微偏，經重新校準歸零後複測修正',
        modifiedBy: '林品檢 (Inspector Lin)',
        modifiedAt: '2026-10-26 19:40',
      },
    ]);
  },
  addMeasurementAudit(log: Omit<MeasurementAuditLog, 'id' | 'modifiedAt'>): void {
    const list = this.getMeasurementAudits();
    const entry: MeasurementAuditLog = {
      ...log,
      id: `aud_${Date.now()}`,
      modifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    list.unshift(entry);
    safeSet(STORAGE_KEYS.MEASUREMENT_AUDIT, list);
  },

  // System Audit Trail
  getAuditEntries(): SystemAuditEntry[] {
    return safeGet<SystemAuditEntry[]>(STORAGE_KEYS.AUDIT_LOGS, [
      {
        id: 'sys_001',
        timestamp: '2026-10-26 08:30:12',
        userId: 'QC-702',
        userName: '林品檢',
        userRole: 'qc_inspector',
        action: '完成開班首件檢驗',
        module: '電子 QC 檢驗',
        lotNumber: 'LOT-20261026-A1',
        details: '首件尺寸全數合格，簽核放行量產。',
      },
      {
        id: 'sys_002',
        timestamp: '2026-10-26 20:35:40',
        userId: 'QC-702',
        userName: '林品檢',
        userRole: 'qc_inspector',
        action: '觸發超規警示與隔離標記',
        module: '異常通報與處置',
        lotNumber: 'LOT-20261026-B2',
        details: '量測滾道刮傷超出標準，系統自動鎖定紅區 B-04 隔離。',
      },
    ]);
  },
  addAuditEntry(entry: Omit<SystemAuditEntry, 'id' | 'timestamp'>): void {
    const list = this.getAuditEntries();
    const item: SystemAuditEntry = {
      ...entry,
      id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    list.unshift(item);
    safeSet(STORAGE_KEYS.AUDIT_LOGS, list.slice(0, 100));
  },

  // Reset to initial factory seed
  resetAll(): void {
    localStorage.clear();
    safeSet(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    safeSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    safeSet(STORAGE_KEYS.STANDARDS, INITIAL_STANDARDS);
    safeSet(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    safeSet(STORAGE_KEYS.REVISIONS, INITIAL_REVISIONS);
    safeSet(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    safeSet(STORAGE_KEYS.ANOMALIES, INITIAL_ANOMALIES);
    safeSet(STORAGE_KEYS.RELEASES, INITIAL_RELEASES);
    safeSet(STORAGE_KEYS.TRACEABILITY, INITIAL_TRACEABILITY);
    safeSet(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
  },
};
