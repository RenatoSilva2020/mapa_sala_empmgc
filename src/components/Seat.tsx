import { useDroppable } from '@dnd-kit/core';
import { StudentCard } from './StudentCard';
import { StudentData } from '../types';
import { X, LogOut, Edit2 } from 'lucide-react';

interface SeatProps {
  key?: string;
  id: string;
  student?: StudentData;
  onDeleteStudent: (id: string) => void;
  onUnseatStudent: (id: string) => void;
  onEditStudent?: (student: StudentData) => void;
  isSelected: boolean;
  onSelect: () => void;
  onSelectStudent: (id: string) => void;
  isLocked: boolean;
}

export function Seat({ id, student, onDeleteStudent, onUnseatStudent, onEditStudent, isSelected, onSelect, onSelectStudent, isLocked }: SeatProps) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: isLocked });

  return (
    <div className="flex flex-col items-center print:m-0 print:p-0">
      <div 
        ref={setNodeRef}
        onClick={onSelect}
        className={`relative w-24 h-16 sm:w-28 sm:h-20 border-2 flex items-center justify-center p-1 transition-all ${
          !isLocked ? 'cursor-pointer' : 'cursor-default'
        } ${
          isSelected ? 'ring-4 ring-blue-500 ring-offset-2 rounded-lg scale-95 z-20' : ''
        } ${
          isOver ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-400'
        } print:border-black print:bg-white print:w-32 print:h-16`}
      >
        {student ? (
          <div className="w-full h-full group relative">
            <div 
              className="w-full h-full"
              onClick={(e) => {
                e.stopPropagation();
                if (!isLocked) onSelectStudent(student.id);
              }}
            >
              <StudentCard student={student} isLocked={isLocked} />
            </div>
            {!isLocked && (
              <div className="absolute -top-2.5 -right-2.5 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20 print:hidden bg-white/90 p-0.5 rounded-full shadow-md border border-slate-200">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnseatStudent(student.id);
                  }}
                  className="bg-amber-500 text-white rounded-full p-1 shadow-xs hover:bg-amber-600 cursor-pointer"
                  title="Tirar do Mapa"
                >
                  <LogOut size={11} className="w-3 h-3" />
                </button>
                {onEditStudent && (
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
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteStudent(student.id);
                  }}
                  className="bg-red-500 text-white rounded-full p-1 shadow-xs hover:bg-red-600 cursor-pointer"
                  title="Desativar Aluno (Taxar)"
                >
                  <X size={11} className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full border-2 border-slate-200 flex items-center justify-center bg-slate-50 print:border-none print:bg-transparent">
            <span className="text-slate-400 text-xs font-medium uppercase print:hidden">Vazio</span>
          </div>
        )}
      </div>
      {/* Chair drawing */}
      <div className={`w-16 h-3 border-b-2 border-l-2 border-r-2 border-slate-400 mt-1 print:border-black print:w-20 print:h-2 transition-colors ${isSelected ? 'border-blue-500' : ''}`}></div>
    </div>
  );
}
