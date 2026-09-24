import React from 'react';
import { PMPQuestion } from '../types';
import QuestionCard from './QuestionCard';
import {
  BookOpen,
  UploadCloud,
  AlertTriangle,
  Trash2,
  Loader2,
  Sparkles,
  ArrowRight,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Clock,
  Award,
  Flag,
  RotateCcw
} from 'lucide-react';

export interface BookMeta {
  id: string;
  name: string;
  pageCount: number;
  charCount: number;
  chunkCount: number;
  uploadedAt: string;
  /** 'pending' right after upload while the server scans chunks in the background, 'done' once
   * finished, 'skipped_offline' if no Gemini key was configured to run the scan at all. */
  extractionStatus?: 'pending' | 'done' | 'skipped_offline';
  extractedQuestionsCount?: number;
}

interface BookCompanionViewProps {
  language: 'EN' | 'FR';
  isAdmin: boolean;
  accessStatus: 'granted' | 'restricted';
  renderRestrictedView: () => React.ReactNode;

  books: BookMeta[];
  selectedBookId: string | null;
  setSelectedBookId: (id: string) => void;
  deleteBook: (bookId: string) => void;

  dragActive: boolean;
  bookUploading: boolean;
  bookUploadError: string | null;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  activeBookTab: 'quiz' | 'extracted';
  setActiveBookTab: (tab: 'quiz' | 'extracted') => void;

  // Grounded MCQ Quiz tab
  bookKeyword: string;
  setBookKeyword: (v: string) => void;
  bookQuestionType: 'situational' | 'definition';
  setBookQuestionType: (v: 'situational' | 'definition') => void;
  generateBookQuestion: () => void;
  isLoadingBookQuestion: boolean;
  bookQuestion: PMPQuestion | null;
  bookAnsweredMap: { [qId: string]: string };
  setBookAnsweredMap: React.Dispatch<React.SetStateAction<{ [qId: string]: string }>>;
  setSessionCompletedCount: React.Dispatch<React.SetStateAction<number>>;

  // Extracted Questions tab (questions pulled verbatim from the document itself)
  extractedQuestions: PMPQuestion[];
  isLoadingExtractedQuestions: boolean;
  extractedIndex: number;
  setExtractedIndex: React.Dispatch<React.SetStateAction<number>>;
  extractedAnsweredMap: { [qId: string]: string };
  setExtractedAnsweredMap: React.Dispatch<React.SetStateAction<{ [qId: string]: string }>>;

  // Timed mock-exam session built from a book's extracted questions
  extractedExamActive: boolean;
  extractedExamSubmitted: boolean;
  extractedExamQuestions: PMPQuestion[];
  extractedExamAnswers: { [qId: string]: string };
  setExtractedExamAnswers: React.Dispatch<React.SetStateAction<{ [qId: string]: string }>>;
  extractedExamIndex: number;
  setExtractedExamIndex: React.Dispatch<React.SetStateAction<number>>;
  extractedExamTimeRemaining: number;
  extractedExamScore: number | null;
  startExtractedExam: () => void;
  submitExtractedExam: () => void;
  exitExtractedExam: () => void;
}

