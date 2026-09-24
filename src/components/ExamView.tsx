import React from 'react';
import { PMPQuestion } from '../types';
import QuestionCard from './QuestionCard';
import { formatTime } from '../lib/dashboardUtils';
import {
  Award,
  Timer,
  Play,
  Pause,
  RotateCcw,
  HelpCircle,
  Coffee,
  ArrowRight,
  Layers,
  FileText,
  Zap,
  ChevronRight
} from 'lucide-react';

interface ExamTexts {
  officialExamTitle: string;
  enforcementSplit: string;
  beginExam: string;
  finishExam: string;
  restartSim: string;
  questionMatrix: string;
  examCompleteTitle: string;
  examCompleteDesc: string;
  complianceRating: string;
  targetAchieved: string;
  improvementReq: string;
  guidelinesTitle: string;
  guidelinesDesc: string;
  notInitiatedTitle: string;
  notInitiatedDesc: string;
}

interface ExamViewProps {
  language: 'EN' | 'FR';
  texts: ExamTexts;
  isAdmin: boolean;
  accessStatus: 'granted' | 'restricted';
  testsCount: number;
  appTestsLimit: number;
  renderRestrictedView: () => React.ReactNode;
  renderAttemptsFinishedView: () => React.ReactNode;

  isExamActive: boolean;
  isExamSubmitted: boolean;
  examTimeRemaining: number;
  examFinalScore: number | null;
  handleStartExam: () => void;
  handleFinishExam: () => void;
  handleResetExam: () => void;

  reviewMode: boolean;
  setReviewMode: React.Dispatch<React.SetStateAction<boolean>>;

  examQuestions: PMPQuestion[];
  examIndex: number;
  setExamIndex: React.Dispatch<React.SetStateAction<number>>;
  answeredMap: { [qId: string]: string };
  setAnsweredMap: React.Dispatch<React.SetStateAction<{ [qId: string]: string }>>;

