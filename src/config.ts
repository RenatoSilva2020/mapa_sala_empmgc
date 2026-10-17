export interface AppConfig {
  apiUrl: string;
  logoUrl: string;
  spreadsheetId?: string;
  defaultClassId?: string;
}

export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export function buildApiUrl(baseApiUrl: string, spreadsheetId?: string): string {
  const cleanId = extractSpreadsheetId(spreadsheetId || '');
  if (!cleanId) return baseApiUrl;
  
  const separator = baseApiUrl.includes('?') ? '&' : '?';
  return `${baseApiUrl}${separator}spreadsheetId=${encodeURIComponent(cleanId)}`;
}

export const DEFAULT_CONFIG: AppConfig = {
  apiUrl: "https://script.google.com/macros/s/AKfycbx697CrCBhHUkG-ajC6DywPr9bkfkbm84oiLbCE0dWvUj3Twy4gHqEYjkkJcHON-2lqWQ/exec",
  logoUrl: "https://i.ibb.co/QwJbGJ9/e-EMPMGC.png",
  spreadsheetId: "1SnCQIs3-oXj0LgiJ5LDY98ylgPOfEVOcBHa0qPe0CdM",
  defaultClassId: "1° REG 02 (SEDE)"
};
