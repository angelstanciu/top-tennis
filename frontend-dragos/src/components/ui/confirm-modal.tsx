import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: 'triangle' | 'circle';
  variant?: 'danger' | 'warning';
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  icon = 'triangle',
  variant = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`relative w-[90vw] max-w-sm rounded-3xl bg-slate-900 border border-white/10 p-6 shadow-2xl overflow-hidden`}
          >
             <div className="flex flex-col items-center text-center gap-3 relative z-10">
                <div className={`p-4 rounded-2xl ${variant === 'danger' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                  {icon === 'triangle' ? <AlertTriangle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight mt-1">{title}</h3>
                <p className="text-sm md:text-base text-slate-400 mb-3">{description}</p>
                
                <div className="flex items-center gap-3 w-full mt-2">
                  <button
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-xs md:text-sm border border-white/10 tracking-wide uppercase"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={onConfirm}
                    className={`flex-1 py-3 rounded-xl font-black transition-all text-xs md:text-sm tracking-wide uppercase shadow-lg ${
                      variant === 'danger' 
                        ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20' 
                        : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                    }`}
                  >
                    {confirmText}
                  </button>
                </div>
             </div>
             {/* Decorative glow */}
             <div className={`absolute -top-16 block -right-16 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none ${variant === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
