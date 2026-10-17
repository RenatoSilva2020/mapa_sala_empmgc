import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { StudentCard } from './StudentCard';
import { StudentData } from '../types';
import { Plus, X, RotateCcw, Edit2, UserX, Users, UserCheck, Search, Shuffle } from 'lucide-react';

interface SidebarProps {
  students: StudentData[];
  inactiveStudents: StudentData[];
  onAddStudent: () => void;
  onDeleteStudent: (id: string) => void;
  onReactivateStudent: (id: string) => void;
  onEditStudent: (student: StudentData) => void;
  onRandomizeSeats?: () => void;
  onResetMap?: () => void;
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
  isLocked: boolean;
  onClose?: () => void;
}

export function Sidebar({ 
  students, 
  inactiveStudents,
  onAddStudent, 
  onDeleteStudent, 
  onReactivateStudent,
  onEditStudent,
  onRandomizeSeats,
  onResetMap,
  selectedStudentId, 
  onSelectStudent, 
  onClose, 
  isLocked 
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'unseated' | 'inactive'>('unseated');
  const [searchTerm, setSearchTerm] = useState('');
  const { isOver, setNodeRef } = useDroppable({ id: 'sidebar', disabled: isLocked });

  const filteredUnseated = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInactive = inactiveStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full bg-white flex flex-col h-full shadow-sm z-10 print:hidden border-r border-slate-200">
      
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="sm:hidden p-1 hover:bg-slate-200 rounded-md text-slate-600">
              <X size={20} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h2 className="font-bold text-sm sm:text-base text-slate-800">
              Gestão de Alunos
            </h2>
          </div>
        </div>

        {!isLocked && (
          <button 
            onClick={onAddStudent} 
            className="text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-semibold shadow-xs cursor-pointer" 
            title="Adicionar Novo Aluno"
          >
            <Plus size={15} />
            <span>Novo</span>
          </button>
        )}
      </div>

      {/* Segmented Tabs: Sem Assento vs Inativos */}
      <div className="p-2 bg-slate-100/80 border-b border-slate-200">
        <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('unseated')}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'unseated'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Sem Assento</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'unseated' ? 'bg-blue-100 text-blue-700' : 'bg-slate-300 text-slate-700'
            }`}>
              {students.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inactive')}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'inactive'
                ? 'bg-white text-red-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Taxados / Inativos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-slate-300 text-slate-700'
            }`}>
              {inactiveStudents.length}
            </span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative mt-2">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-slate-800"
          />
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tab Content 1: Active Unseated Students */}
      {activeTab === 'unseated' && (
        <div 
          ref={setNodeRef}
          className={`flex-1 overflow-auto p-3 flex flex-col gap-2.5 transition-colors ${
            isOver ? 'bg-blue-50/70' : 'bg-slate-50/50'
          }`}
        >
          {!isLocked && !searchTerm && (onRandomizeSeats || onResetMap) && (
            <div className="flex items-center gap-1.5 mb-1 shrink-0">
              {onRandomizeSeats && (
                <button
                  type="button"
                  onClick={onRandomizeSeats}
                  className="flex-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                  title="Distribuir estudantes aleatoriamente nas carteiras"
                >
                  <Shuffle size={13} className="text-purple-600 shrink-0" />
                  <span className="truncate">Sortear</span>
                </button>
              )}
              {onResetMap && (
                <button
                  type="button"
                  onClick={onResetMap}
                  className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                  title="Retirar todos os estudantes das carteiras"
                >
                  <RotateCcw size={13} className="text-amber-600 shrink-0" />
                  <span className="truncate">Reiniciar</span>
                </button>
              )}
            </div>
          )}

          {filteredUnseated.map(student => (
            <div key={student.id} className="relative group h-16 shrink-0">
              <div 
                onClick={() => !isLocked && onSelectStudent(student.id)}
                className={`w-full h-full transition-all ${
                  selectedStudentId === student.id ? 'ring-4 ring-blue-500 ring-offset-2 rounded-lg scale-95' : ''
                } ${isLocked ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <StudentCard student={student} isLocked={isLocked} />
              </div>
              
              {!isLocked && (
                <div className="absolute -top-2 -right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/95 p-0.5 rounded-full shadow-md border border-slate-200">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStudent(student);
                    }}
                    className="bg-blue-600 text-white rounded-full p-1 shadow-xs hover:bg-blue-700 cursor-pointer"
                    title="Editar / Remanejar Aluno"
                  >
                    <Edit2 size={11} className="w-3 h-3" />
                  </button>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStudent(student.id);
                    }}
                    className="bg-red-500 text-white rounded-full p-1 shadow-xs hover:bg-red-600 cursor-pointer"
                    title="Desativar Aluno (Taxar)"
                  >
                    <UserX size={11} className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredUnseated.length === 0 && (
            <div className="text-center my-auto py-8 px-2 text-slate-400 flex flex-col items-center">
              <Users size={32} className="mb-2 opacity-30 text-slate-500" />
              <p className="text-xs font-medium text-slate-500">
                {searchTerm ? 'Nenhum aluno encontrado com este nome.' : 'Nenhum aluno sem assento.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                {searchTerm ? 'Tente outro termo de busca.' : 'Todos os estudantes ativos já estão posicionados nas carteiras.'}
              </p>
              {!isLocked && !searchTerm && (
                <button 
                  onClick={onAddStudent}
                  className="mt-3 text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Adicionar Novo Aluno
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Inactive / Taxados Students */}
      {activeTab === 'inactive' && (
        <div className="flex-1 overflow-auto p-3 flex flex-col gap-2.5 bg-slate-50/50">
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-tight flex items-start gap-1.5">
            <span className="font-bold">Nota:</span>
            <span>Alunos taxados/inativos ficam fora do mapa e podem ser reativados a qualquer momento.</span>
          </div>

          {filteredInactive.map(student => (
            <div 
              key={student.id} 
              className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-400 line-through block truncate uppercase">
                  {student.name}
                </span>
                <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 bg-red-100 text-red-700 rounded-full">
                  Taxado / Inativo
                </span>
              </div>

              {!isLocked && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onReactivateStudent(student.id)}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Reativar Aluno para a Turma"
                  >
                    <RotateCcw size={12} />
                    <span>Reativar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditStudent(student)}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Editar / Remanejar Turma"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredInactive.length === 0 && (
            <div className="text-center my-auto py-8 px-2 text-slate-400 flex flex-col items-center">
              <UserCheck size={32} className="mb-2 opacity-30 text-emerald-600" />
              <p className="text-xs font-medium text-slate-500">
                {searchTerm ? 'Nenhum aluno inativo encontrado.' : 'Nenhum aluno inativo nesta turma.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Quando você desativar/taxar um aluno, ele aparecerá aqui para eventual reativação ou remanejamento.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
