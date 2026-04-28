import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, X, Clock, FileImage, Image as ImageIcon } from 'lucide-react';
import { saveProject, loadProjects, deleteProject, SavedProject } from '../lib/db';
import { GarmentImage, LogoImage } from '../types';

interface ProjectManagerProps {
  onClose: () => void;
  onLoad: (garments: GarmentImage[], logos: LogoImage[]) => void;
  currentGarments: GarmentImage[];
  currentLogos: LogoImage[];
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  onClose,
  onLoad,
  currentGarments,
  currentLogos
}) => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');

  const refreshProjects = async () => {
    const list = await loadProjects();
    setProjects(list);
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setIsSaving(true);
    try {
      const id = Date.now().toString();
      await saveProject({
        id,
        name: saveName.trim(),
        garments: currentGarments,
        logos: currentLogos
      });
      setSaveName('');
      await refreshProjects();
    } catch (e) {
      alert('保存失败，可能是由于存储空间已满');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此项目吗？')) return;
    await deleteProject(id);
    await refreshProjects();
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderOpen size={24} className="text-slate-700" />
            作图记录
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-600 mb-3">保存当前项目</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="输入项目名称..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !saveName.trim() || (currentGarments.length === 0 && currentLogos.length === 0)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <Save size={18} />
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
          {(currentGarments.length === 0 && currentLogos.length === 0) && (
            <p className="text-xs text-rose-500 mt-2">当前没有可以保存的内容，请先添加画面或Logo</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-bold text-slate-600 mb-4">全部记录 ({projects.length})</h3>
          
          {projects.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-20" />
              <p>暂无保存的作图记录</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition-colors bg-white group relative">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1 pr-10 truncate">{p.name || '未命名项目'}</h4>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mb-4">
                    <Clock size={12} />
                    {formatDate(p.updatedAt)}
                  </div>
                  
                  <div className="flex gap-4 text-sm font-medium text-slate-600 mb-4 bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1">
                      <FileImage size={16} className="text-blue-500" />
                      <span>{p.garments?.length || 0} 个底图</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ImageIcon size={16} className="text-indigo-500" />
                      <span>{p.logos?.length || 0} 个附件</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onLoad(p.garments || [], p.logos || []);
                      onClose();
                    }}
                    className="w-full py-2 bg-slate-100 text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    读取项目
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
