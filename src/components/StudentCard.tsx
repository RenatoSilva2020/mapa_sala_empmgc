import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { StudentData } from '../types';

interface StudentCardProps {
  student: StudentData;
  isLocked?: boolean;
}

export function StudentCard({ student, isLocked }: StudentCardProps) {
  const isInactive = student.status === 'inactive';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
    data: student,
    disabled: isLocked || isInactive,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isLocked || isInactive ? {} : listeners)}
      {...(isLocked || isInactive ? {} : attributes)}
      className={`w-full h-full min-h-[3rem] border-2 flex items-center justify-center text-center p-1 transition-shadow ${
        isInactive 
          ? 'bg-slate-100 border-slate-200 cursor-default opacity-60' 
          : isLocked 
            ? 'bg-white border-slate-300 cursor-default' 
            : 'bg-white border-slate-300 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow'
      } ${
        isDragging ? 'border-blue-500 shadow-lg' : 'shadow-sm'
      } print:border-none print:shadow-none print:p-0 print:bg-transparent`}
    >
      <span className={`text-[10px] sm:text-xs break-words line-clamp-3 uppercase select-none print:text-black print:text-[10px] print:leading-tight ${
        isInactive 
          ? 'line-through text-slate-400 font-medium' 
          : 'font-semibold text-slate-700'
      }`}>
        {student.name}
      </span>
    </div>
  );
}
