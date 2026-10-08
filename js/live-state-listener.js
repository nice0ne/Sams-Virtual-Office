/**
 * Live State Listener: Terhubung via WebSocket (ws://)
 * dengan Fallback ke state.json jika WebSocket tidak tersedia.
 * Menerima event instan (<10ms) dari server.js / agy!
 */
export class LiveStateListener {
  constructor({ engine, whiteboard, spawner, bots, pollInterval = 1000 }) {
    this.engine = engine;
    this.whiteboard = whiteboard;
    this.spawner = spawner;
    this.bots = bots;
    this.pollInterval = pollInterval;

    this.currentSessionId = null;
    this.lastUpdatedAt = null;
    this.ws = null;
    this.fallbackTimer = null;
    this.knownSubagents = new Set();
    this.isWsConnected = false;
  }

  start() {
    this.connectWebSocket();
  }

  stop() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  connectWebSocket() {
    if (typeof window === 'undefined' || !window.WebSocket) {
      this.startPollingFallback();
      return;
    }

    const host = window.location.host || 'localhost:8000';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isWsConnected = true;
        console.log('[LiveStateListener] ⚡ Terhubung langsung via WebSocket:', wsUrl);
        this.updateConnectionIndicator(true);

        // Hentikan fallback polling jika sebelumnya jalan
        if (this.fallbackTimer) {
          clearInterval(this.fallbackTimer);
          this.fallbackTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingData(data);
        } catch (e) {
          console.error('[LiveStateListener] Error parsing WebSocket message:', e);
        }
      };

