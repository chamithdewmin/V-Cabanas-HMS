import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

function formatSessionTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

function formatDurationMs(ms) {
  if (ms == null || ms < 0 || !Number.isFinite(ms)) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function displayRole(role) {
  const r = (role || '').toLowerCase();
  if (r === 'receptionist') return 'staff';
  return r || '—';
}

export default function LoginActivity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('');

  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.auth.loginActivity();
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({
        title: 'Could not load history',
        description: err.message || 'Request failed',
        variant: 'destructive',
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const userOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const value = r.userId != null ? String(r.userId) : String(r.email || '');
      const mapKey = r.userId != null ? `id:${r.userId}` : `email:${r.email}`;
      if (!value || map.has(mapKey)) return;
      map.set(mapKey, {
        value,
        label: r.userName || r.email || 'User',
      });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!userFilter) return rows;
    return rows.filter((r) => {
      if (r.userId != null && String(r.userId) === userFilter) return true;
      return String(r.email || '') === userFilter;
    });
  }, [rows, userFilter]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Login / Logout History - V Cabanas HMS</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Login / Logout History</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Successful sign-ins and logouts. Active sessions show until the user signs out.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 sm:justify-end">
            <div className="space-y-1.5 min-w-[10rem]">
              <Label htmlFor="login-history-user" className="text-xs text-muted-foreground">
                Filter
              </Label>
              <select
                id="login-history-user"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="h-10 w-full min-w-[12rem] rounded-md border border-secondary bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">All users</option>
                {userOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" onClick={load} disabled={loading} className="shrink-0">
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/80">
                  <th className="px-4 py-3.5 text-left font-semibold text-foreground">User</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap">Login time</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap">Logout time</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap">Duration</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap">IP address</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-0 align-top">
                      <EmptyState
                        title="No session history yet"
                        description="Sign in and out to see records here."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const loginT = r.loginAt ? new Date(r.loginAt).getTime() : NaN;
                    const logoutT = r.logoutAt ? new Date(r.logoutAt).getTime() : null;
                    const active = !r.logoutAt;
                    const durationMs = Number.isFinite(loginT)
                      ? (logoutT != null ? logoutT - loginT : Date.now() - loginT)
                      : null;

                    return (
                      <tr key={r.id} className="border-b border-border/80 hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-semibold text-foreground">{r.userName || '—'}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {r.email || '—'} <span className="text-border">•</span>{' '}
                            <span className="capitalize">{displayRole(r.role)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top whitespace-nowrap tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-green-500 shrink-0" aria-hidden />
                            {formatSessionTime(r.loginAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          {active ? (
                            <span className="text-orange-500 font-medium">Active session</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 tabular-nums">
                              <ArrowRight className="w-3.5 h-3.5 text-red-500 shrink-0" aria-hidden />
                              {formatSessionTime(r.logoutAt)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          {active ? (
                            <span className="text-sky-500 font-medium">Ongoing</span>
                          ) : (
                            <span className="tabular-nums text-foreground">{formatDurationMs(durationMs)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top font-mono text-xs text-foreground">{r.ipAddress || '—'}</td>
                        <td className="px-4 py-3.5 align-top">
                          {active ? (
                            <span className="inline-flex items-center rounded-full bg-green-600/20 text-green-400 border border-green-600/30 px-2.5 py-0.5 text-xs font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border px-2.5 py-0.5 text-xs font-medium">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
