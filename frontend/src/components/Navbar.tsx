import React from 'react';
import { UserPersona, PersonaRole } from '../types';
import { Layers, ShieldCheck, Cpu, ArrowRightLeft, Database } from 'lucide-react';

interface NavbarProps {
  currentPersona: UserPersona;
  onSelectPersona: (persona: UserPersona) => void;
  personas: UserPersona[];
  blockHeight: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPersona,
  onSelectPersona,
  personas,
  blockHeight,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#090D16]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-400 p-[1px]">
              <div className="h-full w-full bg-[#090D16] rounded-xl flex items-center justify-center">
                <Layers className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">Invoice<span className="text-cyan-400">Net</span></span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  DRUNIX Powered
                </span>
              </div>
              <p className="text-xs text-slate-400">Multi-Party MSME Liquidity & Factoring Network</p>
            </div>
          </div>

          {/* Network Health Indicators */}
          <div className="hidden lg:flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300">Channel: invoicenet-channel</span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              <span>YugabyteDB SQL</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>Block #{blockHeight}</span>
            </div>
          </div>

          {/* Persona Switcher */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">Persona:</span>
            <div className="flex bg-slate-900/90 border border-slate-800 rounded-xl p-1 space-x-1">
              {personas.map((p) => {
                const isActive = currentPersona.role === p.role;
                return (
                  <button
                    key={p.role}
                    onClick={() => onSelectPersona(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{p.name.split(' ')[0]}</span>
                    <span className="text-[10px] opacity-75 hidden md:inline">({p.role.slice(0, 3)})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
