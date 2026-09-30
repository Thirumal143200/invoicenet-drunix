import React, { useState, useEffect } from 'react';
import { UserPersona } from '../types';
import { ShieldCheck, History, User, Building, Clock, Filter } from 'lucide-react';

interface AuditTrailViewProps {
  currentPersona: UserPersona;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ currentPersona }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'x-user-role': currentPersona.role,
        'x-user-org': currentPersona.org,
        'x-user-id': currentPersona.name,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/audit-logs', { headers });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 6000);
    return () => clearInterval(interval);
  }, [currentPersona]);

  const filteredLogs = logs.filter((log) => {
    if (filterAction === 'ALL') return true;
    return log.action === filterAction;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="enterprise-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-royal" />
            <div>
              <h3 className="text-base font-bold text-navy uppercase tracking-wider">
                Consortium Audit Trail & Operations Log
              </h3>
              <p className="text-xs text-slate-500">
                Immutable, cryptographically anchored action history across all organizations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600">Filter:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white font-mono"
            >
              <option value="ALL">All Actions</option>
              <option value="USER_REGISTERED">USER_REGISTERED</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="FINANCING_REQUESTED">FINANCING_REQUESTED</option>
              <option value="FINANCING_APPROVED">FINANCING_APPROVED</option>
              <option value="FINANCING_REJECTED">FINANCING_REJECTED</option>
              <option value="PAYMENT_RECORDED">PAYMENT_RECORDED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No audit records match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor / User</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Entity Ref</th>
                  <th className="p-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-bold text-navy">{log.id}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-royal/10 text-royal border border-royal/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-sans text-slate-700">
                      {log.user_name || log.user_id || 'System Process'}
                    </td>
                    <td className="p-3 text-slate-600">{log.entity_type}</td>
                    <td className="p-3 font-bold text-navy">{log.entity_id || '—'}</td>
                    <td className="p-3 text-slate-500 truncate max-w-xs" title={JSON.stringify(log.metadata)}>
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
