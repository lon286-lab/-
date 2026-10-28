/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfile, UserRole } from '../types/qc';
import { INITIAL_USERS } from '../data/mockData';
import { ShieldCheck, UserCheck, PlayCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  onRoleChange: (role: UserRole) => void;
  onOpenUAT: () => void;
  onResetData: () => void;
  overdueCount: number;
  quarantineCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onRoleChange,
  onOpenUAT,
  onResetData,
  overdueCount,
  quarantineCount,
}) => {
  const navTabs = [
    { id: 'inspection', label: '電子檢驗 (QC-100)' },
    { id: 'anomaly', label: '異常通報 (QC-200)', badgeCount: quarantineCount },
    { id: 'release', label: '放行追溯 (QC-300)' },
    { id: 'dashboard', label: '儀表板與AI (QC-400)' },
    { id: 'master', label: '基礎與標準 (QC-000)' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav Links) - Zone 3 (Action / Role) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
            QC
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
              QC 品質檢驗與異常預警系統
            </div>
            <div className="text-[11px] text-slate-500 whitespace-nowrap hidden sm:block">
              製造現場流程管制 · 防錯隔離 · 全流程批次追溯
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badgeCount && tab.badgeCount > 0 ? (
                  <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded ${isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}>
                    {tab.badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Role Switching */}
        <div className="flex items-center gap-3 shrink-0">
          {/* UAT Verification Trigger */}
          <button
            onClick={onOpenUAT}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
            title="開啟 9 大 UAT 驗收情境快速測試場"
          >
            <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>UAT 驗收測試場</span>
          </button>

          {/* Role Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-2.5 py-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              aria-label="切換測試角色"
              value={currentUser.role}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="text-xs bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
            >
              {INITIAL_USERS.map((u) => (
                <option key={u.id} value={u.role}>
                  {u.roleTitle} ({u.name.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Factory Seed */}
          <button
            onClick={onResetData}
            title="重設回初始測試資料"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-slate-100 bg-slate-50/80">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={onOpenUAT}
          className="px-3 py-1 text-xs font-medium rounded whitespace-nowrap bg-blue-100 text-blue-700 ml-auto"
        >
          UAT 驗收
        </button>
      </div>

      {/* Overdue / Quarantine Global Alert Ticker (Only when items exist) */}
      {(overdueCount > 0 || quarantineCount > 0) && (
        <div className="bg-amber-50 border-t border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>現場管制警報：</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {overdueCount > 0 && (
                <span>
                  未完成/漏檢逾期任務：<strong className="text-red-700 font-mono tabular-nums">{overdueCount}</strong> 筆
                </span>
              )}
              {quarantineCount > 0 && (
                <span>
                  隔離管制中批次：<strong className="text-red-700 font-mono tabular-nums">{quarantineCount}</strong> 批
                </span>
              )}
            </div>
            <div className="ml-auto text-[11px] text-amber-700 hidden md:block">
              依品質防錯原則，隔離中及未檢批次均禁止正常放行出貨
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
