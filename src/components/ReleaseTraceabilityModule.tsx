/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ReleaseRecord,
  UserProfile,
  LotTraceabilityData,
  CustomerComplaint,
} from '../types/qc';
import { qcStorage } from '../services/qcStorage';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Truck,
  Search,
  FileCheck2,
  GitBranch,
  Layers,
  ArrowRight,
  ExternalLink,
  Barcode,
  PackageCheck,
  UserCheck,
} from 'lucide-react';

interface ReleaseTraceabilityModuleProps {
  currentUser: UserProfile;
  initialLotNumber?: string;
  onRefreshGlobalCounts: () => void;
}

export const ReleaseTraceabilityModule: React.FC<ReleaseTraceabilityModuleProps> = ({
  currentUser,
  initialLotNumber,
  onRefreshGlobalCounts,
}) => {
  const [subTab, setSubTab] = useState<'gatekeeper' | 'traceability' | 'complaints'>('gatekeeper');

  // Gatekeeper state (QC-302, QC-303)
  const [releases, setReleases] = useState<ReleaseRecord[]>(() => qcStorage.getReleases());
  const [gateScanInput, setGateScanInput] = useState<string>('LOT-20261026-D4');
  const [gateEvaluation, setGateEvaluation] = useState<{
    evaluated: boolean;
    canRelease: boolean;
    reason: string;
    targetLot?: string;
    record?: ReleaseRecord;
  }>({
    evaluated: false,
    canRelease: false,
    reason: '',
  });

  // Traceability state (QC-304, UAT-06)
  const [traceLotInput, setTraceLotInput] = useState<string>(initialLotNumber || 'LOT-20261026-D4');
  const [activeTraceData, setActiveTraceData] = useState<LotTraceabilityData | undefined>(() =>
    qcStorage.getTraceability('LOT-20261026-D4')
  );

  // Complaints state (QC-305)
  const [complaints] = useState<CustomerComplaint[]>(() => qcStorage.getComplaints());
  const [selectedComplaint, setSelectedComplaint] = useState<CustomerComplaint | null>(complaints[0] || null);

  // UAT-03 & UAT-04: Evaluate Release Gatekeeper
  const handleCheckReleaseGate = (lotQuery?: string) => {
    const lot = (lotQuery || gateScanInput).trim().toUpperCase();
    if (!lot) return;

    // 1. Check if lot exists in tasks
    const allTasks = qcStorage.getTasks();
    const task = allTasks.find((t) => t.lotNumber.toUpperCase() === lot);

    // 2. Check if lot is in active quarantine (QC-204)
    const anomalies = qcStorage.getAnomalies();
    const activeQuarantine = anomalies.find((a) => a.lotNumber.toUpperCase() === lot && a.isQuarantined);

    // 3. Check if lot is already approved in release records
    const releaseRec = releases.find((r) => r.lotNumber.toUpperCase() === lot);

    if (activeQuarantine) {
      setGateEvaluation({
        evaluated: true,
        canRelease: false,
        reason: `【UAT-04 出貨閘門防錯攔截】批號 ${lot} 目前處於「品質異常隔離中 (案件 ${activeQuarantine.ncrNumber})」！儲位於 ${activeQuarantine.quarantineLocation}，系統嚴格禁止出貨放行！`,
        targetLot: lot,
        record: releaseRec,
      });
      return;
    }

    if (!task || task.status === 'pending' || task.status === 'in_progress' || task.status === 'overdue') {
      setGateEvaluation({
        evaluated: true,
        canRelease: false,
        reason: `【UAT-03 出貨閘門防錯攔截】批號 ${lot} 尚未完成必要之檢驗流程！(目前狀態：${
          task?.status === 'overdue' ? '逾期未檢' : '未檢驗/檢驗中'
        })，依規則禁止出貨！`,
        targetLot: lot,
        record: releaseRec,
      });
      return;
    }

    if (task.status === 'failed') {
      setGateEvaluation({
        evaluated: true,
        canRelease: false,
        reason: `【出貨閘門攔截】批號 ${lot} 檢驗判定為「不合格」，不得正常放行出貨！`,
        targetLot: lot,
        record: releaseRec,
      });
      return;
    }

    // Task is passed, check if QA Manager has formally approved
    if (releaseRec?.isApproved) {
      setGateEvaluation({
        evaluated: true,
        canRelease: true,
        reason: `【綠色通行准許】批號 ${lot} 檢驗合格且已取得品質主管核准放行！可正常執行報關與車輛裝載出庫。`,
        targetLot: lot,
        record: releaseRec,
      });
    } else {
      setGateEvaluation({
        evaluated: true,
        canRelease: false,
        reason: `【待品保放行簽核】批號 ${lot} 檢驗已合格，但尚未取得【品質主管 (QA Manager)】之出貨放行核准！`,
        targetLot: lot,
        record: releaseRec,
      });
    }
  };

  // UAT-05: QA Manager Release Approval
  const handleApproveRelease = (lotNumber: string) => {
    if (currentUser.role !== 'qa_manager') {
      alert(
        `【UAT-05 權限安全防錯攔截】\n目前登入角色為「${currentUser.roleTitle}」。\n出貨放行審批為最終關鍵關卡，僅限【品質主管 (QA Manager)】授權放行！\n請切換至品質主管角色再行審批。`
      );
      return;
    }

    const rec = releases.find((r) => r.lotNumber === lotNumber);
    if (!rec) return;

    const certNo = `COA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const updated: ReleaseRecord = {
      ...rec,
      isApproved: true,
      approvedBy: `${currentUser.name} (${currentUser.badgeNumber})`,
      approvedAt: new Date().toISOString(),
      releaseCertificateNo: certNo,
      comments: 'OQC 全數檢驗合格，製程穩定，准予出貨放行。',
    };

    qcStorage.saveRelease(updated);
    setReleases(qcStorage.getReleases());
    onRefreshGlobalCounts();

    qcStorage.addAuditEntry({
      userId: currentUser.badgeNumber,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: '核准產品出貨放行 (UAT-05)',
      module: '放行與批次追溯',
      lotNumber,
      details: `品質主管 ${currentUser.name} 簽發出廠檢驗證明書 ${certNo}，正式放行出貨。`,
    });

    handleCheckReleaseGate(lotNumber);
    alert(`【UAT-05 驗證成功】批號 ${lotNumber} 已由品質主管核准放行！\n出廠檢驗證明書 (COA) 編號：${certNo}`);
  };

  // Query Lot Traceability (UAT-06)
  const handleQueryTraceability = (lotInput?: string) => {
    const lot = (lotInput || traceLotInput).trim().toUpperCase();
    if (!lot) return;

    const data = qcStorage.getTraceability(lot);
    if (data) {
      setActiveTraceData(data);
      setTraceLotInput(lot);
    } else {
      alert(`批號 ${lot} 無全流程履歷存檔，請嘗試查詢預設批號：LOT-20261026-D4 或 LOT-20261026-B2`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            QC-300 · RELEASE GATE & TRACEABILITY
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">產品放行管制與批次追溯</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            未核准/隔離品出貨防錯攔截 · 品質主管數位放行簽核 · 上下游全流程批次溯源 · 客訴批次追查
          </p>
        </div>

        {/* Sub Navigation Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setSubTab('gatekeeper')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              subTab === 'gatekeeper' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            出貨放行檢查 (QC-302)
          </button>
          <button
            onClick={() => setSubTab('traceability')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              subTab === 'traceability' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全流程批次追溯 (QC-304)
          </button>
          <button
            onClick={() => setSubTab('complaints')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              subTab === 'complaints' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            客訴批次追查 (QC-305)
          </button>
        </div>
      </div>

      {/* SubTab 1: Shipping Release Gatekeeper (QC-302, QC-303) */}
      {subTab === 'gatekeeper' && (
        <div className="space-y-6">
          {/* Release Scanner & Verification Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>QC-302 出貨放行防錯檢查閘門 (Shipping Release Gatekeeper)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  現場倉管出庫掃描防錯：若有未完檢、隔離中或未取得品保簽核者，閘門將強制攔截！
                </p>
              </div>

              {/* Quick Preset Buttons for UAT Testing */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">快速測試批號:</span>
                <button
                  onClick={() => {
                    setGateScanInput('LOT-20261026-D4');
                    handleCheckReleaseGate('LOT-20261026-D4');
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-mono text-[11px]"
                >
                  D4 (合格待審)
                </button>
                <button
                  onClick={() => {
                    setGateScanInput('LOT-20261026-E5');
                    handleCheckReleaseGate('LOT-20261026-E5');
                  }}
                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-mono text-[11px]"
                >
                  E5 (隔離中 UAT-04)
                </button>
                <button
                  onClick={() => {
                    setGateScanInput('LOT-20261026-C3');
                    handleCheckReleaseGate('LOT-20261026-C3');
                  }}
                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-mono text-[11px]"
                >
                  C3 (漏檢未完 UAT-03)
                </button>
              </div>
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="輸入或條碼掃描批號 (如: LOT-20261026-D4)..."
                  value={gateScanInput}
                  onChange={(e) => setGateScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckReleaseGate()}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => handleCheckReleaseGate()}
                className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>執行放行防錯查核</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Evaluation Result Box */}
            {gateEvaluation.evaluated && (
              <div
                className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  gateEvaluation.canRelease
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded shrink-0 ${
                      gateEvaluation.canRelease ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {gateEvaluation.canRelease ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {gateEvaluation.canRelease ? '放行檢查合格 · 准予出庫' : '出貨防錯攔截 · 禁止出庫'}
                    </div>
                    <div className="text-xs mt-1 leading-relaxed">{gateEvaluation.reason}</div>
                  </div>
                </div>

                {/* Approve Button if passed inspection but unapproved */}
                {!gateEvaluation.canRelease &&
                  gateEvaluation.record &&
                  gateEvaluation.record.inspectionPassed &&
                  !gateEvaluation.record.hasActiveQuarantine && (
                    <button
                      onClick={() => handleApproveRelease(gateEvaluation.targetLot || '')}
                      className="px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
                      title="UAT-05: 僅品質主管具核准權限"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>品質主管核准放行 (UAT-05)</span>
                    </button>
                  )}
              </div>
            )}
          </div>

          {/* Release Records Table (QC-303) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">出貨批次放行清冊 (QC-303 放行紀錄)</h3>
                <p className="text-xs text-slate-500">所有出庫貨件皆受防錯鎖定與品質簽核稽核追蹤</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">{releases.length} 批次</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">放行編號</th>
                    <th className="py-2.5 px-3">批號 / 工單</th>
                    <th className="py-2.5 px-3">出貨單號 / 客戶</th>
                    <th className="py-2.5 px-3">產品名稱</th>
                    <th className="py-2.5 px-3 text-right">數量</th>
                    <th className="py-2.5 px-3 text-center">檢驗狀態</th>
                    <th className="py-2.5 px-3 text-center">隔離管制</th>
                    <th className="py-2.5 px-3 text-center">主管核准</th>
                    <th className="py-2.5 px-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {releases.map((rel) => (
                    <tr key={rel.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-blue-700">{rel.releaseNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">{rel.lotNumber}</div>
                        <div className="font-mono text-[11px] text-slate-500">{rel.workOrderNumber}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-700">{rel.deliveryOrderNumber}</div>
                        <div className="text-[11px] text-slate-500">{rel.customerName}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-800">{rel.productName}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">{rel.quantity} PCS</td>
                      <td className="py-3 px-3 text-center">
                        {rel.inspectionPassed ? (
                          <span className="text-emerald-700 font-medium">合格 (OK)</span>
                        ) : (
                          <span className="text-red-700 font-medium">未完成/不合格</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {rel.hasActiveQuarantine ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <Lock className="w-3 h-3 text-red-600" />
                            已隔離
                          </span>
                        ) : (
                          <span className="text-slate-500">無隔離</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {rel.isApproved ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              已核准放行
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">{rel.approvedBy?.split(' ')[0]}</div>
                          </div>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                            待放行審核
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {!rel.isApproved && rel.inspectionPassed && !rel.hasActiveQuarantine ? (
                          <button
                            onClick={() => handleApproveRelease(rel.lotNumber)}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800"
                          >
                            核准 (UAT-05)
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSubTab('traceability');
                              handleQueryTraceability(rel.lotNumber);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            查履歷
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Full Lot Genealogy & Traceability Tree (QC-304, UAT-06) */}
      {subTab === 'traceability' && (
        <div className="space-y-6">
          {/* Query Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600" />
              <span>QC-304 批次全流程追溯 (Lot Genealogy & Traceability Tree)</span>
            </h2>
            <p className="text-xs text-slate-500">
              UAT-06 驗證：輸入指定批號，串聯原料爐號、機台人員、首件/巡檢紀錄、異常隔離與出貨物流全歷程。
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="輸入欲追溯之批號 (例: LOT-20261026-D4 或 LOT-20261026-B2)..."
                  value={traceLotInput}
                  onChange={(e) => setTraceLotInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQueryTraceability()}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => handleQueryTraceability()}
                className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>調閱全流程履歷</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Trace Tree View */}
          {activeTraceData ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
              {/* Lot Summary Kicker */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs font-mono text-blue-600 font-semibold">{activeTraceData.workOrderNumber}</div>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                    批號：<span className="font-mono">{activeTraceData.lotNumber}</span>
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">
                    產品：{activeTraceData.productName} · 數量：{activeTraceData.batchQuantity} PCS · 生產日期：
                    {activeTraceData.productionDate}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-400">生產線 / 機台：</span>
                    <div className="font-medium text-slate-800">
                      {activeTraceData.line} · {activeTraceData.machineId}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">班別 / 操作員：</span>
                    <div className="font-medium text-slate-800">
                      {activeTraceData.shift} · {activeTraceData.operator}
                    </div>
                  </div>
                </div>
              </div>

              {/* End-to-End Visual Timeline */}
              <div className="space-y-6">
                {/* 1. 上游原料履歷 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-mono">
                      1
                    </span>
                    <span>上游原材料批次與進料檢驗 (Raw Material Heat & Incoming Inspection)</span>
                  </div>
                  <div className="ml-7 border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-2 px-3">材料名稱</th>
                          <th className="py-2 px-3">供應商</th>
                          <th className="py-2 px-3 font-mono">供應商批號 / 爐號 (Heat#)</th>
                          <th className="py-2 px-3">進料檢驗日</th>
                          <th className="py-2 px-3 text-center">進料判定</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeTraceData.rawMaterials.map((rm, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{rm.materialName}</td>
                            <td className="py-2.5 px-3 text-slate-600">{rm.supplier}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {rm.supplierLot} / {rm.heatNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">{rm.incomingInspectionDate}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                                {rm.incomingResult}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. 製程檢驗節點 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-mono">
                      2
                    </span>
                    <span>製程品質檢驗歷程 (首件 / 巡檢 / 出檢記錄)</span>
                  </div>
                  <div className="ml-7 space-y-2">
                    {activeTraceData.inspectionMilestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded border border-slate-200 bg-slate-50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{m.stage}</span>
                            <span className="font-mono text-slate-500">[{m.taskNumber}]</span>
                            <span className="text-slate-400 font-mono">@{m.time}</span>
                          </div>
                          <div className="text-slate-600 mt-1 font-mono text-[11px]">{m.keyParameters}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-[11px]">檢驗員：{m.inspector}</span>
                          <span
                            className={`px-2 py-0.5 rounded font-medium ${
                              m.result === '合格'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {m.result}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. 異常事件歷程 (如有) */}
                {activeTraceData.anomalyEvents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[11px] font-mono">
                        !
                      </span>
                      <span>生產中品質異常與處置事件</span>
                    </div>
                    <div className="ml-7 space-y-2">
                      {activeTraceData.anomalyEvents.map((ae, idx) => (
                        <div key={idx} className="p-3 rounded border border-red-200 bg-red-50 text-xs text-red-950">
                          <div className="flex items-center justify-between font-bold">
                            <span>{ae.ncrNumber} - {ae.issue}</span>
                            <span className="font-mono text-[11px]">{ae.time}</span>
                          </div>
                          <div className="mt-1 text-red-800 leading-relaxed">{ae.disposition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. 出貨與物流流向 */}
                {activeTraceData.shippingRecord && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-mono">
                        3
                      </span>
                      <span>出貨流向與物流承運商 (Shipping & Dispatch Trace)</span>
                    </div>
                    <div className="ml-7 p-3 bg-slate-50 rounded border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <div className="text-slate-400 text-[10px]">出貨單號</div>
                        <div className="font-mono font-bold text-slate-900">
                          {activeTraceData.shippingRecord.deliveryOrderNumber}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">交付客戶</div>
                        <div className="font-medium text-slate-800">{activeTraceData.shippingRecord.customerName}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">出庫目的地</div>
                        <div className="text-slate-700">{activeTraceData.shippingRecord.destination}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">承運物流</div>
                        <div className="text-slate-700">{activeTraceData.shippingRecord.carrier}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
              請輸入批號以查詢全流程履歷
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Customer Complaint Investigation (QC-305) */}
      {subTab === 'complaints' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-amber-600" />
              <span>QC-305 客訴批次追查與關聯批號防外溢 (Customer Complaint & RMA Trace)</span>
            </h2>
            <p className="text-xs text-slate-500">
              收到客戶品質客訴時，快速回溯製程根因、量測數據，並即時識別採用同原料批次或同班次之「兄弟批次 (Sibling Lots)」，全面防堵缺陷外流。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Complaints List */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-bold text-slate-900">客訴案件清單</div>
              <div className="space-y-2">
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer ${
                      selectedComplaint?.id === c.id
                        ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between font-mono font-bold text-slate-900">
                      <span>{c.complaintNumber}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{c.status}</span>
                    </div>
                    <div className="mt-1 font-medium text-slate-800">{c.customerName}</div>
                    <div className="mt-1 font-mono text-[11px] text-slate-500">受影響批號: {c.lotNumber}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Detailed Investigation Card */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              {selectedComplaint && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                        {selectedComplaint.complaintNumber}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedComplaint.customerName}</h3>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-slate-400">客訴日期</div>
                      <div className="font-mono text-slate-800">{selectedComplaint.complaintDate}</div>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                      <div className="font-bold text-red-900">客戶回報缺陷情形：</div>
                      <p className="text-red-800 leading-relaxed">{selectedComplaint.defectReported}</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                      <div className="font-bold text-slate-900">製程逆向回溯要因定位：</div>
                      <p className="text-slate-700 leading-relaxed">{selectedComplaint.rootCauseTrace}</p>
                    </div>

                    {/* Sibling Lots Warning (市場外溢防堵) */}
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>同原料批次 / 同班次關聯批號 (防外溢處置建議)：</span>
                      </div>
                      <p className="text-xs text-amber-800">
                        依追溯關聯性分析，以下批次採用相同之 40CrNiMoA 鋼材並由同班次加工，系統建議立即實施封存盤點與召回抽驗：
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        {selectedComplaint.affectedSiblingLots.map((sLot) => (
                          <span
                            key={sLot}
                            className="font-mono text-xs font-bold px-2.5 py-1 bg-white border border-amber-300 text-amber-950 rounded shadow-xs"
                          >
                            {sLot}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
