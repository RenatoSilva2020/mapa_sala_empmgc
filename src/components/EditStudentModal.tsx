import React, { useState, useEffect } from 'react';
import { User, ArrowRightLeft, CheckCircle2, UserX, X } from 'lucide-react';
import { StudentData, ClassData } from '../types';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentData | null;
  classes: ClassData[];
  onSave: (updatedData: {
    id: string;
    name: string;
    classId: string;
    status: 'active' | 'inactive';
  }) => void;
}

export function EditStudentModal({
  isOpen,
  onClose,
  student,
  classes,
  onSave
}: EditStudentModalProps) {
  const [name, setName] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    if (student) {
      setName(student.name);
      setTargetClassId(student.classId);
      setStatus(student.status === 'inactive' ? 'inactive' : 'active');
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const currentClass = classes.find(c => c.id === student.classId);
  const isTransferring = targetClassId !== student.classId;
  const targetClass = classes.find(c => c.id === targetClassId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetClassId) return;

    onSave({
      id: student.id,
      name: name.trim(),
      classId: targetClassId,
      status
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold">Editar Estudante</h2>
              <p className="text-xs text-slate-300">Alterar dados ou remanejar de turma</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Nome do Estudante */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
              Nome do Estudante
            </label>
            <input 
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Ex: João da Silva"
            />
          </div>

          {/* Turma & Remanejamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider flex items-center justify-between">
              <span>Turma (Remanejamento)</span>
              {isTransferring && (
                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Transferência Detectada
                </span>
              )}
            </label>

            <select
              value={targetClassId}
              onChange={e => setTargetClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.id === student.classId ? '(Turma Atual)' : ''}
                </option>
              ))}
            </select>

            {isTransferring && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 mt-2 animate-in fade-in">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <ArrowRightLeft size={14} className="text-amber-600 shrink-0" />
                  <span>Remanejando de <strong>{currentClass?.name}</strong> para <strong>{targetClass?.name}</strong></span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  O estudante sairá de qualquer assento ocupado nesta sala e entrará na lista "Sem Assento" da turma de destino.
                </p>
              </div>
            )}
          </div>

          {/* Situação Cadastral (Ativo / Inativo / Taxado) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
              Situação Cadastral
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'active'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 size={16} className={status === 'active' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Ativo na Sala</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'inactive'
                    ? 'bg-red-50 border-red-400 text-red-800 ring-2 ring-red-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserX size={16} className={status === 'inactive' ? 'text-red-600' : 'text-slate-400'} />
                <span>Inativo / Taxado</span>
              </button>
            </div>
            {status === 'inactive' && (
              <p className="text-[11px] text-slate-500 pl-1 mt-1">
                O aluno ficará fora do mapa, marcado como taxado na lista de inativos, podendo ser reativado a qualquer momento.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Salvar Alterações</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
