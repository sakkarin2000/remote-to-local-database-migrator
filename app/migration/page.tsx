"use client";
import React, { useState, useEffect } from 'react';
import { useToast } from '../components/ToastProvider';

type PreviewRow = { table: string; sourceCount: number; destCount: number | null; existsInDest?: boolean; status?: 'ready'|'missing'|'mismatch'|'empty'|'unknown'; schemaDiff?: { missingInDest: string[]; extraInDest: string[]; typeMismatches: Array<{ column: string; srcType: string; destType: string }> } };

const MigrationPage = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [disableFK, setDisableFK] = useState(true);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [overwriteMap, setOverwriteMap] = useState<Record<string, boolean>>({});
  const [overwriteAll, setOverwriteAll] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [approximateCounts, setApproximateCounts] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const toast = useToast();

  const fetchPreview = async (silent = false) => {
    setStatus('Previewing tables...');
    // get credentials and selection from server memory
    const credsRes = await fetch('/api/get-credentials');
    if (!credsRes.ok) { if (!silent) toast.show('No credentials found. Please save credentials first.', 'error'); setStatus(''); return; }
    const creds = await credsRes.json();

    let tables: string[] = [];
    try {
      const selRes = await fetch('/api/get-selection');
      if (selRes.ok) {
        const sel = await selRes.json();
        tables = sel.selectedTables || [];
      } else {
        // fallback to client-side localStorage selection
        const raw = localStorage.getItem('tableSelection');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) tables = parsed;
        }
      }
    } catch (e) {
      const raw = localStorage.getItem('tableSelection');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) tables = parsed;
      }
    }
    if (tables.length === 0) { if (!silent) toast.show('No tables selected', 'error'); setStatus(''); return; }
    setSelectedCount(tables.length);

    const resp = await fetch('/api/preview-migration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: creds.source, destination: creds.destination, tables, approximate: approximateCounts }),
    });

    if (!resp.ok) {
      if (!silent) toast.show('Preview failed', 'error');
      setStatus('');
      return;
    }

    const data = await resp.json();
    setPreview(data.tables || []);
    // initialize overwrite map only for tables that have destCount > 0
    const map: Record<string, boolean> = {};
    (data.tables || []).forEach((r: PreviewRow) => {
      map[r.table] = false;
    });
    setOverwriteMap(map);
    setStatus('Preview ready');
    if (!silent) toast.show('Preview ready', 'info');
  };

  useEffect(() => {
    // auto-run preview on load and when approximateCounts changes; silent to avoid spammy toasts
    fetchPreview(true).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approximateCounts]);

  const beginMigration = async () => {
    if (confirmText !== 'MIGRATE') { toast.show('Type MIGRATE to confirm', 'error'); return; }

    // get credentials and selection again
    const credsRes = await fetch('/api/get-credentials');
    if (!credsRes.ok) { toast.show('No credentials found. Please save credentials first.', 'error'); return; }
    const creds = await credsRes.json();

    let tables: string[] = [];
    try {
      const selRes = await fetch('/api/get-selection');
      if (selRes.ok) {
        const sel = await selRes.json();
        tables = sel.selectedTables || [];
      } else {
        const raw = localStorage.getItem('tableSelection');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) tables = parsed;
        }
      }
    } catch (e) {
      const raw = localStorage.getItem('tableSelection');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) tables = parsed;
      }
    }
    if (tables.length === 0) { toast.show('No tables selected', 'error'); return; }

    setMigrating(true);
    setStatus('Migrating...');
    setProgress(0);

    // if user toggled overwriteAll, set all dest non-empty tables to true
    const finalMap: Record<string, boolean> = { ...overwriteMap };
    if (overwriteAll && preview) {
      preview.forEach((r) => {
        if ((r.destCount ?? 0) > 0) finalMap[r.table] = true;
      });
    }

    try {
      const resp = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: creds.source,
          destination: creds.destination,
          tables,
          disableForeignKeyChecks: disableFK,
          overwriteMap: finalMap,
        }),
      });

      if (!resp.ok) {
        toast.show('Migration failed', 'error');
        setStatus('Migration failed');
      } else {
        const body = await resp.json();
        setStatus('Migration completed');
        setProgress(100);
        toast.show('Migration completed', 'success');
        // show detailed results if present
        if (body.results) console.log('Migration results', body.results);
      }
    } catch (err) {
      console.error(err);
      toast.show('Migration failed', 'error');
      setStatus('Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Migration</h1>

      <div className="card mb-4">
        <div className="form-row">
          <label className="form-label">Disable Foreign Key Checks</label>
          <input type="checkbox" checked={disableFK} onChange={() => setDisableFK(!disableFK)} />
        </div>

            <div className="form-row">
              <label className="form-label">Preview Tables</label>
              <div className="flex gap-2">
                <button onClick={() => fetchPreview(false)} className="btn btn-primary">Reload Preview</button>
                <button onClick={() => { setPreview(null); setOverwriteMap({}); setStatus(''); setSelectedCount(0); }} className="btn btn-secondary">Clear Preview</button>
              </div>
            </div>

        {preview && (
          <div className="mt-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Preview results (source → destination)</div>
                <div className="text-xs text-slate-500">Selected tables: <strong>{selectedCount}</strong> • Approximate counts: <strong>{approximateCounts ? 'Yes' : 'No'}</strong></div>
              </div>
              <div className="text-sm">
                <strong className="text-green-700">{preview.filter(p => p.status === 'ready').length}</strong> ready • <strong className="text-yellow-700">{preview.filter(p => p.status === 'missing').length}</strong> missing • <strong className="text-orange-700">{preview.filter(p => p.status === 'mismatch').length}</strong> mismatch
              </div>
            </div>

            <div className="table-list">
              <div className="table-inner">
                <div className="table-header text-xs font-semibold">
                <div>Table</div>
                <div className="text-center">Source</div>
                <div className="text-center">Destination</div>
                <div className="text-center">Status</div>
                <div className="text-center">Action</div>
                <div className="text-center">Schema</div>
              </div>
              {preview.map((r, idx) => (
                      <div key={r.table} className="table-row bg-white">
                  <div className="font-medium break-words">{r.table}</div>
                  <div className="text-sm text-slate-600 text-center">{r.sourceCount === -1 ? '—' : r.sourceCount}</div>
                  <div className="text-sm text-slate-600 text-center">{r.destCount === null ? '—' : r.destCount}</div>
                  <div className="text-center">
                    {r.status === 'ready' && <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Ready</span>}
                    {r.status === 'missing' && <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">Missing</span>}
                    {r.status === 'mismatch' && <span className="inline-block bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">Mismatch</span>}
                    {r.status === 'empty' && <span className="inline-block bg-gray-100 text-slate-600 px-2 py-0.5 rounded text-xs">Empty</span>}
                    {r.status === 'unknown' && <span className="inline-block bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">Unknown</span>}
                  </div>
                  <div className="text-center">
                    {r.existsInDest && r.destCount && r.destCount > 0 ? (
                      <label className="flex items-center justify-center gap-2">
                        <input type="checkbox" checked={overwriteAll ? true : !!overwriteMap[r.table]} onChange={(e) => setOverwriteMap((m) => ({ ...m, [r.table]: e.target.checked }))} />
                      </label>
                    ) : (
                      <div className="text-sm text-green-600">Insert</div>
                    )}
                  </div>
                  <div className="text-xs text-amber-700 schema-cell">
                    {r.schemaDiff && (r.schemaDiff.missingInDest.length > 0 || r.schemaDiff.extraInDest.length > 0 || r.schemaDiff.typeMismatches.length > 0) ? (
                      <div>
                        {r.schemaDiff.missingInDest.length > 0 && <div>Missing: {r.schemaDiff.missingInDest.join(', ')}</div>}
                        {r.schemaDiff.extraInDest.length > 0 && <div>Extra: {r.schemaDiff.extraInDest.join(', ')}</div>}
                        {r.schemaDiff.typeMismatches.length > 0 && <div>Types: {r.schemaDiff.typeMismatches.map(m => `${m.column}(${m.srcType}→${m.destType})`).join('; ')}</div>}
                      </div>
                    ) : (
                      <div className="text-slate-400">No diffs</div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        <div className="form-row mt-4">
          <label className="form-label">Confirmation (type MIGRATE)</label>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="input" />
        </div>

        <div className="mt-2">
          <button disabled={migrating} onClick={beginMigration} className="btn btn-primary">Begin Migration</button>
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="text-sm text-slate-600">{status}</div>
      </div>
    </div>
  );
};

export default MigrationPage;