      this.ws.onerror = () => {
        // Gagal connect websocket, aktifkan fallback polling
        if (!this.isWsConnected) {
          this.startPollingFallback();
        }
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        this.updateConnectionIndicator(false);
        console.log('[LiveStateListener] 🔴 WebSocket terputus. Mencoba reconnect dalam 3 detik...');
        this.startPollingFallback();

        // Coba reconnect setiap 3 detik
        setTimeout(() => {
          this.connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      this.startPollingFallback();
    }
  }

  startPollingFallback() {
    if (this.fallbackTimer) return;
    console.log('[LiveStateListener] Menggunakan fallback polling state.json');
    this.fallbackTimer = setInterval(() => this.pollHttp(), this.pollInterval);
  }

  async pollHttp() {
    try {
      const res = await fetch('./state.json?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      this.handleIncomingData(data);
    } catch (err) {}
  }

  handleIncomingData(data) {
    if (!data) return;

    // Deteksi Sesi Baru
    if (data.sessionId && data.sessionId !== this.currentSessionId) {
      this.handleNewSession(data);
    }

    if (data.updatedAt && data.updatedAt === this.lastUpdatedAt) return;
    this.lastUpdatedAt = data.updatedAt;
    this.applyState(data);
  }

  updateConnectionIndicator(connected) {
    if (typeof document === 'undefined') return;
    const updEl = document.getElementById('upd');
    if (updEl) {
      if (connected) {
        updEl.innerHTML = '<i class="live-dot" style="background:#22c55e;"></i><span>⚡ WebSocket Aktif · Terhubung Instan</span>';
      } else {
        updEl.innerHTML = '<i class="live-dot" style="background:#eab308;"></i><span>● Polling Mode · Reconnecting WS...</span>';
      }
    }
  }

  handleNewSession(data) {
    console.log('[LiveStateListener] 🚀 SESI AGY BARU TERDETEKSI:', data.sessionId, '| Topik:', data.topic);
    this.currentSessionId = data.sessionId;

    // Despawn subagent dari sesi sebelumnya
    if (this.spawner && this.knownSubagents.size > 0) {
      this.knownSubagents.forEach(subId => {
        try {
          this.spawner.resolveSubagent(subId, 'despawn');
        } catch (e) {}
      });
      this.knownSubagents.clear();
    }

    // Kembalikan semua bot inti ke posisi santai di lobby saat sesi baru dimulai
    if (this.bots) {
      this.bots.forEach(b => {
        if (!b.isSubagent && b.lobbySpot && typeof b.walkTo === 'function') {
          b.walkTo(b.lobbySpot);
          b.setState('idle', b.defaultSpeech || '☕ Santai di lobby');
        }
      });
    }

    this.showNewSessionNotice(data.topic || 'Sesi Baru');

    if (this.engine && typeof this.engine.resetWorkflow === 'function') {
      this.engine.resetWorkflow();
    }
  }

  showNewSessionNotice(topic) {
    if (typeof document === 'undefined') return;
    let notice = document.getElementById('new-session-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'new-session-notice';
      notice.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(16, 185, 129, 0.95);
        color: #ffffff;
        padding: 8px 18px;
        border-radius: 20px;
        font: 800 13px 'Nunito', sans-serif;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: opacity 0.5s ease;
      `;
      document.body.appendChild(notice);
    }

    notice.innerHTML = `<span>🟢 SESI BARU TERDETEKSI:</span> <b>${topic}</b>`;
    notice.style.opacity = '1';
    notice.style.display = 'flex';

    setTimeout(() => {
      if (notice) {
        notice.style.opacity = '0';
        setTimeout(() => { if (notice) notice.style.display = 'none'; }, 500);
      }
    }, 4000);
  }

  applyState(data) {
    console.log('[LiveStateListener] Update event:', data.stage || data.status, '| Speaker:', data.speaker);

    // 1. Update Whiteboard 3D
    if (data.whiteboard && this.whiteboard) {
      this.whiteboard.updateContent({
        stage: data.whiteboard.stage || data.stage || 'LIVE',
        title: data.whiteboard.title || data.topic || 'SESI AGY',
        subtitle: data.whiteboard.subtitle || '',
        items: data.whiteboard.items || [],
        approvals: data.whiteboard.approvals || ''
      });
    }

    // 2. Gerakkan Karakter Speaker & Munculkan Balon Dialog
    if (data.speaker && this.bots) {
      const bot = this.bots.get(data.speaker);
      if (bot) {
        if (data.speakerMessage && typeof bot.say === 'function') {
          bot.say(data.speakerMessage);
        }

        // Simpan riwayat ucapan & pemikiran ke bot untuk live modal
        if (!bot.quoteLog) bot.quoteLog = [];
        if (data.speakerMessage && !bot.quoteLog.includes(data.speakerMessage)) {
          bot.quoteLog.push(data.speakerMessage);
          if (bot.quoteLog.length > 8) bot.quoteLog.shift();
        }

        if (!bot.thoughts) bot.thoughts = [];
        if (data.thought) {
          bot.thoughts.push(data.thought);
          if (bot.thoughts.length > 8) bot.thoughts.shift();
        } else if (data.speakerMessage) {
          bot.thoughts.push(`Menganalisis: "${data.speakerMessage.slice(0, 60)}..."`);
          if (bot.thoughts.length > 8) bot.thoughts.shift();
        }

        if (data.tool) bot.currentTool = data.tool;
        if (data.model) bot.model = data.model;

        // Update active task jika disediakan atau dari topic
        if (data.taskTitle || data.topic) {
          bot.activeTask = {
            id: data.taskId || `TSK-${data.speaker.toUpperCase()}`,
            category: data.stage ? data.stage.toLowerCase() : 'live',
            title: data.taskTitle || (data.topic ? `${data.topic} (${data.stage || 'ACTIVE'})` : data.speakerMessage),
            criteria: data.criteria || [
              `Fase: ${data.stage || 'SEDANG BERJALAN'}`,
              `Pesan terakhir: ${data.speakerMessage || 'Aktif'}`,
              `Sinkronisasi live via WebSocket port 8000`
            ]
          };
        }

        // Jika fase Brainstorming, karakter otomatis berjalan menghadap whiteboard Creative
        if (data.stage === 'BRAINSTORMING' && typeof bot.walkTo === 'function') {
          bot.walkTo({ x: -10, z: 8.2, yaw: 0 });
          bot.setState('working');
        } else if (data.stage === 'FINISHED' || data.stage === 'IDLE') {
          if (bot.lobbySpot && typeof bot.walkTo === 'function') {
            bot.walkTo(bot.lobbySpot);
            bot.setState('idle');
          }
        } else if (data.stage && bot.desk && typeof bot.walkTo === 'function') {
          // Ada tugas / pekerjaan aktif: pindah ke meja kerja masing-masing!
          // Cek apakah meja kerja sedang ditempati karakter lain agar tidak bertumpuk
          let targetDesk = { ...bot.desk };
          if (this.bots && typeof this.bots.forEach === 'function') {
            let isOccupied = false;
            this.bots.forEach(otherBot => {
              if (otherBot && otherBot !== bot && otherBot.mesh && otherBot.mesh.position) {
                const dx = otherBot.mesh.position.x - targetDesk.x;
                const dz = otherBot.mesh.position.z - targetDesk.z;
                if ((dx * dx + dz * dz) < 1.44) { // Jarak < 1.2 unit
                  isOccupied = true;
                }
              }
            });
            if (isOccupied) {
              // Geser sedikit ke sisi meja (visitor / discussion stance) agar tidak menimpa karakter lain
              targetDesk = {
                x: bot.desk.x + (bot.desk.x > 0 ? 0.9 : -0.9),
                z: bot.desk.z + 0.4,
                yaw: bot.desk.yaw !== undefined ? bot.desk.yaw : 0
              };
            }
          }
          bot.walkTo(targetDesk);
          bot.setState('working');
        }
      }
    }

    // Jika fase FINISHED atau IDLE, kembalikan semua agen inti ke lobby untuk bersantai
    if ((data.stage === 'FINISHED' || data.stage === 'IDLE') && this.bots) {
      const relaxQuotes = {
        kamala: '🎉 Seluruh task selesai 100%! Santai di lounge.',
        devin: '🎮 Lanjut main PS di gaming corner!',
        audit: '☕ Santai sambil ngopi hangat di pantry.',
        rani: '🏓 Latihan servis pingpong di lobby!',
        aura: '🥤 Segar sehabis minum di dispenser!',
        raka: '🏓 Siap tanding pingpong bareng Rani!'
      };
      this.bots.forEach(b => {
        if (!b.isSubagent && b.lobbySpot && typeof b.walkTo === 'function') {
          b.walkTo(b.lobbySpot);
          b.setState('idle', relaxQuotes[b.id] || b.defaultSpeech || '☕ Santai di lobby');
        }
      });
    }

    // 3. Update Status FSM Engine & Badge UI
    if (data.stage && this.engine && typeof this.engine.getCurrentState === 'function') {
      if (this.engine.getCurrentState() !== data.stage) {
        this.engine.state = data.stage;
        const badge = document.getElementById('sp-stage-badge');
        if (badge) badge.textContent = data.stage;
      }
    }

    // Update Top HUD Metrics jika ada data session
    if (typeof document !== 'undefined') {
      const elAct = document.getElementById('sAct');
      const elSes = document.getElementById('sSes');
      const elCost = document.getElementById('sCost');
      if (elAct && this.bots) elAct.textContent = `${this.bots.size || 6}/6`;
      if (data.metrics) {
        if (elSes && data.metrics.tasksCompleted !== undefined) elSes.textContent = data.metrics.tasksCompleted;
        if (elCost && data.metrics.tokenCost !== undefined) elCost.textContent = `$${Number(data.metrics.tokenCost).toFixed(2)}`;
      }
    }

    // 4. Deteksi & Spawn Subagent Baru Otomatis dari agy
    if (Array.isArray(data.subagents) && this.spawner) {
      data.subagents.forEach((sub, idx) => {
        if (!this.knownSubagents.has(sub.id)) {
          this.knownSubagents.add(sub.id);
          console.log('[LiveStateListener] 🚀 Spawn subagent via WebSocket:', sub.name);

          this.spawner.spawnSubagent({
            id: sub.id,
            name: sub.name || `Subagent #${idx + 1}`,
            role: sub.role || 'Worker',
            color: sub.color || '#38bdf8',
            taskTitle: sub.task || 'Menjalankan instruksi subagent...'
          });
        }
      });
    }
  }
}
