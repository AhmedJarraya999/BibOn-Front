'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useMemo } from 'react';
import { Plus, Package, Upload, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { type Registration, type Race, type Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Drawer } from '@/components/ui/drawer';
import { RegistrationForm } from '@/components/registrations/registration-form';
import { DistributionPanel } from '@/components/distributions/distribution-panel';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  REGISTERED: 'info',
  CHECKED_IN: 'success',
  DNS: 'warning',
  DNF: 'danger',
  FINISHED: 'success',
  DISQUALIFIED: 'danger',
};

const STATUS_OPTIONS = ['REGISTERED', 'CHECKED_IN', 'DNS', 'DNF', 'FINISHED', 'DISQUALIFIED'];

interface DistributionTarget {
  registrationId: string;
  bibNumber: string;
  participantName: string;
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
        className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

export default function RegistrationsPage() {
  const [page, setPage] = useState(1);
  const [filterEventId, setFilterEventId] = useState('');
  const [filterRaceId, setFilterRaceId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRaceId, setImportRaceId] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [distributionTarget, setDistributionTarget] = useState<DistributionTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

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

  const importMutation = useMutation({
    mutationFn: ({ raceId, file }: { raceId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return api.post(`/registrations/import/${raceId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: () => toast.error('Import failed. Check your CSV file.'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['registrations', page, filterRaceId],
    queryFn: () =>
      api
        .get('/registrations', {
          params: { page, limit: 20, ...(filterRaceId && { raceId: filterRaceId }) },
        })
        .then((r) => r.data),
  });

  const registrations: Registration[] = data?.data ?? [];
  const meta = data?.meta;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/registrations/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Status updated.');
    },
    onError: () => toast.error('Could not update status.'),
  });

  const handleEventChange = (eventId: string) => {
    setFilterEventId(eventId);
    setFilterRaceId('');
    setPage(1);
  };

  const handleRaceChange = (raceId: string) => {
    setFilterRaceId(raceId);
    setPage(1);
  };

  const activeEvent = events.find((e) => e.id === filterEventId);
  const activeRace = allRaces.find((r) => r.id === filterRaceId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Registrations</h1>
          {(activeEvent || activeRace) && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {activeEvent?.name}
              {activeRace && <span className="mx-1.5 text-gray-300">›</span>}
              {activeRace?.name}
              {meta?.total != null && (
                <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {meta.total} registrations
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportOpen(true); setImportResult(null); }}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Registration
          </Button>
        </div>
      </div>

      {/* Cascading filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Event
            </label>
            <FilterSelect
              value={filterEventId}
              onChange={handleEventChange}
              placeholder="All events"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </FilterSelect>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Race
            </label>
            <FilterSelect
              value={filterRaceId}
              onChange={handleRaceChange}
              placeholder={filterEventId ? 'All races in event' : 'All races'}
              disabled={filteredRaces.length === 0}
            >
              {filteredRaces.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </FilterSelect>
          </div>

          {(filterEventId || filterRaceId) && (
            <button
              onClick={() => { setFilterEventId(''); setFilterRaceId(''); setPage(1); }}
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                {['Bib', 'Participant', 'Race', 'Status', 'Items'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {registrations.map((r) => (
                <tr key={r.id} className="group hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {r.bibNumber ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {r.participant?.fullName ?? r.participantId}
                    </p>
                    {r.participant?.email && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{r.participant.email}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {r.race?.name ?? r.raceId}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={r.status}
                        onChange={(e) => statusMutation.mutate({ id: r.id, status: e.target.value })}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status}</Badge>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <button
                      onClick={() =>
                        setDistributionTarget({
                          registrationId: r.id,
                          bibNumber: r.bibNumber,
                          participantName: r.participant?.fullName ?? 'Participant',
                        })
                      }
                      className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors dark:border-gray-700 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Items
                    </button>
                  </td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-gray-400 dark:text-gray-600">
                    No registrations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {meta.page} of {meta.totalPages} &bull; {meta.total} total
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Import CSV modal */}
      <Modal
        open={importOpen}
        onClose={() => { setImportOpen(false); setImportResult(null); }}
        title="Import from CSV (Tunisie Evenement)"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Upload the CSV exported from Tunisie Evenement or Sportsense. Participants will be created
            automatically and linked to the selected race.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Race
            </label>
            <FilterSelect
              value={importRaceId}
              onChange={setImportRaceId}
              placeholder="Select race…"
            >
              {allRaces.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </FilterSelect>
          </div>

          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/10"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Click to select CSV file</p>
            <p className="mt-1 text-xs text-gray-400">.csv files only</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && importRaceId) importMutation.mutate({ raceId: importRaceId, file });
                else if (!importRaceId) toast.error('Please select a race first.');
              }}
            />
          </div>

          {importMutation.isPending && (
            <p className="animate-pulse text-center text-sm text-blue-600">Importing…</p>
          )}

          {importResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{importResult.imported} participants imported successfully</p>
              </div>
              {importResult.skipped > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm">{importResult.skipped} rows skipped</p>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-gray-500 dark:text-gray-400">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Registration">
        <RegistrationForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Drawer
        open={!!distributionTarget}
        onClose={() => setDistributionTarget(null)}
        title={`Bib #${distributionTarget?.bibNumber ?? ''}`}
        subtitle={distributionTarget?.participantName}
      >
        {distributionTarget && (
          <DistributionPanel
            registrationId={distributionTarget.registrationId}
            bibNumber={distributionTarget.bibNumber}
            participantName={distributionTarget.participantName}
          />
        )}
      </Drawer>
    </div>
  );
}
