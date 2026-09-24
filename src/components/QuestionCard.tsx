import React, { useState } from 'react';
import { PMPQuestion } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Sparkles, 
  Award, 
  Tag, 
  Settings, 
  ChevronRight,
  BookOpen,
  FileText,
  Layers
} from 'lucide-react';

interface QuestionCardProps {
  question: PMPQuestion;
  onSubmit: (questionId: string, selectedOption: 'A' | 'B' | 'C' | 'D') => void;
  isLoadingNew: boolean;
  onNext: () => void;
  isGenerating: boolean;
  language?: 'EN' | 'FR';
  previouslySelectedOption?: 'A' | 'B' | 'C' | 'D' | null;
  isAdmin?: boolean;
  /** When true (live mock exam, not yet finished), correctness and the AI Coach explanation
   * stay hidden after submission - matching real exam-day conditions where no per-question
   * feedback is given until the attempt is over. */
  lockFeedback?: boolean;
  /** When false, submitting an answer does NOT automatically open the coaching/explanation tray -
   * it only opens when the candidate explicitly clicks "See Basis". Defaults to true (the tray
   * opens right after submitting, as in exam review and book practice) everywhere except Domain
   * Practice, where candidates asked to see the correct-answer/option coloring immediately but
   * only read the basis on demand. */
  autoRevealBasis?: boolean;
}

const t = {
  EN: {
    analyst: "SCENARIO TASK ANALYST",
    doublePass: "Quality review in progress...",
    submitBtn: "Submit Answer",
    constructing: "Constructing Realism...",
    nextBtn: "Next PMP Question",
    coachTitle: "Compliance Coach",
    alignment: "ALIGNMENT",
    excellent: "EXCELLENT",
    improvement: "IMPROVEMENT TARGET",
    auditedStandard: "Audited Standard",
    successTitle: "Rigorous Decision Aligned!",
    successDesc: "Excellent work. Your choice reflects stewardship, servant leadership, and agile responsiveness, bypassing the common pitfalls of direct escalations and contract rigidity.",
    failTitle: "Stewardship Stance Discrepancy",
    failDesc1: "You selected ",
    failDesc2: ". In the actual PMP test environment, this choice fails your compliance parameters by favoring procedural workarounds, premature escalations, or bypassing team problem-solving boundaries.",
    coachingTitle: "Logical Fallacy Mapping & Core Reason",
    showBasisBtn: "See Basis",
    hideBasisBtn: "Hide Basis",
    studyGuideTitle: "Study Guide Basis (Practice Mode)",
    studyGuideDesc: "This matrix alignment and coach logic is active to support your real-time learning. Highlighting correct option details pre-submission.",
    correctLabel: "Correct Decision Path",
    answerRecordedTitle: "Answer Recorded",
    answerRecordedDesc: "Correctness and the coach's explanation are hidden during the timed mock exam, exactly like the real PMP exam. Review your full results and every explanation once you finish or review the attempt."
  },
  FR: {
    analyst: "ANALYSTE DE SCÉNARIO PMP",
    doublePass: "Vérification qualité en cours...",
    submitBtn: "Valider la réponse",
    constructing: "Création réaliste...",
    nextBtn: "Question PMP suivante",
    coachTitle: "Coach de conformité",
    alignment: "ALIGNEMENT",
    excellent: "EXCELLENT",
    improvement: "CIBLE D'AMÉLIORATION",
    auditedStandard: "Standard Audité",
    successTitle: "Décision Rigoureuse Alignée !",
    successDesc: "Excellent travail. Votre choix reflète la gérance (stewardship), le leadership serviteur et la réactivité agile, en évitant les pièges des escalades prématurées et de la rigidité contractuelle.",
    failTitle: "Écart de Posture de Gérance (Stewardship)",
    failDesc1: "Vous avez sélectionné ",
    failDesc2: ". Dans l'environnement réel de l'examen PMP, ce choix échoue en favorisant des contournements individuels, des escalades prématurées ou en contournant les capacités de résolution de l'équipe.",
    coachingTitle: "Analyse de l'Erreur Logique & Cause Fondamentale",
    showBasisBtn: "Voir le fondement",
    hideBasisBtn: "Masquer le fondement",
    studyGuideTitle: "Fiche d'étude : Fondement PMP",
    studyGuideDesc: "Cette matrice d'alignement et la logique de coaching sont affichées pour guider votre apprentissage en temps réel en révélant la bonne réponse.",
    correctLabel: "Posture Décisionnelle Correcte",
    answerRecordedTitle: "Réponse Enregistrée",
    answerRecordedDesc: "La correction et l'explication du coach restent masquées pendant l'examen blanc chronométré, exactement comme lors de l'examen PMP réel. Vous retrouverez tous les résultats et toutes les explications à la fin ou lors de la révision de votre tentative."
  }
};

