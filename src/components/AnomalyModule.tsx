/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  QualityAnomaly,
  UserProfile,
  DispositionType,
  AnomalySeverity,
} from '../types/qc';
import { qcStorage } from '../services/qcStorage';
import {
  AlertTriangle,
  ShieldAlert,
  Lock,
  Unlock,
  CheckCircle,
  FileText,
  UserCheck,
  PlusCircle,
  ArrowRight,
  Printer,
  XCircle,
  Check,
  Filter,
} from 'lucide-react';

interface AnomalyModuleProps {
  currentUser: UserProfile;
  prefillData?: {
    lotNumber: string;
    item: string;
    measured: string;
    spec: string;
  } | null;
  onClearPrefill?: () => void;
  onRefreshGlobalCounts: () => void;
}

export const AnomalyModule: React.FC<AnomalyModuleProps> = ({
  currentUser,
  prefillData,
  onClearPrefill,
  onRefreshGlobalCounts,
}) => {
  const [anomalies, setAnomalies] = useState<QualityAnomaly[]>(() => qcStorage.getAnomalies());
  const [selectedAnomaly, setSelectedAnomaly] = useState<QualityAnomaly | null>(() => {
    const list = qcStorage.getAnomalies();
    return list[0] || null;
  });

  // Filter state
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New NCR Modal State
  const [isCreatingNCR, setIsCreatingNCR] = useState<boolean>(!!prefillData);
  const [newLotNumber, setNewLotNumber] = useState<string>(prefillData?.lotNumber || 'LOT-20261026-B2');
  const [newDefectItem, setNewDefectItem] = useState<string>(prefillData?.item || '滾道外觀刮痕凹痕 (Raceway Surface)');
  const [newDefectCategory, setNewDefectCategory] = useState<string>('外觀刮傷碰凹 (Scratch & Dent)');
  const [newSeverity, setNewSeverity] = useState<AnomalySeverity>('P1_critical');
  const [newQty, setNewQty] = useState<number>(24);
  const [newDescription, setNewDescription] = useState<string>(
    prefillData ? `實測值 ${prefillData.measured} 超出標準範圍 ${prefillData.spec}。` : '機台下料導軌碰傷零件表面。'
  );
  const [newQuarantineLocation, setNewQuarantineLocation] = useState<string>('紅區隔離庫 B-04 (禁止移轉)');
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('/src/assets/images/qc_bearing_defect_1793073344632.jpg');

  // Disposition Modal (QC-205)
  const [isDispositioning, setIsDispositioning] = useState<boolean>(false);
  const [dispType, setDispType] = useState<DispositionType>('rework');
  const [dispDetails, setDispDetails] = useState<string>('');
  const [disp5M1E, setDisp5M1E] = useState<string>('機 (Machine)：刀具後刀面崩刃造成加工微紋');

  // Closure Modal (QC-206)
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [closureEvidence, setClosureEvidence] = useState<string>('');

  // Quarantine Tag View
  const [showQuarantineTag, setShowQuarantineTag] = useState<boolean>(false);

  // Filter anomalies
  const filteredAnomalies = anomalies.filter((a) => {
    const matchSev = filterSeverity === 'all' || a.severity === filterSeverity;
    const matchStat = filterStatus === 'all' || a.status === filterStatus;
    return matchSev && matchStat;
  });

  // Handle Create NCR (QC-201, QC-204)
  const handleCreateNCR = () => {
    if (!newLotNumber.trim() || !newDefectItem.trim()) {
      alert('請完整填寫批號與異常項目！');
      return;
    }

    const newNcrNumber = `NCR-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${String(
      anomalies.length + 1
    ).padStart(2, '0')}`;

    const newEntry: QualityAnomaly = {
      id: `anom_${Date.now()}`,
      ncrNumber: newNcrNumber,
      taskNumber: 'INSP-20261026-LIVE',
      lotNumber: newLotNumber,
      workOrderNumber: 'WO-20261026-LIVE',
      productId: 'prod_bearing',
      productName: '航太精密主軸承外圈',
      defectItem: newDefectItem,
      defectCategory: newDefectCategory,
      severity: newSeverity,
      status: 'open',
      affectedQuantity: newQty,
      description: newDescription,
      photoUrl: newPhotoUrl,
      reportedBy: `${currentUser.name} (${currentUser.roleTitle})`,
      reportedAt: new Date().toISOString(),
      isQuarantined: true, // Auto-lock to Quarantine (QC-204)
      quarantineLocation: newQuarantineLocation,
    };

    qcStorage.saveAnomaly(newEntry);
    setAnomalies(qcStorage.getAnomalies());
    setSelectedAnomaly(newEntry);
    setIsCreatingNCR(false);
    if (onClearPrefill) onClearPrefill();
    onRefreshGlobalCounts();

    alert(
      `【品質異常建案完成】編號 ${newNcrNumber} 已成立！\n批號 ${newLotNumber} (數量 ${newQty} 件) 已自動標記為【隔離管制 (Quarantined)】。\n系統已發出通報通知品質主管及現場工程主管！`
    );
  };

  // UAT-04: Release Quarantine Enforcement
  const handleToggleQuarantine = (anomaly: QualityAnomaly) => {
    // Only QA Manager can lift quarantine
    if (currentUser.role !== 'qa_manager') {
      alert(
        `【UAT-04 權限安全防錯攔截】\n目前登入角色為「${currentUser.roleTitle}」。\n依品管防錯程序第 3 條：已隔離產品之隔離解除，僅限【品質主管 (QA Manager)】具有授權解除權限！\n請切換為品質主管身分以執行解除操作。`
      );
      return;
    }

    const nextQuarantineState = !anomaly.isQuarantined;
    const updated: QualityAnomaly = {
      ...anomaly,
      isQuarantined: nextQuarantineState,
    };

    qcStorage.saveAnomaly(updated);
    setAnomalies(qcStorage.getAnomalies());
    setSelectedAnomaly(updated);
    onRefreshGlobalCounts();

    qcStorage.addAuditEntry({
      userId: currentUser.badgeNumber,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: nextQuarantineState ? '重新隔離批次' : '解除批次隔離 (UAT-04)',
      module: '異常處置管理',
      lotNumber: anomaly.lotNumber,
      details: `品質主管 ${currentUser.name} ${nextQuarantineState ? '恢復隔離' : '已核准解除隔離'} (案件 ${anomaly.ncrNumber})`,
    });

    alert(
      nextQuarantineState
        ? `批號 ${anomaly.lotNumber} 已重新恢復隔離管制！`
        : `【UAT-04 驗證成功】品質主管 ${currentUser.name} 已解除批號 ${anomaly.lotNumber} 之隔離狀態，並完成稽核簽名留存。`
    );
  };

  // QC-205: Submit MRB Disposition
  const handleSaveDisposition = () => {
    if (!selectedAnomaly) return;
    if (!dispDetails.trim()) {
      alert('請填寫處置決策說明與處置方案！');
      return;
    }

    const updated: QualityAnomaly = {
      ...selectedAnomaly,
      status: 'dispositioned',
      disposition: {
        type: dispType,
        details: dispDetails,
        rootCause5M1E: disp5M1E,
        dispositionedBy: `${currentUser.name} (${currentUser.roleTitle})`,
        dispositionedAt: new Date().toISOString(),
        retestResult: dispType === 'scrap' ? 'failed' : 'passed',
      },
    };

    qcStorage.saveAnomaly(updated);
    setAnomalies(qcStorage.getAnomalies());
    setSelectedAnomaly(updated);
    setIsDispositioning(false);
    onRefreshGlobalCounts();

    alert(`【MRB 處置完成】已登記 ${dispType === 'rework' ? '返工重修' : dispType === 'scrap' ? '報廢' : '特採'} 處置！`);
  };

  // QC-206: Close Anomaly
  const handleCloseAnomaly = () => {
    if (!selectedAnomaly) return;
    if (currentUser.role !== 'qa_manager') {
      alert('僅品質主管 (QA Manager) 可執行異常案件審查結案！');
      return;
    }
    if (!closureEvidence.trim()) {
      alert('請填寫結案改善證據與驗證結果！');
      return;
    }

    const updated: QualityAnomaly = {
      ...selectedAnomaly,
      status: 'closed',
      isQuarantined: false, // lift quarantine upon approved closure
      closure: {
        approvedBy: `${currentUser.name} (${currentUser.roleTitle})`,
        approvedAt: new Date().toISOString(),
        closureEvidence,
        isApproved: true,
      },
      capa: {
        capaNumber: `CAPA-${selectedAnomaly.ncrNumber}`,
        actionPlan: '完成機台夾具限位塊鎖固改造與作業員 SOP 重新訓練',
        responsiblePerson: '陳志明 (現場領班)',
        dueDate: '2026-11-15',
        verificationStatus: 'verified',
        effectivenessNote: '追蹤後續 3 批次未再發生類似刮碰傷缺陷',
      },
    };

    qcStorage.saveAnomaly(updated);
    setAnomalies(qcStorage.getAnomalies());
    setSelectedAnomaly(updated);
    setIsClosing(false);
    onRefreshGlobalCounts();

    alert(`【NCR 結案核准】案件 ${selectedAnomaly.ncrNumber} 已審查結案，矯正預防措施 (CAPA) 納入追蹤！`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">QC-200 · NON-CONFORMANCE & MRB</div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">品質異常通報與處置管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            超規自動建案 · 不合格品庫位實體隔離 · MRB 審查處置 · CAPA 矯正改善閉環
          </p>
        </div>

        <button
          onClick={() => setIsCreatingNCR(true)}
          className="px-4 py-2 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>手動新建異常案件 (NCR)</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: NCR List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>品質異常案件清單</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">{filteredAnomalies.length} 件</span>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 text-[11px] pb-1 border-b border-slate-100">
              <span className="text-slate-400">嚴重度:</span>
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-2 py-0.5 rounded ${filterSeverity === 'all' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterSeverity('P1_critical')}
                className={`px-2 py-0.5 rounded ${filterSeverity === 'P1_critical' ? 'bg-red-600 text-white font-medium' : 'text-slate-600'}`}
              >
                P1 致命
              </button>
              <button
                onClick={() => setFilterSeverity('P2_major')}
                className={`px-2 py-0.5 rounded ${filterSeverity === 'P2_major' ? 'bg-amber-600 text-white font-medium' : 'text-slate-600'}`}
              >
                P2 主要
              </button>
            </div>

            {/* Cards List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredAnomalies.map((anom) => {
                const isSelected = selectedAnomaly?.id === anom.id;
                return (
                  <div
                    key={anom.id}
                    onClick={() => setSelectedAnomaly(anom)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-mono font-bold text-slate-900">{anom.ncrNumber}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          anom.status === 'closed'
                            ? 'bg-slate-100 text-slate-600'
                            : anom.status === 'dispositioned'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {anom.status === 'open' ? '待處置' : anom.status === 'dispositioned' ? '處置中' : '已結案'}
                      </span>
                    </div>

                    <div className="mt-1 font-medium text-slate-800 line-clamp-1">{anom.defectItem}</div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-mono font-medium text-slate-700">{anom.lotNumber}</span>
                      {anom.isQuarantined ? (
                        <span className="text-red-700 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3 text-red-600" />
                          已隔離管制
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          隔離已解除
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed NCR Card & Operations */}
        <div className="lg:col-span-8 space-y-4">
          {selectedAnomaly ? (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-900 text-white rounded">
                      {selectedAnomaly.ncrNumber}
                    </span>
                    <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      等級：{selectedAnomaly.severity === 'P1_critical' ? 'P1 致命中斷' : 'P2 主要異常'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedAnomaly.defectItem}</h2>
                </div>

                {/* Quarantine Status Badge with Action Button (UAT-04) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQuarantineTag(!showQuarantineTag)}
                    className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>查看隔離管制標籤</span>
                  </button>

                  <button
                    onClick={() => handleToggleQuarantine(selectedAnomaly)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                      selectedAnomaly.isQuarantined
                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                    title="UAT-04 驗證：非品質主管點擊將被系統防錯阻擋"
                  >
                    {selectedAnomaly.isQuarantined ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-700" />
                        <span>解除隔離 (需品保主管)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-red-700" />
                        <span>重新鎖定隔離</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quarantine Tag Card Preview (If toggled) */}
              {showQuarantineTag && (
                <div className="p-4 bg-red-600 text-white rounded-lg shadow-sm border border-red-700 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-red-400 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-yellow-300" />
                      <span className="font-bold tracking-wider text-sm">不合格品隔離標籤 (HOLD / QUARANTINE TAG)</span>
                    </div>
                    <span className="text-xs font-mono bg-red-800 px-2 py-0.5 rounded">嚴禁移轉出貨</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-red-200 text-[10px]">受管製品號</div>
                      <div className="font-mono font-bold text-sm text-yellow-300">{selectedAnomaly.lotNumber}</div>
                    </div>
                    <div>
                      <div className="text-red-200 text-[10px]">隔離數量</div>
                      <div className="font-bold text-sm">{selectedAnomaly.affectedQuantity} PCS</div>
                    </div>
                    <div>
                      <div className="text-red-200 text-[10px]">實體隔離庫位</div>
                      <div className="font-bold">{selectedAnomaly.quarantineLocation || '紅區隔離庫 B-04'}</div>
                    </div>
                    <div>
                      <div className="text-red-200 text-[10px]">標記人員</div>
                      <div>{selectedAnomaly.reportedBy}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Defect Details & Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">產品名稱：</span>
                    <span className="font-medium text-slate-900">{selectedAnomaly.productName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">工單 / 批號：</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {selectedAnomaly.workOrderNumber} / {selectedAnomaly.lotNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">缺陷分類：</span>
                    <span className="font-medium text-slate-800">{selectedAnomaly.defectCategory}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">實測超規數據：</span>
                    <span className="font-mono font-bold text-red-600">
                      {selectedAnomaly.measuredValue || '目視外觀缺陷超規'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">提報時間 / 人員：</span>
                    <span className="text-slate-700">
                      {selectedAnomaly.reportedAt.replace('T', ' ').substring(0, 16)} · {selectedAnomaly.reportedBy}
                    </span>
                  </div>
                </div>

                {/* Attached Defect Photo */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-600">現場缺陷照片存證 (QC-201)：</div>
                  {selectedAnomaly.photoUrl ? (
                    <div className="relative rounded border border-slate-300 overflow-hidden bg-slate-900 h-36 flex items-center justify-center">
                      <img
                        src={selectedAnomaly.photoUrl}
                        alt="現場缺陷存證"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-36 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      未上傳照片
                    </div>
                  )}
                </div>
              </div>

              {/* Disposition (MRB) Status Section */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>MRB 審查處置決策 (QC-205)</span>
                  </h3>
                  {!selectedAnomaly.disposition && (
                    <button
                      onClick={() => setIsDispositioning(true)}
                      className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      進行處置判定
                    </button>
                  )}
                </div>

                {selectedAnomaly.disposition ? (
                  <div className="space-y-2 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        處置方式：
                        <span className="ml-1 text-blue-700">
                          {selectedAnomaly.disposition.type === 'rework'
                            ? '返工重修 (Rework)'
                            : selectedAnomaly.disposition.type === 'scrap'
                            ? '報廢處理 (Scrap)'
                            : '特採使用 (Concession)'}
                        </span>
                      </span>
                      <span className="text-slate-500">{selectedAnomaly.disposition.dispositionedBy}</span>
                    </div>
                    <div className="text-slate-700 leading-relaxed">{selectedAnomaly.disposition.details}</div>
                    <div className="pt-1 text-[11px] text-slate-500 font-mono">
                      根本原因 (5M1E)：{selectedAnomaly.disposition.rootCause5M1E}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-2">尚未進行 MRB 處置判定，該批次持續處於管制狀態。</div>
                )}
              </div>

              {/* Closure and CAPA Section (QC-206, QC-207) */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>異常案件結案審查與 CAPA 追蹤 (QC-206 / QC-207)</span>
                  </h3>
                  {selectedAnomaly.status !== 'closed' && (
                    <button
                      onClick={() => setIsClosing(true)}
                      className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    >
                      品質主管結案簽核
                    </button>
                  )}
                </div>

                {selectedAnomaly.closure ? (
                  <div className="space-y-2 text-xs bg-emerald-50/50 p-3 rounded border border-emerald-200">
                    <div className="flex items-center justify-between text-emerald-900">
                      <span className="font-bold">已結案 (Closed) · 核准人：{selectedAnomaly.closure.approvedBy}</span>
                      <span className="text-[11px] font-mono">
                        {selectedAnomaly.closure.approvedAt.replace('T', ' ').substring(0, 16)}
                      </span>
                    </div>
                    <p className="text-emerald-800">{selectedAnomaly.closure.closureEvidence}</p>
                    {selectedAnomaly.capa && (
                      <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-950">
                        <strong>CAPA 改善對策：</strong> {selectedAnomaly.capa.actionPlan} (負責人：
                        {selectedAnomaly.capa.responsiblePerson} · 驗證結果：{selectedAnomaly.capa.effectivenessNote})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-2">待完成處置與再發防止驗證後，由品質主管簽核結案。</div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
              請由左側選擇異常案件
            </div>
          )}
        </div>
      </div>

      {/* Create New NCR Modal */}
      {isCreatingNCR && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 text-red-600 rounded">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">建立品質異常案件 (NCR 建案 - QC-201)</h3>
                  <p className="text-xs text-slate-500">系統將同步鎖定該批次為「隔離管制」防錯狀態</p>
                </div>
              </div>
              <button onClick={() => setIsCreatingNCR(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">生產批號 *</label>
                  <input
                    type="text"
                    value={newLotNumber}
                    onChange={(e) => setNewLotNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">異常嚴重度 *</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as AnomalySeverity)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="P1_critical">P1 致命 (停止生產/全數隔離)</option>
                    <option value="P2_major">P2 主要 (功能/裝配公差超差)</option>
                    <option value="P3_minor">P3 輕微 (外觀微量偏差)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">異常檢驗項目 / 特性 *</label>
                <input
                  type="text"
                  value={newDefectItem}
                  onChange={(e) => setNewDefectItem(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">缺陷分類</label>
                  <select
                    value={newDefectCategory}
                    onChange={(e) => setNewDefectCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="外觀刮傷碰凹 (Scratch & Dent)">外觀刮傷碰凹 (Scratch & Dent)</option>
                    <option value="尺寸超差 (Out of Dimension)">尺寸超差 (Out of Dimension)</option>
                    <option value="應力裂紋 (Stress Crack)">應力裂紋 (Stress Crack)</option>
                    <option value="焊接不良錫橋 (Solder Bridge)">焊接不良錫橋 (Solder Bridge)</option>
                    <option value="異物殘留 (Foreign Particle)">異物殘留 (Foreign Particle)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">受影響數量 (PCS) *</label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">預設隔離庫位 (QC-204)</label>
                <input
                  type="text"
                  value={newQuarantineLocation}
                  onChange={(e) => setNewQuarantineLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">缺陷現場描述</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">存證照片路徑 (可選擇預設樣品照片)</label>
                <div className="flex items-center gap-2">
                  <select
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  >
                    <option value="/src/assets/images/qc_bearing_defect_1793073344632.jpg">
                      航太軸承滾道刮傷與凹痕照片
                    </option>
                    <option value="/src/assets/images/qc_casing_crack_1793073345335.jpg">
                      醫療 PEEK 注塑外殼應力裂痕照片
                    </option>
                    <option value="/src/assets/images/qc_pcb_solder_defect_1793073345497.jpg">
                      SMT 電路板 IC 錫橋短路微觀照片
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCreatingNCR(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                取消
              </button>
              <button
                onClick={handleCreateNCR}
                className="px-4 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700"
              >
                確認建案並隔離批次
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MRB Disposition Modal */}
      {isDispositioning && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">MRB 品質處置審查 (QC-205)</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">處置方式 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'rework', label: '返工重修' },
                    { id: 'scrap', label: '報廢處理' },
                    { id: 'concession', label: '特採允收' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDispType(t.id as DispositionType)}
                      className={`p-2 rounded border text-center font-medium ${
                        dispType === t.id
                          ? 'border-blue-600 bg-blue-50 text-blue-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">要因分析 5M1E *</label>
                <input
                  type="text"
                  value={disp5M1E}
                  onChange={(e) => setDisp5M1E(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  placeholder="人/機/料/法/環/測"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">處置指示與作業規範說明 *</label>
                <textarea
                  rows={3}
                  value={dispDetails}
                  onChange={(e) => setDispDetails(e.target.value)}
                  placeholder="填寫具體返工指導書、報廢流程或特採簽核工程依據..."
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsDispositioning(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                取消
              </button>
              <button
                onClick={handleSaveDisposition}
                className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存處置決策
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closure Modal */}
      {isClosing && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">品質主管異常結案審查 (QC-206)</h3>
            <p className="text-xs text-slate-500">確認處置完成並驗證改善措施後，正式解除追蹤並結案。</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">改善驗證證據與效果說明 *</label>
                <textarea
                  rows={3}
                  value={closureEvidence}
                  onChange={(e) => setClosureEvidence(e.target.value)}
                  placeholder="例如：機台氣動機械臂滑軌限位塊已完成更換鎖緊，加裝防撞緩衝墊，抽驗 3 批次零刮傷..."
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsClosing(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                取消
              </button>
              <button
                onClick={handleCloseAnomaly}
                className="px-4 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                品質主管簽名結案
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
