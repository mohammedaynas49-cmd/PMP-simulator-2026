import React from 'react';
import { PMPDomain, PMPQuestion, MasteryMatrix } from '../types';
import QuestionCard from './QuestionCard';
import { RefreshCw, Sparkles, Play, Clock, Target, Award } from 'lucide-react';

const QUESTION_COUNT_PRESETS = [5, 10, 20, 50];

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface DomainPracticeTexts {
  sandboxTitle: string;
  compliantSec: string;
  forceRegene: string;
}

interface DomainPracticeViewProps {
  language: 'EN' | 'FR';
  texts: DomainPracticeTexts;
  isAdmin: boolean;

  selectedDomains: PMPDomain[];
  handleClosePractice: () => void;

  prefQuestionType: 'situational' | 'definition' | 'case_study';
  setPrefQuestionType: (v: 'situational' | 'definition' | 'case_study') => void;
  prefGenerationSource: 'docs' | 'ai' | 'combine';
  setPrefGenerationSource: (v: 'docs' | 'ai' | 'combine') => void;
  prefDomain: 'People' | 'Process' | 'Business Environment' | 'Any';
  setPrefDomain: (v: 'People' | 'Process' | 'Business Environment' | 'Any') => void;
  prefMethodology: 'Predictive' | 'Adaptive/Agile' | 'Hybrid' | 'Any';
  setPrefMethodology: (v: 'Predictive' | 'Adaptive/Agile' | 'Hybrid' | 'Any') => void;
  prefSubject: string;
  setPrefSubject: (v: string) => void;
  prefPhase: 'Initiating' | 'Planning' | 'Executing' | 'Monitoring and Controlling' | 'Closing' | 'Any';
  setPrefPhase: (v: 'Initiating' | 'Planning' | 'Executing' | 'Monitoring and Controlling' | 'Closing' | 'Any') => void;

  fetchNewQuestion: (
    overrideDomains?: PMPDomain[],
    customSub?: string,
    customPh?: string,
    customMeth?: string
  ) => void;
  handleLaunchDomainPractice: (
    overrideDomains?: PMPDomain[],
    customSub?: string,
    customPh?: string,
    customMeth?: string
  ) => void;
  isLoadingNew: boolean;
  isGenerating: boolean;
  currentQuestion: PMPQuestion | null;
  handleAnswerSubmit: (qId: string, selectedOption: 'A' | 'B' | 'C' | 'D') => void;
  answeredMap: { [qId: string]: string };
  mastery: MasteryMatrix;

  // Fixed question-count target (null = unlimited) + elapsed-time awareness for the current
  // Domain Practice session (see AskUserQuestion: target count shows a summary once reached,
  // elapsed time is a plain running stopwatch with no imposed limit).
  domainTargetCount: number | null;
  setDomainTargetCount: (v: number | null) => void;
  domainSessionAnswered: number;
  domainSessionCorrect: number;
  domainSessionElapsedSeconds: number;
  domainSessionComplete: boolean;
  onContinuePastTarget: () => void;
  // True once the server has confirmed there is no real case study left to serve (see
  // caseStudyPoolExhausted in Dashboard.tsx) - the completion screen offers "exit this mode"
  // instead of "next case study" once this is set.
  caseStudyPoolExhausted: boolean;
  handleStartNextCaseStudy: () => void;
}

