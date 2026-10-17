# Mapeamento de Sala de Aula

Sistema interativo e moderno para organização visual de carteiras escolares e turmas com sincronização com planilha e geração de PDF para impressão em folha A4 única.

## 🚀 Configurações Incluídas:
- **URL da Planilha/API (GAS):** `https://script.google.com/macros/s/AKfycbx697CrCBhHUkG-ajC6DywPr9bkfkbm84oiLbCE0dWvUj3Twy4gHqEYjkkJcHON-2lqWQ/exec`
- **ID da Planilha Ativa:** `1SnCQIs3-oXj0LgiJ5LDY98ylgPOfEVOcBHa0qPe0CdM`
- **URL do Logotipo:** `https://i.ibb.co/4nDkF8SW/e-EMPMGC.png`

---

## 📄 Google Apps Script (Código.gs)
O arquivo `Codigo.gs` incluso na raiz deste pacote pode ser copiado diretamente para o seu Google Apps Script (em https://script.google.com) e implantado como Web App.

---

## 🛠️ Como Executar Localmente

### 1. Instalar dependências:
```bash
npm install
```

### 2. Iniciar o servidor de desenvolvimento:
```bash
npm run dev
```

Abra no navegador em `http://localhost:3000`.

### 3. Gerar build para produção:
```bash
npm run build
```

Os arquivos estáticos estarão na pasta `dist/`, prontos para deploy no GitHub Pages, Vercel, Netlify ou qualquer hospedagem web.

---

## ✨ Funcionalidades
- Arrastar e soltar (Drag & Drop) intuitivo para posicionar alunos nas carteiras.
- Desativação segura de alunos (marcar como taxado/inativo mantendo no sistema para eventual reativação).
- Edição de alunos e remanejamento entre turmas.
- Bloqueio e desbloqueio com registro de histórico do professor responsável.
- Geração de PDF no formato A4 em página única com layout calibrado e alta legibilidade.
- Alinhamento automático da Mesa do Professor e Porta da Sala.
- Sincronização direta com a planilha do Google Apps Script independente (Standalone) ou vinculada.
