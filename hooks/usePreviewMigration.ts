"use client";
import { useState } from 'react';
import { endpoints, postJson } from '../lib/api';

export function usePreviewMigration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function preview(payload: any) {
    setLoading(true);
    setError(null);
    try {
      const data = await postJson(endpoints.previewMigration, payload);
      return data;
    } catch (e: any) {
      setError(e.message || 'Failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { preview, loading, error };
}
