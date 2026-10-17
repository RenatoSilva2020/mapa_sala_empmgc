/**
 * SISTEMA DE MAPEAMENTO DE SALA DE AULA - BACKEND GOOGLE APPS SCRIPT
 * 
 * Funcionalidades:
 * - Modo Standalone (script independente): Abre qualquer planilha pelo parâmetro 'spreadsheetId'
 * - Modo Vinculado: Usa a planilha ativa caso nenhum 'spreadsheetId' seja informado
 * - Criação automática das abas necessárias (TURMAS, ESTUDANTES, HISTORICO) com cabeçalhos caso estejam vazias
 * - Suporta leitura (doGet) e gravação completa (doPost)
 */

function getSpreadsheet(idOrParam) {
  if (idOrParam && typeof idOrParam === 'string' && idOrParam.trim() !== '') {
    try {
      return SpreadsheetApp.openById(idOrParam.trim());
    } catch (e) {
      throw new Error('Não foi possível abrir a planilha com o ID "' + idOrParam + '". Verifique se o ID está correto e se o script tem permissão de edição nela.');
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error('Nenhuma planilha vinculada encontrada e nenhum "spreadsheetId" foi informado.');
  }
}

function ensureSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}

function doGet(e) {
  try {
    var spreadsheetId = (e && e.parameter && e.parameter.spreadsheetId) ? e.parameter.spreadsheetId : '';
    var ss = getSpreadsheet(spreadsheetId);
    
    var sheetTurmas = ensureSheet(ss, 'TURMAS', ['id', 'name', 'rows', 'cols', 'doorPosition', 'deskPosition', 'classRepresentative', 'referenceTeacher', 'lastUpdated']);
    var sheetEstudantes = ensureSheet(ss, 'ESTUDANTES', ['id', 'classId', 'name', 'row', 'col', 'status']);
    var sheetHistorico = ensureSheet(ss, 'HISTORICO', ['id', 'classId', 'date', 'teacherName', 'action']);
    
    // Ler Turmas
    var turmasData = sheetTurmas.getDataRange().getValues();
    var turmas = [];
    if (turmasData.length > 1) {
      for (var i = 1; i < turmasData.length; i++) {
        var row = turmasData[i];
        if (row[0]) {
          turmas.push({
            id: String(row[0]),
            name: String(row[1] || ''),
            rows: Number(row[2]) || 6,
            cols: Number(row[3]) || 6,
            doorPosition: String(row[4] || 'right'),
            deskPosition: String(row[5] || 'left'),
            classRepresentative: String(row[6] || ''),
            referenceTeacher: String(row[7] || ''),
            lastUpdated: row[8] ? String(row[8]) : null
          });
        }
      }
    }

    // Ler Estudantes (detecção dinâmica de colunas para suportar tanto ID, Nome, Turma quanto ID, Turma, Nome)
    var estudantesData = sheetEstudantes.getDataRange().getValues();
    var estudantes = [];
    if (estudantesData.length > 1) {
      var headerRow = estudantesData[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
      
      var colId = headerRow.indexOf('id');
      if (colId === -1) colId = 0;

      var colName = headerRow.indexOf('name');
      if (colName === -1) colName = headerRow.indexOf('nome');
      if (colName === -1) colName = headerRow.indexOf('aluno');
      if (colName === -1) colName = headerRow.indexOf('estudante');
      
      var colClass = headerRow.indexOf('classid');
      if (colClass === -1) colClass = headerRow.indexOf('turma');
      if (colClass === -1) colClass = headerRow.indexOf('turmaid');
      
      var colRow = headerRow.indexOf('row');
      if (colRow === -1) colRow = headerRow.indexOf('linha');
      if (colRow === -1) colRow = headerRow.indexOf('fila');
      
      var colCol = headerRow.indexOf('col');
      if (colCol === -1) colCol = headerRow.indexOf('coluna');
      if (colCol === -1) colCol = headerRow.indexOf('carteira');
      
      var colStatus = headerRow.indexOf('status');
      if (colStatus === -1) colStatus = headerRow.indexOf('situacao');

      if (colName === -1 && colClass === -1) {
        colName = 1;
        colClass = 2;
      } else if (colName === -1) {
        colName = colClass === 1 ? 2 : 1;
      } else if (colClass === -1) {
        colClass = colName === 1 ? 2 : 1;
      }
      if (colRow === -1) colRow = 3;
      if (colCol === -1) colCol = 4;
      if (colStatus === -1) colStatus = 5;

      for (var j = 1; j < estudantesData.length; j++) {
        var eRow = estudantesData[j];
        if (eRow[colId] !== '' && eRow[colId] !== null && eRow[colId] !== undefined) {
          var sName = String(eRow[colName] || '').trim();
          var sClass = String(eRow[colClass] || '').trim();
          
          // Desinverte caso sName seja a turma e sClass seja o aluno
          var nameIsTurma = turmas.some(function(t) { return t.id.toLowerCase() === sName.toLowerCase() || t.name.toLowerCase() === sName.toLowerCase(); });
          var classIsTurma = turmas.some(function(t) { return t.id.toLowerCase() === sClass.toLowerCase() || t.name.toLowerCase() === sClass.toLowerCase(); });
          if (nameIsTurma && !classIsTurma) {
            var temp = sName;
            sName = sClass;
            sClass = temp;
          }

          estudantes.push({
            id: String(eRow[colId]),
            name: sName,
            classId: sClass,
            row: eRow[colRow] !== '' && eRow[colRow] !== null && eRow[colRow] !== undefined ? eRow[colRow] : null,
            col: eRow[colCol] !== '' && eRow[colCol] !== null && eRow[colCol] !== undefined ? eRow[colCol] : null,
            status: String(eRow[colStatus] || 'active')
          });
        }
      }
    }

    // Ler Histórico
    var historicoData = sheetHistorico.getDataRange().getValues();
    var historico = [];
    if (historicoData.length > 1) {
      for (var k = 1; k < historicoData.length; k++) {
        var hRow = historicoData[k];
        if (hRow[0]) {
          historico.push({
            id: String(hRow[0]),
            classId: String(hRow[1] || ''),
            date: String(hRow[2] || ''),
            teacherName: String(hRow[3] || ''),
            action: String(hRow[4] || 'save')
          });
        }
      }
    }

    var result = {
      status: 'success',
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      turmas: turmas,
      estudantes: estudantes,
      historico: historico
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var action = data.action;
    var payload = data.payload;
    var spreadsheetId = data.spreadsheetId || (e && e.parameter && e.parameter.spreadsheetId) || '';
    
    var ss = getSpreadsheet(spreadsheetId);
    var sheetTurmas = ensureSheet(ss, 'TURMAS', ['id', 'name', 'rows', 'cols', 'doorPosition', 'deskPosition', 'classRepresentative', 'referenceTeacher', 'lastUpdated']);
    var sheetEstudantes = ensureSheet(ss, 'ESTUDANTES', ['id', 'classId', 'name', 'row', 'col', 'status']);
    var sheetHistorico = ensureSheet(ss, 'HISTORICO', ['id', 'classId', 'date', 'teacherName', 'action']);

    if (action === 'saveMap') {
      var classId = payload.id;
      var lastUpdated = payload.lastUpdated;
      var historyEntry = payload.historyEntry;
      var studentsList = payload.students || [];

      // Atualizar lastUpdated e dados da turma
      var turmasData = sheetTurmas.getDataRange().getValues();
      for (var i = 1; i < turmasData.length; i++) {
        if (String(turmasData[i][0]) === String(classId)) {
          sheetTurmas.getRange(i + 1, 9).setValue(lastUpdated);
          if (payload.classRepresentative !== undefined) {
            sheetTurmas.getRange(i + 1, 7).setValue(payload.classRepresentative);
          }
          if (payload.referenceTeacher !== undefined) {
            sheetTurmas.getRange(i + 1, 8).setValue(payload.referenceTeacher);
          }
          break;
        }
      }

      // Atualizar posições dos estudantes
      var estudantesData = sheetEstudantes.getDataRange().getValues();
      var studentMap = {};
      for (var s = 0; s < studentsList.length; s++) {
        studentMap[String(studentsList[s].id)] = studentsList[s];
      }

      for (var j = 1; j < estudantesData.length; j++) {
        var sId = String(estudantesData[j][0]);
        if (studentMap[sId]) {
          var sObj = studentMap[sId];
          sheetEstudantes.getRange(j + 1, 4).setValue(sObj.row !== null ? sObj.row : '');
          sheetEstudantes.getRange(j + 1, 5).setValue(sObj.col !== null ? sObj.col : '');
          if (sObj.status) {
            sheetEstudantes.getRange(j + 1, 6).setValue(sObj.status);
          }
        }
      }

      // Inserir histórico
      if (historyEntry) {
        sheetHistorico.appendRow([
          historyEntry.id || Utilities.getUuid(),
          classId,
          historyEntry.date || lastUpdated,
          historyEntry.teacherName || '',
          historyEntry.action || 'save'
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveStudent') {
      var st = payload;
      var estData = sheetEstudantes.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < estData.length; i++) {
        if (String(estData[i][0]) === String(st.id)) {
          sheetEstudantes.getRange(i + 1, 2).setValue(st.classId);
          sheetEstudantes.getRange(i + 1, 3).setValue(st.name);
          sheetEstudantes.getRange(i + 1, 4).setValue(st.row !== null && st.row !== undefined ? st.row : '');
          sheetEstudantes.getRange(i + 1, 5).setValue(st.col !== null && st.col !== undefined ? st.col : '');
          sheetEstudantes.getRange(i + 1, 6).setValue(st.status || 'active');
          found = true;
          break;
        }
      }
      if (!found) {
        sheetEstudantes.appendRow([
          st.id,
          st.classId,
          st.name,
          st.row !== null && st.row !== undefined ? st.row : '',
          st.col !== null && st.col !== undefined ? st.col : '',
          st.status || 'active'
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteStudent' || action === 'deactivateStudent') {
      var studentId = payload.id;
      var isPermanent = payload.permanent === true;
      var eData = sheetEstudantes.getDataRange().getValues();
      for (var i = 1; i < eData.length; i++) {
        if (String(eData[i][0]) === String(studentId)) {
          if (isPermanent) {
            sheetEstudantes.deleteRow(i + 1);
          } else {
            sheetEstudantes.getRange(i + 1, 4).setValue('');
            sheetEstudantes.getRange(i + 1, 5).setValue('');
            sheetEstudantes.getRange(i + 1, 6).setValue('inactive');
          }
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveClass') {
      var cl = payload;
      var cData = sheetTurmas.getDataRange().getValues();
      var cFound = false;
      for (var i = 1; i < cData.length; i++) {
        if (String(cData[i][0]) === String(cl.id)) {
          sheetTurmas.getRange(i + 1, 2).setValue(cl.name);
          sheetTurmas.getRange(i + 1, 3).setValue(cl.rows);
          sheetTurmas.getRange(i + 1, 4).setValue(cl.cols);
          sheetTurmas.getRange(i + 1, 5).setValue(cl.doorPosition || 'right');
          sheetTurmas.getRange(i + 1, 6).setValue(cl.deskPosition || 'left');
          if (cl.classRepresentative !== undefined) sheetTurmas.getRange(i + 1, 7).setValue(cl.classRepresentative);
          if (cl.referenceTeacher !== undefined) sheetTurmas.getRange(i + 1, 8).setValue(cl.referenceTeacher);
          cFound = true;
          break;
        }
      }
      if (!cFound) {
        sheetTurmas.appendRow([
          cl.id,
          cl.name,
          cl.rows,
          cl.cols,
          cl.doorPosition || 'right',
          cl.deskPosition || 'left',
          cl.classRepresentative || '',
          cl.referenceTeacher || '',
          ''
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteClass') {
      var classIdToDelete = payload.id;
      var clData = sheetTurmas.getDataRange().getValues();
      for (var i = clData.length - 1; i >= 1; i--) {
        if (String(clData[i][0]) === String(classIdToDelete)) {
          sheetTurmas.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored', action: action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
