import React from 'react';
import { PMPQuestion } from '../types';
import QuestionCard from './QuestionCard';
import {
  ListChecks,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Award,
  Flag,
  RotateCcw
} from 'lucide-react';

interface ExtractedQuestionsViewProps {
  language: 'EN' | 'FR';
  isAdmin: boolean;

  questions: PMPQuestion[];
  isLoading: boolean;
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  answeredMap: { [qId: string]: string };
  setAnsweredMap: React.Dispatch<React.SetStateAction<{ [qId: string]: string }>>;
  setSessionCompletedCount: React.Dispatch<React.SetStateAction<number>>;

  // Timed mock-exam session, shared with the admin's per-book extracted-questions tab
  examActive: boolean;
  examSubmitted: boolean;
  examQuestions: PMPQuestion[];
  examAnswers: { [qId: string]: string };
  setExamAnswers: React.Dispatch<React.SetStateAction<{ [qId: string]: string }>>;
  examIndex: number;
  setExamIndex: React.Dispatch<React.SetStateAction<number>>;
  examTimeRemaining: number;
  examScore: number | null;
  startExam: (questions: PMPQuestion[]) => void;
  submitExam: () => void;
  exitExam: () => void;
}

// Every candidate's question source is restricted to this view: only questions found verbatim
// inside admin-uploaded documents (see extractQuestionsFromBook in server.ts), aggregated across
// every uploaded book - never AI-drafted questions. Domain Practice / Full 180 Mock Exam (both
// AI-generated) stay admin-only; this is their candidate-facing replacement.
export default function ExtractedQuestionsView({
  language,
  isAdmin,
  questions,
  isLoading,
  index,
  setIndex,
  answeredMap,
  setAnsweredMap,
  setSessionCompletedCount,
  examActive,
  examSubmitted,
  examQuestions,
  examAnswers,
  setExamAnswers,
  examIndex,
  setExamIndex,
  examTimeRemaining,
  examScore,
  startExam,
  submitExam,
  exitExam
}: ExtractedQuestionsViewProps) {
  if (examActive) {
    const currentExamQuestion = examQuestions[examIndex] || null;
    const minutes = Math.floor(examTimeRemaining / 60);
    const seconds = examTimeRemaining % 60;
    const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const answeredCount = Object.keys(examAnswers).length;

    return (
      <div className="max-w-4xl mx-auto w-full py-6" id="view_extracted_exam">
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] border border-indigo-100 shadow-md flex flex-col space-y-4 min-h-[500px] w-full">
          <div className="flex items-center justify-between border-b border-indigo-50 pb-3 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                {examSubmitted ? <Award className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-indigo-950">
                  {examSubmitted
                    ? (language === 'FR' ? "Résultats de l'examen" : "Exam Results")
                    : (language === 'FR' ? "Examen Chronométré" : "Timed Exam")}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold">
                  {examSubmitted
                    ? (language === 'FR' ? "Révisez chaque question avec la correction complète" : "Review each question with full correctness revealed")
                    : (language === 'FR' ? `${answeredCount} / ${examQuestions.length} répondues` : `${answeredCount} / ${examQuestions.length} answered`)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!examSubmitted && (
                <span className="text-sm font-mono font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl" id="extracted_exam_timer">
                  {timeLabel}
                </span>
              )}
              {examSubmitted && examScore !== null && (
                <span className={`text-sm font-mono font-black px-3 py-1.5 rounded-xl border ${examScore >= 70 ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-800 bg-rose-50 border-rose-200'}`} id="extracted_exam_score">
                  {examScore}%
                </span>
              )}
              {!examSubmitted ? (
                <button
                  id="submit_extracted_exam_btn"
                  onClick={submitExam}
                  className="bg-gradient-to-r from-rose-600 to-orange-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md hover:scale-102 active:scale-100 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-white" />
                  <span>{language === 'FR' ? "Terminer" : "Submit Exam"}</span>
                </button>
              ) : (
                <button
                  id="exit_extracted_exam_btn"
                  onClick={exitExam}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                  <span>{language === 'FR' ? "Quitter la révision" : "Exit Review"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 overflow-y-auto flex flex-col justify-start min-h-[350px]">
            {currentExamQuestion && (
              <div className="w-full text-left space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-widest">
                    {language === 'FR' ? `Question ${examIndex + 1} sur ${examQuestions.length}` : `Question ${examIndex + 1} of ${examQuestions.length}`}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setExamIndex(i => Math.max(0, i - 1))}
                      disabled={examIndex === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExamIndex(i => Math.min(examQuestions.length - 1, i + 1))}
                      disabled={examIndex >= examQuestions.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <QuestionCard
                  question={currentExamQuestion}
                  onSubmit={(qId, option) => {
                    setExamAnswers(prev => ({ ...prev, [qId]: option }));
                  }}
                  isLoadingNew={false}
                  onNext={() => setExamIndex(i => Math.min(examQuestions.length - 1, i + 1))}
                  isGenerating={false}
                  language={language}
                  previouslySelectedOption={examAnswers[currentExamQuestion.question_id] as "A" | "B" | "C" | "D" | null | undefined}
                  isAdmin={isAdmin}
                  lockFeedback={!examSubmitted}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const current = questions[index] || null;

  return (
    <div className="max-w-4xl mx-auto w-full py-6 space-y-6" id="view_extracted_questions">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight leading-tight">
          {language === 'FR' ? "Questions Extraites des Documents" : "Questions Extracted From Your Documents"}
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto font-medium">
          {language === 'FR'
            ? "Ce sont les questions réellement présentes dans les documents PMP téléversés par l'administrateur, pas des questions générées par IA."
            : "These are the actual questions found inside the PMP documents your administrator uploaded, not AI-generated ones."}
        </p>
      </div>

      <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] border border-indigo-100 shadow-md flex flex-col space-y-4 min-h-[500px] w-full">
        <div className="flex items-center justify-between border-b border-indigo-50 pb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <ListChecks className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-indigo-950">
              {language === 'FR' ? `${questions.length} question(s) disponible(s)` : `${questions.length} question(s) available`}
            </span>
          </div>
          {questions.length > 0 && (
            <button
              id="start_extracted_exam_btn"
              onClick={() => startExam(questions)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md hover:scale-102 active:scale-100 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Clock className="w-4 h-4 text-white" />
              <span>{language === 'FR' ? `Examen chronométré (${questions.length}Q)` : `Start Timed Exam (${questions.length}Q)`}</span>
            </button>
          )}
        </div>

        <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 overflow-y-auto flex flex-col justify-start min-h-[350px]">
          {isLoading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center space-y-3 my-auto">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <span className="text-xs font-black text-indigo-950">
                {language === 'FR' ? "Chargement des questions extraites..." : "Loading extracted questions..."}
              </span>
            </div>
          ) : current ? (
            <div className="w-full text-left space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-widest">
                  {language === 'FR' ? `Question ${index + 1} sur ${questions.length}` : `Question ${index + 1} of ${questions.length}`}
                  {current.grounded_book_name && ` — ${current.grounded_book_name}`}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setIndex(i => Math.max(0, i - 1))}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIndex(i => Math.min(questions.length - 1, i + 1))}
                    disabled={index >= questions.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <QuestionCard
                question={current}
                onSubmit={(qId, option) => {
                  setAnsweredMap(prev => ({ ...prev, [qId]: option }));
                  setSessionCompletedCount(prev => prev + 1);
                }}
                isLoadingNew={false}
                onNext={() => setIndex(i => Math.min(questions.length - 1, i + 1))}
                isGenerating={false}
                language={language}
                previouslySelectedOption={answeredMap[current.question_id] as "A" | "B" | "C" | "D" | null | undefined}
                isAdmin={isAdmin}
              />
            </div>
          ) : (
            <div className="text-center py-12 flex flex-col items-center justify-center space-y-3 my-auto">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg">📄</div>
              <div className="space-y-1">
                <span className="text-xs font-black text-indigo-950 block">
                  {language === 'FR' ? "Aucune question disponible pour le moment" : "No questions available yet"}
                </span>
                <span className="text-[10px] text-slate-500 max-w-sm block leading-relaxed font-bold mx-auto">
                  {language === 'FR'
                    ? "Votre administrateur n'a pas encore téléversé de document contenant des questions détectables."
                    : "Your administrator hasn't uploaded a document with detectable questions yet."}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
