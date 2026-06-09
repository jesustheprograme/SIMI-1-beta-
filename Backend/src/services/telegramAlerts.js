const { telegram } = require('../config/env');
const { formatStoredDate } = require('../utils/date');
const { hasValue } = require('../utils/values');

async function sendTelegramOutlierAlerts(outliers, user) {
  if (!telegram.enabled || !telegram.botToken) return;
  const notifiableOutliers = outliers.filter(shouldSendTelegramOutlierAlert);
  if (notifiableOutliers.length === 0) return;

  const chatIds = getTelegramChatIds(user);
  if (chatIds.length === 0) return;

  for (const outlier of notifiableOutliers) {
    for (const chatId of chatIds) {
      try {
        await sendTelegramMessage(chatId, formatOutlierAlertMessage(outlier));
      } catch (error) {
        console.warn(`No se pudo enviar la alerta de Telegram a ${chatId}:`, error.message);
      }
    }
  }
}

async function sendTelegramProcessFinishedAlert(process, user) {
  if (!telegram.enabled || !telegram.botToken) return;
  const chatIds = getTelegramChatIds(user);
  if (chatIds.length === 0) return;

  for (const chatId of chatIds) {
    try {
      await sendTelegramMessage(chatId, formatProcessFinishedMessage(process));
    } catch (error) {
      console.warn(`No se pudo enviar la finalizacion del proceso a ${chatId}:`, error.message);
    }
  }
}

function getTelegramChatIds(user) {
  return Array.from(
    new Set([String(user.telegram_id || '').trim(), ...telegram.defaultChatIds].filter(Boolean)),
  );
}

function shouldSendTelegramOutlierAlert(outlier) {
  if (telegram.scope === 'all') return true;
  return outlier.proceso_en_ejecucion === true;
}

async function sendTelegramMessage(chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${telegram.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, disable_notification: false, text }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Telegram respondio ${response.status}${detail ? `: ${detail}` : ''}`);
  }
}

function formatOutlierAlertMessage(outlier) {
  const sensorName = outlier.nombre || outlier.sensor || outlier.id || 'Sin nombre';
  const unit = outlier.unidad || '';
  const limitType = getOutlierLimitType(outlier);
  const limitLabel = limitType === 'INFERIOR' ? 'Valor Minimo' : 'Valor Maximo';
  const limitSource = limitType === 'INFERIOR' ? outlier.valor_minimo : outlier.valor_maximo;
  const lines = [`🚨 VALOR ${limitType} AL LIMITE 🚨`];

  if (outlier.ubicacion) lines.push(`⚠️ ${outlier.ubicacion} ⚠️`);
  lines.push(`Sensor: ${sensorName}`, `Valor: ${formatOutlierValue(outlier.valor)}${unit ? ` ${unit}` : ''}`);
  if (hasValue(limitSource)) lines.push(`${limitLabel}: ${formatOutlierValue(limitSource)}${unit ? ` ${unit}` : ''}`);
  if (outlier.fecha_hora) lines.push(`Hora: ${formatOutlierTimestamp(outlier.fecha_hora)}`);
  if (String(outlier.proceso_nombre || outlier.proceso_id || '').trim()) lines.push(`Proceso: ${outlier.proceso_nombre || outlier.proceso_id}`);
  if (hasValue(outlier.registro_numero)) lines.push(`ID del Registro: ${outlier.registro_numero}`);
  return lines.join('\n');
}

function getOutlierLimitType(outlier) {
  const observation = String(outlier.observacion || '').toLowerCase();
  if (observation.includes('min')) return 'INFERIOR';
  if (observation.includes('max')) return 'MAXIMO';
  const value = Number(outlier.valor);
  if (Number.isFinite(value) && Number.isFinite(Number(outlier.valor_minimo)) && value < Number(outlier.valor_minimo)) return 'INFERIOR';
  if (Number.isFinite(value) && Number.isFinite(Number(outlier.valor_maximo)) && value > Number(outlier.valor_maximo)) return 'MAXIMO';
  return 'MAXIMO';
}

function formatOutlierValue(value) {
  if (value instanceof Date) return formatStoredDate(value) || value.toISOString();
  return String(value ?? '').trim() || 'Sin valor';
}

function formatOutlierTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(date);
}

function formatProcessFinishedMessage(process) {
  const startedAt = getProcessDate(process.createdAt || process.startAt || process.startat_ts || process.startat);
  const finishedAt = getProcessDate(process.finishedAt || process.finishedat_ts || process.finishedat) || new Date();
  const lines = [
    '⚠️ PROCESO FINALIZADO ⚠️',
    '',
    `Nombre del proceso: ${String(process.processName || process.nombre || '').trim() || 'Sin nombre'}`,
    `Operador inicial: ${String(process.initialOperator || '').trim() || 'Sin asignar'}`,
    `Hora de inicialización: ${formatProcessTimestamp(startedAt)}`,
    `Tiempo de monitoreo: ${formatMonitoringDuration(startedAt, finishedAt)}`,
    `Hora de finalización: ${formatProcessTimestamp(finishedAt)}`,
    `Operador final: ${String(process.finalOperator || '').trim() || 'Sin asignar'}`,
  ];

  return lines.join('\n');
}

function getProcessDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatProcessTimestamp(date) {
  if (!date) return 'Sin registrar';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Bogota',
  }).format(date);
}

function formatMonitoringDuration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return 'Sin registrar';
  const totalSeconds = Math.max(0, Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);
  return parts.join(', ');
}

module.exports = { sendTelegramOutlierAlerts, sendTelegramProcessFinishedAlert };