export default function BookCompanionView({
  language,
  isAdmin,
  accessStatus,
  renderRestrictedView,
  books,
  selectedBookId,
  setSelectedBookId,
  deleteBook,
  dragActive,
  bookUploading,
  bookUploadError,
  handleDrag,
  handleDrop,
  handleFileChange,
  activeBookTab,
  setActiveBookTab,
  bookKeyword,
  setBookKeyword,
  bookQuestionType,
  setBookQuestionType,
  generateBookQuestion,
  isLoadingBookQuestion,
  bookQuestion,
  bookAnsweredMap,
  setBookAnsweredMap,
  setSessionCompletedCount,
  extractedQuestions,
  isLoadingExtractedQuestions,
  extractedIndex,
  setExtractedIndex,
  extractedAnsweredMap,
  setExtractedAnsweredMap,
  extractedExamActive,
  extractedExamSubmitted,
  extractedExamQuestions,
  extractedExamAnswers,
  setExtractedExamAnswers,
  extractedExamIndex,
  setExtractedExamIndex,
  extractedExamTimeRemaining,
  extractedExamScore,
  startExtractedExam,
  submitExtractedExam,
  exitExtractedExam
}: BookCompanionViewProps) {
  if (accessStatus === 'restricted') {
    return <>{renderRestrictedView()}</>;
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col h-full" id="view_book_companion">

      {/* Header Study Bar */}
      <div className="bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-500 p-6 rounded-3xl flex flex-wrap justify-between items-center gap-4 shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-inner">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">
              {language === 'FR' ? "Compagnon de Lecture & IA PMP" : "PMP Study Books & AI Companion"}
            </h2>
            <p className="text-xs text-teal-50 mt-0.5 font-bold">
              {language === 'FR' ? "GROUNDED RAG : Étudiez directement avec vos PDF de plus de 400 pages !" : "GROUNDED RAG: Bring your official 400+ page PMBOK / Rita Mulcahy guides and practice directly!"}
            </p>
          </div>
        </div>
      </div>

      {/* If no books uploaded, show full drag and drop uploader first */}
      {books.length === 0 ? (
        <div className="max-w-2xl mx-auto w-full my-4">
          <div
            id="book_dropzone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-4 border-dashed rounded-[2.5rem] p-12 text-center transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/50 scale-102 shadow-lg'
                : 'border-indigo-100 bg-white/80 hover:bg-white hover:border-indigo-200'
            } shadow-md relative`}
          >
            <input
              type="file"
              id="book_file_input"
              onChange={handleFileChange}
              accept=".pdf,.txt"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-md">
                {bookUploading ? (
                  <Loader2 className="w-10 h-10 animate-spin text-white" />
                ) : (
                  <UploadCloud className="w-10 h-10 text-white" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-indigo-950">
                  {bookUploading
                    ? (language === 'FR' ? "Analyse et indexation du livre..." : "Parsing PMP Guide text...")
                    : (language === 'FR' ? "Déposez votre livre d'étude PMP ici" : "Upload your PMP Exam study book")}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-bold">
                  {bookUploading
                    ? (language === 'FR' ? "Analyse intensive des pages pour créer des modules d'étude indexés. Cela peut prendre quelques secondes pour les gros livres (400+ pages)." : "We are indexing every single page of your book to build high-performance study chunks. This is extremely robust for books from 400 to 1000 pages!")
                    : (language === 'FR' ? "Prend en charge les formats PDF d'apprentissage et TXT jusqu'à 150 Mo. Glissez-déposez ou cliquez pour parcourir vos fichiers." : "Accepts PDF exam prep booklets and TXT files up to 150MB. Drag & drop or click anywhere to select.")
                  }
                </p>
              </div>

              {!bookUploading && (
                <button
                  className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-650 text-white font-extrabold px-6 py-3 rounded-2xl text-sm shadow-md hover:scale-105 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  {language === 'FR' ? "Sélectionner un livre" : "Select Study PDF / Book"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {bookUploadError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl max-w-md mx-auto flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{bookUploadError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Active Dashboard book companion view
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300" id="active_book_companion_workspace">

          {/* Book Workspace side bar */}
          <div className="lg:col-span-3 space-y-4 bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-indigo-100 shadow-md">
            <div className="flex justify-between items-center border-b border-indigo-50 pb-3">
              <span className="text-xs text-indigo-950 uppercase tracking-widest font-mono font-black">
                {language === 'FR' ? "Mes Livres" : "Prepped Books"}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 font-mono text-[9px] font-black">
                {books.length} Active
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {books.map(b => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBookId(b.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                    selectedBookId === b.id
                      ? 'bg-gradient-to-r from-teal-50/70 via-emerald-50/55 to-indigo-50/30 border-emerald-400 shadow-xs'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-black text-slate-800 line-clamp-2 leading-snug">{b.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBook(b.id); }}
                      className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-mono font-bold">
                    <span>{b.pageCount} pages</span>
                    <span>•</span>
                    <span>{b.chunkCount} zones</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add document inside the side panel */}
            <div className="border-t border-indigo-50 pt-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/30'
                    : 'border-indigo-100/60 bg-slate-50 hover:bg-slate-100/50'
                } cursor-pointer relative`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.txt"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-1">
                  {bookUploading ? (
                    <Loader2 className="w-5 h-5 text-emerald-500 mx-auto animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5 text-emerald-500 mx-auto" />
                  )}
                  <span className="text-[11px] font-black text-slate-700 block mt-1">
                    {bookUploading ? (language === 'FR' ? "Lave/Indexe..." : "Uploading...") : (language === 'FR' ? "Ajouter un livre" : "+ Add another book")}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-bold">PDF/TXT &lt; 150MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Bento Workspace: MCQ Grounding Workspace VS QA coach rendered as tabs */}
          <div className="lg:col-span-9 flex flex-col space-y-4" id="active_book_companion_workspace_content">

            {/* Tab Selector bar */}
            <div className="flex border border-indigo-100 bg-slate-50/80 p-1 rounded-2xl gap-1.5 w-full max-w-md mx-auto shadow-sm" id="book_workspace_tabs">
              <button
                onClick={() => setActiveBookTab('quiz')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeBookTab === 'quiz'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-white shadow-md'
                    : 'text-indigo-950 hover:bg-white/60'
                }`}
              >
                <Sparkles className={`w-4 h-4 shrink-0 ${activeBookTab === 'quiz' ? 'text-amber-300 fill-amber-300' : 'text-indigo-600'}`} />
                <span>{language === 'FR' ? "Générateur MCQ" : "Grounded MCQ Quiz"}</span>
              </button>
              <button
                onClick={() => setActiveBookTab('extracted')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeBookTab === 'extracted'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-white shadow-md'
                    : 'text-indigo-950 hover:bg-white/60'
                }`}
              >
                <ListChecks className={`w-4 h-4 shrink-0 ${activeBookTab === 'extracted' ? 'text-white' : 'text-indigo-600'}`} />
                <span>{language === 'FR' ? "Questions Extraites" : "Extracted Questions"}</span>
              </button>
            </div>

            {/* Tab Content 1: MCQ Grounded Question Generator */}
            {activeBookTab === 'quiz' && (
              <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] border border-indigo-100 shadow-md flex flex-col space-y-4 min-h-[500px] w-full animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 border-b border-indigo-50 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold font-mono">🎯</div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-indigo-950">
                      {language === 'FR' ? "Questions MCQ Fondées" : "Grounded PDF MCQs"}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {language === 'FR' ? "Générez des cas d'examen liés à vos pages" : "Generate scenarios grounded in uploaded guide pages"}
                    </p>
                  </div>
                </div>

                {/* Inputs & actions */}
                <div className="space-y-3 text-left max-w-xl">
                  <div>
                    <label className="text-[10px] uppercase font-mono font-black text-indigo-400 block mb-1">
                      {language === 'FR' ? "Mot-Clé ou Chapitre (Optionnel)" : "Target Subject / Topic (Optional)"}
                    </label>
                    <input
                      type="text"
                      value={bookKeyword}
                      onChange={(e) => setBookKeyword(e.target.value)}
                      placeholder={language === 'FR' ? "ex: Chemin critique, Risques, SPI..." : "e.g., Critical Path, Earned Value, Risks..."}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-indigo-950 outline-hidden focus:ring-2 focus:ring-emerald-400 focus:bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono font-black text-indigo-400 block mb-1">
                      {language === 'FR' ? "Focus de la Question" : "Question Focus Mode"}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setBookQuestionType('situational')}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          bookQuestionType === 'situational'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xxs'
                            : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        💼 {language === 'FR' ? "Situation PMP" : "Situational Scenario"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookQuestionType('definition')}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          bookQuestionType === 'definition'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xxs'
                            : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        📖 {language === 'FR' ? "Définitions PMBOK" : "PMBOK Definitions"}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={generateBookQuestion}
                    disabled={isLoadingBookQuestion || !selectedBookId}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md hover:scale-102 active:scale-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoadingBookQuestion ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>{language === 'FR' ? "Extraction PMP RAG..." : "Grounded Questioning Gen..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                        <span>{language === 'FR' ? "Générer une question d'étude" : "Generate Custom PMP Question"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Output display workspace */}
                <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 overflow-y-auto flex flex-col justify-start min-h-[350px]">
                  {bookQuestion ? (
                    <div className="w-full text-left">
                      <QuestionCard
                        question={bookQuestion}
                        onSubmit={(qId, option) => {
                          setBookAnsweredMap(prev => ({ ...prev, [qId]: option }));
                          setSessionCompletedCount(prev => prev + 1);
                        }}
                        isLoadingNew={false}
                        onNext={generateBookQuestion}
                        isGenerating={false}
                        language={language}
                        previouslySelectedOption={bookAnsweredMap[bookQuestion.question_id] as "A" | "B" | "C" | "D" | null | undefined}
                        isAdmin={isAdmin}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 flex flex-col items-center justify-center space-y-3 my-auto">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg">📚</div>
                      <div className="space-y-1">
                        <span className="text-xs font-black text-indigo-950 block">
                          {language === 'FR' ? "Prêt pour l'entraînement" : "Ready for custom quiz formulation"}
                        </span>
                        <span className="text-[10px] text-slate-500 max-w-sm block leading-relaxed font-bold mx-auto">
                          {language === 'FR' ? "Saisissez un terme ou laissez vide, puis cliquez sur générer pour obtenir une question de niveau d'architecte." : "Define a specific keyword directory or leave blank, then generate a situational PMP query."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Content 3: Questions Extracted Verbatim From The Document */}
            {activeBookTab === 'extracted' && !extractedExamActive && (() => {
              const selectedBook = books.find(b => b.id === selectedBookId);
              const status = selectedBook?.extractionStatus;
              const currentExtracted = extractedQuestions[extractedIndex] || null;

              return (
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] border border-indigo-100 shadow-md flex flex-col space-y-4 min-h-[500px] w-full animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-indigo-50 pb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">🔎</div>
                      <div className="text-left">
                        <h3 className="text-sm font-black text-indigo-950">
                          {language === 'FR' ? "Questions Extraites du Document" : "Questions Extracted From Your Document"}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold">
                          {language === 'FR' ? "Ce sont les questions réellement présentes dans votre document, pas des questions générées par IA" : "These are the actual questions found inside your uploaded document, not AI-generated ones"}
                        </p>
                      </div>
                    </div>
                    {extractedQuestions.length > 0 && (
                      <button
                        id="start_extracted_exam_btn"
                        onClick={startExtractedExam}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md hover:scale-102 active:scale-100 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <Clock className="w-4 h-4 text-white" />
                        <span>{language === 'FR' ? `Examen chronométré (${extractedQuestions.length}Q)` : `Start Timed Exam (${extractedQuestions.length}Q)`}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 overflow-y-auto flex flex-col justify-start min-h-[350px]">
                    {isLoadingExtractedQuestions ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center space-y-3 my-auto">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        <span className="text-xs font-black text-indigo-950">
                          {language === 'FR' ? "Chargement des questions extraites..." : "Loading extracted questions..."}
                        </span>
                      </div>
                    ) : status === 'pending' ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center space-y-3 my-auto">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                        <div className="space-y-1">
                          <span className="text-xs font-black text-indigo-950 block">
                            {language === 'FR' ? "Analyse du document en cours..." : "Scanning your document..."}
                          </span>
                          <span className="text-[10px] text-slate-500 max-w-sm block leading-relaxed font-bold mx-auto">
                            {language === 'FR' ? "Nous recherchons des questions déjà présentes dans ce livre. Cela peut prendre quelques minutes." : "We're searching this book for questions it already contains. This can take a few minutes for large documents."}
                          </span>
                        </div>
                      </div>
                    ) : status === 'skipped_offline' ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center space-y-3 my-auto">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                        <div className="space-y-1">
                          <span className="text-xs font-black text-indigo-950 block">
                            {language === 'FR' ? "Extraction indisponible" : "Extraction unavailable"}
                          </span>
                          <span className="text-[10px] text-slate-500 max-w-sm block leading-relaxed font-bold mx-auto">
                            {language === 'FR' ? "L'extraction automatique nécessite une clé IA configurée côté serveur." : "Automatic extraction requires an AI key configured on the server."}
                          </span>
                        </div>
                      </div>
                    ) : currentExtracted ? (
                      <div className="w-full text-left space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-widest">
                            {language === 'FR' ? `Question ${extractedIndex + 1} sur ${extractedQuestions.length}` : `Question ${extractedIndex + 1} of ${extractedQuestions.length}`}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setExtractedIndex(i => Math.max(0, i - 1))}
                              disabled={extractedIndex === 0}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setExtractedIndex(i => Math.min(extractedQuestions.length - 1, i + 1))}
                              disabled={extractedIndex >= extractedQuestions.length - 1}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <QuestionCard
                          question={currentExtracted}
                          onSubmit={(qId, option) => {
                            setExtractedAnsweredMap(prev => ({ ...prev, [qId]: option }));
                            setSessionCompletedCount(prev => prev + 1);
                          }}
                          isLoadingNew={false}
                          onNext={() => setExtractedIndex(i => Math.min(extractedQuestions.length - 1, i + 1))}
                          isGenerating={false}
                          language={language}
                          previouslySelectedOption={extractedAnsweredMap[currentExtracted.question_id] as "A" | "B" | "C" | "D" | null | undefined}
                          isAdmin={isAdmin}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12 flex flex-col items-center justify-center space-y-3 my-auto">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg">📄</div>
                        <div className="space-y-1">
                          <span className="text-xs font-black text-indigo-950 block">
                            {language === 'FR' ? "Aucune question trouvée" : "No questions found"}
                          </span>
                          <span className="text-[10px] text-slate-500 max-w-sm block leading-relaxed font-bold mx-auto">
                            {language === 'FR' ? "Ce document ne semble pas contenir de questions à choix multiples détectables." : "This document doesn't appear to contain any detectable multiple-choice questions."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Tab Content 3b: Timed Exam built from a book's extracted questions (live or review) */}
            {activeBookTab === 'extracted' && extractedExamActive && (() => {
              const currentExamQuestion = extractedExamQuestions[extractedExamIndex] || null;
              const minutes = Math.floor(extractedExamTimeRemaining / 60);
              const seconds = extractedExamTimeRemaining % 60;
              const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              const answeredCount = Object.keys(extractedExamAnswers).length;

              return (
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] border border-indigo-100 shadow-md flex flex-col space-y-4 min-h-[500px] w-full animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-indigo-50 pb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                        {extractedExamSubmitted ? <Award className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-black text-indigo-950">
                          {extractedExamSubmitted
                            ? (language === 'FR' ? "Résultats de l'examen" : "Exam Results")
                            : (language === 'FR' ? "Examen Chronométré" : "Timed Exam")}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold">
                          {extractedExamSubmitted
                            ? (language === 'FR' ? "Révisez chaque question avec la correction complète" : "Review each question with full correctness revealed")
                            : (language === 'FR' ? `${answeredCount} / ${extractedExamQuestions.length} répondues` : `${answeredCount} / ${extractedExamQuestions.length} answered`)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!extractedExamSubmitted && (
                        <span className="text-sm font-mono font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl" id="extracted_exam_timer">
                          {timeLabel}
                        </span>
                      )}
                      {extractedExamSubmitted && extractedExamScore !== null && (
                        <span className={`text-sm font-mono font-black px-3 py-1.5 rounded-xl border ${extractedExamScore >= 70 ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-800 bg-rose-50 border-rose-200'}`} id="extracted_exam_score">
                          {extractedExamScore}%
                        </span>
                      )}
                      {!extractedExamSubmitted ? (
                        <button
                          id="submit_extracted_exam_btn"
                          onClick={submitExtractedExam}
                          className="bg-gradient-to-r from-rose-600 to-orange-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md hover:scale-102 active:scale-100 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5 text-white" />
                          <span>{language === 'FR' ? "Terminer" : "Submit Exam"}</span>
                        </button>
                      ) : (
                        <button
                          id="exit_extracted_exam_btn"
                          onClick={exitExtractedExam}
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
                            {language === 'FR' ? `Question ${extractedExamIndex + 1} sur ${extractedExamQuestions.length}` : `Question ${extractedExamIndex + 1} of ${extractedExamQuestions.length}`}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setExtractedExamIndex(i => Math.max(0, i - 1))}
                              disabled={extractedExamIndex === 0}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setExtractedExamIndex(i => Math.min(extractedExamQuestions.length - 1, i + 1))}
                              disabled={extractedExamIndex >= extractedExamQuestions.length - 1}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <QuestionCard
                          question={currentExamQuestion}
                          onSubmit={(qId, option) => {
                            setExtractedExamAnswers(prev => ({ ...prev, [qId]: option }));
                          }}
                          isLoadingNew={false}
                          onNext={() => setExtractedExamIndex(i => Math.min(extractedExamQuestions.length - 1, i + 1))}
                          isGenerating={false}
                          language={language}
                          previouslySelectedOption={extractedExamAnswers[currentExamQuestion.question_id] as "A" | "B" | "C" | "D" | null | undefined}
                          isAdmin={isAdmin}
                          lockFeedback={!extractedExamSubmitted}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
