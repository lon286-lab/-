/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'qc_inspector'    // QC 現場品管檢驗員
  | 'qa_manager'      // 品質主管
  | 'production_lead' // 生產現場主管/工程師
  | 'shipping_clerk'; // 倉管與出貨人員

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  badgeNumber: string;
}

// 產品主檔 (QC-001)
export interface ProductMaster {
  id: string;
  code: string;
  name: string;
  specification: string;
  process: string;
  drawingNumber: string;
  currentRevision: string;
  material: string;
  targetLine: string;
  isActive: boolean;
}

// 檢驗標準項目 (QC-002)
export type InspectionType = 'dimension' | 'visual' | 'functional' | 'weight';
export type DefectClass = 'critical' | 'major' | 'minor';

export interface InspectionStandardItem {
  id: string;
  productId: string;
  itemNumber: number;
  itemName: string;
  type: InspectionType;
  nominalValue: number | null; // 目標值
  upperTolerance: number | null; // +公差
  lowerTolerance: number | null; // -公差
  usl: number | null; // 上限規格 Upper Spec Limit
  lsl: number | null; // 下限規格 Lower Spec Limit
  unit: string;
  tool: string; // 量測設備/量具 (如: 數位游標卡尺、三次元量床、2.5D投影儀、通止規)
  method: string;
  defectClass: DefectClass;
  isMandatory: boolean; // 是否為必填項目
  sampleSize: number; // 抽樣數
}

// 檢驗計畫 (QC-003)
export type PlanType = 'first_article' | 'in_process' | 'final_oqc';

export interface InspectionPlan {
  id: string;
  productId: string;
  planType: PlanType;
  planName: string;
  frequency: string; // e.g., "換線/每班開工首件", "每2小時抽檢5件", "每批次依 MIL-STD-105E AQL 0.65"
  timing: string;
  sampleCount: number;
  ac: number; // 允收數
  re: number; // 拒收數
  version: string;
}

// 標準版本管理 (QC-005)
export interface StandardRevision {
  id: string;
  productId: string;
  revision: string;
  effectiveDate: string;
  approvedBy: string;
  changeSummary: string;
  previousRevision: string;
}

// 檢驗任務 (QC-101)
export type TaskStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'overdue';

export interface InspectionTask {
  id: string;
  taskNumber: string;
  workOrderNumber: string; // 工單編號
  lotNumber: string; // 生產批號
  productId: string;
  productName: string;
  productCode: string;
  planType: PlanType;
  planName: string;
  line: string;
  shift: string;
  quantity: number;
  status: TaskStatus;
  assignedInspector: string;
  deadline: string; // 規定完成時間 (ISO string)
  startedAt?: string;
  completedAt?: string;
  isOverdue: boolean;
}

// 單一檢驗項目實測紀錄 (QC-102, QC-103)
export interface MeasurementEntry {
  itemId: string;
  itemName: string;
  itemNumber: number;
  type: InspectionType;
  unit: string;
  nominalValue: number | null;
  usl: number | null;
  lsl: number | null;
  tool: string;
  defectClass: DefectClass;
  isMandatory: boolean;
  actualValue: number | string | null;
  isOutOfSpec: boolean;
  deviation: number | null; // 實測值與目標值偏差
  status: 'passed' | 'failed' | 'pending';
  sampleReadings: number[]; // 抽樣個別量測數據
  notes?: string;
}

// 檢驗修改紀錄 (QC-104, UAT-07)
export interface MeasurementAuditLog {
  id: string;
  taskNumber: string;
  lotNumber: string;
  itemName: string;
  previousValue: string;
  newValue: string;
  changeReason: string;
  modifiedBy: string;
  modifiedAt: string;
}

// 品質狀態 (QC-301)
export type LotQualityStatus =
  | 'pending_inspection' // 待檢驗
  | 'in_inspection'      // 檢驗中
  | 'passed'             // 檢驗合格 (待出貨放行)
  | 'quarantined'        // 已隔離 (品質異常管制)
  | 'dispositioned'      // 異常處置完成 (待複驗/重判)
  | 'released';          // 核准出貨放行

// 異常建案 (QC-201, QC-202, QC-203)
export type AnomalySeverity = 'P1_critical' | 'P2_major' | 'P3_minor';
export type AnomalyStatus = 'open' | 'under_review' | 'dispositioned' | 'closed';
export type DispositionType = 'rework' | 'scrap' | 'concession' | 'sorting';

