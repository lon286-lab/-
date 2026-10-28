/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ProductMaster,
  InspectionStandardItem,
  InspectionPlan,
  StandardRevision,
  UserProfile,
} from '../types/qc';
import { qcStorage } from '../services/qcStorage';
import {
  Settings,
  Sliders,
  FileCode2,
  Users,
  GitCommit,
  Plus,
  CheckCircle,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface MasterDataModuleProps {
  currentUser: UserProfile;
}

export const MasterDataModule: React.FC<MasterDataModuleProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'standards' | 'plans' | 'roles' | 'revisions'>('products');

  const [products] = useState<ProductMaster[]>(() => qcStorage.getProducts());
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || 'prod_bearing');

  const standards = qcStorage.getStandards(selectedProductId);
  const plans = qcStorage.getPlans(selectedProductId);
  const revisions = qcStorage.getRevisions(selectedProductId);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Role Permissions Matrix (QC-004)
  const rolePermissions = [
    { module: '電子檢驗 (QC-100)', permission: '輸入實測值並送出檢驗判定', qc: true, qa: true, prod: false, ship: false },
    { module: '電子檢驗 (QC-100)', permission: '修改已存檔量測數據 (需稽核原因)', qc: true, qa: true, prod: false, ship: false },
    { module: '異常通報 (QC-200)', permission: '提報品質異常案件 (NCR 建案)', qc: true, qa: true, prod: true, ship: true },
    { module: '異常處置 (QC-200)', permission: '標記批次實體隔離 (Quarantine)', qc: true, qa: true, prod: false, ship: false },
    { module: '異常處置 (QC-200)', permission: '解除批次隔離管制 (UAT-04)', qc: false, qa: true, prod: false, ship: false },
    { module: '異常處置 (QC-200)', permission: 'MRB 審查與處置判定 (返工/報廢/特採)', qc: false, qa: true, prod: true, ship: false },
    { module: '異常處置 (QC-200)', permission: '異常案件審查結案 (Sign-off)', qc: false, qa: true, prod: false, ship: false },
    { module: '出貨放行 (QC-300)', permission: '產品出貨放行核准 (UAT-05)', qc: false, qa: true, prod: false, ship: false },
    { module: '標準設定 (QC-000)', permission: '檢驗公差標準與版本審批', qc: false, qa: true, prod: false, ship: false },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            QC-000 · MASTER DATA & GOVERNANCE
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">基礎資料、檢驗標準與權限設定</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            產品主檔 · 尺寸公差與量具標準 · 抽檢計畫 · 職能分離權限矩陣 · 標準歷史版本管制
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {[
            { id: 'products', label: '產品資料 (QC-001)' },
            { id: 'standards', label: '檢驗標準 (QC-002)' },
            { id: 'plans', label: '檢驗計畫 (QC-003)' },
            { id: 'roles', label: '角色權限 (QC-004)' },
            { id: 'revisions', label: '版本管理 (QC-005)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Selector Bar (when on standards/plans/revisions) */}
      {['standards', 'plans', 'revisions'].includes(activeTab) && (
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 whitespace-nowrap">選擇適用產品標準：</span>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded bg-slate-50 font-medium text-slate-900 max-w-md focus:outline-none"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name} ({p.currentRevision})
              </option>
            ))}
          </select>
          {selectedProduct && (
            <span className="text-slate-500 hidden sm:inline ml-auto font-mono">
              圖號: {selectedProduct.drawingNumber} · 產線: {selectedProduct.targetLine}
            </span>
          )}
        </div>
      )}

      {/* QC-001: Products */}
      {activeTab === 'products' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">QC-001 產品基本主檔清冊</h2>
            <span className="text-xs text-slate-500 font-mono">{products.length} 項零件</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">產品編號</th>
                  <th className="py-2.5 px-3">產品名稱</th>
                  <th className="py-2.5 px-3">關鍵規格說明</th>
                  <th className="py-2.5 px-3">工藝製程</th>
                  <th className="py-2.5 px-3 font-mono">工程圖號 / 版本</th>
                  <th className="py-2.5 px-3">材料規格</th>
                  <th className="py-2.5 px-3">目標產線</th>
                  <th className="py-2.5 px-3 text-center">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">{p.code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3 px-3 text-slate-700">{p.specification}</td>
                    <td className="py-3 px-3 text-slate-600">{p.process}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {p.drawingNumber} ({p.currentRevision})
                    </td>
                    <td className="py-3 px-3 text-slate-600">{p.material}</td>
                    <td className="py-3 px-3 text-slate-700">{p.targetLine}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">有效量產</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QC-002: Inspection Standards */}
      {activeTab === 'standards' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">QC-002 檢驗標準項目設定 (Inspection Criteria)</h2>
              <p className="text-xs text-slate-500">
                套用產品：{selectedProduct?.name} ({selectedProduct?.currentRevision})
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">項次</th>
                  <th className="py-2.5 px-3">檢驗項目名稱</th>
                  <th className="py-2.5 px-3">類別</th>
                  <th className="py-2.5 px-3 text-right">目標值</th>
                  <th className="py-2.5 px-3 text-right">公差下限 (LSL)</th>
                  <th className="py-2.5 px-3 text-right">公差上限 (USL)</th>
                  <th className="py-2.5 px-3">單位</th>
                  <th className="py-2.5 px-3">指定量測儀器 / 工具</th>
                  <th className="py-2.5 px-3">缺陷等級</th>
                  <th className="py-2.5 px-3 text-center">必填驗證</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {standards.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">{s.itemNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{s.itemName}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {s.type === 'dimension' ? '尺寸量測' : s.type === 'visual' ? '外觀檢視' : s.type === 'functional' ? '功能特性' : '重量'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{s.nominalValue ?? '-'}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">{s.lsl ?? '-'}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">{s.usl ?? '-'}</td>
                    <td className="py-3 px-3 font-mono">{s.unit}</td>
                    <td className="py-3 px-3 text-slate-700">{s.tool}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          s.defectClass === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : s.defectClass === 'major'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {s.defectClass === 'critical' ? '致命 (Critical)' : s.defectClass === 'major' ? '主要 (Major)' : '次要 (Minor)'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.isMandatory ? (
                        <span className="text-red-600 font-bold text-xs">*必填</span>
                      ) : (
                        <span className="text-slate-400">選填</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QC-003: Inspection Plans */}
      {activeTab === 'plans' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">QC-003 品質檢驗計畫設定 (Inspection Plans)</h2>
            <span className="text-xs text-slate-500 font-mono">產品：{selectedProduct?.name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-700 px-2 py-0.5 bg-blue-50 rounded">
                    {plan.planType === 'first_article' ? '首件確認 (FAI)' : plan.planType === 'in_process' ? '製程巡檢 (IPQC)' : '出廠抽檢 (OQC)'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">{plan.version}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{plan.planName}</h3>
                <div className="text-xs space-y-1.5 text-slate-600 pt-1 border-t border-slate-200">
                  <div>
                    <strong className="text-slate-700">抽檢頻率：</strong> {plan.frequency}
                  </div>
                  <div>
                    <strong className="text-slate-700">執行時機：</strong> {plan.timing}
                  </div>
                  <div className="font-mono text-[11px] pt-1 text-slate-800">
                    樣本數 n={plan.sampleCount} · 允收 Ac={plan.ac} · 拒收 Re={plan.re}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QC-004: Role Permissions Matrix */}
      {activeTab === 'roles' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">QC-004 人員及角色職能分離權限矩陣 (RBAC Matrix)</h2>
              <p className="text-xs text-slate-500">
                落實「檢驗執行、品質判定、隔離解除與出貨放行」權限分離，防範越權竄改與誤放行。
              </p>
            </div>
            <div className="text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded">
              當前登入身分：<strong className="text-blue-700">{currentUser.roleTitle}</strong>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">功能模組</th>
                  <th className="py-2.5 px-3">關鍵管制操作項目</th>
                  <th className="py-2.5 px-3 text-center">現場 QC 檢驗員</th>
                  <th className="py-2.5 px-3 text-center bg-blue-50/50 text-blue-900">品質主管 (QA Mgr)</th>
                  <th className="py-2.5 px-3 text-center">生產現場主管</th>
                  <th className="py-2.5 px-3 text-center">倉管與出貨員</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rolePermissions.map((rp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-700">{rp.module}</td>
                    <td className="py-3 px-3 text-slate-800">{rp.permission}</td>
                    <td className="py-3 px-3 text-center">
                      {rp.qc ? (
                        <span className="text-emerald-600 font-bold">✓ 允許</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-blue-50/30">
                      {rp.qa ? (
                        <span className="text-emerald-600 font-bold">✓ 允許 (授權)</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rp.prod ? (
                        <span className="text-emerald-600 font-bold">✓ 允許</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rp.ship ? (
                        <span className="text-emerald-600 font-bold">✓ 允許</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QC-005: Standard Revisions */}
      {activeTab === 'revisions' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">QC-005 檢驗標準版本變更管理與歷程</h2>
            <span className="text-xs text-slate-500 font-mono">產品：{selectedProduct?.name}</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 font-mono">版本編號</th>
                  <th className="py-2.5 px-3">生效生效日期</th>
                  <th className="py-2.5 px-3">核准簽發主管</th>
                  <th className="py-2.5 px-3">變更內容說明與依據</th>
                  <th className="py-2.5 px-3 font-mono">前一版本</th>
                  <th className="py-2.5 px-3 text-center">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revisions.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">{rev.revision}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{rev.effectiveDate}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{rev.approvedBy}</td>
                    <td className="py-3 px-3 text-slate-700 leading-relaxed max-w-md">{rev.changeSummary}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{rev.previousRevision}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">現行有效</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
