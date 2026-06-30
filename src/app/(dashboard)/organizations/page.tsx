'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Building2, Globe, Phone, MapPin, Link } from 'lucide-react';
import api from '@/lib/api';
import { type Organization } from '@/types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { OrganizationForm } from '@/components/organizations/organization-form';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

export default function OrganizationsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Organization | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then((r) => r.data),
  });

  const organizations: Organization[] = data?.data ?? data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization deleted.');
    },
    onError: () => toast.error('Could not delete organization.'),
  });

  const handleDelete = async (org: Organization) => {
    const ok = await confirm({ title: 'Delete Organization', message: `Delete "${org.name}"? All its events will also be removed.`, confirmLabel: 'Delete' });
    if (ok) deleteMutation.mutate(org.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Organization
        </Button>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt={org.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                      {org.description && (
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{org.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <button
                      onClick={() => setEditTarget(org)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(org)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {(org.phone || org.address || org.website || org.facebook || org.instagram) && (
                  <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                    {org.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>{org.phone}</span>
                      </div>
                    )}
                    {org.address && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{org.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {org.website && (
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Globe className="h-3 w-3" /> Website
                        </a>
                      )}
                      {org.facebook && (
                        <a href={org.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Link className="h-3 w-3" /> Facebook
                        </a>
                      )}
                      {org.instagram && (
                        <a href={org.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-pink-600 hover:underline">
                          <Link className="h-3 w-3" /> Instagram
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {organizations.length === 0 && (
            <p className="col-span-full py-12 text-center text-gray-500">No organizations yet.</p>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Organization">
        <OrganizationForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Organization">
        {editTarget && (
          <OrganizationForm organization={editTarget} onSuccess={() => setEditTarget(null)} />
        )}
      </Modal>
    </div>
  );
}