export interface QualityAnomaly {
  id: string;
  ncrNumber: string; // NCR-20261026-001
  taskNumber: string;
  lotNumber: string;
  workOrderNumber: string;
  productId: string;
  productName: string;
  defectItem: string;
  defectCategory: string; // 尺寸超差, 裂痕, 劃痕, 錫橋短路, 異物, 變形
  severity: AnomalySeverity;
  status: AnomalyStatus;
  affectedQuantity: number;
  measuredValue?: string;
  specLimit?: string;
  description: string;
  photoUrl?: string;
  reportedBy: string;
  reportedAt: string;
  isQuarantined: boolean;
  quarantineLocation?: string; // 隔離庫位 e.g. "紅區隔離架 R-02"
  
  // 處置 (QC-205)
  disposition?: {
    type: DispositionType;
    details: string;
    rootCause5M1E: string; // 人/機/料/法/環/測
    dispositionedBy: string;
    dispositionedAt: string;
    retestResult?: 'passed' | 'failed';
    retestNotes?: string;
  };
  
  // 結案 (QC-206)
  closure?: {
    approvedBy: string;
    approvedAt: string;
    closureEvidence: string;
    isApproved: boolean;
  };
  
  // CAPA 改善 (QC-207)
  capa?: {
    capaNumber: string;
    actionPlan: string;
    responsiblePerson: string;
    dueDate: string;
    verificationStatus: 'open' | 'verified' | 'closed';
    effectivenessNote?: string;
  };
}

// 產品放行核准紀錄 (QC-302, QC-303)
export interface ReleaseRecord {
  id: string;
  releaseNumber: string; // REL-20261026-001
  lotNumber: string;
  workOrderNumber: string;
  deliveryOrderNumber: string; // 出貨單號
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  inspectionPassed: boolean;
  hasActiveQuarantine: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  releaseCertificateNo?: string; // COA 編號
  comments?: string;
}

// 批次全流程追溯 (QC-304)
export interface LotTraceabilityData {
  lotNumber: string;
  workOrderNumber: string;
  productId: string;
  productName: string;
  productionDate: string;
  line: string;
  shift: string;
  operator: string;
  machineId: string;
  batchQuantity: number;
  
  // 上游原料追溯
  rawMaterials: {
    materialName: string;
    supplier: string;
    supplierLot: string;
    heatNumber: string; // 爐號
    materialCertUrl?: string;
    incomingInspectionDate: string;
    incomingResult: '合格' | '特採';
  }[];
  
  // 製程檢驗節點
  inspectionMilestones: {
    stage: string; // 首件 / 製程巡檢 / 最終出檢
    taskNumber: string;
    time: string;
    inspector: string;
    result: '合格' | '不合格';
    keyParameters: string;
  }[];
  
  // 異常事件紀錄
  anomalyEvents: {
    ncrNumber: string;
    time: string;
    issue: string;
    disposition: string;
    closed: boolean;
  }[];
  
  // 出貨下游流向
  shippingRecord?: {
    deliveryOrderNumber: string;
    customerName: string;
    shippingDate: string;
    destination: string;
    quantity: number;
    carrier: string;
  };
}

// 客訴批次追查 (QC-305)
export interface CustomerComplaint {
  id: string;
  complaintNumber: string; // RMA-2026-081
  customerName: string;
  lotNumber: string;
  productName: string;
  complaintDate: string;
  defectReported: string;
  claimedQuantity: number;
  rootCauseTrace: string;
  affectedSiblingLots: string[]; // 相同原料批次/同班次生產之關聯批號 (防外溢)
  status: '調查中' | '已定位要因' | '已召回/封存' | '結案';
}

// SPC 與 AI 品質預警 (QC-403)
export interface SPCPoint {
  index: number;
  time: string;
  lotNumber: string;
  measurement: number;
  ucl: number;
  cl: number;
  lcl: number;
  ruleViolations: string[]; // e.g. "Rule 1: 超出3σ規格界限", "Rule 2: 連續9點在中心線同側"
}

export interface AIRiskAssessment {
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  trendSummary: string;
  physicalFactors: string[];
  recommendedActions: string[];
  suggestedInspectionFrequencyIncrease: boolean;
  modelConfidence: number;
}

// AI 視覺檢測 (QC-404, QC-405)
export interface VisualDefectDetection {
  id: string;
  imagePath: string;
  sampleName: string;
  detectedDefects: {
    defectType: string;
    confidence: number;
    box: { x: number; y: number; width: number; height: number }; // 0-100%
    severity: 'critical' | 'major' | 'minor';
    description: string;
  }[];
  aiDecision: 'REJECT' | 'PASS' | 'MANUAL_REVIEW';
  humanConfirmation?: {
    decision: 'ACCEPT_AI' | 'OVERRULE_PASS' | 'OVERRULE_FAIL';
    confirmedBy: string;
    confirmedAt: string;
    notes?: string;
  };
}

// 系統稽核歷史 (所有關鍵操作)
export interface SystemAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  lotNumber?: string;
  details: string;
}
