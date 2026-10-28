/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfile } from '../types/qc';
import {
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldAlert,
  Lock,
  Search,
  Eye,
  Activity,
  History,
} from 'lucide-react';

interface UATVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onNavigateTab: (tab: string) => void;
}

export const UATVerificationModal: React.FC<UATVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'UAT-01',
      title: 'QC 未填完必要檢驗項目',
      expectation: '系統提示缺漏項目，禁止正常完成檢驗流程',
      targetModule: 'inspection',
      targetTabLabel: '電子檢驗 (QC-100)',
      actionText: '開啟檢查表測試必填攔截',
      runAction: () => {
        onNavigateTab('inspection');
        onClose();
      },
    },
    {
      id: 'UAT-02',
      title: '量測值超出規格 (Out-of-Spec)',
      expectation: '顯示不合格狀態，自動觸發異常建案與隔離警示',
      targetModule: 'inspection',
      targetTabLabel: '電子檢驗 (QC-100)',
      actionText: '測試實測超規自動警示',
      runAction: () => {
        onNavigateTab('inspection');
        onClose();
      },
    },
    {
      id: 'UAT-03',
      title: '批次尚未完成檢驗',
      expectation: '出貨防錯閘門攔截，禁止正常放行出貨',
      targetModule: 'release',
      targetTabLabel: '放行追溯 (QC-300)',
      actionText: '測試未完檢出貨攔截',
      runAction: () => {
        onNavigateTab('release');
        onClose();
      },
    },
    {
      id: 'UAT-04',
      title: '批次已被品質隔離管制',
      expectation: '一般使用者不得直接解除隔離或放行 (僅品質主管方可解除)',
      targetModule: 'anomaly',
      targetTabLabel: '異常處置 (QC-200)',
      actionText: '測試已隔離安全鎖定',
      runAction: () => {
        onNavigateTab('anomaly');
        onClose();
      },
    },
    {
      id: 'UAT-05',
      title: '授權人員 (品質主管) 核准放行',
      expectation: '系統依權限執行並保留數位簽核與出廠證明 (COA) 紀錄',
      targetModule: 'release',
      targetTabLabel: '放行追溯 (QC-300)',
      actionText: '測試品保放行簽核',
      runAction: () => {
        onNavigateTab('release');
        onClose();
      },
    },
    {
      id: 'UAT-06',
      title: '查詢指定批號全流程履歷',
      expectation: '可追溯對應之原料爐號、機台操作員、檢驗實測、異常處置與出貨單',
      targetModule: 'release',
      targetTabLabel: '放行追溯 (QC-300)',
      actionText: '測試批次全流程溯源',
      runAction: () => {
        onNavigateTab('release');
        onClose();
      },
    },
    {
      id: 'UAT-07',
      title: '修改已保存的檢驗紀錄',
      expectation: '依權限控管並保留修改前後數值、原因及操作者履歷',
      targetModule: 'inspection',
      targetTabLabel: '電子檢驗 (QC-100)',
      actionText: '測試修改稽核履歷',
      runAction: () => {
        onNavigateTab('inspection');
        onClose();
      },
    },
    {
      id: 'UAT-08',
      title: '查詢品質 KPI 報表',
      expectation: '顯示良率、FPY、DPU PPM 與柏拉圖，與來源資料核對一致',
      targetModule: 'dashboard',
      targetTabLabel: '儀表板與AI (QC-400)',
      actionText: '查核 KPI 與柏拉圖',
      runAction: () => {
        onNavigateTab('dashboard');
        onClose();
      },
    },
    {
      id: 'UAT-09',
      title: 'AI 提示潛在缺陷與人機協作',
      expectation: '顯示 AI 視覺/SPC 預警，並保留人工確認與實際判定紀錄',
      targetModule: 'dashboard',
      targetTabLabel: '儀表板與AI (QC-400)',
      actionText: '測試 AI 提示與人工簽認',
      runAction: () => {
        onNavigateTab('dashboard');
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">QC 系統驗收測試場 (UAT Verification Lab)</h2>
              <p className="text-xs text-slate-500">
                對應功能規格書「第五節：主要驗收條件」全數 9 大驗收情境
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Context Banner */}
        <div className="px-5 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
          <div>
            當前操作角色：<strong className="font-bold">{currentUser.roleTitle}</strong> ({currentUser.name})
          </div>
          <div className="text-[11px] text-blue-700">
            提示：可隨時於右上角切換「品質主管 / 現場檢驗員 / 出貨倉管」以測試權限控管
          </div>
        </div>

        {/* Scenarios Table */}
        <div className="p-5 overflow-y-auto space-y-3 divide-y divide-slate-100">
          {scenarios.map((sc) => (
            <div key={sc.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold px-2 py-0.5 bg-slate-900 text-white rounded text-[11px]">
                    {sc.id}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{sc.title}</span>
                </div>
                <div className="text-slate-600 leading-relaxed">
                  <span className="text-slate-400">驗收預期結果：</span> {sc.expectation}
                </div>
              </div>

              <button
                onClick={sc.runAction}
                className="px-3.5 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center"
              >
                <span>{sc.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>所有情境皆具備即時互動防錯機制與稽核資料保存</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded font-medium hover:bg-slate-800"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
