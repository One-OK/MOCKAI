import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppStep, GarmentImage, LogoImage, Language } from './types';
import { GarmentStep } from './components/GarmentStep';
import { LogoStep } from './components/LogoStep';
import { MockupCanvas } from './components/MockupCanvas';
import { ExportStep } from './components/ExportStep';
import { ProjectManager } from './components/ProjectManager';
import { Shirt, Image as ImageIcon, Layout, Download, ChevronRight, ArrowLeft, Languages, Settings, FolderOpen } from 'lucide-react';
import { translations } from './i18n';
import { MeasurementSettings } from './types';

export default function App() {
  const [step, setStep] = useState<AppStep>('garment');
  const [lang, setLang] = useState<Language>('zh'); // Default to Chinese as requested
  const [garments, setGarments] = useState<GarmentImage[]>([]);
  const [logos, setLogos] = useState<LogoImage[]>([]);
  const [finalMockup, setFinalMockup] = useState<{effectWithWatermark: string, effectNoWatermark: string, engineering: string, name: string}[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [measurementSettings, setMeasurementSettings] = useState<MeasurementSettings>({ method: 'tshirt' });

  const steps: { id: AppStep; label: string; icon: any }[] = [
    { id: 'garment', label: translations[lang].steps.garment, icon: Shirt },
    { id: 'logo', label: translations[lang].steps.logo, icon: ImageIcon },
    { id: 'mockup', label: translations[lang].steps.mockup, icon: Layout },
    { id: 'export', label: translations[lang].steps.export, icon: Download },
  ];

  const handleGarmentComplete = (data: GarmentImage[]) => {
    setGarments(data);
    setStep('logo');
  };

  const handleLogoComplete = (data: LogoImage[]) => {
    setLogos(data);
    setStep('mockup');
  };

  const handleMockupComplete = (data: {effectWithWatermark: string, effectNoWatermark: string, engineering: string, name: string}[]) => {
    setFinalMockup(data);
    setStep('export');
  };

  const handleRestart = () => {
    setGarments([]);
    setLogos([]);
    setFinalMockup(null);
    setStep('garment');
  };

  const goBack = () => {
    if (step === 'logo') setStep('garment');
    if (step === 'mockup') setStep('logo');
    if (step === 'export') setStep('mockup');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <Layout size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">MOCKAI</h1>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Garment Mockup Engine</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isPast = steps.findIndex(x => x.id === step) > i;
            
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 transition-all ${isActive ? 'text-slate-900' : isPast ? 'text-emerald-500' : 'text-slate-300'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'border-slate-900 bg-slate-900 text-white' : isPast ? 'border-emerald-500 bg-emerald-50 text-emerald-500' : 'border-slate-200'}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">{s.label}</span>
                </div>
                {i < steps.length - 1 && <ChevronRight size={14} className="text-slate-200" />}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setLang('zh')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${lang === 'zh' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              中文
            </button>
            <button 
              onClick={() => setLang('en')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              EN
            </button>
          </div>
          <button 
            onClick={() => setShowProjectManager(true)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
          >
            <FolderOpen size={14} />
            作图记录
          </button>
          <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
            <Languages size={14} />
            Help
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
          >
            <Settings size={14} />
            设置
          </button>
        </div>
      </header>

      {showProjectManager && (
        <ProjectManager
          onClose={() => setShowProjectManager(false)}
          currentGarments={garments}
          currentLogos={logos}
          onLoad={(loadedGarments, loadedLogos) => {
            setGarments(loadedGarments);
            setLogos(loadedLogos);
            if (loadedGarments.length > 0 && loadedLogos.length > 0) {
              setStep('mockup');
            } else if (loadedGarments.length > 0) {
              setStep('logo');
            } else {
              setStep('garment');
            }
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[400px] shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">测量方法设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">默认测量款式</label>
                <select 
                  value={measurementSettings.method}
                  onChange={(e) => setMeasurementSettings({ method: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="tshirt">T恤 (T-Shirt)</option>
                  <option value="hoodie">卫衣 (Hoodie)</option>
                  <option value="pants">裤子 (Pants)</option>
                  <option value="custom">自定义 (Custom)</option>
                </select>
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                {measurementSettings.method === 'tshirt' && (
                  <ul className="list-disc pl-4 space-y-1">
                    <li>衣长：右侧领口肩缝交点至下摆</li>
                    <li>肩宽：左右肩袖缝交点连线</li>
                    <li>胸围：左右腋下侧缝交点连线</li>
                  </ul>
                )}
                {measurementSettings.method === 'hoodie' && (
                  <ul className="list-disc pl-4 space-y-1">
                    <li>衣长：帽根至下摆</li>
                    <li>肩宽：左右肩袖缝交点连线</li>
                    <li>胸围：左右腋下侧缝交点连线</li>
                  </ul>
                )}
                {measurementSettings.method === 'pants' && (
                  <ul className="list-disc pl-4 space-y-1">
                    <li>裤长：腰头至裤脚</li>
                    <li>腰围：腰头左右连线</li>
                    <li>臀围：裆部上方最宽处连线</li>
                  </ul>
                )}
                {measurementSettings.method === 'custom' && (
                  <p>自定义测量点位，可自由拖动调整。</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">
          {step !== 'garment' && (
            <button 
              onClick={goBack}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">{translations[lang].common.back}</span>
            </button>
          )}
        </div>

        <div className="h-full relative">
          <div style={{ display: step === 'garment' ? 'block' : 'none' }}>
            <GarmentStep onComplete={handleGarmentComplete} lang={lang} measurementSettings={measurementSettings} />
          </div>
          <div style={{ display: step === 'logo' ? 'block' : 'none' }}>
            <LogoStep onComplete={handleLogoComplete} garments={garments} lang={lang} />
          </div>
          
          <div style={{ display: step === 'mockup' ? 'block' : 'none', height: '100%' }}>
            {garments.length > 0 && logos.length > 0 && (
              <MockupCanvas 
                garments={garments} 
                logos={logos} 
                lang={lang}
                onExport={handleMockupComplete} 
              />
            )}
          </div>

          <AnimatePresence mode="wait">
            {step === 'export' && finalMockup && (
              <motion.div
                key="export"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ExportStep mockupUrl={finalMockup} onRestart={handleRestart} lang={lang} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-12 py-6 text-center">
        <p className="text-xs text-slate-400">© 2026 MOCKAI Engine. Professional Garment Visualization Tool.</p>
      </footer>
    </div>
  );
}
