import React, { useEffect, useState } from 'react';
import { BlockchainBlock } from '../types';
import { Box, Layers, ShieldCheck, Clock, Server, CheckCircle2 } from 'lucide-react';

export const NetworkExplorerView: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBlockchainData = async () => {
    try {
      const [blocksRes, statusRes] = await Promise.all([
        fetch('/api/blockchain/blocks'),
        fetch('/api/blockchain/status'),
      ]);
      const blocksData = await blocksRes.json();
      const statusData = await statusRes.json();

      if (blocksData.success) setBlocks(blocksData.data);
      if (statusData.success) setNetworkStatus(statusData.data);
    } catch (err) {
      console.error('Failed to fetch blockchain explorer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockchainData();
    const interval = setInterval(fetchBlockchainData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Network Overview Grid */}
      {networkStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 enterprise-card space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Server className="h-4 w-4 text-royal" />
              <span>Consensus Topology</span>
            </div>
            <div className="text-base font-bold text-navy">Raft Crash Fault Tolerant</div>
            <div className="text-xs text-slate-500 font-mono">Orderer: {networkStatus.orderer}</div>
          </div>

          <div className="p-5 enterprise-card space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>State Database Engine</span>
            </div>
            <div className="text-base font-bold text-navy">YugabyteDB (Distributed SQL)</div>
            <div className="text-xs text-slate-500">Enables atomic SQL queries directly against world state</div>
          </div>

          <div className="p-5 enterprise-card space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-emerald" />
              <span>Endorsement Policy</span>
            </div>
            <div className="text-base font-bold text-navy">Multi-Party Verification</div>
            <div className="text-xs text-slate-500 font-mono">AND('SupplierMSP', 'BuyerMSP')</div>
          </div>
        </div>
      )}

      {/* Connected Nodes Matrix */}
      {networkStatus && networkStatus.connectedOrganizations && (
        <div className="p-6 enterprise-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider flex items-center space-x-2">
              <span>DRUNIX Federated Peer Nodes</span>
            </h3>
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold border ${
                networkStatus.liveConnection
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              {networkStatus.liveConnection ? '● Live DLT Fabric' : '● Deterministic Replica (Demo Mode)'}
            </span>
          </div>

          {networkStatus.notice && (
            <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-2 font-sans">
              <div className="mt-0.5 font-bold text-royal">ℹ</div>
              <div>{networkStatus.notice}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {networkStatus.connectedOrganizations.map((org: any, idx: number) => {
              const isLive = org.status === 'ONLINE_LIVE' || org.status === 'ONLINE';
              return (
                <div key={idx} className="p-4 rounded-lg soft-panel space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-navy font-mono">{org.name}</span>
                    <span
                      className={`flex items-center space-x-1 text-[11px] font-bold ${
                        isLive ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isLive ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}
                      ></span>
                      <span>{org.status}</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">{org.role}</div>
                  <div className="text-[11px] font-mono text-slate-400">{org.endpoint}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Blocks Explorer */}
      <div className="p-6 enterprise-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider flex items-center space-x-2">
            <Box className="h-4 w-4 text-royal" />
            <span>DRUNIX Block Ledger Explorer</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">Block Count: {blocks.length}</span>
        </div>

        <div className="space-y-3">
          {blocks.map((block) => (
            <div
              key={block.blockNumber}
              className="p-4 rounded-lg soft-panel hover:border-slate-300 transition-all font-mono text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-softGray-border pb-2.5 mb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded bg-blue-50 text-royal font-bold border border-blue-200">
                    Block #{block.blockNumber}
                  </span>
                  <span className="text-slate-600 text-[11px] font-sans">
                    {block.transactionsCount} {block.transactionsCount === 1 ? 'Transaction' : 'Transactions'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(block.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="truncate">
                  <span className="text-slate-400">Block Hash: </span>
                  <span className="text-navy font-semibold">{block.blockHash}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Prev Hash: </span>
                  <span className="text-navy font-semibold">{block.previousHash}</span>
                </div>
              </div>

              {block.transactions && block.transactions.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-softGray-border">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 font-sans">Transactions Included:</div>
                  <div className="space-y-1">
                    {block.transactions.map((tx, tidx) => (
                      <div key={tidx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded border border-softGray-border">
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald font-bold text-[10px]">{tx.action}</span>
                          <span className="text-slate-500 text-[10px]">[{tx.mspId}]</span>
                        </div>
                        <span className="text-navy font-mono text-[10px] font-semibold">{tx.txId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
