import { Brain, Grid3X3, Info, ChevronDown, ArrowLeftRight, MapPin } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import SectionHeader from '../components/SectionHeader';
import SegmentedTabs from '../components/SegmentedTabs';
import RoundedCard from '../components/RoundedCard';
import GlassPanel from '../components/GlassPanel';
import TeamBadge from '../components/TeamBadge';
import ProbabilityBar from '../components/ProbabilityBar';
import { WC2026_TEAMS, getTeamByCode, CONFEDERATION_META } from '../data/worldCup2026';
import { predictMatch, buildScorelineMatrix, type MatchPrediction, type ScorelineProb, type VenueContext } from '../lib/prediction';

const tabs = [
  { id: 'head', label: 'Head-to-Head' },
  { id: 'matrix', label: 'Score Matrix' },
  { id: 'scoreline', label: 'Scorelines' },
];

function TeamSelector({ label, selected, onSelect, exclude, isOpen, onToggle, onClose }: {
  label: string; selected: string | null; onSelect: (code: string) => void;
  exclude: string | null; isOpen: boolean; onToggle: () => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const team = selected ? getTeamByCode(selected) : null;

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  const filtered = WC2026_TEAMS.filter(t => {
    if (exclude && t.code === exclude) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
  });

  return (
    <div ref={ref} className={`relative ${isOpen ? 'z-[100]' : 'z-0'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-brand-500/50 transition-all"
      >
        {team ? (
          <>
            <TeamBadge name={team.name} code={team.code} size="md" showName={false} />
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{team.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`badge ${CONFEDERATION_META[team.confederation]?.bgClass || ''} ${CONFEDERATION_META[team.confederation]?.textClass || ''}`}>{team.confederation}</span>
                <span className="text-[10px] text-slate-400">Elo {team.elo}</span>
              </div>
            </div>
          </>
        ) : (
          <span className="text-sm text-slate-400 flex-1 text-left">Select {label}...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[110] w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl max-h-64 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-2 border-b border-slate-100 dark:border-slate-700">
            <input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              autoFocus
            />
          </div>
          {filtered.map(t => (
            <button
              key={t.code}
              onClick={() => { onSelect(t.code); onClose(); setSearch(''); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <TeamBadge name={t.name} code={t.code} size="sm" showName={false} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.name}</p>
              </div>
              <span className="text-[10px] text-slate-400">Elo {t.elo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScorelineMatrix({ prediction }: { prediction: MatchPrediction }) {
  const matrix = useMemo(() => buildScorelineMatrix(prediction, 6), [prediction]);
  const maxProb = Math.max(...matrix.flat());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[320px]">
        <div className="flex items-center gap-1 mb-2 pl-12">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Team B Goals</span>
        </div>
        <div className="flex">
          <div />
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4, 5].map(b => (
              <div key={b} className="w-12 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">{b}</div>
            ))}
          </div>
        </div>
        {matrix.map((row, a) => (
          <div key={a} className="flex items-center gap-0.5">
            <div className="w-12 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 pr-2">{a}</div>
            {row.map((val, b) => {
              const intensity = maxProb > 0 ? val / maxProb : 0;
              const isTeamAWin = a > b;
              const isDraw = a === b;
              let bgColor = 'bg-slate-100 dark:bg-slate-700';
              if (val > 0) {
                if (isTeamAWin) bgColor = `rgba(59,130,246,${intensity * 0.8})`;
                else if (isDraw) bgColor = `rgba(148,163,184,${intensity * 0.7})`;
                else bgColor = `rgba(245,158,11,${intensity * 0.8})`;
              }
              return (
                <div
                  key={b}
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors"
                  style={{ backgroundColor: val > 0 ? bgColor : undefined }}
                  title={`${a}-${b}: ${val.toFixed(1)}%`}
                >
                  <span className={`${intensity > 0.5 ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    {val >= 0.1 ? `${val.toFixed(1)}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-2 text-[10px] text-slate-400 pl-12">Team A Goals</div>
        <div className="flex items-center gap-4 mt-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500/60" />
            <span className="text-slate-500 dark:text-slate-400">Team A Win</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-slate-400/60" />
            <span className="text-slate-500 dark:text-slate-400">Draw</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500/60" />
            <span className="text-slate-500 dark:text-slate-400">Team B Win</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorelineCards({ scorelines }: { scorelines: ScorelineProb[] }) {
  const top12 = [...scorelines]
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 12);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {top12.map((s, i) => (
        <div
          key={`${s.teamA}-${s.teamB}`}
          className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 hover:border-brand-500/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-400">#{i + 1}</span>
            <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400">{(s.prob * 100).toFixed(1)}%</span>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-200 text-center">
            {s.teamA} - {s.teamB}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${Math.min(s.prob * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Predictor() {
  const [activeTab, setActiveTab] = useState('head');
  const [teamACode, setTeamACode] = useState<string | null>(null);
  const [teamBCode, setTeamBCode] = useState<string | null>(null);
  const [venue, setVenue] = useState<VenueContext>('neutral');
  const [openDropdown, setOpenDropdown] = useState<'a' | 'b' | null>(null);

  const teamA = teamACode ? getTeamByCode(teamACode) : null;
  const teamB = teamBCode ? getTeamByCode(teamBCode) : null;
  const sameTeam = !!(teamACode && teamBCode && teamACode === teamBCode);

  const prediction: MatchPrediction | null = useMemo(() => {
    if (!teamA || !teamB || sameTeam) return null;
    return predictMatch(teamA, teamB, venue);
  }, [teamA, teamB, sameTeam, venue]);

  function swapTeams() {
    const tmp = teamACode;
    setTeamACode(teamBCode);
    setTeamBCode(tmp);
  }

  const hasBoth = !!teamA && !!teamB && !sameTeam;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Match Predictor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Elo + Poisson/Dixon-Coles model predictions</p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg px-2.5 py-1">v1.0</span>
        </div>
      </div>

      {/* Team Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start relative z-20">
        <div className={`relative overflow-visible ${openDropdown === 'a' ? 'z-50' : 'z-10'}`}>
          <GlassPanel className="overflow-visible">
            <SectionHeader title="Team A" />
            <div className="mt-3">
              <TeamSelector
                label="Team A"
                selected={teamACode}
                onSelect={setTeamACode}
                exclude={teamBCode}
                isOpen={openDropdown === 'a'}
                onToggle={() => setOpenDropdown(openDropdown === 'a' ? null : 'a')}
                onClose={() => setOpenDropdown(null)}
              />
            </div>
          </GlassPanel>
        </div>
      
        <div className="flex flex-col items-center gap-2 self-center relative z-20">
          <button
            onClick={swapTeams}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center hover:border-brand-500/50 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all"
            title="Swap teams"
          >
            <ArrowLeftRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
          <span className="text-[10px] text-slate-400">Swap</span>
        </div>
      
        <div className={`relative overflow-visible ${openDropdown === 'b' ? 'z-50' : 'z-10'}`}>
          <GlassPanel className="overflow-visible">
            <SectionHeader title="Team B" />
            <div className="mt-3">
              <TeamSelector
                label="Team B"
                selected={teamBCode}
                onSelect={setTeamBCode}
                exclude={teamACode}
                isOpen={openDropdown === 'b'}
                onToggle={() => setOpenDropdown(openDropdown === 'b' ? null : 'b')}
                onClose={() => setOpenDropdown(null)}
              />
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Venue Context */}
      <div className="flex items-center gap-3">
        <MapPin className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">Venue:</span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
          <button
            onClick={() => setVenue('neutral')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${venue === 'neutral' ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >Neutral</button>
          <button
            onClick={() => setVenue('home')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${venue === 'home' ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >Team A Home</button>
        </div>
        {venue === 'neutral' && (
          <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px]">Default</span>
        )}
        {venue === 'home' && (
          <span className="badge bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px]">+8% xG boost to Team A</span>
        )}
      </div>

      {/* Same-team validation */}
      {sameTeam && (
        <RoundedCard hover={false} className="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Team A and Team B must be different.</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-1">Select two different teams to generate a prediction.</p>
        </RoundedCard>
      )}

      {/* Prediction Results */}
      {hasBoth && prediction ? (
        <>
          {activeTab === 'head' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <GlassPanel className="lg:col-span-2">
                <SectionHeader title="Match Prediction" icon={<Brain className="w-5 h-5" />} />
                <div className="mt-6">
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <div className="text-center">
                      <TeamBadge name={teamA!.name} code={teamA!.code} size="lg" showName={false} />
                      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{teamA!.name}</p>
                      <span className="text-[10px] text-slate-400">Elo {teamA!.elo}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">VS</span>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        {venue === 'neutral' ? 'Neutral' : 'Team A Home'}
                      </span>
                    </div>
                    <div className="text-center">
                      <TeamBadge name={teamB!.name} code={teamB!.code} size="lg" showName={false} />
                      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{teamB!.name}</p>
                      <span className="text-[10px] text-slate-400">Elo {teamB!.elo}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <ProbabilityBar label={`${teamA!.name} Win`} value={prediction.teamAWinProb} color="bg-blue-500" size="lg" />
                    <ProbabilityBar label="Draw" value={prediction.drawProb} color="bg-slate-400" size="lg" />
                    <ProbabilityBar label={`${teamB!.name} Win`} value={prediction.teamBWinProb} color="bg-amber-500" size="lg" />
                  </div>
                </div>
              </GlassPanel>

              <div className="space-y-4">
                <GlassPanel>
                  <SectionHeader title="Expected Goals (xG)" />
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamBadge name={teamA!.name} code={teamA!.code} size="sm" showName={false} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{teamA!.name}</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{prediction.expectedTeamAGoals.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamBadge name={teamB!.name} code={teamB!.code} size="sm" showName={false} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{teamB!.name}</span>
                      </div>
                      <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{prediction.expectedTeamBGoals.toFixed(2)}</span>
                    </div>
                  </div>
                </GlassPanel>

                <GlassPanel>
                  <SectionHeader title="Betting Metrics" />
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">BTTS (Both Score)</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{prediction.bttsProb.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Over 1.5 Goals</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{prediction.over15Prob.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Over 2.5 Goals</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{prediction.over25Prob.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Over 3.5 Goals</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{prediction.over35Prob.toFixed(1)}%</span>
                    </div>
                  </div>
                </GlassPanel>

                <RoundedCard hover={false}>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">How The Read Works</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Predictions use Elo ratings to derive expected goals via Poisson distribution with Dixon-Coles low-score correction.
                        {venue === 'neutral'
                          ? ' Neutral venue assumed (default) — no home advantage applied. Swapping teams mirrors probabilities.'
                          : ' Team A Home context active — Team A receives +8% expected goals boost (home advantage).'}
                      </p>
                    </div>
                  </div>
                </RoundedCard>
              </div>
            </div>
          )}

          {activeTab === 'matrix' && (
            <GlassPanel>
              <SectionHeader title="Scoreline Probability Matrix" subtitle={`Probability (%) of each scoreline: ${teamA!.name} vs ${teamB!.name} (${venue === 'neutral' ? 'Neutral' : 'Team A Home'})`} icon={<Grid3X3 className="w-5 h-5" />} />
              <div className="mt-6 flex justify-center">
                <ScorelineMatrix prediction={prediction} />
              </div>
            </GlassPanel>
          )}

          {activeTab === 'scoreline' && (
            <GlassPanel>
              <SectionHeader title="Top Scorelines" subtitle="Most likely exact score outcomes" icon={<Grid3X3 className="w-5 h-5" />} />
              <div className="mt-4">
                <ScorelineCards scorelines={prediction.scorelines} />
              </div>
            </GlassPanel>
          )}
        </>
      ) : !sameTeam ? (
        <GlassPanel>
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            </div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Select both teams to generate prediction</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Choose Team A and Team B above to see match probabilities, scoreline matrix, and betting metrics.</p>
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
}
