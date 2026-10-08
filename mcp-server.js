#!/usr/bin/env node
/**
 * mcp-server.js — Sam's Virtual Office MCP Server (Model Context Protocol)
 *
 * Mengimplementasikan protokol MCP stdio (JSON-RPC 2.0)
 * Memungkinkan Claude Code, Cursor, Windsurf, Roo Code, dan Antigravity
 * mengendalikan Virtual Office 3D secara native menggunakan function calling / tools.
 */

import readline from 'node:readline';
import { sendOfficeEvent, spawnAgent } from './notify.js';

// Metadata Server
const SERVER_NAME = 'sams-virtual-office';
const SERVER_VERSION = '1.0.0';

// Definisi Tools yang diexpose ke AI Model
const TOOLS = [
  {
    name: 'office_set_stage',
    description: 'Mengubah tahap alur kerja di Virtual Office 3D (misal: BRAINSTORMING, WRITING_PLAN, EXECUTING, FINISHED), menggerakkan karakter, dan memperbarui Whiteboard 3D.',
    inputSchema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['IDLE', 'BRAINSTORMING', 'WRITING_PLAN', 'EXECUTING_SUBAGENTS', 'FINISHED'],
          description: 'Tahapan kerja aktif saat ini'
        },
        topic: {
          type: 'string',
          description: 'Topik atau judul fitur yang sedang dikerjakan'
        },
        speaker: {
          type: 'string',
          description: 'Karakter pembicara yang aktif (misal: kamala, devin, audit, rani, aura, raka)'
        },
        message: {
          type: 'string',
          description: 'Pesan balon percakapan di atas karakter'
        }
      },
      required: ['stage']
    }
  },
  {
    name: 'office_spawn_agent',
    description: 'Merekrut dan memunculkan agen/subagent baru melalui portal 3D di Lobby. Subagent akan otomatis mencari meja kerja kosong menggunakan A* pathfinding.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nama subagent (misal: Alex, Neo, UI-Specialist)'
        },
        role: {
          type: 'string',
          description: 'Peran atau spesialisasi tugas (misal: Frontend Dev, Database Architect)'
        },
        task: {
          type: 'string',
          description: 'Deskripsi singkat task yang sedang dikerjakan'
        },
        color: {
          type: 'string',
          description: 'Warna hex aksen bot (default: #38bdf8)'
        }
      },
      required: ['name', 'role', 'task']
    }
  },
  {
    name: 'office_update_whiteboard',
    description: 'Memperbarui teks dan checklist task pada papan tulis Whiteboard 3D di kantor.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Judul utama whiteboard'
        },
        subtitle: {
          type: 'string',
          description: 'Subjudul atau ringkasan status'
        },
        items: {
          type: 'array',
          items: { type: 'string' },
          description: 'Daftar butir/checklist tugas (gunakan format "[x] Selesai", "[>] Sedang Berjalan", "[ ] Menunggu")'
        },
        approvals: {
          type: 'string',
          description: 'Status persetujuan pada footer whiteboard'
        }
      },
      required: ['title', 'items']
    }
  },
  {
    name: 'office_agent_speak',
    description: 'Membuat salah satu karakter kantor berbicara dan menampilkan balon dialog di atas kepalanya.',
    inputSchema: {
      type: 'object',
      properties: {
        speaker: {
          type: 'string',
          description: 'Nama bot (kamala, devin, audit, rani, aura, raka)'
        },
        message: {
          type: 'string',
          description: 'Isi pesan yang disampaikan bot'
        }
      },
      required: ['speaker', 'message']
    }
  }
];

/**
 * Handle MCP Tool Calls
 */
async function handleToolCall(name, args) {
  switch (name) {
    case 'office_set_stage': {
      const res = await sendOfficeEvent({
        stage: args.stage,
        topic: args.topic,
        speaker: args.speaker || (args.stage === 'BRAINSTORMING' ? 'kamala' : 'devin'),
        speakerMessage: args.message
      });
      return {
        content: [
          {
            type: 'text',
            text: res.success 
              ? `✅ Status Virtual Office berhasil diubah ke [${args.stage}]` 
              : `⚠️ Gagal sinkronisasi: ${res.error}`
          }
        ]
      };
    }

    case 'office_spawn_agent': {
      const res = await spawnAgent(
        args.name, 
        args.role, 
        args.task, 
        args.color || '#38bdf8'
      );
      return {
        content: [
          {
            type: 'text',
            text: res.success 
              ? `🚀 Subagent [${args.name}] (${args.role}) berhasil dipanggil via Portal 3D!`
              : `⚠️ Gagal spawn subagent: ${res.error}`
          }
        ]
      };
    }

    case 'office_update_whiteboard': {
      const res = await sendOfficeEvent({
        whiteboard: {
          title: args.title,
          subtitle: args.subtitle || '',
          items: args.items,
          approvals: args.approvals || 'Active'
        }
      });
      return {
        content: [
          {
            type: 'text',
            text: res.success 
              ? `📋 Whiteboard 3D berhasil diperbarui: "${args.title}"` 
              : `⚠️ Gagal update whiteboard: ${res.error}`
          }
        ]
      };
    }

    case 'office_agent_speak': {
      const res = await sendOfficeEvent({
        speaker: args.speaker,
        speakerMessage: args.message
      });
      return {
        content: [
          {
            type: 'text',
            text: res.success 
              ? `💬 ${args.speaker} berbicara di kantor 3D: "${args.message}"` 
              : `⚠️ Gagal: ${res.error}`
          }
        ]
      };
    }

    default:
      throw new Error(`Tool tidak ditemukan: ${name}`);
  }
}

/**
 * JSON-RPC 2.0 Message Dispatcher via Standard I/O (stdio)
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (e) {
    sendResponse({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' }
    });
    return;
  }

  const { id, method, params } = request;

  try {
    switch (method) {
      // MCP Initialize Handshake
      case 'initialize':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION
            }
          }
        });
        break;

      case 'notifications/initialized':
        // Client ack, no response needed
        break;

      // MCP List Tools
      case 'tools/list':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS
          }
        });
        break;

      // MCP Call Tool
      case 'tools/call': {
        const { name, arguments: toolArgs } = params;
        const result = await handleToolCall(name, toolArgs || {});
        sendResponse({
          jsonrpc: '2.0',
          id,
          result
        });
        break;
      }

      default:
        sendResponse({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }
  } catch (error) {
    sendResponse({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: error.message }
    });
  }
});

// Log readiness to stderr (MCP spec: stdout is reserved for JSON-RPC)
console.error(`[MCP] 🚀 ${SERVER_NAME} v${SERVER_VERSION} berjalan via stdio.`);
