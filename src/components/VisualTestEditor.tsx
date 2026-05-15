import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Settings,
  Columns2,
  Columns3,
  Video,
  Play
} from 'lucide-react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MathText from './MathText';

interface VisualBlock {
  id: string;
  type: 'text' | 'image' | 'question' | 'video';
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  questionData?: {
    ru: string;
    tyv: string;
    options: { text_ru: string; text_tyv: string; is_correct: boolean; id: string }[];
  };
  layout?: 'full' | 'half' | 'third';
  columnCount?: 1 | 2 | 3;
}

interface VisualTestEditorProps {
  initialBlocks?: VisualBlock[];
  onSave: (blocks: VisualBlock[]) => void;
}

interface SortableBlockProps {
  block: VisualBlock;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function SortableBlock({ block, isSelected, onSelect, onRemove }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const getWidthClass = () => {
    switch (block.layout) {
      case 'half': return 'w-full md:w-[calc(50%-0.5rem)]';
      case 'third': return 'w-full md:w-[calc(33.33%-0.67rem)]';
      default: return 'w-full';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${getWidthClass()} group relative bg-white rounded-3xl border-2 transition-all p-4 cursor-default ${isSelected ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-xl' : 'border-white hover:border-stone-200 shadow-sm'} ${isDragging ? 'opacity-50 scale-95' : ''}`}
      onClick={() => onSelect(block.id)}
    >
      <div className="flex gap-4">
        <div className="w-8 shrink-0 flex flex-col items-center gap-2">
           <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
             <GripVertical className="w-5 h-5 text-stone-300 group-hover:text-stone-400" />
           </div>
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${block.type === 'question' ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
              {block.type === 'text' && <Type className="w-4 h-4" />}
              {block.type === 'image' && <ImageIcon className="w-4 h-4" />}
              {block.type === 'video' && <Video className="w-4 h-4" />}
              {block.type === 'question' && <HelpCircle className="w-4 h-4" />}
           </div>
        </div>

        <div className="flex-grow min-w-0">
           {block.type === 'text' && (
             <div 
               className="p-2"
               style={{ 
                 columnCount: block.columnCount || 1, 
                 columnGap: '2rem',
                 columnRule: block.columnCount && block.columnCount > 1 ? '1px solid #f1f1f1' : 'none'
               }}
             >
                {block.content ? (
                  <div className="text-stone-700 leading-relaxed text-sm"><MathText text={block.content} /></div>
                ) : (
                  <span className="text-stone-300 italic text-sm">Пустой текстовый блок...</span>
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

           {block.type === 'video' && (
             <div className="relative aspect-video bg-stone-900 rounded-2xl flex flex-col items-center justify-center text-white/20 overflow-hidden">
               {block.videoUrl ? (
                 <div className="flex flex-col items-center gap-2">
                    <Play className="w-12 h-12 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">{block.videoUrl}</span>
                 </div>
               ) : (
                 <>
                   <Video className="w-10 h-10 mb-2 opacity-50" />
                   <span className="text-xs font-bold uppercase tracking-widest">Нет видео</span>
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
                <p className="text-stone-600 line-clamp-2 italic text-sm">
                  {block.questionData?.ru || 'Текст вопроса не заполнен...'}
                </p>
             </div>
           )}
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(block.id); }}
          className="opacity-0 group-hover:opacity-100 p-2 text-stone-300 hover:text-rose-500 transition-all bg-stone-50 rounded-xl self-start"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function VisualTestEditor({ initialBlocks = [], onSave }: VisualTestEditorProps) {
  const [blocks, setBlocks] = useState<VisualBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const newBlock: VisualBlock = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'image',
            content: '',
            imageUrl: base64,
            layout: 'full'
          };
          setBlocks([...blocks, newBlock]);
          setSelectedBlockId(newBlock.id);
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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
    <div 
      onPaste={handlePaste}
      className="flex flex-col lg:flex-row gap-8 min-h-[700px] bg-stone-50 p-6 rounded-[2.5rem] border border-stone-200 shadow-inner"
    >
      {/* Visual Canvas Area */}
      <div className="flex-grow flex flex-col gap-6">
        <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
           <div>
             <h3 className="text-xl font-serif font-black text-stone-900">Пространство теста</h3>
             <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Визуальное проектирование</p>
           </div>
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 border-r border-stone-100 pr-4">
                <button 
                  onClick={() => addBlock('text')}
                  className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
                  title="Добавить текст"
                >
                  <Type className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => addBlock('image')}
                  className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
                  title="Добавить изображение"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => addBlock('video')}
                  className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
                  title="Добавить видео"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => addBlock('question')}
                  className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
                  title="Добавить вопрос"
                >
                  <Plus className="w-5 h-5" />
                </button>
             </div>
             <button 
              onClick={() => onSave(blocks)}
              className="bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs flex items-center gap-2 active:scale-95"
             >
               <CheckCircle2 className="w-5 h-5" />
               Сохранить тест
             </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto max-h-[750px] pr-2 custom-scrollbar">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={blocks.map(b => b.id)}
              strategy={rectSortingStrategy}
            >
              <div className="flex flex-wrap gap-4">
                {blocks.map((block) => (
                  <SortableBlock 
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={setSelectedBlockId}
                    onRemove={removeBlock}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

        {blocks.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border-4 border-dashed border-stone-100 text-stone-200">
             <Layout className="w-20 h-20 mb-4 opacity-10" />
             <p className="text-xl font-serif font-black">Пустое поле</p>
             <p className="font-bold text-stone-300 mt-2">Используйте кнопки выше, чтобы добавить элементы</p>
          </div>
        )}
      </div>
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
                   <p className="text-[10px] text-stone-400 italic">Вы также можете просто вставить изображение из буфера обмена (Ctrl+V)</p>
                </div>
              )}

              {selectedBlock.type === 'video' && (
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ссылка на видео (YouTube / Vimeo / Direct)</label>
                      <input 
                        type="url"
                        value={selectedBlock.videoUrl || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { videoUrl: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                   </div>
                   <p className="text-[10px] text-stone-400 italic">Поддерживаются ссылки на YouTube, Vimeo и прямые ссылки на MP4.</p>
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

              <div className="pt-8 border-t border-stone-100 flex flex-col gap-6">
                 <div className="space-y-4">
                   <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Размер блока</label>
                   <div className="flex gap-2">
                     {[
                       { id: 'third', icon: Minimize2, label: '1/3' },
                       { id: 'half', icon: Columns2, label: '1/2' },
                       { id: 'full', icon: Maximize2, label: '1/1' }
                     ].map((opt) => (
                       <button 
                        key={opt.id}
                        onClick={() => updateBlock(selectedBlock.id, { layout: opt.id as any })}
                        className={`flex-grow flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${selectedBlock.layout === opt.id ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-400 hover:border-emerald-600 hover:text-emerald-600'}`}
                       >
                         <opt.icon className="w-4 h-4" />
                         <span className="text-[10px] font-black">{opt.label}</span>
                       </button>
                     ))}
                   </div>
                 </div>

                 {(selectedBlock.type === 'text' || selectedBlock.type === 'image') && (
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Колонки контента</label>
                     <div className="flex gap-2">
                       {[1, 2, 3].map((num) => (
                         <button 
                          key={num}
                          onClick={() => updateBlock(selectedBlock.id, { columnCount: num as any })}
                          className={`flex-grow flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${selectedBlock.columnCount === num || (!selectedBlock.columnCount && num === 1) ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-400 hover:border-emerald-600 hover:text-emerald-600'}`}
                         >
                           {num === 1 && <Maximize2 className="w-4 h-4" />}
                           {num === 2 && <Columns2 className="w-4 h-4" />}
                           {num === 3 && <Columns3 className="w-4 h-4" />}
                           <span className="text-xs font-black">{num}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
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
