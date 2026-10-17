import React, { useState, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, TouchSensor, closestCenter, DragOverlay } from '@dnd-kit/core';
import { Trash2, Users, Loader2, Edit, Plus, Download, Menu, X as CloseIcon, DoorOpen, Monitor, Lock, Unlock, Save, History, LogOut, CheckCircle2, AlertTriangle, Info, Shuffle, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ClassroomMap } from './components/ClassroomMap';
import { Sidebar } from './components/Sidebar';
import { EditStudentModal } from './components/EditStudentModal';
import { ClassData, StudentData, HistoryEntry } from './types';
import { StudentCard } from './components/StudentCard';
import { DEFAULT_CONFIG } from './config';

export default function App() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  
  // Class Modal State
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassRows, setNewClassRows] = useState(6);
  const [newClassCols, setNewClassCols] = useState(6);
  const [newDoorPosition, setNewDoorPosition] = useState<'left' | 'right'>('right');
  const [newDeskPosition, setNewDeskPosition] = useState<'left' | 'right'>('left');

  // Student Modal State
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  // Edit Student & Transfer Modal State
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Alert Modal State
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Save Map Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [saveActionType, setSaveActionType] = useState<'save' | 'unlock'>('save');

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSystemClosed, setIsSystemClosed] = useState(false);

  // Toast Notification State (Instantâneo e Não-Bloqueante)
  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: 'success' | 'info' | 'error' | 'syncing';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showToast = (type: 'success' | 'info' | 'error' | 'syncing', title: string, message: string, duration = 3500) => {
    setToast({ isOpen: true, type, title, message });
    if (duration > 0) {
      setTimeout(() => {
        setToast(prev => ({ ...prev, isOpen: false }));
      }, duration);
    }
  };

  // Warning for unsaved changes (Browser Tab Close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(DEFAULT_CONFIG.apiUrl);
      const data = await response.json();

      const formattedClasses = (data.turmas || []).map((t: any) => {
        const classHistory = (data.historico || [])
          .filter((h: any) => String(h.classId).trim() === String(t.id).trim())
          .map((h: any) => ({
            id: h.id || crypto.randomUUID(),
            date: h.date,
            teacherName: h.teacherName,
            action: h.action
          }));

        return {
          id: String(t.id).trim(),
          name: String(t.name || t.id).trim(),
          rows: parseInt(t.rows, 10) || 6,
          cols: parseInt(t.cols, 10) || 6,
          doorPosition: t.doorPosition === 'left' ? 'left' : 'right',
          deskPosition: t.deskPosition === 'right' ? 'right' : 'left',
          classRepresentative: t.classRepresentative || '',
          referenceTeacher: t.referenceTeacher || '',
          lastUpdated: t.lastUpdated || null,
          isLocked: false,
          history: classHistory
        };
      });

      const turmaMap = new Map<string, string>();
      formattedClasses.forEach((c: any) => {
        turmaMap.set(c.id.toLowerCase(), c.id);
        turmaMap.set(c.name.toLowerCase(), c.id);
      });

      const formattedStudents = (data.estudantes || []).map((s: any) => {
        let seatId = null;
        const isInactive = s.status === 'inactive' || s.status === 'inativo' || s.ativo === false || s.active === false || s.status === 'taxado';
        if (!isInactive && s.row && s.col && s.row !== "(vazio)" && s.col !== "(vazio)") {
          const r = parseInt(s.row, 10);
          const c = parseInt(s.col, 10);
          if (!isNaN(r) && !isNaN(c)) {
            seatId = `seat-${r - 1}-${c - 1}`;
          }
        }

        let rawClassId = String(s.classId || s.turma || s.turmaId || '').trim();
        let rawName = String(s.name || s.nome || s.studentName || s.aluno || '').trim();

        if (rawName && !turmaMap.has(rawClassId.toLowerCase()) && turmaMap.has(rawName.toLowerCase())) {
          const temp = rawClassId;
          rawClassId = rawName;
          rawName = temp;
        }

        const resolvedClassId = turmaMap.get(rawClassId.toLowerCase()) || rawClassId;

        return {
          id: String(s.id),
          name: rawName,
          classId: resolvedClassId,
          seatId,
          status: isInactive ? 'inactive' : 'active'
        };
      });

      formattedClasses.forEach((c: any) => {
        const hasSeated = formattedStudents.some((s: any) => s.classId === c.id && s.seatId !== null);
        if (hasSeated) c.isLocked = true;
      });

      setClasses(formattedClasses);
      setStudents(formattedStudents);
      if (formattedClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(formattedClasses[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sendPostRequest = async (action: string, data: any) => {
    try {
      await fetch(DEFAULT_CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data }),
      });
    } catch (error) {
      console.error('Erro na requisição:', error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const openAddClassModal = () => {
    setEditingClassId(null);
    setNewClassName('');
    setNewClassRows(6);
    setNewClassCols(6);
    setNewDoorPosition('right');
    setNewDeskPosition('left');
    setShowClassModal(true);
  };

  const openEditClassModal = () => {
    if (!currentClass) return;
    setEditingClassId(currentClass.id);
    setNewClassName(currentClass.name);
    setNewClassRows(currentClass.rows);
    setNewClassCols(currentClass.cols);
    setNewDoorPosition(currentClass.doorPosition || 'right');
    setNewDeskPosition(currentClass.deskPosition || 'left');
    setShowClassModal(true);
  };

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    if (editingClassId) {
      const updatedClass = {
        name: newClassName.trim(),
        rows: Number(newClassRows) || 6,
        cols: Number(newClassCols) || 6,
        doorPosition: newDoorPosition,
        deskPosition: newDeskPosition,
      };

      setClasses(classes.map(c => c.id === editingClassId ? { ...c, ...updatedClass } : c));
      sendPostRequest('editClass', { id: editingClassId, ...updatedClass });
      setIsDirty(true);
      setShowClassModal(false);
    } else {
      const newClass: ClassData = {
        id: crypto.randomUUID(),
        name: newClassName.trim(),
        rows: Number(newClassRows) || 6,
        cols: Number(newClassCols) || 6,
        doorPosition: newDoorPosition,
        deskPosition: newDeskPosition,
        classRepresentative: '',
        referenceTeacher: '',
        isLocked: false,
        history: []
      };

      setClasses([...classes, newClass]);
      setSelectedClassId(newClass.id);
      sendPostRequest('addClass', newClass);
      setIsDirty(true);
      setShowClassModal(false);
    }
  };

  const requestDeleteClass = () => {
    if (!selectedClassId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Turma',
      message: 'Tem certeza que deseja excluir esta turma e todos os seus alunos? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        setClasses(classes.filter(c => c.id !== selectedClassId));
        setStudents(students.filter(s => s.classId !== selectedClassId));
        setSelectedClassId(classes.length > 1 ? classes.find(c => c.id !== selectedClassId)?.id || null : null);
        sendPostRequest('deleteClass', { id: selectedClassId });
        setIsDirty(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestAddStudent = () => {
    if (!selectedClassId) return;
    setNewStudentName('');
    setShowStudentModal(true);
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentName.trim() && selectedClassId) {
      const newStudent: StudentData = {
        id: crypto.randomUUID(),
        classId: selectedClassId,
        name: newStudentName.trim(),
        seatId: null,
        status: 'active',
      };
      setStudents([...students, newStudent]);
      sendPostRequest('addStudent', { ...newStudent, row: null, col: null });
      setIsDirty(true);
      setShowStudentModal(false);
    }
  };

  const requestDeactivateStudent = (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    setConfirmModal({
      isOpen: true,
      title: 'Desativar Estudante (Taxar)',
      message: `Deseja desativar "${student.name}"? O aluno será retirado do mapa e ficará taxado na aba de inativos, podendo ser reativado a qualquer momento.`,
      confirmLabel: 'Desativar Aluno',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        setStudents(prev => prev.map(s => 
          s.id === id ? { ...s, status: 'inactive', seatId: null } : s
        ));
        sendPostRequest('editStudent', { id, status: 'inactive', row: null, col: null });
        setIsDirty(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleReactivateStudent = (id: string) => {
    setStudents(prev => prev.map(s => 
      s.id === id ? { ...s, status: 'active', seatId: null } : s
    ));
    sendPostRequest('editStudent', { id, status: 'active' });
    setIsDirty(true);
  };

  const handleOpenEditStudent = (student: StudentData) => {
    setEditingStudent(student);
    setShowEditStudentModal(true);
  };

  const handleSaveEditStudent = (updatedData: {
    id: string;
    name: string;
    classId: string;
    status: 'active' | 'inactive';
  }) => {
    const currentStudent = students.find(s => s.id === updatedData.id);
    if (!currentStudent) return;

    const classChanged = currentStudent.classId !== updatedData.classId;
    const statusChangedToInactive = updatedData.status === 'inactive';
    const newSeatId = (classChanged || statusChangedToInactive) ? null : currentStudent.seatId;

    let row = null;
    let col = null;
    if (newSeatId) {
      const parts = newSeatId.split('-');
      row = parseInt(parts[1]) + 1;
      col = parseInt(parts[2]) + 1;
    }

    setStudents(prev => prev.map(s => 
      s.id === updatedData.id ? {
        ...s,
        name: updatedData.name,
        classId: updatedData.classId,
        status: updatedData.status,
        seatId: newSeatId
      } : s
    ));

    sendPostRequest('editStudent', {
      id: updatedData.id,
      name: updatedData.name,
      classId: updatedData.classId,
      status: updatedData.status,
      row,
      col
    });

    setIsDirty(true);
    setShowEditStudentModal(false);
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const student = students.find(s => s.id === active.id);
    if (student) setActiveStudent(student);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStudent(null);
    const { active, over } = event;
    if (!over) return;
    moveStudent(active.id as string, over.id as string);
  };

  const moveStudent = (studentId: string, overId: string) => {
    setIsDirty(true);
    let newRow: number | null = null;
    let newCol: number | null = null;
    let oldRow: number | null = null;
    let oldCol: number | null = null;
    let occupiedStudentToUpdate: StudentData | null = null;

    setStudents((prev) => {
      const newStudents = [...prev];
      const studentIndex = newStudents.findIndex(s => s.id === studentId);
      if (studentIndex === -1) return prev;

      const student = newStudents[studentIndex];

      if (overId === 'sidebar') {
        newStudents[studentIndex] = { ...student, seatId: null };
      } else if (overId.startsWith('seat-')) {
        const occupiedIndex = newStudents.findIndex(s => s.seatId === overId && s.classId === student.classId);
        const [, rStr, cStr] = overId.split('-');
        newRow = parseInt(rStr) + 1;
        newCol = parseInt(cStr) + 1;

        if (occupiedIndex !== -1 && newStudents[occupiedIndex].id !== studentId) {
          const tempSeat = student.seatId;
          const occupiedStudent = newStudents[occupiedIndex];
          occupiedStudentToUpdate = occupiedStudent;
          
          newStudents[studentIndex] = { ...student, seatId: overId };
          newStudents[occupiedIndex] = { ...occupiedStudent, seatId: tempSeat };
          
          oldRow = tempSeat ? parseInt(tempSeat.split('-')[1]) + 1 : null;
          oldCol = tempSeat ? parseInt(tempSeat.split('-')[2]) + 1 : null;
        } else {
          newStudents[studentIndex] = { ...student, seatId: overId };
        }
      }
      return newStudents;
    });

    if (overId === 'sidebar') {
      sendPostRequest('updateStudentSeat', { id: studentId, row: null, col: null });
    } else if (overId.startsWith('seat-')) {
      if (occupiedStudentToUpdate) {
        sendPostRequest('swapStudents', {
          student1: { id: studentId, row: newRow, col: newCol },
          student2: { id: (occupiedStudentToUpdate as StudentData).id, row: oldRow, col: oldCol }
        });
      } else {
        sendPostRequest('updateStudentSeat', { id: studentId, row: newRow, col: newCol });
      }
    }
  };

  const handleSelectStudent = (studentId: string) => {
    if (selectedSeatId) {
      moveStudent(studentId, selectedSeatId);
      setSelectedSeatId(null);
      setSelectedStudentId(null);
    } else if (selectedStudentId && selectedStudentId !== studentId) {
      const student2 = students.find(s => s.id === studentId);
      if (student2 && student2.seatId) {
        moveStudent(selectedStudentId, student2.seatId);
        setSelectedStudentId(null);
      } else {
        setSelectedStudentId(studentId);
      }
    } else {
      setSelectedStudentId(selectedStudentId === studentId ? null : studentId);
      setSelectedSeatId(null);
      if (window.innerWidth < 640) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handleSelectSeat = (seatId: string) => {
    if (selectedStudentId) {
      moveStudent(selectedStudentId, seatId);
      setSelectedStudentId(null);
      setSelectedSeatId(null);
    } else if (selectedSeatId) {
      if (selectedSeatId === seatId) {
        setSelectedSeatId(null);
      } else {
        const student1 = students.find(s => s.seatId === selectedSeatId && s.classId === selectedClassId);
        const student2 = students.find(s => s.seatId === seatId && s.classId === selectedClassId);
        if (student1) {
          moveStudent(student1.id, seatId);
        } else if (student2) {
          moveStudent(student2.id, selectedSeatId);
        }
        setSelectedSeatId(null);
      }
    } else {
      setSelectedSeatId(seatId);
      setSelectedStudentId(null);
    }
  };

  const handleOpenSaveModal = () => {
    if (!selectedClassId) return;

    const currentClassStudents = students.filter(s => s.classId === selectedClassId && s.status !== 'inactive');
    const currentSeated = currentClassStudents.filter(s => s.seatId);
    const currentUnseated = currentClassStudents.filter(s => !s.seatId);

    // Caso 1: Todos os alunos estão fora das carteiras (mapa em branco / reiniciado)
    if (currentSeated.length === 0 && currentClassStudents.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Salvar Mapa em Branco',
        message: 'Nenhum estudante está posicionado nas carteiras. Deseja realmente salvar o mapa em branco?',
        confirmLabel: 'Salvar em Branco',
        confirmColor: 'bg-blue-600 hover:bg-blue-700',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTeacherName('');
          setShowSaveModal(true);
        }
      });
      return;
    }

    // Caso 2: Mapa parcialmente preenchido (alguns alunos nas carteiras e outros fora)
    if (currentUnseated.length > 0 && currentSeated.length > 0) {
      setAlertModal({
        isOpen: true,
        title: 'Atenção',
        message: `Não é possível salvar o mapa com ${currentUnseated.length} aluno(s) pendente(s) fora das carteiras. Por favor, posicione todos os alunos nas carteiras ou reinicie o mapa para salvar em branco.`
      });
      return;
    }

    // Caso 3: Todos os alunos posicionados (100% preenchido) ou turma sem alunos
    setTeacherName('');
    setShowSaveModal(true);
  };

  const handleUnlockMap = () => {
    if (!selectedClassId) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Editar Mapa',
      message: 'Deseja realmente editar o mapa? Isso irá destravar as alterações.',
      confirmLabel: 'Editar',
      confirmColor: 'bg-blue-600 hover:bg-blue-700',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Destrava instantaneamente sem bloquear
        setClasses(classes.map(c => 
          c.id === selectedClassId ? { ...c, isLocked: false } : c
        ));
        sendPostRequest('unlockMap', { id: selectedClassId });
        setIsDirty(true);
        showToast('info', 'Mapa Destravado', 'As carteiras foram liberadas para movimentação e edição.', 3000);
      }
    });
  };

  const handleRandomizeSeats = () => {
    if (!selectedClassId || !currentClass) return;

    if (currentClass.isLocked) {
      setAlertModal({
        isOpen: true,
        title: 'Mapa Travado',
        message: 'O mapa está travado para edições. Clique no botão "Editar" para destravar antes de distribuir os alunos.'
      });
      return;
    }

    const activeStudents = students.filter(
      s => s.classId === selectedClassId && s.status !== 'inactive'
    );

    if (activeStudents.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Sem Estudantes',
        message: 'Não há estudantes ativos cadastrados nesta turma para posicionar.'
      });
      return;
    }

    const allSeatIds: string[] = [];
    for (let r = 0; r < currentClass.rows; r++) {
      for (let c = 0; c < currentClass.cols; c++) {
        allSeatIds.push(`seat-${r}-${c}`);
      }
    }

    const doRandomize = () => {
      const shuffledSeatIds = [...allSeatIds];
      for (let i = shuffledSeatIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledSeatIds[i], shuffledSeatIds[j]] = [shuffledSeatIds[j], shuffledSeatIds[i]];
      }

      setStudents(prev => {
        let seatIdx = 0;
        return prev.map(s => {
          if (s.classId !== selectedClassId || s.status === 'inactive') {
            return s;
          }
          if (seatIdx < shuffledSeatIds.length) {
            const assignedSeat = shuffledSeatIds[seatIdx];
            seatIdx++;
            return { ...s, seatId: assignedSeat };
          } else {
            return { ...s, seatId: null };
          }
        });
      });

      setIsDirty(true);

      if (activeStudents.length > allSeatIds.length) {
        showToast(
          'info',
          'Distribuição Concluída',
          `Foram sorteados ${allSeatIds.length} alunos nas carteiras. ${activeStudents.length - allSeatIds.length} aluno(s) excedentes ficaram sem assento.`,
          4500
        );
      } else {
        showToast(
          'success',
          'Distribuição Aleatória',
          `Todos os ${activeStudents.length} estudantes foram distribuídos aleatoriamente no mapa!`,
          3500
        );
      }
    };

    const alreadySeated = activeStudents.some(s => s.seatId !== null);
    if (alreadySeated) {
      setConfirmModal({
        isOpen: true,
        title: 'Distribuir Aleatoriamente',
        message: 'Deseja sortear e reorganizar aleatoriamente todos os estudantes desta turma nas carteiras da sala? As posições atuais serão substituídas.',
        confirmLabel: 'Sortear Lugares',
        confirmColor: 'bg-purple-600 hover:bg-purple-700',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          doRandomize();
        }
      });
    } else {
      doRandomize();
    }
  };

  const handleResetMap = () => {
    if (!selectedClassId || !currentClass) return;

    if (currentClass.isLocked) {
      setAlertModal({
        isOpen: true,
        title: 'Mapa Travado',
        message: 'O mapa está travado para edições. Clique em "Editar" para destravar antes de reiniciar.'
      });
      return;
    }

    const seated = students.filter(
      s => s.classId === selectedClassId && s.status !== 'inactive' && s.seatId
    );

    if (seated.length === 0) {
      showToast('info', 'Mapa Já Está Vazio', 'Não há estudantes ocupando carteiras no momento.', 3000);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Reiniciar Mapa',
      message: `Deseja realmente retirar todos os ${seated.length} estudantes das carteiras? Eles voltarão para a lista de alunos sem assento.`,
      confirmLabel: 'Reiniciar Mapa',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setStudents(prev => prev.map(s => 
          s.classId === selectedClassId ? { ...s, seatId: null } : s
        ));
        setSelectedStudentId(null);
        setSelectedSeatId(null);
        setIsDirty(true);
        showToast('info', 'Mapa Reiniciado', 'Todos os estudantes foram retirados das carteiras.', 3500);
      }
    });
  };

  const confirmSaveMap = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTeacherName = teacherName.trim();
    if (!cleanTeacherName || !selectedClassId) return;

    const currentClassObj = currentClass;
    const now = new Date();
    const lastUpdated = now.toISOString();
    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      date: lastUpdated,
      teacherName: cleanTeacherName,
      action: 'save'
    };

    const classStudents = students
      .filter(s => s.classId === selectedClassId)
      .map(s => {
        let row = null;
        let col = null;
        if (s.seatId && s.status !== 'inactive') {
          const parts = s.seatId.split('-');
          row = parseInt(parts[1]) + 1;
          col = parseInt(parts[2]) + 1;
        }
        return { id: s.id, row, col, status: s.status || 'active' };
      });

    // 1. ATUALIZAÇÃO IMEDIATA DO ESTADO LOCAL
    setClasses(prev => prev.map(c => 
      c.id === selectedClassId ? { 
        ...c, 
        isLocked: true, 
        lastUpdated,
        history: [...(c.history || []), historyEntry]
      } : c
    ));

    setIsDirty(false);
    setShowSaveModal(false);
    setTeacherName('');

    // 2. FEEDBACK VISUAL INSTANTÂNEO NÃO-BLOQUEANTE
    showToast(
      'syncing',
      'Mapeamento Salvo',
      'Alterações aplicadas! Sincronizando com a planilha em segundo plano...',
      0
    );

    // 3. SINCRONIZAÇÃO ASSÍNCRONA EM SEGUNDO PLANO
    (async () => {
      try {
        await sendPostRequest('saveMap', { 
          id: selectedClassId, 
          lastUpdated, 
          historyEntry,
          students: classStudents,
          classRepresentative: currentClassObj?.classRepresentative || '',
          referenceTeacher: currentClassObj?.referenceTeacher || ''
        });

        showToast(
          'success',
          'Sincronizado!',
          'O mapa foi salvo e gravado na planilha com sucesso.',
          3500
        );
      } catch (error) {
        console.error('Erro ao sincronizar em segundo plano:', error);
        showToast(
          'error',
          'Aviso de Conexão',
          'O mapa foi salvo na tela, mas houve lentidão ao sincronizar na planilha.',
          5000
        );
      }
    })();
  };

  const currentClass = classes.find(c => c.id === selectedClassId);
  const classStudents = students.filter(s => s.classId === selectedClassId);
  const activeStudents = classStudents.filter(s => s.status !== 'inactive');
  const inactiveStudents = classStudents.filter(s => s.status === 'inactive');
  const unseatedStudents = activeStudents.filter(s => !s.seatId);
  const seatedStudents = activeStudents.filter(s => s.seatId);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center text-slate-500">
          <Loader2 size={48} className="animate-spin mb-4 text-blue-600" />
          <p className="font-medium">Carregando dados da planilha...</p>
        </div>
      </div>
    );
  }

  if (isSystemClosed) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogOut size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Sessão Encerrada</h2>
          <p className="text-slate-600 mb-8">
            Você saiu do sistema com segurança. Todas as alterações salvas foram preservadas na planilha.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            Entrar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 font-sans print:h-auto print:bg-white">
      {/* Header */}
      <header className="bg-white border-b px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs z-30 print:hidden">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="sm:hidden p-2 hover:bg-slate-100 rounded-md text-slate-600 relative cursor-pointer"
          >
            {isSidebarOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
          </button>

          <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <DoorOpen className="text-blue-600 hidden xs:block" size={24} />
            <span>Mapa de Sala</span>
          </h1>
          
          {/* Seletor de Turma */}
          <div className="flex items-center gap-1 sm:gap-2">
            <select 
              value={selectedClassId || ''} 
              onChange={e => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 sm:p-2 font-medium"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            {currentClass && (
              <button 
                onClick={openEditClassModal}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Editar Layout da Turma"
              >
                <Edit size={16} />
              </button>
            )}

            {currentClass && (
              <button 
                onClick={requestDeleteClass}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Excluir Turma"
              >
                <Trash2 size={16} />
              </button>
            )}
            
            <button 
              onClick={openAddClassModal}
              className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
              title="Nova Turma"
            >
              <Plus size={16} />
              <span className="hidden md:inline">Nova Turma</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {currentClass && (
            <>
              <button 
                onClick={() => setShowHistoryModal(true)}
                className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                title="Ver Histórico de Alterações"
              >
                <History size={18} />
                <span className="hidden lg:inline">Histórico</span>
              </button>

              {currentClass.isLocked ? (
                <button 
                  onClick={handleUnlockMap}
                  className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Destravar mapa para edição"
                >
                  <Unlock size={16} />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleRandomizeSeats}
                    className="text-purple-600 hover:bg-purple-50 active:bg-purple-100 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-purple-200 bg-purple-50/50"
                    title="Distribuir estudantes aleatoriamente nas carteiras"
                  >
                    <Shuffle size={16} />
                    <span className="hidden sm:inline">Sortear</span>
                  </button>

                  <button 
                    onClick={handleResetMap}
                    className="text-amber-600 hover:bg-amber-50 active:bg-amber-100 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-amber-200 bg-amber-50/50"
                    title="Retirar todos os estudantes das carteiras"
                  >
                    <RotateCcw size={16} />
                    <span className="hidden sm:inline">Reiniciar</span>
                  </button>

                  <button 
                    onClick={handleOpenSaveModal}
                    className="px-2.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
                    title="Salvar Mapa"
                  >
                    <Save size={16} />
                    <span>Salvar {isDirty && <span className="text-orange-300 font-bold">●</span>}</span>
                  </button>
                </>
              )}
            </>
          )}

          <button 
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Imprimir / Salvar em PDF"
          >
            <Download size={16} />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button 
            onClick={() => setIsSystemClosed(true)}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Sair do Sistema"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden print:overflow-visible relative">
        {currentClass ? (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className={`
              fixed inset-0 z-40 bg-black/50 transition-opacity sm:hidden
              ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `} onClick={() => setIsSidebarOpen(false)} />
            
            <div className={`
              fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0 sm:z-0 print:hidden
              ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
              <Sidebar 
                students={unseatedStudents} 
                inactiveStudents={inactiveStudents}
                onAddStudent={requestAddStudent} 
                onDeleteStudent={requestDeactivateStudent}
                onReactivateStudent={handleReactivateStudent}
                onEditStudent={handleOpenEditStudent}
                onRandomizeSeats={handleRandomizeSeats}
                onResetMap={handleResetMap}
                selectedStudentId={selectedStudentId}
                onSelectStudent={handleSelectStudent}
                onClose={() => setIsSidebarOpen(false)}
                isLocked={currentClass?.isLocked || false}
              />
            </div>
            
            <div className="flex-1 overflow-auto p-4 sm:p-8 print:p-0 print:overflow-visible bg-slate-100 relative">
              {/* Floating Button for Mobile Student List */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className={`sm:hidden fixed bottom-6 right-6 z-30 p-4 rounded-full shadow-2xl transition-all cursor-pointer ${
                  selectedStudentId ? 'bg-blue-600 text-white scale-110' : 'bg-white text-slate-700'
                }`}
              >
                <div className="relative">
                  <Users size={24} />
                  {unseatedStudents.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white">
                      {unseatedStudents.length}
                    </span>
                  )}
                </div>
              </button>

              <ClassroomMap 
                students={seatedStudents} 
                currentClass={currentClass} 
                onDeleteStudent={requestDeactivateStudent}
                onUnseatStudent={(id) => moveStudent(id, 'sidebar')}
                onEditStudent={handleOpenEditStudent}
                selectedSeatId={selectedSeatId}
                onSelectSeat={handleSelectSeat}
                onSelectStudent={handleSelectStudent}
                isLocked={currentClass?.isLocked || false}
                onUpdateRepresentative={(value) => {
                  setIsDirty(true);
                  setClasses(classes.map(c => c.id === selectedClassId ? { ...c, classRepresentative: value } : c));
                }}
                onUpdateTeacher={(value) => {
                  setIsDirty(true);
                  setClasses(classes.map(c => c.id === selectedClassId ? { ...c, referenceTeacher: value } : c));
                }}
                logoUrl={DEFAULT_CONFIG.logoUrl}
              />
            </div>
            <DragOverlay>
              {activeStudent && !currentClass?.isLocked ? (
                <div className="w-24 h-16 sm:w-28 sm:h-20 opacity-90 shadow-xl transform scale-100 sm:scale-105">
                  <StudentCard student={activeStudent} isLocked={false} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Users size={64} className="mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma turma selecionada</h2>
            <p>Crie uma nova turma para começar a organizar os assentos.</p>
            <button 
              onClick={openAddClassModal}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus size={20} /> Criar Primeira Turma
            </button>
          </div>
        )}
      </main>

      {/* Modal de Turma (Criar/Editar) */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {editingClassId ? 'Editar Turma' : 'Criar Nova Turma'}
            </h2>
            <form onSubmit={handleClassSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Turma</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: 6º Ano A"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. de Filas (Colunas)</label>
                    <input 
                      type="number" 
                      min="1" max="15" required
                      value={newClassCols}
                      onChange={e => setNewClassCols(parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Carteiras por Fila (Linhas)</label>
                    <input 
                      type="number" 
                      min="1" max="15" required
                      value={newClassRows}
                      onChange={e => setNewClassRows(parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-center"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors cursor-pointer"
                >
                  {editingClassId ? 'Salvar Alterações' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Novo Aluno */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Adicionar Aluno</h2>
            <form onSubmit={handleAddStudentSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Aluno</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Estudante */}
      <EditStudentModal
        isOpen={showEditStudentModal}
        onClose={() => setShowEditStudentModal(false)}
        student={editingStudent}
        classes={classes}
        onSave={handleSaveEditStudent}
      />

      {/* Modal de Confirmação */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h2>
            <p className="text-slate-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-white rounded-md font-medium transition-colors cursor-pointer ${confirmModal.confirmColor || 'bg-red-600 hover:bg-red-700'}`}
              >
                {confirmModal.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Salvar Mapa */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {saveActionType === 'save' ? 'Salvar Mapeamento' : 'Destravar Mapeamento'}
            </h2>
            <form onSubmit={confirmSaveMap}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Professor Responsável</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Histórico de Alterações</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-500 hover:text-slate-700 cursor-pointer">
                <CloseIcon size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {currentClass?.history && currentClass.history.length > 0 ? (
                <div className="space-y-4">
                  {[...currentClass.history].reverse().map((entry) => (
                    <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-slate-50 rounded-r-lg">
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          entry.action === 'save' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.action === 'save' ? 'SALVO' : 'DESTRAVADO'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(entry.date).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">
                        Responsável: <span className="font-semibold">{entry.teacherName}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <History size={48} className="mx-auto mb-2 opacity-20" />
                  <p>Nenhum histórico registrado para esta turma.</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification (Instantâneo e Não-Bloqueante) */}
      {toast.isOpen && (
        <div 
          id="system-toast-notification"
          className="fixed top-5 right-5 z-[100] max-w-md w-[calc(100vw-2.5rem)] sm:w-96 shadow-2xl rounded-xl border p-4 transition-all duration-300 transform translate-y-0 bg-white/95 backdrop-blur-md"
          style={{
            borderColor: toast.type === 'syncing' ? '#93c5fd' : toast.type === 'success' ? '#86efac' : toast.type === 'error' ? '#fca5a5' : '#cbd5e1'
          }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {toast.type === 'syncing' && (
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              )}
              {toast.type === 'success' && (
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 size={20} />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <AlertTriangle size={20} />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                  <Info size={20} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className={`text-sm font-bold ${
                toast.type === 'syncing' ? 'text-blue-900' :
                toast.type === 'success' ? 'text-emerald-900' :
                toast.type === 'error' ? 'text-rose-900' : 'text-slate-900'
              }`}>
                {toast.title}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors shrink-0 cursor-pointer"
              title="Fechar notificação"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
