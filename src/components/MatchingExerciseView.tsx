import React, { useState, useEffect, useCallback } from 'react';
import { Shuffle, Loader2, AlertTriangle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface MatchingExerciseViewProps {
  language: 'EN' | 'FR';
}

interface MatchingPair {
  id: string;
  term: string;
  definition: string;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// A term-to-definition matching exercise (4-5 pairs), drawn at random from the uploaded glossary
// each time: terms stay in order, definitions are shuffled and lettered, the candidate assigns a
// letter to each term via a dropdown, then checks all answers at once - a different exercise
// format from the single-question practice/exam modes, but still available to every candidate.
export default function MatchingExerciseView({ language }: MatchingExerciseViewProps) {
  const [pairs, setPairs] = useState<MatchingPair[]>([]);
  const [shuffledDefinitions, setShuffledDefinitions] = useState<MatchingPair[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // termId -> definitionId
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const loadExercise = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setChecked(false);
    setAssignments({});
    try {
      const res = await authFetch(`/api/matching-exercise?language=${language}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.pairs) && data.pairs.length > 0) {
        setPairs(data.pairs);
        const shuffled = [...data.pairs];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setShuffledDefinitions(shuffled);
      } else {
        setError(data.error || (language === 'FR' ? "Impossible de charger l'exercice." : "Could not load the exercise."));
        setPairs([]);
      }
    } catch (err: any) {
      setError(err.message || (language === 'FR' ? "Impossible de charger l'exercice." : "Could not load the exercise."));
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  useEffect(() => {
    loadExercise();
  }, [loadExercise]);

  const handleAssign = (termId: string, definitionId: string) => {
    if (checked) return;
    setAssignments(prev => ({ ...prev, [termId]: definitionId }));
  };

  const allAssigned = pairs.length > 0 && pairs.every(p => assignments[p.id]);
  const correctCount = pairs.filter(p => assignments[p.id] === p.id).length;

  const letterFor = (definitionId: string) => {
    const idx = shuffledDefinitions.findIndex(d => d.id === definitionId);
    return idx >= 0 ? LETTERS[idx] : '?';
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col h-full" id="view_matching_exercise">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 p-6 rounded-3xl flex flex-wrap justify-between items-center gap-4 shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-inner">
            <Shuffle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">
              {language === 'FR' ? "Association Termes & Définitions" : "Terminology Matching"}
            </h2>
            <p className="text-xs text-indigo-50 mt-0.5 font-bold">
              {language === 'FR' ? "Associez chaque terme à sa définition" : "Match each term to its correct definition"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-5">
        <div className="bg-white/95 backdrop-blur-md rounded-[2rem] border border-indigo-100 shadow-md p-6 min-h-[350px] flex flex-col" id="matching_exercise_body">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-xs font-black text-indigo-950">
                {language === 'FR' ? "Préparation de l'exercice..." : "Preparing exercise..."}
              </span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
              <span className="text-xs font-black text-rose-700">{error}</span>
            </div>
          ) : (
            <>
              {checked && (
                <div className={`mb-4 p-4 rounded-2xl border text-center font-black text-sm ${
                  correctCount === pairs.length
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`} id="matching_exercise_score">
                  {language === 'FR'
                    ? `Score : ${correctCount} / ${pairs.length} correct(s)`
                    : `Score: ${correctCount} / ${pairs.length} correct`}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                {/* Terms with assignment dropdowns */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-widest block">
                    {language === 'FR' ? "Termes" : "Terms"}
                  </span>
                  {pairs.map((p, idx) => {
                    const assignedId = assignments[p.id];
                    const isCorrect = checked && assignedId === p.id;
                    const isWrong = checked && assignedId && assignedId !== p.id;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                          isCorrect ? 'bg-emerald-50 border-emerald-200' : isWrong ? 'bg-rose-50 border-rose-200' : 'bg-slate-50/50 border-slate-150'
                        }`}
                      >
                        <span className="text-xs font-black text-indigo-950 flex-1">{idx + 1}. {p.term}</span>
                        <select
                          id={`matching_term_select_${idx}`}
                          value={assignedId || ''}
                          onChange={(e) => handleAssign(p.id, e.target.value)}
                          disabled={checked}
                          className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-2 outline-hidden focus:ring-2 focus:ring-indigo-400 disabled:opacity-70"
                        >
                          <option value="">--</option>
                          {shuffledDefinitions.map((d) => (
                            <option key={d.id} value={d.id}>{letterFor(d.id)}</option>
                          ))}
                        </select>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {isWrong && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Shuffled definitions, lettered */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-widest block">
                    {language === 'FR' ? "Définitions" : "Definitions"}
                  </span>
                  {shuffledDefinitions.map((d, idx) => (
                    <div key={d.id} className="flex gap-2.5 p-3.5 rounded-2xl border border-slate-150 bg-slate-50/30">
                      <span className="text-xs font-black text-indigo-600 shrink-0">{LETTERS[idx]}.</span>
                      <p className="text-xs text-slate-700 leading-relaxed font-bold">{d.definition}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-center mt-6">
                <button
                  id="check_matching_answers_btn"
                  onClick={() => setChecked(true)}
                  disabled={!allAssigned || checked}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold text-sm px-6 py-3 rounded-2xl shadow-md hover:scale-102 active:scale-100 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'FR' ? "Vérifier" : "Check Answers"}</span>
                </button>
                <button
                  id="new_matching_exercise_btn"
                  onClick={loadExercise}
                  className="bg-white border border-slate-200 text-slate-700 font-extrabold text-sm px-6 py-3 rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{language === 'FR' ? "Nouvel exercice" : "New Exercise"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
