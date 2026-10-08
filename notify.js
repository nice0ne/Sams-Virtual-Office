#!/usr/bin/env node
/**
 * notify.js - Universal CLI & Client SDK untuk Sam's Virtual Office 3D
 *
 * Fitur:
 * 1. Mendukung environment variable SAMS_OFFICE_URL (misal: http://localhost:8000 atau https://office.domain.com)
 * 2. Fail-safe & non-blocking: Jika kantor 3D offline, coding agent tidak akan macet/crash.
 * 3. Modular: Dapat dijalankan via CLI atau di-import sebagai ES Module (import { sendOfficeEvent, spawnAgent } from './notify.js').
 */

import http from 'node:http';
import { URL } from 'node:url';

/**
 * URL endpoint kantor 3D.
 * Dapat di-override melalui environment variable SAMS_OFFICE_URL atau MSAM_OFFICE_URL.
 */
const DEFAULT_URL = process.env.SAMS_OFFICE_URL || process.env.MSAM_OFFICE_URL || 'http://localhost:8000';

/**
 * Mengirim event payload ke Sam's Virtual Office
 * @param {Object} payload 
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function sendOfficeEvent(payload, options = {}) {
  const targetUrl = new URL('/api/event', options.url || DEFAULT_URL);
  const postData = JSON.stringify({
    ...payload,
    updatedAt: new Date().toISOString()
  });

  const authKey = process.env.SAMS_OFFICE_KEY || process.env.MSAM_OFFICE_KEY || null;
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  };
  if (authKey) {
    headers['Authorization'] = `Bearer ${authKey}`;
  }

  return new Promise((resolve) => {
    const req = http.request({
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname,
      method: 'POST',
      timeout: 2500,
      headers
    }, res => {
      let resBody = '';

      res.on('data', chunk => { resBody += chunk; });
      res.on('end', () => {
        if (!options.silent) {
          console.log(`[notify] ✅ Terkirim ke Virtual Office (${targetUrl.host}): ${resBody}`);
        }
        resolve({ success: true, response: resBody });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      if (!options.silent) {
        console.warn(`[notify] ⏱️ Timeout saat menghubungi Virtual Office (${targetUrl.host})`);
      }
      resolve({ success: false, error: 'timeout' });
    });

    req.on('error', err => {
      if (!options.silent) {
        console.warn(`[notify] ℹ️ Virtual Office offline atau tidak terjangkau (${err.message}). Melanjutkan tugas.`);
      }
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Helper ringkas untuk spawn subagent
 */
export async function spawnAgent(name, role, task, color = '#38bdf8', options = {}) {
  return sendOfficeEvent({
    stage: 'EXECUTING_SUBAGENTS',
    subagents: [{
      id: `sub-${Date.now()}`,
      name,
      role,
      task,
      color
    }],
    speaker: 'kamala',
    speakerMessage: `Merekrut subagent baru: ${name} (${role}) untuk Dev Lab!`
  }, options);
}

// -------------------------------------------------------------
// CLI Execution Handler (Ketika dijalankan via terminal: node notify.js ...)
// -------------------------------------------------------------
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('notify.js') || 
  process.argv[1].endsWith('notify')
);

if (isDirectExecution && process.argv.length > 2) {
  const args = process.argv.slice(2);

  function getArg(flag) {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  }

  const stage = getArg('--stage');
  const speaker = getArg('--speaker');
  const msg = getArg('--msg') || getArg('--message');
  const topic = getArg('--topic');
  const session = getArg('--session');
  const spawn = getArg('--spawn');
  const role = getArg('--role') || 'Subagent Worker';
  const task = getArg('--task') || 'Menjalankan tugas subagent...';
  const color = getArg('--color') || '#38bdf8';

  const payload = {};
  if (session) payload.sessionId = session;
  if (topic) payload.topic = topic;
  if (stage) payload.stage = stage;
  if (speaker) payload.speaker = speaker;
  if (msg) payload.speakerMessage = msg;

  if (spawn) {
    payload.stage = 'EXECUTING_SUBAGENTS';
    payload.subagents = [{
      id: `sub-${Date.now()}`,
      name: spawn,
      role: role,
      task: task,
      color: color
    }];
    if (!payload.speakerMessage) {
      payload.speaker = 'kamala';
      payload.speakerMessage = `Merekrut subagent baru: ${spawn} (${role}) untuk Dev Lab!`;
    }
  }

  if (stage === 'BRAINSTORMING') {
    payload.whiteboard = {
      stage: 'BRAINSTORMING',
      title: topic || 'SESI BRAINSTORMING',
      subtitle: msg || 'Eksplorasi ide dan klasifikasi alur...',
      items: [
        '[>] 1. Exploring user intent & scope',
        '    2. Classify Path: [Spike] | [Bounded] | [Architectural]',
        '    3. Propose 2-3 approaches with trade-offs',
        '    4. Human approval gate on spec'
      ],
      approvals: 'Gate: Menunggu Persetujuan Partner'
    };
  } else if (stage === 'WRITING_PLAN') {
    payload.whiteboard = {
      stage: 'WRITING_PLAN',
      title: topic || 'IMPLEMENTATION PLAN',
      subtitle: 'Rencana kerja bite-sized terstruktur',
      items: [
        '[>] Task 1: Setup Architecture & Interfaces',
        '[ ] Task 2: Subagent Worker Implementation',
        '[ ] Task 3: Integration & Testing Suite',
        '[ ] Task 4: Final Verification'
      ],
      approvals: 'Status: Plan Disetujui'
    };
  } else if (stage === 'EXECUTING_SUBAGENTS') {
    payload.whiteboard = {
      stage: 'EXECUTING',
      title: topic || 'SUBAGENT CODING POOL',
      subtitle: 'Eksekusi paralel autonomous coding',
      items: [
        '[x] Task 1: Setup Architecture',
        '[>] Task 2: Subagents Active in Dev Lab...',
        '[ ] Task 3: Code Verification'
      ],
      approvals: 'Status: Subagents Working'
    };
  } else if (stage === 'FINISHED') {
    payload.whiteboard = {
      stage: 'COMPLETED',
      title: topic || 'SEMUA TASK SELESAI',
      subtitle: msg || 'Verifikasi 100% sukses. Semua agent kembali santai di lobby.',
      items: [
        '[x] Task 1: Setup Architecture & Interfaces',
        '[x] Task 2: Subagent Execution Complete',
        '[x] Task 3: Unit & Integration Tests Passing',
        '[x] Task 4: Verified by Reviewer'
      ],
      approvals: 'Status: Selesai ✅ (Kembali ke Lobby)'
    };
  }

  await sendOfficeEvent(payload);
}
