'use client';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { ChevronDown, RefreshCw, Users, CheckCircle, Trophy, CreditCard, Package, Shirt, Medal, Utensils, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { type Race, type Event } from '@/types';

interface Stats {
  total: number;
  registered: number;
  checkedIn: number;
  finished: number;
  disqualified: number;
  paid: number;
  pending: number;
  bibsDistributed: number;
  tshirts: number;
  medals: number;
  ravitos: number;
  lastUpdated: string;
  perRace: {
    raceId: string;
    raceName: string;
    total: number;
    registered: number;
    checkedIn: number;
    finished: number;
  }[];
}

function StatCard({
  label,
  value,
  total,
  icon,
  color,
}: {
  label: string;
  value: number;
  total?: number;
  icon: React.ReactNode;
  color: string;
}) {
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {pct !== null && (
            <p className="mt-0.5 text-sm text-gray-400">{pct}% of total</p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
      </div>
      {total !== undefined && total > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color.replace('bg-', 'bg-').replace('/10', '')}`}
            style={{ width: `${Math.min((value / total) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-sm text-gray-700 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

export default function LiveDashboardPage() {
  const [filterEventId, setFilterEventId] = useState('');
  const [filterRaceId, setFilterRaceId] = useState('');

  const { data: eventsData } = useQuery({
    queryKey: ['events-all'],
    queryFn: () => api.get('/events', { params: { limit: 100 } }).then((r) => r.data),
  });
  const events: Event[] = eventsData?.data ?? [];

  const { data: racesData } = useQuery({
    queryKey: ['races-all'],
    queryFn: () => api.get('/races', { params: { limit: 200 } }).then((r) => r.data),
  });
  const allRaces: Race[] = racesData?.data ?? [];
  const filteredRaces = useMemo(
    () => (filterEventId ? allRaces.filter((r) => r.eventId === filterEventId) : allRaces),
    [allRaces, filterEventId],
  );

  const statsParams = filterRaceId
    ? { raceId: filterRaceId }
    : filterEventId
    ? { eventId: filterEventId }
    : {};

  const {
    data: stats,
    isLoading,
    dataUpdatedAt,
    refetch,
    isFetching,
  } = useQuery<Stats>({
    queryKey: ['live-stats', filterEventId, filterRaceId],
    queryFn: () => api.get('/registrations/stats', { params: statsParams }).then((r) => r.data),
    refetchInterval: 10_000,
  });

  const handleEventChange = (eventId: string) => {
    setFilterEventId(eventId);
    setFilterRaceId('');
  };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—';
  const checkInRate = stats?.total ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Live Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Auto-refreshes every 10 seconds &bull; Last updated: {lastUpdated}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Event
            </label>
            <FilterSelect value={filterEventId} onChange={handleEventChange} placeholder="All events">
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </FilterSelect>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Race
            </label>
            <FilterSelect
              value={filterRaceId}
              onChange={(v) => setFilterRaceId(v)}
              placeholder={filterEventId ? 'All races in event' : 'All races'}
              disabled={filteredRaces.length === 0}
            >
              {filteredRaces.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </FilterSelect>
          </div>
          {(filterEventId || filterRaceId) && (
            <div className="flex items-end">
              <button
                onClick={() => { setFilterEventId(''); setFilterRaceId(''); }}
                className="h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Check-in progress banner */}
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-red-800">
                Overall check-in progress
              </p>
              <p className="text-sm font-bold text-red-900">{checkInRate}%</p>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-red-100">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-700"
                style={{ width: `${checkInRate}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-red-600">
              {stats.checkedIn} checked in out of {stats.total} registered
            </p>
          </div>

          {/* Stat cards — participation */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Participation</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Total Registered"
                value={stats.total}
                icon={<Users className="h-5 w-5 text-gray-600" />}
                color="bg-gray-100"
              />
              <StatCard
                label="Checked In"
                value={stats.checkedIn}
                total={stats.total}
                icon={<CheckCircle className="h-5 w-5 text-red-600" />}
                color="bg-red-50"
              />
              <StatCard
                label="Finished"
                value={stats.finished}
                total={stats.total}
                icon={<Trophy className="h-5 w-5 text-green-600" />}
                color="bg-green-50"
              />
              <StatCard
                label="Disqualified / DNS"
                value={stats.disqualified + stats.registered}
                total={stats.total}
                icon={<AlertCircle className="h-5 w-5 text-red-500" />}
                color="bg-red-50"
              />
            </div>
          </div>

          {/* Stat cards — payments */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Payments</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
              <StatCard
                label="Paid"
                value={stats.paid}
                total={stats.total}
                icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
                color="bg-emerald-50"
              />
              <StatCard
                label="Pending (on-site)"
                value={stats.pending}
                total={stats.total}
                icon={<CreditCard className="h-5 w-5 text-amber-600" />}
                color="bg-amber-50"
              />
            </div>
          </div>

          {/* Stat cards — distributions */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Distributions</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Bibs Distributed"
                value={stats.bibsDistributed}
                total={stats.checkedIn}
                icon={<Package className="h-5 w-5 text-violet-600" />}
                color="bg-violet-50"
              />
              <StatCard
                label="T-Shirts"
                value={stats.tshirts}
                total={stats.checkedIn}
                icon={<Shirt className="h-5 w-5 text-pink-600" />}
                color="bg-pink-50"
              />
              <StatCard
                label="Medals"
                value={stats.medals}
                total={stats.finished}
                icon={<Medal className="h-5 w-5 text-yellow-600" />}
                color="bg-yellow-50"
              />
              <StatCard
                label="Ravito"
                value={stats.ravitos}
                total={stats.checkedIn}
                icon={<Utensils className="h-5 w-5 text-orange-600" />}
                color="bg-orange-50"
              />
            </div>
          </div>

          {/* Per-race breakdown */}
          {stats.perRace.length > 1 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Per Race</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Race', 'Total', 'Checked In', 'Finished', 'Not Arrived'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.perRace.map((r) => {
                      const pct = r.total > 0 ? Math.round((r.checkedIn / r.total) * 100) : 0;
                      return (
                        <tr key={r.raceId} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{r.raceName}</td>
                          <td className="px-5 py-3.5 text-sm text-gray-600">{r.total}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-red-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-700">{r.checkedIn} <span className="text-gray-400 text-xs">({pct}%)</span></span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-600">{r.finished}</td>
                          <td className="px-5 py-3.5 text-sm text-gray-600">{r.registered}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
          No data available.
        </div>
      )}
    </div>
  );
}
