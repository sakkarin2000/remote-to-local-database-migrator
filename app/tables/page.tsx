"use client";
import React, { useEffect, useState } from 'react';
import { useToast } from '../components/ToastProvider';

const TableListPage = () => {
  const [tables, setTables] = useState<Array<{ table: string; sourceCount: number; destCount?: number; existsInDest?: boolean }>>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tableSelection');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSelectedTables(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchTables = async () => {
    const credsRes = await fetch('/api/get-credentials');
    if (!credsRes.ok) { toast.show('No credentials found. Please save credentials first.', 'error'); return; }
    const creds = await credsRes.json();

    const response = await fetch('/api/fetch-tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: creds.source, destination: creds.destination }),
    });

    if (response.ok) {
      const data = await response.json();
      // data.tables is expected to be [{ table, sourceCount, destCount?, existsInDest? }]
      setTables(data.tables || []);
      if (data.migrationLock) {
        const ml = data.migrationLock;
        toast.show(`Destination migrations: ${ml.hasMigrationsTable ? 'yes' : 'no'}; lock: ${ml.isLocked === null ? 'unknown' : ml.isLocked ? 'locked' : 'unlocked'}`, 'info');
      }
      toast.show('Tables fetched', 'success');
    } else {
      toast.show('Failed to fetch tables', 'error');
    }
  };

  const toggleTableSelection = (table: string) => {
    setSelectedTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  const saveSelection = async () => {
    const res = await fetch('/api/store-selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedTables }),
    });
    if (res.ok) {
      try {
        localStorage.setItem('tableSelection', JSON.stringify(selectedTables));
      } catch (e) {}
      toast.show('Selection saved', 'success');
    } else {
      toast.show('Failed to save selection', 'error');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Table List</h1>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={fetchTables} className="btn btn-primary">Fetch Tables</button>
        <button onClick={saveSelection} className="btn btn-secondary">Save Selection</button>
      </div>

      <div className="table-list">
        {tables.map((t) => (
            <div key={t.table} className="table-item">
              <input type="checkbox" checked={selectedTables.includes(t.table)} onChange={() => toggleTableSelection(t.table)} />
              <div style={{fontWeight:600}}>{t.table}</div>
              <div className="text-sm text-slate-600 ml-4">SRC: {t.sourceCount >= 0 ? t.sourceCount.toLocaleString() : 'N/A'}</div>
              <div className="text-sm text-slate-600 ml-auto">DEST: {typeof t.destCount === 'number' ? (t.destCount >= 0 ? t.destCount.toLocaleString() : 'N/A') : '-'}</div>
            </div>
          ))}
        {tables.length === 0 && <div className="text-sm text-slate-500 p-2">No tables loaded. Click "Fetch Tables" to load.</div>}
      </div>
      {tables.length > 0 && (
        <div className="mt-3 text-sm text-slate-600">
          Total source rows: {tables.reduce((s, r) => s + (r.sourceCount > 0 ? r.sourceCount : 0), 0).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default TableListPage;