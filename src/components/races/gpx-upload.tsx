'use client';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Route } from 'lucide-react';
import api from '@/lib/api';
import { type Race } from '@/types';
import { useToast } from '@/components/ui/toast';

interface Props {
  race: Race;
}

export function GpxUpload({ race }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post(`/races/${race.id}/gpx`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      toast.success('GPX route uploaded.');
    },
    onError: () => toast.error('Failed to upload GPX file.'),
  });

  const removeMutation = useMutation({
    mutationFn: () => api.delete(`/races/${race.id}/gpx`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      toast.success('GPX route removed.');
    },
    onError: () => toast.error('Failed to remove GPX.'),
  });

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.gpx')) {
      toast.error('Please select a .gpx file');
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Route className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-medium text-gray-700">GPX Route File</p>
      </div>

      {race.gpxUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">✓ Route uploaded</p>
            <p className="text-xs text-green-600 truncate">{race.gpxUrl.split('/').pop()}</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Replace
          </button>
          <button
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            className="text-xs text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className={`h-8 w-8 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {uploadMutation.isPending ? 'Uploading…' : 'Drop .gpx file or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">GPX format — exported from Strava, Garmin, Komoot, etc.</p>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".gpx,application/gpx+xml"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}
