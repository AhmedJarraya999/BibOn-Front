'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Gamepad2, Plus, Play, Square, ChevronRight, Check, X, Trophy,
  Hash, RefreshCw, Trash2, PlusCircle, Flag,
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface GameSession {
  id: string; eventId: string; title: string;
  type: 'TAMBOLA' | 'QUIZ'; status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  calledNumbers: number[]; currentQuestion: number; questionOpenAt?: string;
  questions?: QuizQuestion[];
  tambolaClaims?: TambolaClaim[];
  _count?: { tambolaCards: number; tambolaClaims: number; quizAnswers: number };
}
interface QuizQuestion { question: string; options: string[]; correctOption: number; timeLimit: number; }
interface TambolaClaim { id: string; participantId: string; participantName: string; claimType: string; verified?: boolean | null; claimedAt: string; }
interface Event { id: string; name: string; }

const CLAIM_LABELS: Record<string, string> = { ONE_LINE: '1 Line', TWO_LINES: '2 Lines', FULL_HOUSE: 'Full House 🏠' };

/* ── Tambola board ── */
function TambolaBoard({ session, onRefresh }: { session: GameSession; onRefresh: () => void }) {
  const toast = useToast();

  const callMutation = useMutation({
    mutationFn: () => api.post(`/games/${session.id}/call`, {}),
    onSuccess: onRefresh,
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  });
  const verifyMutation = useMutation({
    mutationFn: ({ claimId, verified }: { claimId: string; verified: boolean }) =>
      api.patch(`/games/claims/${claimId}`, { verified }),
    onSuccess: onRefresh,
  });
  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/games/${session.id}/status`, { status }),
    onSuccess: onRefresh,
  });

  const called = new Set(session.calledNumbers);
  const lastCalled = session.calledNumbers[session.calledNumbers.length - 1];
  const pending = (session.tambolaClaims ?? []).filter((c) => c.verified === null || c.verified === undefined);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {session.status === 'WAITING' && (
          <button onClick={() => statusMutation.mutate('ACTIVE')} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            <Play className="h-4 w-4" /> Start Game
          </button>
        )}
        {session.status === 'ACTIVE' && (
          <>
            <button onClick={() => callMutation.mutate()} disabled={callMutation.isPending || session.calledNumbers.length >= 90}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
              <Hash className="h-4 w-4" /> {callMutation.isPending ? 'Calling…' : 'Call Next Number'}
            </button>
            <button onClick={() => statusMutation.mutate('FINISHED')} className="flex items-center gap-2 border border-red-300 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm">
              <Square className="h-4 w-4" /> End Game
            </button>
          </>
        )}
        <span className="ml-auto text-sm text-gray-400">{session.calledNumbers.length}/90 called · {session._count?.tambolaCards ?? 0} players</span>
      </div>

      {/* Last called number */}
      {lastCalled && (
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-4xl font-black shadow-lg ring-4 ring-blue-200">
            {lastCalled}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Last called</p>
            <p className="text-2xl font-black text-gray-900">{lastCalled}</p>
            <p className="text-xs text-gray-400">{90 - session.calledNumbers.length} numbers remaining</p>
          </div>
        </div>
      )}

      {/* 90-number grid */}
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => (
          <div key={n} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
            called.has(n)
              ? n === lastCalled ? 'bg-blue-600 text-white ring-2 ring-blue-300 scale-110' : 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-400'
          }`}>{n}</div>
        ))}
      </div>

      {/* Claims */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
          Claims
          {pending.length > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs">{pending.length} pending</span>}
        </p>
        {(session.tambolaClaims ?? []).length === 0 && <p className="text-sm text-gray-400">No claims yet</p>}
        {(session.tambolaClaims ?? []).map((c) => (
          <div key={c.id} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${c.verified === true ? 'bg-green-50 border-green-200' : c.verified === false ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-sm font-bold text-gray-800">{CLAIM_LABELS[c.claimType] ?? c.claimType}</span>
            <span className="text-sm text-gray-600 flex-1">{c.participantName}</span>
            {c.verified === null || c.verified === undefined ? (
              <div className="flex gap-1.5">
                <button onClick={() => verifyMutation.mutate({ claimId: c.id, verified: true })} className="flex items-center gap-1 rounded-lg bg-green-500 text-white px-2.5 py-1 text-xs font-semibold hover:bg-green-600"><Check className="h-3 w-3" /> Verify</button>
                <button onClick={() => verifyMutation.mutate({ claimId: c.id, verified: false })} className="flex items-center gap-1 rounded-lg bg-red-400 text-white px-2.5 py-1 text-xs font-semibold hover:bg-red-500"><X className="h-3 w-3" /> Reject</button>
              </div>
            ) : (
              <span className={`text-xs font-semibold ${c.verified ? 'text-green-600' : 'text-red-500'}`}>{c.verified ? '✓ Verified' : '✗ Rejected'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Quiz board ── */
function QuizBoard({ session, onRefresh }: { session: GameSession; onRefresh: () => void }) {
  const toast = useToast();
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState<QuizQuestion[]>(session.questions ?? []);
  const [newQ, setNewQ] = useState<QuizQuestion>({ question: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 30 });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session.questionOpenAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(session.questionOpenAt!).getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [session.questionOpenAt]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/games/${session.id}/questions`, { questions: draftQuestions }),
    onSuccess: () => { onRefresh(); setEditingQuestions(false); toast.success('Questions saved.'); },
  });
  const nextMutation = useMutation({
    mutationFn: () => api.post(`/games/${session.id}/next-question`, {}),
    onSuccess: onRefresh,
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  });
  const statusMutation = useMutation({
    mutationFn: (s: string) => api.patch(`/games/${session.id}/status`, { status: s }),
    onSuccess: onRefresh,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['quiz-leaderboard', session.id],
    queryFn: () => api.get(`/games/${session.id}/leaderboard`).then((r) => r.data),
    refetchInterval: 5000,
    enabled: session.status !== 'WAITING',
  });

  const questions = session.questions ?? [];
  const currentQ = questions[session.currentQuestion];
  const tl = currentQ?.timeLimit ?? 30;
  const pct = Math.min(100, (elapsed / tl) * 100);

  const addQuestion = () => {
    if (!newQ.question.trim() || newQ.options.some((o) => !o.trim())) { toast.error('Fill in all fields'); return; }
    setDraftQuestions((qs) => [...qs, { ...newQ }]);
    setNewQ({ question: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 30 });
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {session.status === 'WAITING' && questions.length > 0 && (
          <button onClick={() => nextMutation.mutate()} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            <Play className="h-4 w-4" /> Start Quiz
          </button>
        )}
        {session.status === 'ACTIVE' && session.currentQuestion < questions.length - 1 && (
          <button onClick={() => nextMutation.mutate()} disabled={nextMutation.isPending} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg text-sm">
            <ChevronRight className="h-4 w-4" /> Next Question
          </button>
        )}
        {session.status === 'ACTIVE' && session.currentQuestion >= questions.length - 1 && (
          <button onClick={() => statusMutation.mutate('FINISHED')} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            <Trophy className="h-4 w-4" /> Finish Quiz
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400">
          {session.currentQuestion >= 0 ? `Q${session.currentQuestion + 1}/${questions.length}` : `${questions.length} questions`}
        </span>
      </div>

      {/* Current question */}
      {currentQ && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-400 uppercase">Question {session.currentQuestion + 1}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${elapsed > tl ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>⏱ {elapsed}s / {tl}s</span>
          </div>
          <div className="h-1.5 rounded-full bg-blue-200 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-lg font-bold text-gray-900">{currentQ.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {currentQ.options.map((opt, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-sm font-medium ${i === currentQ.correctOption ? 'bg-green-100 border border-green-300 text-green-800' : 'bg-white border border-gray-200 text-gray-700'}`}>
                <span className="font-bold mr-1.5">{String.fromCharCode(65 + i)}.</span>{opt}
                {i === currentQ.correctOption && <span className="ml-1 text-xs">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Leaderboard</div>
          {leaderboard.slice(0, 8).map((e: any) => (
            <div key={e.participantId} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100">
              <span className="w-6 text-center text-sm font-bold text-gray-400">#{e.rank}</span>
              <span className="flex-1 text-sm font-medium text-gray-900 truncate">{e.name}</span>
              <span className="text-sm font-bold text-blue-600">{e.score} pts</span>
              <span className="text-xs text-gray-400">{e.correct} ✓</span>
            </div>
          ))}
        </div>
      )}

      {/* Question editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Questions ({questions.length})</p>
          {session.status === 'WAITING' && (
            <button onClick={() => setEditingQuestions((v) => !v)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              {editingQuestions ? 'Done' : 'Edit'}
            </button>
          )}
        </div>

        {editingQuestions && (
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            {draftQuestions.map((q, qi) => (
              <div key={qi} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-xs font-bold text-gray-400 w-5">{qi + 1}.</span>
                <p className="text-sm flex-1 truncate text-gray-700">{q.question}</p>
                <button onClick={() => setDraftQuestions((qs) => qs.filter((_, i) => i !== qi))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <input className={inp} placeholder="Question…" value={newQ.question} onChange={(e) => setNewQ((q) => ({ ...q, question: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                {newQ.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <button onClick={() => setNewQ((q) => ({ ...q, correctOption: i }))}
                      className={`shrink-0 h-4 w-4 rounded-full border-2 transition-colors ${newQ.correctOption === i ? 'border-green-500 bg-green-500' : 'border-gray-300'}`} />
                    <input className={inp} placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt}
                      onChange={(e) => setNewQ((q) => { const ops = [...q.options]; ops[i] = e.target.value; return { ...q, options: ops }; })} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 shrink-0">Time (sec)</label>
                <input type="number" className="w-16 h-8 rounded-lg border border-gray-300 px-2 text-sm" value={newQ.timeLimit}
                  onChange={(e) => setNewQ((q) => ({ ...q, timeLimit: parseInt(e.target.value) || 30 }))} />
                <button onClick={addQuestion} className="flex items-center gap-1.5 ml-auto bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">
                  <PlusCircle className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg text-sm">
              {saveMutation.isPending ? 'Saving…' : 'Save Questions'}
            </button>
          </div>
        )}

        {!editingQuestions && questions.map((q, i) => (
          <div key={i} className={`rounded-lg border px-3 py-2 text-sm ${i === session.currentQuestion ? 'border-blue-300 bg-blue-50 font-semibold' : 'border-gray-200 text-gray-600'}`}>
            <span className="font-bold text-gray-400 mr-2">Q{i + 1}.</span>{q.question}
          </div>
        ))}
        {!editingQuestions && questions.length === 0 && session.status === 'WAITING' && (
          <p className="text-sm text-gray-400">Click <span className="font-medium">Edit</span> to add quiz questions.</p>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function GamesPage() {
  const toast = useToast();
  const [eventId, setEventId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'TAMBOLA' | 'QUIZ'>('TAMBOLA');

  const { data: eventsData } = useQuery({
    queryKey: ['events', 1, ''],
    queryFn: () => api.get('/events', { params: { limit: 100 } }).then((r) => r.data),
  });
  const events: Event[] = eventsData?.data ?? [];

  const { data: sessions = [], refetch } = useQuery<GameSession[]>({
    queryKey: ['games', eventId],
    queryFn: () => api.get('/games', { params: { eventId } }).then((r) => r.data),
    enabled: !!eventId,
    refetchInterval: 5000,
  });

  const { data: selected, refetch: refetchSelected } = useQuery<GameSession>({
    queryKey: ['game-state', selectedId],
    queryFn: () => api.get(`/games/${selectedId}/state`).then((r) => r.data),
    enabled: !!selectedId,
    refetchInterval: 3000,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/games', { eventId, title: newTitle, type: newType }),
    onSuccess: (res) => {
      refetch(); setSelectedId(res.data.id);
      setCreating(false); setNewTitle(''); toast.success('Game created.');
    },
    onError: () => toast.error('Could not create game.'),
  });

  const handleRefresh = () => { refetch(); if (selectedId) refetchSelected(); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Gamepad2 className="h-6 w-6 text-blue-500" /> Games</h1>
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-gray-400" />
          <select className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:border-blue-400" value={eventId} onChange={(e) => { setEventId(e.target.value); setSelectedId(null); }}>
            <option value="">Select event…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {!eventId ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Gamepad2 className="h-10 w-10 mb-3" />
          <p>Select an event to manage games</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Sidebar: game list */}
          <div className="space-y-3">
            <button onClick={() => setCreating((v) => !v)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
              <Plus className="h-4 w-4" /> New Game
            </button>

            {creating && (
              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <input className={inp} placeholder="Game title…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  {(['TAMBOLA', 'QUIZ'] as const).map((t) => (
                    <button key={t} onClick={() => setNewType(t)}
                      className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${newType === t ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                      {t === 'TAMBOLA' ? '🎱 Tambola' : '⚡ Quiz'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => createMutation.mutate()} disabled={!newTitle.trim() || createMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50">
                    {createMutation.isPending ? 'Creating…' : 'Create'}
                  </button>
                  <button onClick={() => setCreating(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            )}

            {sessions.map((s) => (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${selectedId === s.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.title}</p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{s.type === 'TAMBOLA' ? '🎱 Tambola' : '⚡ Quiz'} · {s._count?.tambolaCards ?? 0} players</p>
              </button>
            ))}
            {sessions.length === 0 && !creating && <p className="text-sm text-gray-400 text-center py-6">No games yet for this event</p>}
          </div>

          {/* Main panel */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{selected.type === 'TAMBOLA' ? '🎱 Tambola' : '⚡ Quiz'} · <StatusBadge status={selected.status} /></p>
                  </div>
                  <button onClick={handleRefresh} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><RefreshCw className="h-4 w-4" /></button>
                </div>
                {selected.type === 'TAMBOLA'
                  ? <TambolaBoard session={selected} onRefresh={handleRefresh} />
                  : <QuizBoard session={selected} onRefresh={handleRefresh} />}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <Gamepad2 className="h-10 w-10 mb-3" />
                <p>Select a game to manage it</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = { WAITING: 'bg-gray-100 text-gray-500', ACTIVE: 'bg-green-100 text-green-700', FINISHED: 'bg-purple-100 text-purple-700' };
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cls[status] ?? cls.WAITING}`}>{status}</span>;
}

const inp = 'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:border-blue-400';