  breakActive: 'break1' | 'break2' | null;
  setBreakActive: React.Dispatch<React.SetStateAction<'break1' | 'break2' | null>>;
  breakTimeRemaining: number;
  setBreakTimeRemaining: React.Dispatch<React.SetStateAction<number>>;
  isBreakTimerRunning: boolean;
  setIsBreakTimerRunning: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ExamView({
  language,
  texts,
  isAdmin,
  accessStatus,
  testsCount,
  appTestsLimit,
  renderRestrictedView,
  renderAttemptsFinishedView,
  isExamActive,
  isExamSubmitted,
  examTimeRemaining,
  examFinalScore,
  handleStartExam,
  handleFinishExam,
  handleResetExam,
  reviewMode,
  setReviewMode,
  examQuestions,
  examIndex,
  setExamIndex,
  answeredMap,
  setAnsweredMap,
  breakActive,
  setBreakActive,
  breakTimeRemaining,
  setBreakTimeRemaining,
  isBreakTimerRunning,
  setIsBreakTimerRunning
}: ExamViewProps) {
  if (accessStatus === 'restricted') {
    return <>{renderRestrictedView()}</>;
  }
  if (!isAdmin && testsCount >= appTestsLimit && !isExamActive && !isExamSubmitted) {
    return <>{renderAttemptsFinishedView()}</>;
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col h-full" id="view_mock_exam">

      {/* Header Exam Dashboard Bar */}
      <div className="bg-white/90 backdrop-blur-md border border-indigo-100 p-5 rounded-3xl flex flex-wrap justify-between items-center gap-4 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500 text-white flex items-center justify-center shadow-md">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-black text-indigo-950">{texts.officialExamTitle}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5 font-bold">{texts.enforcementSplit}</p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-4">
          {isExamActive && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-100/50 to-rose-100/50 px-4 py-2.5 rounded-2xl border border-amber-200 text-amber-900 font-mono text-sm font-black shadow-xxs">
              <Timer className="w-4 h-4 animate-pulse shrink-0 text-amber-600" />
              <span>{formatTime(examTimeRemaining)}</span>
            </div>
          )}

          {!isExamActive && !isExamSubmitted ? (
            <button
              id="start_exam_btn"
              onClick={handleStartExam}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 hover:opacity-90 hover:scale-105 text-white px-6 py-3 rounded-2xl font-black text-sm cursor-pointer shadow-md transition-all active:scale-[0.98]"
            >
              <Play className="w-4 h-4 text-white fill-white" />
              <span>{texts.beginExam}</span>
            </button>
          ) : isExamActive ? (
            <button
              id="finish_exam_btn"
              onClick={handleFinishExam}
              className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-850 border-2 border-slate-700/60 text-white px-6 py-2.5 rounded-2xl font-black text-sm cursor-pointer shadow-md transition-all hover:scale-105"
            >
              {texts.finishExam}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                id="review_exam_btn"
                onClick={() => {
                  setReviewMode(prev => !prev);
                  setExamIndex(0);
                  setBreakActive(null);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer shadow-xs transition-colors border ${
                  reviewMode
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent'
                    : 'bg-white hover:bg-violet-50 border-violet-200 text-violet-700'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>{language === 'FR' ? 'Revoir mes réponses' : 'Review My Answers'}</span>
              </button>
              <button
                id="reset_exam_btn"
                onClick={handleResetExam}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer shadow-xs transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>{texts.restartSim}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exam Main Content Layer (live exam, or post-exam review browsing) */}
      {(isExamActive || (isExamSubmitted && reviewMode)) && examQuestions.length > 0 && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

          {/* Visual grid checklist navigator grouped by exam series & breaks */}
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-indigo-100 overflow-y-auto block space-y-4 max-h-[500px] lg:max-h-full shadow-md z-10">
            <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
              <span className="text-xs text-indigo-950 uppercase tracking-widest font-mono font-black">
                {texts.questionMatrix}
              </span>
              <span className="text-[11px] font-mono font-bold text-violet-600">
                180 Qs
              </span>
            </div>

            {/* Series 1: Case Studies (Q1 - Q10) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                <Layers className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span>{language === 'FR' ? 'Série 1 : Études de Cas (Q1-10)' : 'Series 1: Case Studies (Q1-10)'}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {examQuestions.slice(0, 10).map((q, idx) => {
                  const qIndex = idx; // 0..9
                  const isAnswered = answeredMap[q.question_id] !== undefined;
                  const isActive = examIndex === qIndex && breakActive === null;

                  let btnStyle = "bg-slate-50 border border-slate-200/60 text-slate-500 hover:bg-slate-100";
                  if (isActive) {
                    btnStyle = "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black ring-2 ring-indigo-500 shadow-sm scale-105";
                  } else if (isAnswered) {
                    btnStyle = "bg-violet-50 border border-violet-200 text-violet-800 font-bold";
                  }

                  return (
                    <button
                      key={q.question_id}
                      onClick={() => {
                        setBreakActive(null);
                        setExamIndex(qIndex);
                      }}
                      className={`h-8 w-full rounded-lg text-xs font-mono transition-all cursor-pointer ${btnStyle}`}
                    >
                      {(qIndex + 1).toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Break 1 Indicator Button (live exam only, not during post-exam review) */}
            {isExamActive && (
            <button
              onClick={() => {
                setBreakActive('break1');
                setBreakTimeRemaining(600);
                setIsBreakTimerRunning(true);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                breakActive === 'break1'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-50/60 border-amber-200/80 text-amber-900 hover:bg-amber-100/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Coffee className={`w-4 h-4 ${breakActive === 'break1' ? 'text-white' : 'text-amber-600'}`} />
                <span>{language === 'FR' ? 'Pause 1 (10 Min)' : 'Break 1 (10 Min)'}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ${breakActive === 'break1' ? 'text-white' : 'text-amber-600'}`} />
            </button>
            )}

            {/* Series 2: Scenario-Based Questions (Q11 - Q100) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{language === 'FR' ? 'Série 2 : Scénarios (Q11-100)' : 'Series 2: Scenarios (Q11-100)'}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {examQuestions.slice(10, 100).map((q, idx) => {
                  const qIndex = idx + 10; // 10..99
                  const isAnswered = answeredMap[q.question_id] !== undefined;
                  const isActive = examIndex === qIndex && breakActive === null;

                  let btnStyle = "bg-slate-50 border border-slate-200/60 text-slate-500 hover:bg-slate-100";
                  if (isActive) {
                    btnStyle = "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black ring-2 ring-indigo-500 shadow-sm scale-105";
                  } else if (isAnswered) {
                    btnStyle = "bg-violet-50 border border-violet-200 text-violet-800 font-bold";
                  }

                  return (
                    <button
                      key={q.question_id}
                      onClick={() => {
                        setBreakActive(null);
                        setExamIndex(qIndex);
                      }}
                      className={`h-8 w-full rounded-lg text-xs font-mono transition-all cursor-pointer ${btnStyle}`}
                    >
                      {(qIndex + 1).toString().padStart(3, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Break 2 Indicator Button (live exam only, not during post-exam review) */}
            {isExamActive && (
            <button
              onClick={() => {
                setBreakActive('break2');
                setBreakTimeRemaining(600);
                setIsBreakTimerRunning(true);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                breakActive === 'break2'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-50/60 border-amber-200/80 text-amber-900 hover:bg-amber-100/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Coffee className={`w-4 h-4 ${breakActive === 'break2' ? 'text-white' : 'text-amber-600'}`} />
                <span>{language === 'FR' ? 'Pause 2 (10 Min)' : 'Break 2 (10 Min)'}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ${breakActive === 'break2' ? 'text-white' : 'text-amber-600'}`} />
            </button>
            )}

            {/* Series 3: Strategic & Process Knowledge (Q101 - Q180) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{language === 'FR' ? 'Série 3 : Stratégique (Q101-180)' : 'Series 3: Strategic (Q101-180)'}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {examQuestions.slice(100, 180).map((q, idx) => {
                  const qIndex = idx + 100; // 100..179
                  const isAnswered = answeredMap[q.question_id] !== undefined;
                  const isActive = examIndex === qIndex && breakActive === null;

                  let btnStyle = "bg-slate-50 border border-slate-200/60 text-slate-500 hover:bg-slate-100";
                  if (isActive) {
                    btnStyle = "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black ring-2 ring-indigo-500 shadow-sm scale-105";
                  } else if (isAnswered) {
                    btnStyle = "bg-violet-50 border border-violet-200 text-violet-800 font-bold";
                  }

                  return (
                    <button
                      key={q.question_id}
                      onClick={() => {
                        setBreakActive(null);
                        setExamIndex(qIndex);
                      }}
                      className={`h-8 w-full rounded-lg text-xs font-mono transition-all cursor-pointer ${btnStyle}`}
                    >
                      {(qIndex + 1).toString().padStart(3, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question rendering workspace or Break workspace */}
          <div className="lg:col-span-3 flex flex-col items-stretch justify-start">
            {breakActive !== null ? (
              <div className="bg-white/95 backdrop-blur-md border-2 border-amber-200 rounded-3xl p-8 space-y-6 shadow-xl text-center my-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <Coffee className="w-10 h-10 text-white" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                    {breakActive === 'break1'
                      ? (language === 'FR' ? 'Pause Programmée 1 (Après Q10)' : 'Scheduled Break 1 (After Q10)')
                      : (language === 'FR' ? 'Pause Programmée 2 (Après Q100)' : 'Scheduled Break 2 (After Q100)')
                    }
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 pt-2">
                    {language === 'FR' ? 'Temps de Pause Réglementaire (10 Minutes)' : 'Official Exam Break (10 Minutes)'}
                  </h2>
                  <p className="text-sm text-slate-600 max-w-lg mx-auto font-medium">
                    {language === 'FR'
                      ? "Le chronomètre principal de l'examen est suspendu. Profitez-en pour vous étirer, vous hydrater et reposer vos yeux avant la prochaine série."
                      : "The main exam clock is currently paused. Take this opportunity to stretch, hydrate, and refresh your mind before continuing to the next series."
                    }
                  </p>
                </div>

                {/* Large Countdown timer */}
                <div className="p-6 bg-gradient-to-b from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/80 inline-block">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-800 block">
                    {language === 'FR' ? 'Temps de pause restant' : 'Break Time Remaining'}
                  </span>
                  <div className="text-5xl font-mono font-black text-amber-900 mt-2 tracking-tight">
                    {Math.floor(breakTimeRemaining / 60).toString().padStart(2, '0')}:{(breakTimeRemaining % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => setIsBreakTimerRunning(prev => !prev)}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                  >
                    {isBreakTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-slate-800" />}
                    <span>{isBreakTimerRunning ? (language === 'FR' ? 'Mettre la pause en attente' : 'Pause Break Timer') : (language === 'FR' ? 'Reprendre le décompte' : 'Resume Countdown')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setBreakActive(null);
                      if (breakActive === 'break1') {
                        setExamIndex(10); // Start Q11
                      } else {
                        setExamIndex(100); // Start Q101
                      }
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:opacity-95 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-md transition-all cursor-pointer"
                  >
                    <span>{language === 'FR' ? "Terminer la pause et reprendre l'examen" : 'End Break & Continue Exam'}</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <QuestionCard
                question={examQuestions[examIndex]}
                onSubmit={(qId, option) => {
                  // Reviewing after submission never mutates the locked-in exam record.
                  if (isExamSubmitted) return;
                  setAnsweredMap(prev => ({ ...prev, [qId]: option }));
                  // Advancement is driven solely by the candidate clicking "Next" below -
                  // a real exam never auto-advances the candidate off a question.
                }}
                isLoadingNew={false}
                onNext={() => {
                  if (isExamSubmitted) {
                    // Review mode: simple linear browsing, no scheduled breaks.
                    setExamIndex(prev => Math.min(prev + 1, examQuestions.length - 1));
                    return;
                  }
                  if (examIndex === 9) {
                    setBreakActive('break1');
                    setBreakTimeRemaining(600);
                    setIsBreakTimerRunning(true);
                  } else if (examIndex === 99) {
                    setBreakActive('break2');
                    setBreakTimeRemaining(600);
                    setIsBreakTimerRunning(true);
                  } else if (examIndex < 179) {
                    setExamIndex(prev => prev + 1);
                  }
                }}
                isGenerating={false}
                language={language}
                previouslySelectedOption={answeredMap[examQuestions[examIndex].question_id] as "A" | "B" | "C" | "D" | null | undefined}
                isAdmin={isAdmin}
                lockFeedback={isExamActive && !isExamSubmitted}
              />
            )}
          </div>

        </div>
      )}

      {/* Score Summary Metrics panel (hidden while actively browsing the review screen -
          otherwise it visually overlaps the question/navigator grid below) */}
      {isExamSubmitted && examFinalScore !== null && !reviewMode && (
        <div className="bg-white/95 backdrop-blur-md border border-indigo-100 rounded-[2.5rem] p-8 max-w-2xl mx-auto text-center space-y-6 shadow-xl animate-in fade-in zoom-in-95 duration-300 z-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 via-pink-400 to-amber-400 text-white flex items-center justify-center mx-auto shadow-md">
            <Award className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-indigo-950">{texts.examCompleteTitle}</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed font-semibold">
              {texts.examCompleteDesc}
            </p>
          </div>

          {/* Score Ratio percentage circle */}
          <div className="p-6 bg-gradient-to-tr from-violet-50 via-rose-50 to-amber-50 rounded-2xl inline-block border border-indigo-100 shadow-sm">
            <span className="text-[10px] text-indigo-950 tracking-wider uppercase font-mono block font-black">{texts.complianceRating}</span>
            <div className="text-4xl sm:text-5xl font-black font-mono bg-gradient-to-r from-violet-600 via-pink-600 to-amber-600 bg-clip-text text-transparent mt-1.5 animate-pulse">
              {examFinalScore}%
            </div>
            <span className="text-xs text-indigo-905 mt-2 block font-bold">
              {examFinalScore >= 75 ? texts.targetAchieved : texts.improvementReq}
            </span>
          </div>

          {/* Domain feedback matrices info box */}
          <div className="p-5 bg-gradient-to-b from-indigo-50/40 to-violet-50/30 border border-indigo-150 rounded-2xl text-left space-y-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">{texts.guidelinesTitle}</span>
            <p className="text-xs text-slate-600 leading-relaxed font-bold">
              {texts.guidelinesDesc}
            </p>
          </div>
        </div>
      )}

      {/* Waiting workspace state */}
      {!isExamActive && !isExamSubmitted && (
        <div className="flex-1 bg-white/90 backdrop-blur-md border border-indigo-105 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-md z-10">
          <HelpCircle className="w-12 h-12 text-violet-400 animate-pulse" />
          <div className="space-y-1.5">
            <h3 className="text-sm sm:text-base font-black text-slate-800">{texts.notInitiatedTitle}</h3>
            <p className="text-xs text-slate-500 max-w-sm font-bold leading-relaxed">
              {texts.notInitiatedDesc}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
