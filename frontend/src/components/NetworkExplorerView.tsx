import React, { useEffect, useState } from 'react';
import { BlockchainBlock } from '../types';
import { Box, Layers, Cpu, ShieldCheck, CheckCircle2, Hash, Clock, Server } from 'lucide-react';

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
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Network Overview Grid */}
      {networkStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Server className="h-4 w-4 text-cyan-400" />
              <span>Consensus Architecture</span>
            </div>
            <div className="text-base font-bold text-white">Raft Crash Fault Tolerant</div>
            <div className="text-xs text-slate-400 font-mono">Orderer: {networkStatus.orderer}</div>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>State Database Engine</span>
            </div>
            <div className="text-base font-bold text-white">YugabyteDB (Distributed SQL)</div>
            <div className="text-xs text-slate-400">Enables real-time SQL queries across receivables world state</div>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Endorsement Policy</span>
            </div>
            <div className="text-base font-bold text-white">Multi-Org Cryptographic Proof</div>
            <div className="text-xs text-slate-400 font-mono">AND('SupplierMSP.peer', 'BuyerMSP.peer')</div>
          </div>
        </div>
      )}

      {/* Connected Nodes Matrix */}
      {networkStatus && networkStatus.connectedOrganizations && (
        <div className="p-6 rounded-2xl glass-panel border border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <span>DRUNIX Federated Peer Nodes</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              3 Orgs Active
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {networkStatus.connectedOrganizations.map((org: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-cyan-300 font-mono">{org.name}</span>
                  <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>{org.status}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-300">{org.role}</div>
                <div className="text-[11px] font-mono text-slate-500">{org.endpoint}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Blocks Explorer */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Box className="h-4 w-4 text-cyan-400" />
            <span>DRUNIX Block Ledger Explorer</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Total Blocks: {blocks.length}</span>
        </div>

        <div className="space-y-3">
          {blocks.map((block) => (
            <div
              key={block.blockNumber}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all font-mono text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5 mb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                    Block #{block.blockNumber}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {block.transactionsCount} {block.transactionsCount === 1 ? 'Transaction' : 'Transactions'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(block.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="truncate">
                  <span className="text-slate-500">Block Hash: </span>
                  <span className="text-slate-300">{block.blockHash}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-500">Prev Hash: </span>
                  <span className="text-slate-300">{block.previousHash}</span>
                </div>
              </div>

              {block.transactions && block.transactions.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/40">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">Transactions:</div>
                  <div className="space-y-1">
                    {block.transactions.map((tx, tidx) => (
                      <div key={tidx} className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/50">
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-400 font-bold text-[10px]">{tx.action}</span>
                          <span className="text-slate-500 text-[10px]">[{tx.mspId}]</span>
                        </div>
                        <span className="text-cyan-300 font-mono text-[10px]">{tx.txId}</span>
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
