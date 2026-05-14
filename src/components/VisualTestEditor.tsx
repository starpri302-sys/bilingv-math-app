import React, { useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Type, 
  Image as ImageIcon, 
  CheckCircle2, 
  GripVertical, 
  HelpCircle,
  Layout,
  Maximize2,
  Minimize2,
  ChevronRight,
  Settings
} from 'lucide-react';
import MathText from './MathText';

interface VisualBlock {
  id: string;
  type: 'text' | 'image' | 'question';
  content: string;
  imageUrl?: string;
  questionData?: {
    ru: string;
    tyv: string;
    options: { text_ru: string; text_tyv: string; is_correct: boolean; id: string }[];
  };
  layout?: 'full' | 'half' | 'third';
}

interface VisualTestEditorProps {
  initialBlocks?: VisualBlock[];
  onSave: (blocks: VisualBlock[]) => void;
}

export default function VisualTestEditor({ initialBlocks = [], onSave }: VisualTestEditorProps) {
  const [blocks, setBlocks] = useState<VisualBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const addBlock = (type: VisualBlock['type']) => {
    const newBlock: VisualBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: '',
      layout: 'full',
      ...(type === 'question' && {
        questionData: {
          ru: '',
          tyv: '',
          options: [
            { id: '1', text_ru: '', text_tyv: '', is_correct: true },
            { id: '2', text_ru: '', text_tyv: '', is_correct: false }
          ]
        }
      })
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<VisualBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[700px] bg-stone-50 p-6 rounded-[2.5rem] border border-stone-200 shadow-inner">
      {/* Visual Canvas Area */}
      <div className="flex-grow space-y-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
        <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
           <div>
             <h3 className="text-xl font-serif font-black text-stone-900">Пространство теста</h3>
             <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Визуальное проектирование</p>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => addBlock('text')}
                className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
              >
                <Type className="w-5 h-5" />
              </button>
              <button 
                onClick={() => addBlock('image')}
                className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => addBlock('question')}
                className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
           </div>
        </div>

        <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-4">
          {blocks.map((block) => (
            <Reorder.Item 
              key={block.id} 
              value={block}
              className={`group relative bg-white rounded-3xl border-2 transition-all p-4 cursor-default ${selectedBlockId === block.id ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-xl' : 'border-white hover:border-stone-200 shadow-sm'}`}
              onClick={() => setSelectedBlockId(block.id)}
            >
              <div className="flex gap-4">
                <div className="w-8 shrink-0 flex flex-col items-center gap-2">
                   <GripVertical className="w-5 h-5 text-stone-300 group-hover:text-stone-400 cursor-grab active:cursor-grabbing" />
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${block.type === 'question' ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                      {block.type === 'text' && <Type className="w-4 h-4" />}
                      {block.type === 'image' && <ImageIcon className="w-4 h-4" />}
                      {block.type === 'question' && <HelpCircle className="w-4 h-4" />}
                   </div>
                </div>

                <div className="flex-grow">
                   {block.type === 'text' && (
                     <div className="p-2">
                        {block.content ? (
                          <div className="text-stone-700 leading-relaxed"><MathText text={block.content} /></div>
                        ) : (
                          <span className="text-stone-300 italic">Пустой текстовый блок...</span>
                        )}
                     </div>
                   )}

                   {block.type === 'image' && (
                     <div className="relative aspect-video bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-300 overflow-hidden">
                       {block.imageUrl ? (
                         <img src={block.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <>
                           <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                           <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Нет изображения</span>
                         </>
                       )}
                     </div>
                   )}

                   {block.type === 'question' && (
                     <div className="p-2 space-y-4">
                        <div className="font-serif font-black text-stone-900 border-b border-stone-100 pb-2 flex items-center justify-between">
                           <span>Вопрос</span>
                           {block.questionData?.ru ? (
                             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                           ) : (
                             <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                           )}
                        </div>
                        <p className="text-stone-600 line-clamp-2 italic">
                          {block.questionData?.ru || 'Текст вопроса не заполнен...'}
                        </p>
                     </div>
                   )}
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-stone-300 hover:text-rose-500 transition-all bg-stone-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {blocks.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border-4 border-dashed border-stone-100 text-stone-200">
             <Layout className="w-20 h-20 mb-4 opacity-10" />
             <p className="text-xl font-serif font-black">Пустое поле</p>
             <p className="font-bold text-stone-300 mt-2">Используйте кнопки выше, чтобы добавить элементы</p>
          </div>
        )}
      </div>

      {/* Control Panel Area */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={selectedBlockId || 'none'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="w-full lg:w-[400px] bg-white rounded-[2.5rem] border border-stone-200 shadow-2xl p-8 sticky top-6 self-start overflow-hidden flex flex-col"
        >
          {selectedBlock ? (
            <div className="space-y-6 flex-grow overflow-y-auto">
              <div className="flex items-center gap-3 mb-8">
                 <div className="p-3 bg-stone-900 text-white rounded-2xl shadow-lg">
                    <Settings className="w-5 h-5" />
                 </div>
                 <h4 className="text-xl font-serif font-black text-stone-900">Настройки блока</h4>
              </div>

              {selectedBlock.type === 'text' && (
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Текст (LaTeX поддерживается)</label>
                      <textarea 
                        value={selectedBlock.content}
                        onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-5 h-48 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all font-medium text-stone-700 leading-relaxed"
                        placeholder="Введите пояснительный текст..."
                      />
                   </div>
                </div>
              )}

              {selectedBlock.type === 'image' && (
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ссылка на изображение</label>
                      <input 
                        type="url"
                        value={selectedBlock.imageUrl || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { imageUrl: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all"
                        placeholder="https://example.com/image.jpg"
                      />
                   </div>
                </div>
              )}

              {selectedBlock.type === 'question' && (
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Текст вопроса (RU)</label>
                      <input 
                        value={selectedBlock.questionData?.ru || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { 
                          questionData: { ...selectedBlock.questionData!, ru: e.target.value } 
                        })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Текст вопроса (TYV)</label>
                      <input 
                        value={selectedBlock.questionData?.tyv || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { 
                          questionData: { ...selectedBlock.questionData!, tyv: e.target.value } 
                        })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold"
                      />
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center justify-between">
                         Варианты
                         <button 
                           onClick={() => {
                             const qData = selectedBlock.questionData!;
                             updateBlock(selectedBlock.id, {
                               questionData: {
                                 ...qData,
                                 options: [...qData.options, { id: Math.random().toString(), text_ru: '', text_tyv: '', is_correct: false }]
                               }
                             });
                           }}
                           className="text-emerald-600 hover:text-emerald-700"
                         >
                           <Plus className="w-4 h-4" />
                         </button>
                      </label>
                      <div className="space-y-2">
                        {selectedBlock.questionData?.options.map((opt, idx) => (
                          <div key={opt.id} className="flex gap-2">
                            <button 
                              onClick={() => {
                                const newOpts = selectedBlock.questionData!.options.map((o, i) => ({ ...o, is_correct: i === idx }));
                                updateBlock(selectedBlock.id, { questionData: { ...selectedBlock.questionData!, options: newOpts } });
                              }}
                              className={`w-10 shrink-0 flex items-center justify-center rounded-xl transition-all ${opt.is_correct ? 'bg-emerald-600 text-white shadow-lg' : 'bg-stone-50 text-stone-300 hover:bg-stone-100'}`}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <input 
                              placeholder="Вариант (RU)"
                              value={opt.text_ru}
                              onChange={(e) => {
                                const newOpts = [...selectedBlock.questionData!.options];
                                newOpts[idx].text_ru = e.target.value;
                                updateBlock(selectedBlock.id, { questionData: { ...selectedBlock.questionData!, options: newOpts } });
                              }}
                              className="flex-grow bg-stone-50 border border-stone-100 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500/10"
                            />
                            <button 
                              onClick={() => {
                                const newOpts = selectedBlock.questionData!.options.filter(o => o.id !== opt.id);
                                updateBlock(selectedBlock.id, { questionData: { ...selectedBlock.questionData!, options: newOpts } });
                              }}
                              className="p-2 text-stone-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              )}

              <div className="pt-8 border-t border-stone-100 flex items-center justify-between">
                 <div className="flex gap-2">
                   <button 
                    onClick={() => updateBlock(selectedBlock.id, { layout: 'third' })}
                    className={`p-2 rounded-lg border ${selectedBlock.layout === 'third' ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-400'}`}
                   >
                     <Minimize2 className="w-4 h-4 shrink-0" />
                   </button>
                   <button 
                    onClick={() => updateBlock(selectedBlock.id, { layout: 'full' })}
                    className={`p-2 rounded-lg border ${selectedBlock.layout === 'full' ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-400'}`}
                   >
                     <Maximize2 className="w-4 h-4 shrink-0" />
                   </button>
                 </div>
                 <button 
                  onClick={() => onSave(blocks)}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all uppercase tracking-widest text-[10px]"
                 >
                   Сохранить всё
                 </button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center py-20 px-6">
              <div className="w-20 h-20 bg-stone-50 rounded-[2rem] flex items-center justify-center text-stone-200 mb-6">
                 <Layout className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-serif font-black text-stone-900 mb-2">Выберите блок</h4>
              <p className="text-stone-400 text-sm leading-relaxed">Нажмите на любой элемент на холсте слева, чтобы начать его настройку.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
