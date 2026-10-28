/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  InspectionTask,
  InspectionStandardItem,
  MeasurementEntry,
  MeasurementAuditLog,
  UserProfile,
  QualityAnomaly,
} from '../types/qc';
import { qcStorage } from '../services/qcStorage';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Download,
  Edit3,
  Lock,
  ArrowRight,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface InspectionModuleProps {
  currentUser: UserProfile;
  onTriggerNCR: (lotNumber: string, item: string, measured: string, spec: string) => void;
  onRefreshGlobalCounts: () => void;
}

export const InspectionModule: React.FC<InspectionModuleProps> = ({
  currentUser,
  onTriggerNCR,
  onRefreshGlobalCounts,
}) => {
  const [tasks, setTasks] = useState<InspectionTask[]>(() => qcStorage.getTasks());
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(() => {
    const list = qcStorage.getTasks();
    return list.find((t) => t.id === 'task_001') || list[0] || null;
  });

  // Current task's standard items
  const standards = useMemo(() => {
    if (!selectedTask) return [];
    return qcStorage.getStandards(selectedTask.productId);
  }, [selectedTask]);

  // Form input state for each item (in-progress worksheet)
  const [measurements, setMeasurements] = useState<Record<string, MeasurementEntry>>(() => {
    // Initial sample measurements for selectedTask
    const initial: Record<string, MeasurementEntry> = {};
    const task = qcStorage.getTasks().find((t) => t.id === 'task_001');
    if (task) {
      const items = qcStorage.getStandards(task.productId);
      items.forEach((item) => {
        initial[item.id] = {
          itemId: item.id,
          itemName: item.itemName,
          itemNumber: item.itemNumber,
          type: item.type,
          unit: item.unit,
          nominalValue: item.nominalValue,
          usl: item.usl,
          lsl: item.lsl,
          tool: item.tool,
          defectClass: item.defectClass,
          isMandatory: item.isMandatory,
          actualValue: item.itemNumber === 1 ? 50.008 : item.itemNumber === 2 ? 34.992 : '',
          isOutOfSpec: false,
          deviation: item.itemNumber === 1 ? 0.008 : item.itemNumber === 2 ? -0.008 : null,
          status: item.itemNumber <= 2 ? 'passed' : 'pending',
          sampleReadings: item.itemNumber === 1 ? [50.007, 50.009, 50.008, 50.008, 50.009] : [],
        };
      });
    }
    return initial;
  });

  // Filters & Search (QC-106)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'passed' | 'failed' | 'overdue'>('all');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [outOfSpecModal, setOutOfSpecModal] = useState<{
    isOpen: boolean;
    itemName: string;
    actual: number | string;
    spec: string;
    usl: number | null;
    lsl: number | null;
  } | null>(null);

  // Edit History Modal (UAT-07 & QC-104)
  const [editingAudit, setEditingAudit] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
    currentValue: string;
    newValue: string;
    reason: string;
  } | null>(null);

  const [auditLogs, setAuditLogs] = useState<MeasurementAuditLog[]>(() => qcStorage.getMeasurementAudits());

  // Handle switching tasks
  const handleSelectTask = (task: InspectionTask) => {
    setSelectedTask(task);
    setValidationError(null);
    const items = qcStorage.getStandards(task.productId);
    const updated: Record<string, MeasurementEntry> = {};
    items.forEach((item) => {
      // populate if exists or create empty
      updated[item.id] = {
        itemId: item.id,
        itemName: item.itemName,
        itemNumber: item.itemNumber,
        type: item.type,
        unit: item.unit,
        nominalValue: item.nominalValue,
        usl: item.usl,
        lsl: item.lsl,
        tool: item.tool,
        defectClass: item.defectClass,
        isMandatory: item.isMandatory,
        actualValue: task.status === 'passed' && item.nominalValue ? item.nominalValue + 0.005 : '',
        isOutOfSpec: false,
        deviation: null,
        status: task.status === 'passed' ? 'passed' : 'pending',
        sampleReadings: [],
      };
    });
    setMeasurements(updated);
  };

  // Real-time measurement validation (QC-103)
  const handleValueChange = (itemId: string, rawVal: string) => {
    setValidationError(null);
    const std = standards.find((s) => s.id === itemId);
    if (!std) return;

    if (rawVal.trim() === '') {
      setMeasurements((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          actualValue: '',
          isOutOfSpec: false,
          deviation: null,
          status: 'pending',
        },
      }));
      return;
    }

    const numVal = parseFloat(rawVal);
    let isOOS = false;
    let deviation: number | null = null;
    let status: 'passed' | 'failed' | 'pending' = 'passed';

    if (!isNaN(numVal) && std.nominalValue !== null) {
      deviation = parseFloat((numVal - std.nominalValue).toFixed(4));
      if (std.usl !== null && numVal > std.usl) {
        isOOS = true;
        status = 'failed';
      }
      if (std.lsl !== null && numVal < std.lsl) {
        isOOS = true;
        status = 'failed';
      }
    } else if (std.type === 'visual') {
      // visual check: if explicitly marked '不合格' or 'NG'
      if (rawVal === 'NG' || rawVal === '不合格' || rawVal === '缺陷') {
        isOOS = true;
        status = 'failed';
      }
    }

    setMeasurements((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        actualValue: isNaN(numVal) ? rawVal : numVal,
        isOutOfSpec: isOOS,
        deviation,
        status,
      },
    }));

    // Trigger Out-of-Spec Warning Dialog if failed (UAT-02)
    if (isOOS) {
      setOutOfSpecModal({
        isOpen: true,
        itemName: std.itemName,
        actual: rawVal,
        spec: `${std.lsl ?? '-∞'} ~ ${std.usl ?? '+∞'} ${std.unit}`,
        usl: std.usl,
        lsl: std.lsl,
      });
    }
  };

  // Submission validation (UAT-01: 未填完必要檢驗項目禁止送出)
  const handleSubmitInspection = () => {
    if (!selectedTask) return;

    // Check all mandatory items
    const missingItems: string[] = [];
    standards.forEach((std) => {
      if (std.isMandatory) {
        const entry = measurements[std.id];
        if (!entry || entry.actualValue === '' || entry.actualValue === null || entry.actualValue === undefined) {
          missingItems.push(`項次 ${std.itemNumber}. ${std.itemName}`);
        }
      }
    });

    if (missingItems.length > 0) {
      setValidationError(
        `【UAT-01 流程管制攔截】檢驗尚未完成！尚有 ${missingItems.length} 個必要檢驗項目未填寫實測值：\n${missingItems.join(
          '、'
        )}\n依品管防錯規範，未完整檢驗之批次不得送出結案！`
      );
      return;
    }

    // Check if any item failed
    const hasFailure = Object.values(measurements).some((m) => m.status === 'failed' || m.isOutOfSpec);
    const finalStatus = hasFailure ? 'failed' : 'passed';

    const updatedTask: InspectionTask = {
      ...selectedTask,
      status: finalStatus,
      completedAt: new Date().toISOString(),
      isOverdue: false,
    };

    qcStorage.saveTask(updatedTask);
    setTasks(qcStorage.getTasks());
    setSelectedTask(updatedTask);
    onRefreshGlobalCounts();

    qcStorage.addAuditEntry({
      userId: currentUser.badgeNumber,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: finalStatus === 'passed' ? '電子檢驗送出 (合格)' : '電子檢驗送出 (不合格)',
      module: '電子 QC 檢驗',
      lotNumber: selectedTask.lotNumber,
      details: `工單 ${selectedTask.workOrderNumber}，判定結果：${finalStatus === 'passed' ? '合格放行' : '不合格警示'}`,
    });

    if (hasFailure) {
      alert(
        `【檢驗不合格】批號 ${selectedTask.lotNumber} 存在超出規格項目！\n系統已自動更新狀態為「不合格」，建議立即前往「異常處置」模組建立 NCR 案件並執行批次隔離！`
      );
    } else {
      alert(`【檢驗合格】工單 ${selectedTask.workOrderNumber} (批號 ${selectedTask.lotNumber}) 檢驗完成，各項尺寸在標準內！`);
    }
  };

  // UAT-07: Save Record Modification with Audit Log
  const handleSaveAuditEdit = () => {
    if (!editingAudit || !selectedTask) return;
    if (!editingAudit.reason.trim()) {
      alert('請務必填寫修改原因以符合稽核追蹤規範！');
      return;
    }

    // Update measurement
    handleValueChange(editingAudit.itemId, editingAudit.newValue);

    // Save audit log
    qcStorage.addMeasurementAudit({
      taskNumber: selectedTask.taskNumber,
      lotNumber: selectedTask.lotNumber,
      itemName: editingAudit.itemName,
      previousValue: editingAudit.currentValue,
      newValue: editingAudit.newValue,
      changeReason: editingAudit.reason,
      modifiedBy: `${currentUser.name} (${currentUser.roleTitle})`,
    });

    setAuditLogs(qcStorage.getMeasurementAudits());
    setEditingAudit(null);
  };

  // Filter tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.taskNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' ? true : t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  // CSV Export (QC-106)
  const handleExportCSV = () => {
    const headers = ['任務編號', '工單號', '批號', '產品名稱', '檢驗類型', '指派人員', '狀態', '完成時間'];
    const rows = tasks.map((t) => [
      t.taskNumber,
      t.workOrderNumber,
      t.lotNumber,
      t.productName,
      t.planName,
      t.assignedInspector,
      t.status,
      t.completedAt || '未完成',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `QC_Inspection_Records_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Module Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">QC-100 · DIGITAL INSPECTION</div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">電子 QC 檢驗管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            工單檢驗任務派發 · 電子檢查表必填驗證 · 實限量測比對與超規防錯
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>匯出檢驗報表 (CSV)</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Task List, Right Inspection Worksheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inspection Tasks (QC-101, QC-105) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                <span>現場待檢任務清單</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">{filteredTasks.length} 筆</span>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="搜尋批號、工單、產品..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                {(
                  [
                    { id: 'all', label: '全部' },
                    { id: 'in_progress', label: '檢驗中' },
                    { id: 'pending', label: '待辦' },
                    { id: 'overdue', label: '逾期漏檢' },
                    { id: 'passed', label: '已合格' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded font-medium whitespace-nowrap transition-colors ${
                      statusFilter === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Item Cards */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">查無相符檢驗任務</div>
              ) : (
                filteredTasks.map((t) => {
                  const isSelected = selectedTask?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTask(t)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono font-bold text-slate-900">{t.lotNumber}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{t.workOrderNumber}</div>
                        </div>
                        {/* Status Label */}
                        <div>
                          {t.status === 'passed' && (
                            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              合格結案
                            </span>
                          )}
                          {t.status === 'in_progress' && (
                            <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              檢驗中
                            </span>
                          )}
                          {t.status === 'pending' && (
                            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              待檢驗
                            </span>
                          )}
                          {t.status === 'overdue' && (
                            <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              逾期未檢
                            </span>
                          )}
                          {t.status === 'failed' && (
                            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              判定不合格
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-slate-700 font-medium line-clamp-1">{t.productName}</div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <span>{t.planName.split(' ')[0]}</span>
                        <span className="font-mono">{t.line}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Missed Inspection Escalation Box (QC-105) */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-red-700">
              <Clock className="w-4 h-4 text-red-600" />
              <span>QC-105 防漏檢及逾期稽核警示</span>
            </div>
            <p className="text-[11px] leading-relaxed text-red-800">
              工單 <span className="font-mono font-bold">WO-20261026-003</span> 逾期未完成注塑巡檢，系統已觸發二級通知並在出貨閘門實施防錯攔截。
            </p>
          </div>
        </div>

        {/* Right Column: Digital Inspection Worksheet (QC-102, QC-103) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedTask ? (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              {/* Worksheet Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-mono font-semibold text-blue-600">{selectedTask.taskNumber}</span>
                    <span>·</span>
                    <span>{selectedTask.planName}</span>
                    <span>·</span>
                    <span className="font-mono">{selectedTask.line}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    {selectedTask.productName} ({selectedTask.productCode})
                  </h2>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <div className="text-slate-400">生產批號</div>
                    <div className="font-mono font-bold text-slate-900">{selectedTask.lotNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400">指派檢驗員</div>
                    <div className="font-medium text-slate-800">{selectedTask.assignedInspector}</div>
                  </div>
                </div>
              </div>

              {/* Validation Error Alert (UAT-01) */}
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-md text-xs text-red-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line leading-relaxed">{validationError}</div>
                </div>
              )}

              {/* Standard Items Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">項次</th>
                      <th className="py-2.5 px-3 min-w-[150px]">檢驗項目 / 特性</th>
                      <th className="py-2.5 px-3 min-w-[120px]">規格上下限 / 目標</th>
                      <th className="py-2.5 px-3 min-w-[100px]">量測設備 / 量具</th>
                      <th className="py-2.5 px-3 min-w-[140px]">實測數值 (實測登錄)</th>
                      <th className="py-2.5 px-3 w-24 text-center">判定</th>
                      <th className="py-2.5 px-3 w-16 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {standards.map((std) => {
                      const entry = measurements[std.id] || {
                        actualValue: '',
                        isOutOfSpec: false,
                        deviation: null,
                        status: 'pending',
                      };
                      const isMandatory = std.isMandatory;

                      return (
                        <tr
                          key={std.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            entry.isOutOfSpec ? 'bg-red-50/40' : ''
                          }`}
                        >
                          {/* Item Number */}
                          <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                            {std.itemNumber}
                          </td>

                          {/* Item Name & Details */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{std.itemName}</span>
                              {isMandatory && (
                                <span className="text-[10px] text-red-600 font-medium" title="必填項目">
                                  *必填
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{std.method}</div>
                          </td>

                          {/* Nominal & Tolerance */}
                          <td className="py-3 px-3 font-mono">
                            {std.nominalValue !== null ? (
                              <div>
                                <span className="font-bold text-slate-800 tabular-nums">
                                  {std.nominalValue} {std.unit}
                                </span>
                                <div className="text-[11px] text-slate-500 tabular-nums">
                                  [{std.lsl} ~ {std.usl}]
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-sans">{std.unit}</span>
                            )}
                          </td>

                          {/* Measurement Tool */}
                          <td className="py-3 px-3 text-slate-600 text-[11px]">{std.tool}</td>

                          {/* Actual Value Input (QC-103) */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {std.nominalValue !== null ? (
                                <div className="relative w-full">
                                  <input
                                    type="number"
                                    step="0.001"
                                    placeholder="輸入實測值"
                                    value={entry.actualValue ?? ''}
                                    onChange={(e) => handleValueChange(std.id, e.target.value)}
                                    className={`w-full font-mono text-xs px-2.5 py-1.5 rounded border tabular-nums focus:outline-none transition-colors ${
                                      entry.isOutOfSpec
                                        ? 'border-red-500 bg-red-50 text-red-900 font-bold focus:ring-1 focus:ring-red-500'
                                        : entry.actualValue !== ''
                                        ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950 font-medium'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  />
                                </div>
                              ) : (
                                <select
                                  value={entry.actualValue ? String(entry.actualValue) : ''}
                                  onChange={(e) => handleValueChange(std.id, e.target.value)}
                                  className={`w-full text-xs px-2 py-1.5 rounded border focus:outline-none ${
                                    entry.isOutOfSpec
                                      ? 'border-red-500 bg-red-50 text-red-900'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  <option value="">-- 選擇結果 --</option>
                                  <option value="合格">合格 (OK)</option>
                                  <option value="不合格">不合格 (NG - 觸發警示)</option>
                                </select>
                              )}
                            </div>

                            {/* Deviation indicator */}
                            {entry.deviation !== null && (
                              <div
                                className={`text-[10px] font-mono mt-0.5 tabular-nums ${
                                  entry.isOutOfSpec ? 'text-red-700 font-bold' : 'text-slate-500'
                                }`}
                              >
                                偏差 Δ: {entry.deviation > 0 ? `+${entry.deviation}` : entry.deviation} {std.unit}
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3 text-center">
                            {entry.isOutOfSpec ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                <XCircle className="w-3 h-3 text-red-600" />
                                超規
                              </span>
                            ) : entry.actualValue !== '' && entry.actualValue !== null ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                合格
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">待輸入</span>
                            )}
                          </td>

                          {/* Edit / Audit history button */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() =>
                                setEditingAudit({
                                  isOpen: true,
                                  itemId: std.id,
                                  itemName: std.itemName,
                                  currentValue: String(entry.actualValue ?? ''),
                                  newValue: String(entry.actualValue ?? ''),
                                  reason: '',
                                })
                              }
                              title="變更修正實測值 (需記錄稽核履歷 UAT-07)"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  當前操作員：<strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.badgeNumber}) ·
                  依據防錯規範，所有檢驗動作均記入稽核軌跡
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      // Demo autofill valid data for quick testing
                      const autofill: Record<string, MeasurementEntry> = { ...measurements };
                      standards.forEach((std) => {
                        if (std.nominalValue) {
                          autofill[std.id] = {
                            ...autofill[std.id],
                            actualValue: std.nominalValue + 0.005,
                            isOutOfSpec: false,
                            deviation: 0.005,
                            status: 'passed',
                          };
                        } else {
                          autofill[std.id] = {
                            ...autofill[std.id],
                            actualValue: '合格',
                            isOutOfSpec: false,
                            status: 'passed',
                          };
                        }
                      });
                      setMeasurements(autofill);
                      setValidationError(null);
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
                  >
                    模擬填入標準合格數據
                  </button>

                  <button
                    onClick={handleSubmitInspection}
                    className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>完成檢驗送出判定</span>
                  </button>
                </div>
              </div>

              {/* Audit Trail of Changes (QC-104 & UAT-07) */}
              <div className="border-t border-slate-200 pt-4 mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-600" />
                    <span>檢驗數據修改與稽核履歷 (QC-104 / UAT-07)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">保存修改前後值及原因以供 ISO/IATF 稽核</span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3">時間</th>
                        <th className="py-2 px-3">批號</th>
                        <th className="py-2 px-3">檢驗項目</th>
                        <th className="py-2 px-3">原實測值</th>
                        <th className="py-2 px-3">修正後實測值</th>
                        <th className="py-2 px-3">修改原因說明 (必填)</th>
                        <th className="py-2 px-3">操作人員</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-500">{log.modifiedAt}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{log.lotNumber}</td>
                          <td className="py-2 px-3 text-slate-700">{log.itemName}</td>
                          <td className="py-2 px-3 font-mono line-through text-red-500">{log.previousValue}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700">{log.newValue}</td>
                          <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate" title={log.changeReason}>
                            {log.changeReason}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{log.modifiedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
              請從左側任務清單選擇欲執行的 QC 檢驗任務
            </div>
          )}
        </div>
      </div>

      {/* Out-of-Spec Warning & NCR Trigger Modal (UAT-02) */}
      {outOfSpecModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-red-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">【UAT-02 超規異常警示】量測值超出規格界限！</h3>
                <p className="text-xs text-slate-500 mt-0.5">系統即時判定不合格，依流程管制規定應建立異常案</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-red-700">超規項目：</span>
                <span className="font-bold text-red-900">{outOfSpecModal.itemName}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-red-700">實測登錄值：</span>
                <span className="font-bold text-red-900">{outOfSpecModal.actual}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-red-700">允收標準範圍：</span>
                <span className="text-red-800">{outOfSpecModal.spec}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              根據品質防錯管理規範，該批次 <strong className="font-mono">{selectedTask?.lotNumber}</strong>{' '}
              已無法直接以良品放行。是否立即啟動「品質異常建案 (NCR)」並執行不合格品隔離標記？
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setOutOfSpecModal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                暫時返回檢查
              </button>
              <button
                onClick={() => {
                  if (selectedTask) {
                    onTriggerNCR(
                      selectedTask.lotNumber,
                      outOfSpecModal.itemName,
                      String(outOfSpecModal.actual),
                      outOfSpecModal.spec
                    );
                  }
                  setOutOfSpecModal(null);
                }}
                className="px-4 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1.5"
              >
                <span>立即建立異常案件 (NCR) 與隔離</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Measurement Audit Modal (UAT-07) */}
      {editingAudit?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded text-blue-600">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">修改已保存之量測紀錄 (UAT-07)</h3>
                <p className="text-xs text-slate-500 mt-0.5">任何歷史紀錄異動皆須留下操作者身分及變更原因</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">檢驗項目：</label>
                <div className="font-semibold text-slate-800">{editingAudit.itemName}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">原實測數值：</label>
                  <input
                    type="text"
                    disabled
                    value={editingAudit.currentValue}
                    className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">修正後數值：</label>
                  <input
                    type="text"
                    value={editingAudit.newValue}
                    onChange={(e) => setEditingAudit({ ...editingAudit, newValue: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-400 rounded font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  修改原因說明 <span className="text-red-500">*必填 (ISO/IATF 稽核用)</span>：
                </label>
                <textarea
                  rows={3}
                  placeholder="例如：量規零點微偏，經重新校正歸零後複測修正；或現場輸入誤植校正..."
                  value={editingAudit.reason}
                  onChange={(e) => setEditingAudit({ ...editingAudit, reason: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingAudit(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                取消
              </button>
              <button
                onClick={handleSaveAuditEdit}
                className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存變更並記錄稽核軌跡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
