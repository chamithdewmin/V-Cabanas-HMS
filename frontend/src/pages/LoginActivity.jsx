import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/EmptyState';

function formatDt(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch {
    return '—';
  }
}

const failureLabels = {
  user_not_found: 'User not found',
  invalid_password: 'Invalid password',
};

export default function LoginActivity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.auth.loginActivity();
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({
        title: 'Could not load activity',
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

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Login activity - V Cabanas HMS</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Login activity</h1>
            <p className="text-muted-foreground">
              Sign-in attempts, IP addresses, and session logouts (admin accounts can stay signed in on multiple devices).
            </p>
          </div>
          <Button type="button" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-secondary bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Login time</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Logout time</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Result</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Email</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Name</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Role</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">IP address</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">If failed</th>
                  <th className="px-3 py-3 text-left font-semibold min-w-[12rem]">User agent</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-0 align-top">
                      <EmptyState title="No records yet" description="Login events will appear here after the next sign-in." />
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-secondary hover:bg-secondary/30">
                      <td className="px-3 py-2.5 align-top tabular-nums whitespace-nowrap">{formatDt(r.loginAt)}</td>
                      <td className="px-3 py-2.5 align-top tabular-nums whitespace-nowrap">{formatDt(r.logoutAt)}</td>
                      <td className="px-3 py-2.5 align-top">
                        {r.success ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">Success</span>
                        ) : (
                          <span className="text-destructive font-medium">Failed</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top break-all max-w-[14rem]">{r.email || '—'}</td>
                      <td className="px-3 py-2.5 align-top">{r.userName || '—'}</td>
                      <td className="px-3 py-2.5 align-top capitalize">{r.role || '—'}</td>
                      <td className="px-3 py-2.5 align-top font-mono text-xs">{r.ipAddress || '—'}</td>
                      <td className="px-3 py-2.5 align-top text-muted-foreground">
                        {!r.success && r.failureReason
                          ? failureLabels[r.failureReason] || r.failureReason
                          : '—'}
                      </td>
                      <td
                        className="px-3 py-2.5 align-top text-xs text-muted-foreground max-w-[20rem] truncate"
                        title={r.userAgent || ''}
                      >
                        {r.userAgent || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
