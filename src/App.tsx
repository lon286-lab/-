/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from './types/qc';
import { qcStorage } from './services/qcStorage';
import { Header } from './components/Header';
import { InspectionModule } from './components/InspectionModule';
import { AnomalyModule } from './components/AnomalyModule';
import { ReleaseTraceabilityModule } from './components/ReleaseTraceabilityModule';
import { DashboardAIModule } from './components/DashboardAIModule';
import { MasterDataModule } from './components/MasterDataModule';
import { UATVerificationModal } from './components/UATVerificationModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => qcStorage.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('inspection');

  // Global counts for badges
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [quarantineCount, setQuarantineCount] = useState<number>(0);

  // UAT modal
  const [isUATModalOpen, setIsUATModalOpen] = useState<boolean>(false);

  // Prefill state when triggering NCR from Inspection (UAT-02)
  const [ncrPrefill, setNcrPrefill] = useState<{
    lotNumber: string;
    item: string;
    measured: string;
    spec: string;
  } | null>(null);

  // Refresh counts
  const refreshGlobalCounts = useCallback(() => {
    const tasks = qcStorage.getTasks();
    const anomalies = qcStorage.getAnomalies();
    setOverdueCount(tasks.filter((t) => t.isOverdue || t.status === 'overdue').length);
    setQuarantineCount(anomalies.filter((a) => a.isQuarantined).length);
  }, []);

  useEffect(() => {
    refreshGlobalCounts();
  }, [refreshGlobalCounts]);

  // Handle Role Switching
  const handleRoleChange = (role: UserRole) => {
    const user = qcStorage.switchRole(role);
    setCurrentUser(user);
  };

  // Reset to initial seed
  const handleResetData = () => {
    if (window.confirm('確定要將系統資料重設回初始測試種子資料嗎？')) {
      qcStorage.resetAll();
      setCurrentUser(qcStorage.getCurrentUser());
      refreshGlobalCounts();
      window.location.reload();
    }
  };

  // Jump from Out-of-Spec in Inspection to Anomaly Module with prefilled values
  const handleTriggerNCR = (lotNumber: string, item: string, measured: string, spec: string) => {
    setNcrPrefill({ lotNumber, item, measured, spec });
    setActiveTab('anomaly');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        onOpenUAT={() => setIsUATModalOpen(true)}
        onResetData={handleResetData}
        overdueCount={overdueCount}
        quarantineCount={quarantineCount}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'inspection' && (
          <InspectionModule
            currentUser={currentUser}
            onTriggerNCR={handleTriggerNCR}
            onRefreshGlobalCounts={refreshGlobalCounts}
          />
        )}

        {activeTab === 'anomaly' && (
          <AnomalyModule
            currentUser={currentUser}
            prefillData={ncrPrefill}
            onClearPrefill={() => setNcrPrefill(null)}
            onRefreshGlobalCounts={refreshGlobalCounts}
          />
        )}

        {activeTab === 'release' && (
          <ReleaseTraceabilityModule
            currentUser={currentUser}
            onRefreshGlobalCounts={refreshGlobalCounts}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardAIModule
            currentUser={currentUser}
            onTriggerNCRFromVision={(lot, item, measured, spec) => handleTriggerNCR(lot, item, measured, spec)}
          />
        )}

        {activeTab === 'master' && <MasterDataModule currentUser={currentUser} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">QC 品質檢驗與異常預警管理系統</span>
            <span>·</span>
            <span>流程管制與數位防錯核心架構 (符合 ISO 9001 / IATF 16949 規範)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>當前身分：{currentUser.roleTitle} ({currentUser.name})</span>
            <span>·</span>
            <span>系統狀態：統計管制運作中</span>
          </div>
        </div>
      </footer>

      {/* UAT 9 大驗收情境快速測試彈窗 */}
      <UATVerificationModal
        isOpen={isUATModalOpen}
        onClose={() => setIsUATModalOpen(false)}
        currentUser={currentUser}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
