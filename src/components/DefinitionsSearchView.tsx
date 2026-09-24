import React, { useState } from 'react';
import { Search, Loader2, BookOpen, AlertTriangle, Calculator } from 'lucide-react';
import { cleanCoachText } from '../lib/dashboardUtils';
import { authFetch } from '../lib/apiClient';

interface DefinitionsSearchViewProps {
  language: 'EN' | 'FR';
  isAdmin: boolean;
}

interface DefinitionEntry {
  term: string;
  definition: string;
  sourceBook: string;
  /** Standard calculation formula, set only for financial/EVM metrics (Earned Value, CPI, ...). */
  formula?: string;
}

interface DefinitionSearchState {
  results: DefinitionEntry[];
  found: boolean;
}

const EXAMPLE_TERMS_EN = ["Change Control Board", "Risk Register", "Estimation", "Earned Value"];
const EXAMPLE_TERMS_FR = ["Comité de contrôle des modifications", "Registre des risques", "Estimation", "Valeur acquise"];

// A dictionary-style lookup, not a chat: search a term (or a broader keyword) and get back every
// matching glossary/PMBOK entry as its own card, replacing the previous result set each time -
// unlike the admin-only Study Coach Chat this replaces, this is available to every candidate,
// since reviewing definitions is as core to PMP prep as exercises.
export default function DefinitionsSearchView({ language, isAdmin }: DefinitionsSearchViewProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [state, setState] = useState<DefinitionSearchState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchedTerm, setLastSearchedTerm] = useState<string | null>(null);

  const exampleTerms = language === 'FR' ? EXAMPLE_TERMS_FR : EXAMPLE_TERMS_EN;

  const runSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || isSearching) return;
    setIsSearching(true);
    setError(null);
    try {
      const res = await authFetch('/api/books/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, language })
      });
      const data = await res.json();
      if (res.ok) {
        setState({
          results: Array.isArray(data.results) ? data.results : [],
          found: data.found === true
        });
        setLastSearchedTerm(trimmed);
      } else {
        setError(data.error || (language === 'FR' ? "La recherche a échoué." : "Search failed."));
      }
    } catch (err: any) {
      setError(err.message || (language === 'FR' ? "La recherche a échoué." : "Search failed."));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col h-full" id="view_definitions_search">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-500 p-6 rounded-3xl flex flex-wrap justify-between items-center gap-4 shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-inner">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">
              {language === 'FR' ? "Recherche de Définitions PMP" : "PMP Definitions Search"}
            </h2>
            <p className="text-xs text-teal-50 mt-0.5 font-bold">
              {language === 'FR' ? "Recherchez un terme ou un mot-clé - toutes les définitions correspondantes s'affichent" : "Search a term or keyword - every matching definition is shown"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col space-y-5">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="definition_search_input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'FR' ? "Ex: Comité de contrôle des modifications, Estimation..." : "e.g., Change Control Board, Estimation..."}
              className="w-full text-sm bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-indigo-950 outline-hidden focus:ring-2 focus:ring-emerald-400 font-bold shadow-sm"
            />
          </div>
          <button
            id="definition_search_btn"
            type="submit"
            disabled={isSearching || !query.trim()}
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-md hover:scale-102 active:scale-100 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{language === 'FR' ? "Rechercher" : "Search"}</span>
          </button>
        </form>

        {/* Example term chips */}
        {!state && !isSearching && (
          <div className="flex gap-1.5 flex-wrap justify-center">
            {exampleTerms.map((term) => (
              <button
                key={term}
                onClick={() => { setQuery(term); runSearch(term); }}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-emerald-300 transition-all font-bold cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Result / states */}
        <div className="flex-1 bg-white/95 backdrop-blur-md rounded-[2rem] border border-indigo-100 shadow-md p-6 min-h-[350px] flex flex-col" id="definition_result">
          {isSearching ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <span className="text-xs font-black text-indigo-950">
                {language === 'FR' ? "Recherche en cours..." : "Searching..."}
              </span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
              <span className="text-xs font-black text-rose-700">{error}</span>
            </div>
          ) : state && !state.found ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center">
              <Search className="w-8 h-8 text-slate-300" />
              <div className="space-y-1">
                <span className="text-xs font-black text-indigo-950 block">
                  {language === 'FR' ? "Aucune définition trouvée" : "No definition found"}
                </span>
                <span className="text-[11px] text-slate-500 max-w-sm block leading-relaxed font-bold mx-auto">
                  {lastSearchedTerm}
                </span>
              </div>
            </div>
          ) : state && state.results.length > 0 ? (
            <div className="space-y-3 text-left" id="definition_result_list">
              {state.results.length > 1 && (
                <span className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-widest block">
                  {language === 'FR' ? `${state.results.length} définitions trouvées` : `${state.results.length} definitions found`}
                </span>
              )}
              {state.results.map((entry, idx) => (
                <div key={`${entry.term}-${idx}`} className="border border-indigo-50 rounded-2xl p-4 space-y-2 bg-slate-50/40">
                  <span className="text-xs font-black text-indigo-950 block">{entry.term}</span>
                  <p className="text-sm text-slate-700 leading-relaxed font-bold whitespace-pre-wrap">
                    {cleanCoachText(entry.definition)}
                  </p>
                  {entry.formula && (
                    <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-xs font-mono font-black text-indigo-950">{entry.formula}</span>
                    </div>
                  )}
                  {isAdmin && (
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full inline-flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3 text-emerald-600 shrink-0" />
                      {entry.sourceBook}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg">📖</div>
              <div className="space-y-1">
                <span className="text-xs font-black text-indigo-950 block">
                  {language === 'FR' ? "Prêt à chercher" : "Ready to search"}
                </span>
                <span className="text-[11px] text-slate-500 max-w-sm block leading-relaxed font-bold mx-auto">
                  {language === 'FR' ? "Tapez un terme ou un concept PMP ci-dessus, ou cliquez sur un exemple." : "Type a PMP term or concept above, or click an example."}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