export default function DomainPracticeView({
  language,
  texts,
  isAdmin,
  selectedDomains,
  handleClosePractice,
  prefQuestionType,
  setPrefQuestionType,
  prefGenerationSource,
  setPrefGenerationSource,
  prefDomain,
  setPrefDomain,
  prefMethodology,
  setPrefMethodology,
  prefSubject,
  setPrefSubject,
  prefPhase,
  setPrefPhase,
  fetchNewQuestion,
  handleLaunchDomainPractice,
  isLoadingNew,
  isGenerating,
  currentQuestion,
  handleAnswerSubmit,
  answeredMap,
  mastery,
  domainTargetCount,
  setDomainTargetCount,
  domainSessionAnswered,
  domainSessionCorrect,
  domainSessionElapsedSeconds,
  domainSessionComplete,
  onContinuePastTarget,
  caseStudyPoolExhausted,
  handleStartNextCaseStudy
}: DomainPracticeViewProps) {
  return (
    <div className="space-y-6 flex-1 flex flex-col justify-center py-4 z-10" id="view_domain_practice">
      {selectedDomains.length === 0 ? (
        <div className="max-w-7xl mx-auto w-full py-6 space-y-8" id="domain_start_screen">
          <div className="space-y-3 text-center">
            <span className="text-[10px] font-black font-mono text-violet-600 bg-violet-100 px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 leading-none">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
              {language === 'FR' ? "PROFIL D'ENTRAÎNEMENT PERSONNALISÉ" : "CUSTOM TRAINING PREFERENCES"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-indigo-950 tracking-tight leading-tight">
              {language === 'FR' ? "Configuration du Simulateur" : "Configure Your Simulator"}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto font-medium">
              {language === 'FR'
                ? "Personnalisez votre session d'étude. Le simulateur générera des questions de mise en situation basées sur vos sélections précises."
                : "Tailor your target preparation. The simulator will draft highly detailed operational scenario questions following your exact constraints."}
            </p>
          </div>

          {/* Grid of Preferences/Filters */}
          <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 rounded-[2.5rem] p-8 md:p-10 shadow-lg space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Question Type Filter */}
              <div className="md:col-span-2 space-y-3 pb-6 border-b border-dashed border-indigo-100">
                <label className="block text-sm font-black text-indigo-950">
                  📋 {language === 'FR' ? "Focus de la Question" : "Question Focus Mode"}
                </label>
                <p className="text-xs text-slate-600 font-bold">
                  {language === 'FR'
                    ? "Basculez entre des scénarios de situation réels ou des questions de terminologies dédiées à la maîtrise des définitions du PMBOK."
                    : "Toggle between real situational project scenarios or terminological questions dedicated to mastering PMBOK definitions."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setPrefQuestionType('situational')}
                    className={`flex-1 py-4 px-5 rounded-2xl text-xs sm:text-sm font-black border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      prefQuestionType === 'situational'
                        ? 'bg-indigo-50/75 border-indigo-300 text-indigo-950 shadow-xxs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    💼 {language === 'FR' ? "Situation Réelle PMP (Scénarios)" : "PMP Situational Scenario"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrefQuestionType('definition')}
                    className={`flex-1 py-4 px-5 rounded-2xl text-xs sm:text-sm font-black border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      prefQuestionType === 'definition'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xxs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📖 {language === 'FR' ? "Définitions PMBOK (Glossaire)" : "PMBOK Glossary Definitions"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrefQuestionType('case_study')}
                    className={`flex-1 py-4 px-5 rounded-2xl text-xs sm:text-sm font-black border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      prefQuestionType === 'case_study'
                        ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xxs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📚 {language === 'FR' ? "Études de Cas (Case Studies)" : "Case Studies"}
                  </button>
                </div>
              </div>

              {/* Session Length: fix a target question count, or leave unlimited */}
              <div className="md:col-span-2 space-y-3 pb-6 border-b border-dashed border-indigo-100">
                <label className="block text-sm font-black text-indigo-950">
                  🎯 {language === 'FR' ? "Nombre de Questions" : "Number of Questions"}
                </label>
                <p className="text-xs text-slate-600 font-bold">
                  {language === 'FR'
                    ? "Fixez un nombre de questions pour cette session, ou entraînez-vous sans limite."
                    : "Fix how many questions you want to work through this session, or practice without a limit."}
                </p>
                {prefQuestionType === 'case_study' && (
                  <p className="text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    📚 {language === 'FR'
                      ? "Pour les Études de Cas, ce choix sert de repli si aucune étude de cas réelle n'est disponible - une étude de cas extraite d'un fichier fixe elle-même son nombre exact de questions."
                      : "For Case Studies, this choice is only a fallback if no real case study is available - a case study extracted from a file sets its own exact question count."}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {QUESTION_COUNT_PRESETS.map((count) => (
                    <button
                      key={count}
                      id={`domain_target_${count}_btn`}
                      type="button"
                      onClick={() => setDomainTargetCount(count)}
                      className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black border transition-all cursor-pointer ${
                        domainTargetCount === count
                          ? 'bg-violet-50 border-violet-300 text-violet-950 shadow-xxs'
                          : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                  <button
                    id="domain_target_unlimited_btn"
                    type="button"
                    onClick={() => setDomainTargetCount(null)}
                    className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black border transition-all cursor-pointer ${
                      domainTargetCount === null
                        ? 'bg-violet-50 border-violet-300 text-violet-950 shadow-xxs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'FR' ? "Illimité" : "Unlimited"}
                  </button>
                </div>
              </div>

              {/* Generation Source Filter - admin-only choice, and only meaningful outside "Case
                  Studies" focus (there's no AI-only way to draft a real case study - a shared
                  narrative + several linked questions, only ever produced by real extraction -
                  see extractCaseStudiesFromBook in server.ts). Non-admin candidates, and admins
                  in Case Studies focus, are always restricted to documents-only generation
                  (enforced again server-request-side in Dashboard.tsx's fetchNewQuestion,
                  regardless of this UI). */}
              {isAdmin && prefQuestionType !== 'case_study' ? (
                <div className="md:col-span-2 space-y-3 pb-6 border-b border-dashed border-indigo-100">
                  <label className="block text-sm font-black text-indigo-950">
                    ⚙️ {language === 'FR' ? "Source de Génération des Questions" : "Question Generation Source"}
                  </label>
                  <p className="text-xs text-slate-600 font-bold">
                    {language === 'FR'
                      ? "Sélectionnez comment l'application doit générer vos questions d'entraînement."
                      : "Choose how the application should generate your PMP practice questions."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPrefGenerationSource('docs')}
                      className={`py-4 px-5 rounded-2xl text-xs sm:text-sm font-black border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        prefGenerationSource === 'docs'
                          ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xxs'
                          : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">📚</span>
                      <span className="text-center">{language === 'FR' ? "1. Documents uniquement" : "1. Using the docs solely"}</span>
                      <span className="text-[10px] text-slate-600 font-medium">{language === 'FR' ? "Seulement vos livres/glossaire" : "Only your books/glossary"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrefGenerationSource('ai')}
                      className={`py-4 px-5 rounded-2xl text-xs sm:text-sm font-black border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        prefGenerationSource === 'ai'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xxs'
                          : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">🧠</span>
                      <span className="text-center">{language === 'FR' ? "2. IA uniquement" : "2. Using AI"}</span>
                      <span className="text-[10px] text-slate-600 font-medium">{language === 'FR' ? "Connaissances générales de l'IA" : "AI's general knowledge"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrefGenerationSource('combine')}
                      className={`py-4 px-5 rounded-2xl text-xs sm:text-sm font-black border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        prefGenerationSource === 'combine'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xxs'
                          : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">🔮</span>
                      <span className="text-center">{language === 'FR' ? "3. Combiner (Docs + IA)" : "3. Combine (Docs + AI)"}</span>
                      <span className="text-[10px] text-slate-600 font-medium">{language === 'FR' ? "Approche hybride ancrée" : "Grounded hybrid approach"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 pb-6 border-b border-dashed border-indigo-100">
                  <div className="flex items-center gap-2.5 bg-amber-50/60 border border-amber-200/60 rounded-2xl px-4 py-3">
                    <span className="text-lg">📚</span>
                    <span className="text-xs text-amber-900 font-bold">
                      {isAdmin
                        ? (language === 'FR'
                            ? "Les Études de Cas proviennent toujours de vos documents téléversés - aucune IA ne peut générer un scénario partagé avec plusieurs questions liées."
                            : "Case Studies always come from your uploaded documents - no AI can draft a shared scenario with several linked questions.")
                        : (language === 'FR'
                            ? "Vos questions sont générées uniquement à partir des documents PMP téléversés par votre administrateur."
                            : "Your questions are generated only from the PMP documents your administrator uploaded.")}
                    </span>
                  </div>
                </div>
              )}

              {/* Domain Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-black text-indigo-950">
                  📁 {language === 'FR' ? "Domaine ECO du PMI" : "Target ECO Domain"}
                </label>
                <p className="text-xs text-slate-600 font-bold">
                  {language === 'FR' ? "Choisissez un pilier de l'économie de projet PMI" : "Select an official Exam Content Outline pillar"}
                </p>
                <select
                  value={prefDomain}
                  onChange={(e: any) => setPrefDomain(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/85 text-slate-800 text-sm rounded-2xl p-4 focus:ring-2 focus:ring-violet-400 focus:outline-none transition-all font-bold cursor-pointer"
                >
                  <option value="Any">{language === 'FR' ? "Tous les domaines (Aléatoire)" : "Any Domain (Randomized)"}</option>
                  <option value="People">{language === 'FR' ? "Humain (People)" : "People (Team & Stakeholders)"}</option>
                  <option value="Process">{language === 'FR' ? "Processus (Process)" : "Process (Scope, Schedule, Cost, Risks)"}</option>
                  <option value="Business Environment">{language === 'FR' ? "Environnement d'Affaires (Business Env)" : "Business Environment (Compliance & Benefits)"}</option>
                </select>
              </div>

              {/* Methodology Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-black text-indigo-950">
                  🔄 {language === 'FR' ? "Méthodologie du projet" : "Project Methodology"}
                </label>
                <p className="text-xs text-slate-600 font-bold">
                  {language === 'FR' ? "Style de gestion et de cycle de vie" : "Development lifecycle approach"}
                </p>
                <select
                  value={prefMethodology}
                  onChange={(e: any) => setPrefMethodology(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/85 text-slate-800 text-sm rounded-2xl p-4 focus:ring-2 focus:ring-violet-400 focus:outline-none transition-all font-bold cursor-pointer"
                >
                  <option value="Any">{language === 'FR' ? "Toutes méthodologies" : "Any Methodology"}</option>
                  <option value="Predictive">{language === 'FR' ? "Prédictif / Cascade (Waterfall)" : "Predictive (Waterfall / Plan-driven)"}</option>
                  <option value="Adaptive/Agile">{language === 'FR' ? "Adaptatif / Agile / Scrum" : "Adaptive (Scrum, Kanban, Agile)"}</option>
                  <option value="Hybrid">{language === 'FR' ? "Hybride (Waterfall + Agile)" : "Hybrid (Merged framework)"}</option>
                </select>
              </div>

              {/* Subject Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-black text-indigo-950">
                  🎯 {language === 'FR' ? "Sujet / Connaissance spécifique" : "Specific Subject / Focus Area"}
                </label>
                <p className="text-xs text-slate-600 font-bold">
                  {language === 'FR' ? "Thème technique issu du PMBOK 8" : "Technical concept or chapter from PMBOK"}
                </p>
                <select
                  value={prefSubject}
                  onChange={(e) => setPrefSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/85 text-slate-800 text-sm rounded-2xl p-4 focus:ring-2 focus:ring-violet-400 focus:outline-none transition-all font-bold cursor-pointer"
                >
                  <option value="Any">{language === 'FR' ? "Tous les thèmes (PMBOK complet)" : "Any Subject (Complete Core PMBOK)"}</option>
                  <option value="Project Charter">{language === 'FR' ? "Charte de Projet & Lancement" : "Project Charter & Initiating documents"}</option>
                  <option value="Scope Management">{language === 'FR' ? "Gestion du Contenu (Scope & WBS)" : "Scope Management & WBS"}</option>
                  <option value="Schedule Management">{language === 'FR' ? "Gestion de l'Échéancier (Calendrier & Chemin Critique)" : "Schedule Management (Critical Path & Gantt)"}</option>
                  <option value="Cost Management">{language === 'FR' ? "Gestion des Coûts (Budget & Earned Value)" : "Cost Management & Earned Value (EVM)"}</option>
                  <option value="Quality Management">{language === 'FR' ? "Gestion de la Qualité" : "Quality Management & QA/QC"}</option>
                  <option value="Resource Management">{language === 'FR' ? "Gestion des Ressources (Humaines & Matérielles)" : "Resource Management & Team Allocation"}</option>
                  <option value="Communications">{language === 'FR' ? "Gestion des Communications & Rapports" : "Communications & Stakeholder updates"}</option>
                  <option value="Risk Management">{language === 'FR' ? "Gestion des Risques (Identification & Réponses)" : "Risk Management (Analysis & Reserves)"}</option>
                  <option value="Procurement">{language === 'FR' ? "Gestion des Approvisionnements & Sourcing" : "Procurement, Sourcing & Contracts"}</option>
                  <option value="Stakeholder Management">{language === 'FR' ? "Engagement des Parties Prenantes" : "Stakeholder Engagement & Conflict resolution"}</option>
                  <option value="Tools and Techniques">{language === 'FR' ? "Outils et d'Analyse (PMBOK 8)" : "Tools and Techniques (PMBOK 8)"}</option>
                </select>
              </div>

              {/* Phase Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-black text-indigo-950">
                  ⏳ {language === 'FR' ? "Phase du Projet / Groupe de processus" : "Project Phase / Process Group"}
                </label>
                <p className="text-xs text-slate-600 font-bold">
                  {language === 'FR' ? "Étape chronologique de mise en situation" : "Chronological placement of the corporate scenario"}
                </p>
                <select
                  value={prefPhase}
                  onChange={(e: any) => setPrefPhase(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/85 text-slate-800 text-sm rounded-2xl p-4 focus:ring-2 focus:ring-violet-400 focus:outline-none transition-all font-bold cursor-pointer"
                >
                  <option value="Any">{language === 'FR' ? "Toutes les phases (Sans contrainte)" : "Any Phase (No Placement)"}</option>
                  <option value="Initiating">{language === 'FR' ? "Lancement (Initiating)" : "Initiating (Lancement)"}</option>
                  <option value="Planning">{language === 'FR' ? "Planification (Planning)" : "Planning (Planification)"}</option>
                  <option value="Executing">{language === 'FR' ? "Exécution (Executing)" : "Executing (Exécution)"}</option>
                  <option value="Monitoring and Controlling">{language === 'FR' ? "Surveillance et Maîtrise (Monitoring & Controlling)" : "Monitoring and Controlling"}</option>
                  <option value="Closing">{language === 'FR' ? "Clôture (Closing)" : "Closing (Clôture)"}</option>
                </select>
              </div>

            </div>

            {/* Submission and trigger block */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-left">
                <span className="text-[10px] font-mono text-indigo-600 block font-bold leading-none uppercase">
                  {language === 'FR' ? "Statut du générateur" : "Generator status"}
                </span>
                <span className="text-xs text-slate-600 font-medium inline-flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {language === 'FR' ? "Moteur de simulation PMP 2026 connecté" : "Connected to the PMP 2026 Simulation Engine"}
                </span>
              </div>

              <button
                onClick={() => {
                  const activeDomains: PMPDomain[] = prefDomain === 'Any' ? ['People', 'Process', 'Business Environment'] : [prefDomain];
                  handleLaunchDomainPractice(activeDomains, prefSubject, prefPhase, prefMethodology);
                }}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-black text-sm rounded-2xl transition-all cursor-pointer shadow-md duration-300 flex items-center justify-center gap-2"
                id="launch_domain_practice_btn"
              >
                <span>{language === 'FR' ? "Lancer la Simulation Personnalisée 🚀" : "Start Targeted Training 🚀"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Upper Stage Brand Label */}
          <div className="max-w-7xl mx-auto w-full flex flex-wrap justify-between items-center gap-4 bg-white/90 backdrop-blur-md p-5 border border-indigo-50 rounded-3xl shadow-md">
            <div>
              <span className="text-[10px] font-black font-mono text-violet-600 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
                {texts.sandboxTitle}
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <h2 className="text-xs sm:text-sm font-black text-slate-800 leading-none">{texts.compliantSec}</h2>
                <button
                  onClick={handleClosePractice}
                  className="text-[10px] font-black font-mono cursor-pointer text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3 py-1 rounded-xl transition-all border border-rose-100 shadow-xxs"
                  title={language === 'FR' ? "Quitter et effacer la session d'entraînement" : "Quit and clear targeted simulation session"}
                >
                  {language === 'FR' ? "❌ Quitter la session" : "❌ Quit Practice"}
                </button>
              </div>
            </div>

            {/* Session progress: elapsed time (plain stopwatch, no limit) + answered/target count */}
            <div className="flex items-center gap-3" id="domain_session_progress">
              <span className="flex items-center gap-1.5 text-xs font-mono font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl" id="domain_session_timer">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {formatElapsed(domainSessionElapsedSeconds)}
              </span>
              {domainTargetCount !== null && (
                <span className="flex items-center gap-1.5 text-xs font-mono font-black text-violet-950 bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-xl" id="domain_session_count">
                  <Target className="w-3.5 h-3.5 text-violet-500" />
                  {domainSessionAnswered} / {domainTargetCount}
                </span>
              )}
            </div>

            <button
              id="regenerated_question_btn"
              onClick={() => fetchNewQuestion()}
              disabled={isLoadingNew}
              className="flex items-center gap-2 text-xs font-black font-mono bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 hover:opacity-90 active:scale-95 text-white px-5 py-3 rounded-2xl border border-transparent transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNew ? 'animate-spin' : ''} text-white`} />
              <span>{texts.forceRegene}</span>
            </button>
          </div>

          {/* ECO Domain Dashboard Performance & Improvement Board */}
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4" id="domain_metrics_board">
            {(['People', 'Process', 'Business Environment'] as const).map((domain) => {
              const stats = mastery[domain] || { answered: 0, correct: 0 };
              const ratio = stats.answered > 0 ? (stats.correct / stats.answered) * 100 : 0;

              // Color configuration representing student progress and improvement
              let cardStyle = "bg-gradient-to-br from-slate-50/50 via-white to-slate-100/30 border-slate-200 text-slate-800";
              let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200 font-bold";
              let progressColor = "bg-slate-300";
              let levelText = language === 'FR' ? "Non initié" : "Not Started";

              if (stats.answered > 0) {
                if (ratio >= 75) {
                  cardStyle = "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white/90 border-emerald-300 text-emerald-950 shadow-sm hover:shadow-emerald-100";
                  badgeStyle = "bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold px-2.5 py-1 rounded-xl border-transparent";
                  progressColor = "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm";
                  levelText = language === 'FR' ? "Cible Atteinte 👑" : "Above Target 👑";
                } else if (ratio >= 50) {
                  cardStyle = "bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-white/90 border-amber-300 text-amber-950 shadow-sm hover:shadow-amber-100";
                  badgeStyle = "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-2.5 py-1 rounded-xl border-transparent";
                  progressColor = "bg-gradient-to-r from-amber-400 to-orange-500";
                  levelText = language === 'FR' ? "En Progression 📈" : "Developing 📈";
                } else {
                  cardStyle = "bg-gradient-to-br from-rose-500/10 via-pink-400/5 to-white/90 border-pink-300 text-rose-950 shadow-sm hover:shadow-rose-100";
                  badgeStyle = "bg-gradient-to-r from-rose-600 to-pink-500 text-white font-extrabold px-2.5 py-1 rounded-xl border-transparent";
                  progressColor = "bg-gradient-to-r from-rose-500 to-pink-500";
                  levelText = language === 'FR' ? "À Travailler 🎯" : "Needs Work 🎯";
                }
              }

              // Format domain labels
              const label = language === 'FR'
                ? (domain === 'People' ? 'Humain (People)' : domain === 'Process' ? 'Processus (Process)' : "Env. d'Affaires")
                : domain;

              return (
                <div key={domain} className={`p-5 rounded-3xl border flex flex-col justify-between shadow-xs transition-colors duration-300 hover:scale-[1.02] ${cardStyle}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black font-mono text-slate-600 tracking-wider uppercase block">{language === 'FR' ? "DOMAINE ECO" : "ECO DOMAIN"}</span>
                      <h4 className="text-sm font-black truncate mt-1 leading-tight text-indigo-950">{label}</h4>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wide px-2 py-1 border rounded-lg leading-none shrink-0 ${badgeStyle}`}>
                      {levelText}
                    </span>
                  </div>

                  <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                      <span className="text-slate-600 font-extrabold">
                        {stats.correct}/{stats.answered} {language === 'FR' ? "Réponses" : "Answers"}
                      </span>
                      <span className="text-slate-700 font-black">{ratio.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${progressColor}`}
                        style={{ width: `${stats.answered > 0 ? ratio : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulated Question stage */}
          <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col items-stretch justify-start mt-4">
            {domainSessionComplete ? (
              <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-10 border border-emerald-100 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto w-full shadow-lg py-12" id="domain_session_summary">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-inner">
                  <Award className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-indigo-950 text-lg leading-none">
                    {prefQuestionType === 'case_study'
                      ? (language === 'FR' ? "Étude de Cas Terminée 🎉" : "Case Study Complete 🎉")
                      : (language === 'FR' ? "Session Terminée 🎉" : "Session Complete 🎉")}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                    {prefQuestionType === 'case_study' && caseStudyPoolExhausted
                      ? (language === 'FR'
                          ? "Vous avez terminé toutes les études de cas disponibles pour le moment."
                          : "You've completed all the case studies currently available.")
                      : (language === 'FR'
                          ? `Vous avez répondu à ${domainSessionAnswered} question(s) en ${formatElapsed(domainSessionElapsedSeconds)}.`
                          : `You answered ${domainSessionAnswered} question(s) in ${formatElapsed(domainSessionElapsedSeconds)}.`)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="text-2xl font-black font-mono text-indigo-950">
                      {domainSessionAnswered > 0 ? Math.round((domainSessionCorrect / domainSessionAnswered) * 100) : 0}%
                    </div>
                    <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">
                      {language === 'FR' ? "Score de la session" : "Session Score"}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="text-2xl font-black font-mono text-indigo-950">{formatElapsed(domainSessionElapsedSeconds)}</div>
                    <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">
                      {language === 'FR' ? "Temps utilisé" : "Time Used"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  {prefQuestionType === 'case_study' ? (
                    <>
                      {!caseStudyPoolExhausted && (
                        <button
                          id="domain_session_next_case_study_btn"
                          onClick={handleStartNextCaseStudy}
                          disabled={isLoadingNew}
                          className="flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 transition-all cursor-pointer disabled:opacity-60"
                        >
                          {language === 'FR' ? "Étude de Cas Suivante" : "Next Case Study"}
                        </button>
                      )}
                      <button
                        id="domain_session_new_btn"
                        onClick={handleClosePractice}
                        className="flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-all cursor-pointer"
                      >
                        {language === 'FR' ? "Quitter ce Mode" : "Exit This Mode"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id="domain_session_continue_btn"
                        onClick={onContinuePastTarget}
                        className="flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 transition-all cursor-pointer"
                      >
                        {language === 'FR' ? "Continuer au-delà de l'objectif" : "Continue Past Target"}
                      </button>
                      <button
                        id="domain_session_new_btn"
                        onClick={handleClosePractice}
                        className="flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-all cursor-pointer"
                      >
                        {language === 'FR' ? "Nouvelle Session" : "New Session"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : currentQuestion ? (
              <QuestionCard
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                isLoadingNew={isLoadingNew}
                onNext={() => fetchNewQuestion()}
                isGenerating={isGenerating}
                language={language}
                previouslySelectedOption={answeredMap[currentQuestion.question_id] as "A" | "B" | "C" | "D" | null | undefined}
                isAdmin={isAdmin}
                autoRevealBasis={false}
              />
            ) : isLoadingNew ? (
              <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-10 border border-indigo-100 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto w-full animate-pulse shadow-lg py-12">
                <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center shadow-inner">
                  <Sparkles className="w-8 h-8 text-violet-600 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-indigo-950 text-lg leading-none">
                    {language === 'FR' ? "Génération du scénario en cours..." : "Drafting Custom Scenario..."}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                    {language === 'FR'
                      ? "Le simulateur analyse vos préférences et rédige une simulation de cas réel PMBOK 8."
                      : "Aligning process parameters and formatting complex real-world situational dilemmas."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-10 border border-indigo-100 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto w-full shadow-lg py-12" id="domain_practice_ready_to_launch">
                <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center shadow-inner">
                  <Play className="w-8 h-8 text-violet-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-indigo-950 text-lg leading-none">
                    {language === 'FR' ? "Prêt à commencer" : "Ready to start"}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                    {language === 'FR'
                      ? "Vos domaines sont sélectionnés. Lancez la génération quand vous êtes prêt, ou quittez pour revenir aux préférences."
                      : "Your domains are selected. Launch generation when you're ready, or quit to go back to preferences."}
                  </p>
                </div>
                <button
                  id="launch_staged_domain_practice_btn"
                  onClick={() => handleLaunchDomainPractice()}
                  className="px-8 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-black text-sm rounded-2xl transition-all cursor-pointer shadow-md duration-300 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{language === 'FR' ? "Lancer l'entraînement" : "Launch Training"}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
