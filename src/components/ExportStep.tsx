import React, { useState } from 'react';
import { Download, Share2, RefreshCw, CheckCircle2, Image as ImageIcon, FileText, ExternalLink, Ruler } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n';

interface ExportStepProps {
  mockupUrl: { effectWithWatermark: string, effectNoWatermark: string, engineering: string, name: string }[];
  onRestart: () => void;
  lang: Language;
}

export const ExportStep: React.FC<ExportStepProps> = ({ mockupUrl, onRestart, lang }) => {
  const t = translations[lang].export;
  const downloadAll = () => {
    mockupUrl.forEach((mockup, index) => {
      setTimeout(() => {
        // Download engineering mockup (with rulers)
        const link1 = document.createElement('a');
        link1.download = `mockai-engineering-${mockup.name || index}.png`;
        link1.href = mockup.engineering;
        link1.click();

        setTimeout(() => {
          // Download visual mockup with watermark
          const link2 = document.createElement('a');
          link2.download = `mockai-visual-watermarked-${mockup.name || index}.png`;
          link2.href = mockup.effectWithWatermark;
          link2.click();

          setTimeout(() => {
            // Download visual mockup without watermark
            const link3 = document.createElement('a');
            link3.download = `mockai-visual-${mockup.name || index}.png`;
            link3.href = mockup.effectNoWatermark;
            link3.click();
          }, 500);
        }, 500);
      }, index * 1500);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <CheckCircle2 size={14} />
          {t.ready}
        </div>
        <h2 className="text-4xl font-light text-slate-900">{t.title}</h2>
        <p className="text-slate-500">{t.desc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          {mockupUrl.map((mockup, index) => (
            <div key={index} className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden group">
              <h3 className="text-center font-bold text-slate-700 mb-3">{mockup.name}</h3>
              <div className="relative rounded-2xl overflow-hidden bg-slate-100">
                <img 
                  src={mockup.effectWithWatermark} 
                  alt={`Final Mockup ${mockup.name}`} 
                  className="w-full h-auto shadow-inner"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => {
                      const link1 = document.createElement('a');
                      link1.download = `mockai-engineering-${mockup.name || index}.png`;
                      link1.href = mockup.engineering;
                      link1.click();
                      setTimeout(() => {
                        const link2 = document.createElement('a');
                        link2.download = `mockai-visual-watermarked-${mockup.name || index}.png`;
                        link2.href = mockup.effectWithWatermark;
                        link2.click();
                        setTimeout(() => {
                          const link3 = document.createElement('a');
                          link3.download = `mockai-visual-${mockup.name || index}.png`;
                          link3.href = mockup.effectNoWatermark;
                          link3.click();
                        }, 500);
                      }, 500);
                    }}
                    className="p-4 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform shadow-xl flex items-center gap-2 font-bold"
                  >
                    <Download size={20} /> 一键三连
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">一键导出</h3>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={downloadAll}
                  className="w-full p-4 bg-slate-900 text-white rounded-2xl font-medium flex items-center justify-between hover:bg-slate-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Download size={18} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">下载全部图片</div>
                      <div className="text-[10px] text-slate-300 font-normal">包含水印图、工程图、无水印图</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-1 rounded uppercase">PNG</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{t.processing}</h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t.upscale}</span>
                  <span className="text-emerald-600 font-bold text-[10px] uppercase">{t.soon}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t.removeBg}</span>
                  <span className="text-emerald-600 font-bold text-[10px] uppercase">{t.soon}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <button
                onClick={onRestart}
                className="w-full py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
              >
                <RefreshCw size={18} />
                {t.restart}
              </button>
            </div>
          </div>
          
          <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-start gap-4">
            <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
              <Share2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-900">{t.share}</h4>
              <p className="text-xs text-indigo-700/70 mt-1">{t.shareDesc}</p>
              <button className="mt-3 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                Generate Link <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
