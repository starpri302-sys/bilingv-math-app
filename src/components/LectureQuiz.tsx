import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Award } from 'lucide-react';
import MathText from './MathText';

interface QuizOption {
  id: string;
  text_ru: string;
  text_tyv: string;
  is_correct: number;
}

interface QuizQuestion {
  id: string;
  question_ru: string;
  question_tyv: string;
  options: QuizOption[];
  explanation_ru?: string;
  explanation_tyv?: string;
}

interface QuizProps {
  quiz: {
    id: string;
    title_ru: string;
    title_tyv: string;
    questions: QuizQuestion[];
  };
  lang: 'ru' | 'tyv';
}

export default function LectureQuiz({ quiz, lang }: QuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = quiz.questions[currentStep];

  const handleOptionSelect = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOption(optionId);
  };

  const handleCheck = () => {
    if (!selectedOption) return;
    
    const isCorrect = currentQuestion.options.find(o => o.id === selectedOption)?.is_correct === 1;
    if (isCorrect) {
      setScore(s => s + 1);
    }
    setIsAnswered(true);
  };

  const handleNext = () => {
    if (currentStep < quiz.questions.length - 1) {
      setCurrentStep(s => s + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setShowResult(false);
  };

  if (showResult) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] border-2 border-emerald-100 p-8 sm:p-12 text-center shadow-xl"
      >
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <Award className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-serif font-black text-stone-900 mb-4">
          {lang === 'ru' ? 'Результат теста' : 'Тест түңнели'}
        </h2>
        <div className="text-5xl font-black text-emerald-600 mb-6">{percentage}%</div>
        <p className="text-stone-500 mb-10 text-lg">
          {lang === 'ru' 
            ? `Вы ответили правильно на ${score} из ${quiz.questions.length} вопросов.` 
            : `Сен ${quiz.questions.length} айтырыгдан ${score} айтырыгга шын харыыладың.`}
        </p>
        <button 
          onClick={restart}
          className="flex items-center gap-2 bg-stone-900 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all mx-auto uppercase tracking-widest text-xs"
        >
          <RotateCcw className="w-4 h-4" />
          {lang === 'ru' ? 'Попробовать снова' : 'Катап эгелээр'}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-black text-stone-900">
          {lang === 'ru' ? 'Проверь себя' : 'Бот-хыналда'}
        </h2>
        <div className="flex items-center gap-1">
          {quiz.questions.map((_, idx) => (
            <div 
              key={idx}
              className={`w-8 h-1.5 rounded-full transition-all duration-500 ${idx === currentStep ? 'bg-emerald-500 w-12' : idx < currentStep ? 'bg-emerald-200' : 'bg-stone-200'}`}
            />
          ))}
        </div>
      </div>

      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-[2.5rem] border border-stone-200 p-6 sm:p-10 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/10" />
        
        <div className="mb-8">
          <div className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">
            {lang === 'ru' ? `Вопрос ${currentStep + 1}` : `${currentStep + 1}-ги айтырыг`}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
            <MathText text={lang === 'ru' ? currentQuestion.question_ru : currentQuestion.question_tyv} />
          </h3>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isCorrect = option.is_correct === 1;
            const isSelected = selectedOption === option.id;
            
            let bgClass = 'bg-stone-50 border-stone-100 hover:border-emerald-200';
            let textClass = 'text-stone-700';
            let icon = null;

            if (isAnswered) {
              if (isCorrect) {
                bgClass = 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500';
                textClass = 'text-emerald-900 font-bold';
                icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
              } else if (isSelected) {
                bgClass = 'bg-rose-50 border-rose-500 ring-1 ring-rose-500';
                textClass = 'text-rose-900 font-bold';
                icon = <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
              } else {
                bgClass = 'bg-stone-50 border-stone-100 opacity-50';
              }
            } else if (isSelected) {
              bgClass = 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500';
              textClass = 'text-emerald-900 font-bold';
            }

            return (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                disabled={isAnswered}
                className={`w-full flex items-center justify-between gap-4 p-5 rounded-2xl border-2 transition-all text-left ${bgClass}`}
              >
                <div className={textClass}>
                  <MathText text={lang === 'ru' ? option.text_ru : option.text_tyv} />
                </div>
                {icon}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-8 pt-8 border-t border-stone-100"
            >
              <div className="flex gap-4 p-6 bg-stone-50 rounded-2xl">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Award className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Пояснение</div>
                  <div className="text-stone-700 text-sm leading-relaxed">
                    <MathText text={lang === 'ru' ? (currentQuestion.explanation_ru || 'Правильный ответ подтвержден.') : (currentQuestion.explanation_tyv || 'Шын харыы бадыткаттынган.')} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 flex justify-end">
          {!isAnswered ? (
            <button
              onClick={handleCheck}
              disabled={!selectedOption}
              className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs"
            >
              Проверить
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-10 py-4 bg-stone-900 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs"
            >
              {currentStep < quiz.questions.length - 1 ? 'Следующий вопрос' : 'Завершить тест'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