export default function QuestionCard({
  question,
  onSubmit,
  isLoadingNew,
  onNext,
  isGenerating,
  language = 'EN',
  previouslySelectedOption = null,
  isAdmin = false,
  lockFeedback = false,
  autoRevealBasis = true
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showBasis, setShowBasis] = useState<boolean>(false);

  const texts = t[language];

  const isDefinition = question.question_focus_type === 'definition';

  const analystLabel = isDefinition
    ? (language === 'FR' ? "ANALYSTE DE TERMINOLOGIE PMBOK" : "PMBOK GLOSSARY ANALYST")
    : texts.analyst;

  const successTitle = isDefinition 
    ? (language === 'FR' ? "Terminologie Validée !" : "Terminology Match Confirmed!")
    : texts.successTitle;

  const successDesc = isDefinition
    ? (language === 'FR' 
        ? "Excellent travail ! Votre sélection correspond exactement à la définition du glossaire et aux concepts clés du Guide PMBOK ou du Guide Pratique Agile." 
        : "Great job! Your selection matches the precise glossary definition and core concept defined in the PMBOK Guide or Agile Practice Guide.")
    : texts.successDesc;

  const failTitle = isDefinition
    ? (language === 'FR' ? "Écart d'alignement du glossaire" : "Glossary Alignment Mismatch")
    : texts.failTitle;

  const failDesc2 = isDefinition
    ? (language === 'FR'
        ? ". Dans le Guide PMBOK et le Guide Pratique Agile, cette définition correspond à un autre terme, livrable ou technique de gestion de projet. Examinez la référence pour bien maîtriser la terminologie."
        : ". In the PMBOK Guide and Agile Practice Guide, this definition represents a different project management term, output, or technique. Review the glossary reference to master the terminology.")
    : texts.failDesc2;

  // Reset internal states on question load
  React.useEffect(() => {
    if (previouslySelectedOption) {
      setSelectedOption(previouslySelectedOption);
      setIsSubmitted(true);
    } else {
      setSelectedOption(null);
      setIsSubmitted(false);
    }
    setShowBasis(false);
  }, [question.question_id, previouslySelectedOption]);

  const handleOptionSelect = (optionChar: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return; // Disallow changes after submission
    setSelectedOption(optionChar);
  };

  const handleAnswerSubmit = () => {
    if (!selectedOption || isSubmitted) return;
    setIsSubmitted(true);
    onSubmit(question.question_id, selectedOption);
  };

  // Helper to extract choice text without letter prefixes safely
  const getCleanLabel = (option: string) => {
    return option.replace(/^[A-D]\.\s*/, '');
  };

  const optionMapping: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  const getOptionLetter = (index: number) => {
    return optionMapping[index];
  };

  return (
    <div className="w-full max-w-none mx-auto space-y-6" id={`q_card_${question.question_id}`}>
      {/* Situational Scenario Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-indigo-100 shadow-md overflow-hidden z-10">
        {/* Header Tags & Metadata */}
        <div className="bg-gradient-to-r from-indigo-50/80 via-white/80 to-violet-50/80 p-5 border-b border-indigo-100/50 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-xs font-black px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full font-mono shadow-sm animate-pulse">
              {question.eco_domain}
            </span>
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-805 border border-amber-200 rounded-full font-mono">
              {question.methodology}
            </span>
            {isAdmin && question.grounded_book_name && (
              <span className="text-[11px] font-black px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1.5 font-sans shadow-xxs">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{language === 'FR' ? 'Source d\'étude : ' : 'Study Source: '}<strong className="text-emerald-950 font-black">{question.grounded_book_name}</strong></span>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {question.tags.map(tag => (
              <span key={tag} className="text-[10px] font-black text-pink-600 border border-pink-100 bg-pink-50/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-xxs">
                <Tag className="w-2.5 h-2.5 text-pink-400" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Overarching Case Study Narrative Banner (if present) */}
        {question.case_study_title && (
          <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-orange-50/40 border-b border-amber-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider font-mono">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{question.case_study_title}</span>
              </div>
              {question.series_label && (
                <span className="text-[10px] bg-amber-200/80 text-amber-950 font-black px-3 py-0.5 rounded-full border border-amber-300 font-mono">
                  {question.series_label}
                </span>
              )}
            </div>
            {question.case_study_scenario && (
              <div className="mt-2 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed bg-white/80 p-4 rounded-2xl border border-amber-200/70 shadow-xs">
                {question.case_study_scenario}
              </div>
            )}
          </div>
        )}

        {/* Situational Scenario Text */}
        <div className="p-7 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-3 min-w-0 flex-1">
              <span className="text-violet-500 text-[10px] font-black font-mono tracking-widest block uppercase">{analystLabel}</span>
              <p className="text-indigo-950 text-[15.5px] sm:text-[16px] leading-relaxed font-black antialiased">
                {question.scenario}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Clickable Options Panel */}
      <div className="space-y-3" id="options_panel">
        {question.options.map((optionText, idx) => {
          const char = getOptionLetter(idx);
          const isSelected = selectedOption === char;
          const isCorrect = question.correct_option === char;
          // Real exam conditions: once submitted, correctness stays hidden until the attempt
          // is finished (lockFeedback). Only the candidate's own pick remains visible.
          const revealCorrectness = isSubmitted && !lockFeedback;

          // Define modern background states for response feedback
          let optionStyles = "bg-white border-indigo-100 text-slate-800 hover:border-violet-350 hover:bg-violet-50/30";
          if (isSelected && !isSubmitted) {
            optionStyles = "bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-500 text-violet-950 ring-1 ring-violet-500/10 font-black shadow-md";
          } else if (isSubmitted && revealCorrectness) {
            if (isCorrect) {
              optionStyles = "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white/95 border-2 border-emerald-500 text-teal-950 shadow-sm font-bold";
            } else if (isSelected && !isCorrect) {
              optionStyles = "bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-white/95 border-2 border-rose-500 text-rose-950 shadow-sm font-bold";
            } else {
              optionStyles = "bg-slate-50/50 border-slate-150 text-slate-400 opacity-60";
            }
          } else if (isSubmitted && lockFeedback) {
            // Locked exam mode: keep the candidate's own selection visible, neutrally styled.
            optionStyles = isSelected
              ? "bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-400 text-violet-950 font-black shadow-sm"
              : "bg-slate-50/50 border-slate-150 text-slate-400 opacity-60";
          }

          return (
            <button
              key={idx}
              id={`option_${char}_btn`}
              disabled={isSubmitted}
              onClick={() => handleOptionSelect(char)}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 flex gap-4 items-center cursor-pointer shadow-xs ${optionStyles}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 font-mono transition-all duration-300 ${
                isSelected && !isSubmitted
                  ? "bg-gradient-to-tr from-violet-500 to-indigo-600 text-white shadow-md animate-bounce"
                  : revealCorrectness && isCorrect
                  ? "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md"
                  : revealCorrectness && isSelected && !isCorrect
                  ? "bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-md"
                  : isSubmitted && lockFeedback && isSelected
                  ? "bg-gradient-to-tr from-violet-500 to-indigo-600 text-white shadow-md"
                  : "bg-gradient-to-tr from-indigo-50 to-slate-100 text-indigo-950 border border-slate-200/85"
              }`}>
                {char}
              </div>
              <div className="flex-1 text-sm sm:text-[15px] leading-relaxed font-bold">
                {getCleanLabel(optionText)}
              </div>

              {/* Status Icons */}
              {revealCorrectness && isCorrect && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              {revealCorrectness && isSelected && !isCorrect && (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Actions Layer */}
      <div className="flex flex-wrap gap-4 justify-between items-center pt-2" id="q_actions">
        <div>
          {isGenerating && (
            <span className="text-violet-650 text-xs flex items-center gap-1.5 font-mono font-black animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping"></span>
              {texts.doublePass}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Peeking at the correct answer before submitting would defeat a real exam attempt,
              so this toggle is only offered outside of the locked-down live mock exam. */}
          {!lockFeedback && (
            <button
              type="button"
              id="toggle_basis_btn"
              onClick={() => setShowBasis(prev => !prev)}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 border flex items-center gap-2 cursor-pointer shadow-sm ${
                showBasis
                  ? 'bg-gradient-to-tr from-violet-500/15 to-indigo-500/15 border-violet-305 text-violet-850 hover:bg-violet-100/50'
                  : 'bg-white border-slate-200 text-slate-705 hover:border-violet-200 hover:bg-violet-55/10'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-violet-600" />
              <span>{showBasis ? texts.hideBasisBtn : texts.showBasisBtn}</span>
            </button>
          )}

          {!isSubmitted ? (
            <button
              id="submit_answer_btn"
              onClick={handleAnswerSubmit}
              disabled={!selectedOption || isGenerating}
              className={`px-7 py-3 rounded-2xl font-black text-sm transition-all duration-200 shadow-md ${
                selectedOption && !isGenerating
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 active:scale-95 text-white hover:scale-[1.01] cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-205'
              }`}
            >
              {texts.submitBtn}
            </button>
          ) : (
            <button
              id="next_question_btn"
              onClick={onNext}
              disabled={isLoadingNew}
              className="px-7 py-3 bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white hover:opacity-95 rounded-2xl font-black text-sm transition-all duration-200 flex items-center gap-1.5 hover:scale-[1.01] shadow-lg cursor-pointer"
            >
              {isLoadingNew ? texts.constructing : texts.nextBtn}
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Neutral confirmation shown instead of the coaching tray during the locked-down live exam */}
      {isSubmitted && lockFeedback && (
        <div
          className="bg-indigo-50/60 border border-indigo-100 shadow-sm rounded-[2.5rem] p-6 sm:p-7 flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-300"
          id="answer_recorded_notice"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
          <div>
            <p className="font-black text-indigo-950">{texts.answerRecordedTitle}</p>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-bold">
              {texts.answerRecordedDesc}
            </p>
          </div>
        </div>
      )}

      {/* Hidden Explanation & Coaching Tray */}
      {((autoRevealBasis && isSubmitted) || showBasis) && !lockFeedback && (
        <div
          className="bg-white/95 backdrop-blur-md border border-indigo-100 shadow-lg rounded-[2.5rem] p-6 sm:p-7 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300"
          id="coaching_tray"
        >
          {/* Tray Title */}
          <div className="flex items-center justify-between border-b border-indigo-50 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 p-0.5 flex items-center justify-center text-white shadow-md animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-black text-indigo-950 flex items-center gap-2 leading-none">
                  {texts.coachTitle}
                </h4>
                <p className="text-[10px] text-slate-450 font-mono mt-1 font-bold">
                  {isSubmitted ? (
                    `${texts.alignment}: ${question.correct_option === selectedOption ? texts.excellent : texts.improvement}`
                  ) : (
                    "SOLUTIONS COMPLIANCE FRAMEWORK"
                  )}
                </p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[9px] text-slate-400 font-mono block font-bold uppercase tracking-wider">{texts.auditedStandard}</span>
              <span className="text-xs text-violet-650 font-bold font-mono">{question.pmbok_8_reference.split('|')[0] || 'PMBOK 8th Edition'}</span>
              {isAdmin && question.grounded_book_name && (
                <span className="text-[10px] text-emerald-700 font-bold font-mono mt-0.5 flex items-center gap-1">
                  <BookOpen className="w-2.5 h-2.5 text-emerald-500" />
                  {question.grounded_book_name}
                </span>
              )}
            </div>
          </div>

          {/* Basis Study Guide alert block if NOT submitted yet */}
          {!isSubmitted && (
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 text-indigo-950 p-5 rounded-2xl flex items-start gap-3.5 text-xs sm:text-sm shadow-xs border border-indigo-100/40">
              <Sparkles className="w-5 h-5 shrink-0 text-violet-600 mt-0.5" />
              <div className="w-full">
                <p className="font-bold text-indigo-950 tracking-tight">{texts.studyGuideTitle}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">
                  {texts.studyGuideDesc}
                </p>
                {isAdmin && question.grounded_book_name && (
                  <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{language === 'FR' ? 'Ancré dans : ' : 'Grounded in: '}<strong className="text-emerald-950">{question.grounded_book_name}</strong></span>
                  </div>
                )}
                <div className="mt-4 text-xs font-bold text-violet-800 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 font-medium">{texts.correctLabel}:</span>
                  <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-mono font-black select-all tracking-wider shadow-md">
                    {question.correct_option}
                  </span>
                  <span className="text-slate-500 text-[11px] font-mono font-normal">
                    ({question.options.find(o => o.startsWith(question.correct_option)) || ''})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fallback Check / Success state banner if submitted */}
          {isSubmitted && (
            question.correct_option === selectedOption ? (
              <div className="bg-emerald-500/10 border border-emerald-250 text-emerald-950 p-5 rounded-3xl flex items-start gap-3.5 text-sm shadow-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-black text-emerald-950">{successTitle}</p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-bold">
                    {successDesc}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-250 text-rose-950 p-5 rounded-3xl flex items-start gap-3.5 text-xs sm:text-sm shadow-sm">
                <XCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <p className="font-black text-rose-950">{failTitle}</p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-bold">
                    {texts.failDesc1}<strong className="text-rose-600 font-sans tracking-tight">{selectedOption}</strong>{failDesc2}
                  </p>
                </div>
              </div>
            )
          )}

          {/* Active Explanatory Logic Coaching Panel */}
          <div className="space-y-3 pt-1">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> {texts.coachingTitle}
            </h5>
            <div className="text-indigo-950 text-[14px] leading-relaxed select-text bg-gradient-to-tr from-indigo-50/20 to-violet-50/10 border border-indigo-100/40 p-5 rounded-2xl space-y-4 shadow-xxs">
              <div className="whitespace-pre-line text-slate-705 font-bold">
                {question.explanation}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
