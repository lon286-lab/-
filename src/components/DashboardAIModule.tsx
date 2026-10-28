/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SPCPoint,
  AIRiskAssessment,
  VisualDefectDetection,
  UserProfile,
} from '../types/qc';
import {
  INITIAL_SPC_POINTS,
  INITIAL_VISUAL_SAMPLES,
} from '../data/mockData';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Sparkles,
  Layers,
  ShieldAlert,
  HelpCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

interface DashboardAIModuleProps {
  currentUser: UserProfile;
  onTriggerNCRFromVision?: (lot: string, item: string, measured: string, spec: string) => void;
}

export const DashboardAIModule: React.FC<DashboardAIModuleProps> = ({
  currentUser,
  onTriggerNCRFromVision,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'kpi' | 'pareto' | 'spc_ai' | 'vision'>('spc_ai');

  // KPI filters (QC-401)
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');

  // SPC & Gemini AI diagnosis state (QC-403)
  const [spcPoints, setSpcPoints] = useState<SPCPoint[]>(INITIAL_SPC_POINTS);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiAssessment, setAiAssessment] = useState<AIRiskAssessment | null>(null);

  // Vision state (QC-404, QC-405)
  const [visualSamples, setVisualSamples] = useState<VisualDefectDetection[]>(INITIAL_VISUAL_SAMPLES);
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);

  const currentSample = visualSamples[currentSampleIndex];

  // Call AI Backend endpoint for SPC Risk Diagnosis (QC-403)
  const handleRunAIDiagnosis = async () => {
    setIsLoadingAI(true);
    try {
      const ruleViolations = spcPoints.flatMap((p) => p.ruleViolations);
      const res = await fetch('/api/ai/predict-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPoints: spcPoints.map((p) => ({ time: p.time, measurement: p.measurement })),
          productName: '航太精密主軸承外圈 (PROD-CNC-8820)',
          currentRuleViolations: ruleViolations,
        }),
      });

      const data = await res.json();
      if (data && data.assessment) {
        setAiAssessment(data.assessment);
      }
    } catch (err) {
      console.error('AI diagnosis error:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // UAT-09: Human Confirmation of AI Vision Result (AI 輔助原則：AI 不可取代人)
  const handleConfirmAIVision = (decision: 'ACCEPT_AI' | 'OVERRULE_PASS') => {
    const updatedSamples = [...visualSamples];
    updatedSamples[currentSampleIndex] = {
      ...currentSample,
      humanConfirmation: {
        decision,
        confirmedBy: `${currentUser.name} (${currentUser.roleTitle})`,
        confirmedAt: new Date().toISOString(),
        notes: decision === 'ACCEPT_AI' ? '經檢驗員光學比對覆判確認，採納 AI 缺陷標記並立案' : '檢驗員人工判定為良品',
      },
    };
    setVisualSamples(updatedSamples);

    alert(
      decision === 'ACCEPT_AI'
        ? `【UAT-09 人機協作驗證】檢驗員 ${currentUser.name} 覆判確認採納 AI 視覺標記！\n系統已留存人工判定紀錄，並符合品質防錯法規。`
        : `【UAT-09 人工覆寫】檢驗員 ${currentUser.name} 判定此件為良品（AI 標記判定已由授權人員覆寫）。`
    );
  };

  // Pareto Chart Data (QC-402)
  const paretoDefects = [
    { name: '表面碰傷與刮痕', count: 48, pct: 40.7, cumPct: 40.7 },
    { name: '外徑尺寸超差', count: 32, pct: 27.1, cumPct: 67.8 },
    { name: '螺孔應力微裂', count: 18, pct: 15.3, cumPct: 83.1 }, // 80% threshold
    { name: 'SMT 晶片連錫錫橋', count: 12, pct: 10.2, cumPct: 93.3 },
    { name: '微小金屬異物夾雜', count: 8, pct: 6.7, cumPct: 100.0 },
  ];

  return (
    <div className="space-y-6">
      {/* Module Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            QC-400 · DASHBOARD & AI ASSISTANCE
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">品質儀表板與 AI 輔助預警</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            製程品質 KPI 總覽 · 柏拉圖異常趨勢 · SPC 統計管制與 AI 根因預警 · AI 視覺輔助瑕疵偵測
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveSubTab('spc_ai')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'spc_ai' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI 品質預警 (QC-403)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('vision')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'vision' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>AI 視覺檢測 (QC-404)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('kpi')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'kpi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>品質 KPI (QC-401)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('pareto')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'pareto' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            <span>柏拉圖分析 (QC-402)</span>
          </button>
        </div>
      </div>

      {/* SubTab: AI SPC Risk Diagnosis (QC-403) */}
      {activeSubTab === 'spc_ai' && (
        <div className="space-y-6">
          {/* SPC Chart Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span>QC-403 統計製程管制 (SPC Run Chart) 與 Western Electric 異常預警</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  特性項目：航太精密軸承外徑 (規格：50.00 ± 0.05 mm · 管制界限：UCL=50.045 / CL=50.000 / LCL=49.955)
                </p>
              </div>

              <button
                onClick={handleRunAIDiagnosis}
                disabled={isLoadingAI}
                className="px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLoadingAI ? 'AI 診斷運算中...' : '執行 AI 品質風險要因診斷'}</span>
              </button>
            </div>

            {/* Interactive SVG SPC Chart */}
            <div className="p-4 bg-slate-900 rounded-lg text-white space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-4 font-mono">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2.5 h-0.5 bg-red-400 inline-block"></span> UCL: 50.045 mm
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span> CL: 50.000 mm
                  </span>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2.5 h-0.5 bg-red-400 inline-block"></span> LCL: 49.955 mm
                  </span>
                </div>
                <div className="text-[11px] text-indigo-300">
                  即時抽檢時間序列 (連續點向上漂移突破 UCL)
                </div>
              </div>

              {/* Chart Visual */}
              <div className="relative h-56 w-full pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 800 180" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {/* UCL Line (y = 20) */}
                  <line x1="40" y1="20" x2="780" y2="20" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="785" y="24" fill="#f87171" fontSize="10" fontFamily="monospace">
                    UCL
                  </text>

                  {/* Center Line (y = 90) */}
                  <line x1="40" y1="90" x2="780" y2="90" stroke="#34d399" strokeWidth="1.5" />
                  <text x="785" y="94" fill="#34d399" fontSize="10" fontFamily="monospace">
                    CL
                  </text>

                  {/* LCL Line (y = 160) */}
                  <line x1="40" y1="160" x2="780" y2="160" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="785" y="164" fill="#f87171" fontSize="10" fontFamily="monospace">
                    LCL
                  </text>

                  {/* Plot Points & Lines */}
                  {(() => {
                    const coords = spcPoints.map((p, idx) => {
                      const x = 60 + idx * 72;
                      // map 49.955 (y=160) to 50.045 (y=20), range = 0.09mm
                      const norm = (p.measurement - 49.955) / 0.09;
                      const y = 160 - norm * 140;
                      return { x, y, p };
                    });

                    const pathStr = coords.reduce((acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`), '');

                    return (
                      <>
                        <path d={pathStr} fill="none" stroke="#818cf8" strokeWidth="2.5" />
                        {coords.map((c, i) => {
                          const hasViolation = c.p.ruleViolations.length > 0;
                          return (
                            <g key={i}>
                              <circle
                                cx={c.x}
                                cy={c.y}
                                r={hasViolation ? 5 : 4}
                                fill={hasViolation ? '#ef4444' : '#6366f1'}
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              />
                              <text
                                x={c.x}
                                y={c.y - 10}
                                textAnchor="middle"
                                fill={hasViolation ? '#fca5a5' : '#cbd5e1'}
                                fontSize="9"
                                fontFamily="monospace"
                              >
                                {c.p.measurement.toFixed(3)}
                              </text>
                              <text
                                x={c.x}
                                y="176"
                                textAnchor="middle"
                                fill="#94a3b8"
                                fontSize="9"
                                fontFamily="monospace"
                              >
                                {c.p.time}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Rule Violations List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900">SPC 管制失控法則判定結果 (Western Electric Rules)：</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Rule 1 違規 (點 10 @ 18:30)：</strong> 實測值 50.047 mm 超出 3σ 管制上限 UCL
                    (50.045mm)。
                  </div>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Rule 3 違規 (點 6-10)：</strong> 連續 6 點以上呈現單調遞增趨勢 (典型刀具磨耗現象)。
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Root Cause & Diagnosis Output (QC-403) */}
          {aiAssessment && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">AI 專家品質風險與要因分析報告 (QC-403)</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">模型信心水準:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {(aiAssessment.modelConfidence * 100).toFixed(0)}%
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      aiAssessment.riskLevel === 'HIGH' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    風險等級：{aiAssessment.riskLevel}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-800 leading-relaxed bg-white p-3.5 rounded border border-indigo-100">
                <strong>趨勢總結：</strong> {aiAssessment.trendSummary}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 5M1E Physical Factors */}
                <div className="bg-white p-3.5 rounded border border-indigo-100 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>物理要因分析 (5M1E 機制推估)：</span>
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                    {aiAssessment.physicalFactors.map((fact, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Immediate Actions */}
                <div className="bg-white p-3.5 rounded border border-indigo-100 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>現場品管與工程對策建議：</span>
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                    {aiAssessment.recommendedActions.map((act, idx) => (
                      <li key={idx} className="leading-relaxed font-medium text-slate-800">
                        {act}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {aiAssessment.suggestedInspectionFrequencyIncrease && (
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded text-xs text-amber-950 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>AI 建議：立即將製程抽檢頻率由原本「每 2 小時」加嚴提升為「每 30 分鐘」，以防批量性不良品流出！</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SubTab: AI Vision Defect Inspection (QC-404, QC-405, UAT-09) */}
      {activeSubTab === 'vision' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span>QC-404 AI 視覺輔助缺陷檢測與人機協作 (UAT-09)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI 輔助原則：AI 標註分類提供檢驗員判斷參考，嚴格要求人工覆判簽認，不可自行覆寫品質標準。
                </p>
              </div>

              {/* Sample Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">切換現場樣品:</span>
                <select
                  value={currentSampleIndex}
                  onChange={(e) => {
                    setCurrentSampleIndex(parseInt(e.target.value, 10));
                    setSelectedBox(null);
                  }}
                  className="text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 font-medium"
                >
                  {visualSamples.map((s, idx) => (
                    <option key={s.id} value={idx}>
                      {s.sampleName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vision Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Image Viewport with Bounding Box Overlay */}
              <div className="lg:col-span-7 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative select-none">
                <div className="relative aspect-4/3 w-full flex items-center justify-center">
                  <img
                    src={currentSample.imagePath}
                    alt={currentSample.sampleName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />

                  {/* Defect Bounding Boxes */}
                  {currentSample.detectedDefects.map((defect, idx) => {
                    const isSelected = selectedBox === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedBox(idx)}
                        style={{
                          left: `${defect.box.x}%`,
                          top: `${defect.box.y}%`,
                          width: `${defect.box.width}%`,
                          height: `${defect.box.height}%`,
                        }}
                        className={`absolute border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-red-400 bg-red-500/20 ring-2 ring-red-400'
                            : 'border-yellow-400 bg-yellow-400/10 hover:border-red-400'
                        }`}
                      >
                        <span className="absolute -top-5 left-0 px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-mono whitespace-nowrap rounded font-bold shadow-xs">
                          {defect.defectType} ({(defect.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>點擊黃色/紅色選框檢視瑕疵詳情</span>
                  <span className="font-mono text-emerald-400">光學解析度: 4K 顯微工業相機</span>
                </div>
              </div>

              {/* Right Panel: Defect Metadata & Human Confirmation (UAT-09) */}
              <div className="lg:col-span-5 space-y-4 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="font-bold text-slate-900">AI 偵測缺陷清單 ({currentSample.detectedDefects.length} 處)</div>

                  <div className="space-y-2">
                    {currentSample.detectedDefects.map((def, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedBox(idx)}
                        className={`p-3 rounded border cursor-pointer transition-colors ${
                          selectedBox === idx ? 'border-red-500 bg-white shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{def.defectType}</span>
                          <span className="font-mono text-red-600">{(def.confidence * 100).toFixed(1)}% 信心值</span>
                        </div>
                        <p className="mt-1 text-slate-600 leading-relaxed text-[11px]">{def.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">AI 建議判定：</span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded">
                      {currentSample.aiDecision === 'REJECT' ? '不合格 (REJECT 建議隔離)' : '良品 (PASS)'}
                    </span>
                  </div>
                </div>

                {/* Human Confirmation Box (UAT-09) */}
                <div className="bg-white border-2 border-indigo-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>檢驗員人工覆核判定 (UAT-09 人工責任把關)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    依規格書規定，AI 僅為輔助檢測工具，不得直接決定產品生死。請現場品管檢驗員覆核並留下責任簽認：
                  </p>

                  {currentSample.humanConfirmation ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-950 space-y-1">
                      <div className="font-bold">
                        覆判結果：
                        {currentSample.humanConfirmation.decision === 'ACCEPT_AI' ? '採納 AI 判定 (不合格)' : '覆寫為良品'}
                      </div>
                      <div>簽認人員：{currentSample.humanConfirmation.confirmedBy}</div>
                      <div className="font-mono text-slate-500">
                        時間：{currentSample.humanConfirmation.confirmedAt.replace('T', ' ').substring(0, 19)}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmAIVision('ACCEPT_AI')}
                        className="flex-1 px-3 py-2 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        採納 AI 判定並建案 (UAT-09)
                      </button>
                      <button
                        onClick={() => handleConfirmAIVision('OVERRULE_PASS')}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        覆寫判定為良品
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* QC-405: AI Model Health & Performance Metrics */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-bold text-slate-900 mb-2">QC-405 AI 視覺模型效能監控指標 (Model Health)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">人工複判吻合率</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums">97.2%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">漏檢率 (Underkill Rate)</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums">0.12%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">誤判率 (Overkill Rate)</div>
                  <div className="text-lg font-bold font-mono text-amber-700 tabular-nums">1.80%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">累計影像推論樣本</div>
                  <div className="text-lg font-bold font-mono text-slate-800 tabular-nums">12,480 件</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab: Quality KPI (QC-401) */}
      {activeSubTab === 'kpi' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
              <div className="text-xs text-slate-500 font-medium">製程綜合良率 (Yield)</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">98.42%</div>
              <div className="text-[11px] text-emerald-700">目標: ≥ 98.00% (達標)</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
              <div className="text-xs text-slate-500 font-medium">首件一次合格率 (FPY)</div>
              <div className="text-2xl font-bold font-mono text-blue-600 tabular-nums">96.80%</div>
              <div className="text-[11px] text-blue-700">較上月提升 +1.2%</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
              <div className="text-xs text-slate-500 font-medium">缺陷數 / 百萬機會 (DPU/PPM)</div>
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">120 PPM</div>
              <div className="text-[11px] text-slate-500">航太產業標準規範內</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
              <div className="text-xs text-slate-500 font-medium">異常處置及時率 (NCR SLA)</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">94.2%</div>
              <div className="text-[11px] text-slate-500">2 小時遏制 / 24 小時要因</div>
            </div>
          </div>

          {/* KPI By Line Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">各產線即時品質指標彙總表 (QC-401)</h3>
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">製造產線</th>
                    <th className="py-2.5 px-3">主要生產產品</th>
                    <th className="py-2.5 px-3 text-right">本日產量</th>
                    <th className="py-2.5 px-3 text-right">首件合格率</th>
                    <th className="py-2.5 px-3 text-right">綜合良率</th>
                    <th className="py-2.5 px-3 text-center">異常未結案數</th>
                    <th className="py-2.5 px-3 text-center">管制狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-800">CNC 1 線</td>
                    <td className="py-3 px-3 text-slate-600">航太精密主軸承外圈</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">524 件</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 tabular-nums">100%</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 tabular-nums">98.6%</td>
                    <td className="py-3 px-3 text-center font-mono text-red-600 font-bold tabular-nums">1</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px]">刀具磨耗警戒</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-800">無塵注塑 3 號機</td>
                    <td className="py-3 px-3 text-slate-600">醫療注射幫浦承重支架</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">1,200 件</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 tabular-nums">98.0%</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 tabular-nums">99.1%</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500 tabular-nums">0</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">受控正常</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-800">SMT 高速 2 線</td>
                    <td className="py-3 px-3 text-slate-600">5G 通訊高頻控制主板</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">850 片</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700 tabular-nums">92.4%</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700 tabular-nums">96.8%</td>
                    <td className="py-3 px-3 text-center font-mono text-red-600 font-bold tabular-nums">1</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-red-800 bg-red-50 px-2 py-0.5 rounded text-[11px]">錫橋隔離處置</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SubTab: Pareto Analysis (QC-402) */}
      {activeSubTab === 'pareto' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                <span>QC-402 缺陷柏拉圖分析 (Pareto Chart 80/20 Rule)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                識別造成 80% 品質不良之關鍵少數缺陷 (前兩項「外觀碰刮痕」與「尺寸超差」佔比近 70%)
              </p>
            </div>

            {/* SVG Pareto Chart */}
            <div className="p-4 bg-slate-900 rounded-lg text-white">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>直條：缺陷發生次數 (PCS)</span>
                <span className="text-red-400">折線：累計百分比 (%)</span>
              </div>

              <div className="relative h-64 w-full pt-6">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                  {/* 80% Benchmark Line */}
                  <line x1="40" y1="40" x2="660" y2="40" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="665" y="44" fill="#ef4444" fontSize="10" fontFamily="monospace">
                    80%
                  </text>

                  {/* Draw Bars */}
                  {paretoDefects.map((d, i) => {
                    const barWidth = 60;
                    const x = 70 + i * 120;
                    // max count = 50 -> height 160
                    const barHeight = (d.count / 50) * 160;
                    const y = 180 - barHeight;

                    return (
                      <g key={i}>
                        {/* Bar */}
                        <rect x={x} y={y} width={barWidth} height={barHeight} fill="#3b82f6" rx="3" />
                        <text
                          x={x + barWidth / 2}
                          y={y - 6}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          {d.count}
                        </text>
                        {/* Label */}
                        <text
                          x={x + barWidth / 2}
                          y="196"
                          textAnchor="middle"
                          fill="#cbd5e1"
                          fontSize="9"
                          fontFamily="sans-serif"
                        >
                          {d.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw Cumulative Line */}
                  {(() => {
                    const points = paretoDefects.map((d, i) => {
                      const x = 70 + i * 120 + 30;
                      // 0% -> y=180, 100% -> y=20
                      const y = 180 - (d.cumPct / 100) * 160;
                      return { x, y, pct: d.cumPct };
                    });

                    const path = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

                    return (
                      <>
                        <path d={path} fill="none" stroke="#f87171" strokeWidth="2.5" />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                            <text
                              x={p.x}
                              y={p.y - 8}
                              textAnchor="middle"
                              fill="#fca5a5"
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {p.pct.toFixed(1)}%
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Defect Ranking Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">排名</th>
                    <th className="py-2.5 px-3">主要不良項目</th>
                    <th className="py-2.5 px-3 text-right">次數 (PCS)</th>
                    <th className="py-2.5 px-3 text-right">單項比例</th>
                    <th className="py-2.5 px-3 text-right">累計比例</th>
                    <th className="py-2.5 px-3">優先改善建議</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paretoDefects.map((d, idx) => (
                    <tr key={idx} className={idx < 2 ? 'bg-amber-50/30' : ''}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">#{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{d.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">{d.count}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{d.pct.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600 tabular-nums">
                        {d.cumPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {idx === 0
                          ? '優化機械臂拋料緩衝墊，消弭撞擊'
                          : idx === 1
                          ? '緊縮刀具磨耗補償頻率，升級為 30 分鐘自動對刀'
                          : '持續維持現行巡檢抽驗管制'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
