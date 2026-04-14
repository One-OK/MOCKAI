import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppStep, GarmentImage, LogoImage, Language } from './types';
import { GarmentStep } from './components/GarmentStep';
import { LogoStep } from './components/LogoStep';
import { MockupCanvas } from './components/MockupCanvas';
import { ExportStep } from './components/ExportStep';
import { Shirt, Image as ImageIcon, Layout, Download, ChevronRight, ArrowLeft, Languages } from 'lucide-react';
import { translations } from './i18n';

export default function App() {
  const [step, setStep] = useState<AppStep>('garment');
  const [lang, setLang] = useState<Language>('zh'); // Default to Chinese as requested
  const [garment, setGarment] = useState<GarmentImage | null>(null);
  const [logos, setLogos] = useState<LogoImage[]>([]);
  const [finalMockup, setFinalMockup] = useState<{withRulers: string, withoutRulers: string} | null>(null);

  const steps: { id: AppStep; label: string; icon: any }[] = [
    { id: 'garment', label: translations[lang].steps.garment, icon: Shirt },
    { id: 'logo', label: translations[lang].steps.logo, icon: ImageIcon },
    { id: 'mockup', label: translations[lang].steps.mockup, icon: Layout },
    { id: 'export', label: translations[lang].steps.export, icon: Download },
  ];

  const handleGarmentComplete = (data: GarmentImage) => {
    setGarment(data);
    setStep('logo');
  };

  const handleLogoComplete = (data: LogoImage[]) => {
    setLogos(data);
    setStep('mockup');
  };

  const handleMockupComplete = (data: {withRulers: string, withoutRulers: string}) => {
    setFinalMockup(data);
    setStep('export');
  };

  const handleRestart = () => {
    setGarment(null);
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
          <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
            <Languages size={14} />
            Help
          </button>
        </div>
      </header>

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
            <GarmentStep onComplete={handleGarmentComplete} lang={lang} />
          </div>
          <div style={{ display: step === 'logo' ? 'block' : 'none' }}>
            <LogoStep onComplete={handleLogoComplete} garment={garment} lang={lang} />
          </div>
          
          <AnimatePresence mode="wait">
            {step === 'mockup' && garment && logos.length > 0 && (
              <motion.div
                key="mockup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MockupCanvas 
                  garment={garment} 
                  logos={logos} 
                  lang={lang}
                  onExport={handleMockupComplete} 
                />
              </motion.div>
            )}
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
