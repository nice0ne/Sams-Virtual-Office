/**
 * Glassmorphism Control Panel for Superpowers Workflow
 * Spec: docs/superpowers/specs/2026-10-06-superpowers-workflow-visualization-design.md
 * Plan: docs/superpowers/plans/2026-10-06-superpowers-workflow-visualization.md (Task 5)
 */

export function initSuperpowersUI(engineOrOptions, eventBusParam = null, spawnerParam = null, options = {}) {
  let engine = null;
  let eventBus = null;
  let spawner = null;
  let office = null;
  let camera = null;
  let controls = null;

  if (
    engineOrOptions &&
    typeof engineOrOptions === 'object' &&
    typeof engineOrOptions.startBrainstorming !== 'function' &&
    ('engine' in engineOrOptions || 'eventBus' in engineOrOptions)
  ) {
    engine = engineOrOptions.engine || null;
    eventBus = engineOrOptions.eventBus || null;
    spawner = engineOrOptions.spawner || null;
    office = engineOrOptions.office || null;
    camera = engineOrOptions.camera || null;
    controls = engineOrOptions.controls || null;
  } else {
    engine = engineOrOptions || null;
    eventBus = eventBusParam || null;
    spawner = spawnerParam || null;
    if (options && typeof options === 'object') {
      office = options.office || null;
      camera = options.camera || null;
      controls = options.controls || null;
    }
  }

  // Prevent duplicate panels
  if (typeof document !== 'undefined' && document.getElementById) {
    const existing = document.getElementById('superpowers-panel');
    if (existing && typeof existing.remove === 'function') {
      existing.remove();
    }
  }

  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }

  const panel = document.createElement('div');
  panel.id = 'superpowers-panel';
  panel.style.cssText = `
    position: fixed;
    right: 14px;
    top: 60px;
    width: 250px;
    background: rgba(15, 23, 42, 0.94);
    border: 1.2px solid rgba(56, 189, 248, 0.55);
    border-radius: 12px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: #f8fafc;
    padding: 10px 12px;
    box-shadow: 0 10px 28px rgba(0,0,0,0.55);
    z-index: 99;
    font-family: 'Nunito', sans-serif;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #334155; padding-bottom:6px;">
      <div style="display:flex; align-items:center; gap:5px;">
        <span style="font-weight:800; font-size:11px; color:#38bdf8; letter-spacing:0.4px;">⚡ SUPERPOWERS</span>
      </div>
      <div style="display:flex; align-items:center; gap:5px;">
        <span id="sp-stage-badge" style="font-size:9.5px; padding:2px 6px; border-radius:5px; background:#0284c7; font-weight:800; letter-spacing:0.5px;">IDLE</span>
        <button id="btn-sp-minimize" style="background:#1e293b; border:1px solid #475569; color:#cbd5e1; cursor:pointer; font-size:12px; font-weight:800; border-radius:4px; width:20px; height:20px; display:flex; align-items:center; justify-content:center; line-height:1;" title="Minimize / Toggle HUD">−</button>
      </div>
    </div>
    <div id="sp-panel-content">
      <div style="display:flex; flex-direction:column; gap:5px;">
        <button id="btn-sp-brainstorm" class="sp-btn" data-stage="BRAINSTORMING">💡 1. Brainstorm</button>
        <button id="btn-sp-approach" class="sp-btn" data-stage="APPROACH">⚡ 2. Confirm Path</button>
        <button id="btn-sp-plan" class="sp-btn" data-stage="WRITING_PLAN">📝 3. Generate Plan</button>
        <button id="btn-sp-subagents" class="sp-btn" data-stage="EXECUTING_SUBAGENTS">🚀 4. Rekrut Subagent</button>
        <button id="btn-sp-finish" class="sp-btn" data-stage="FINISHED">🎉 5. Selesaikan</button>
      </div>
      <div style="margin-top:8px; padding-top:6px; border-top:1px solid #334155; display:flex; gap:5px;">
        <button id="btn-sp-promote" class="sp-btn-sm" style="flex:1;" title="Angkat Subagent menjadi tim permanen">👑 Promote</button>
        <button id="btn-sp-despawn" class="sp-btn-sm" style="flex:1;" title="Subagent pamit dan kembali ke lobby">👋 Despawn</button>
      </div>
      <div style="margin-top:6px; display:flex; gap:5px;">
        <button id="btn-sp-auto" class="sp-btn" style="flex:2; background:#4338ca; border-color:#6366f1; text-align:center; justify-content:center;">▶ Demo Auto</button>
        <button id="btn-sp-reset" class="sp-btn-sm" style="flex:1; text-align:center;" title="Reset alur ke IDLE">🔄 Reset</button>
      </div>
      <div id="sp-subagent-status" style="margin-top:6px; font-size:9.5px; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;">
        <span>Bot: <b id="sp-bot-count" style="color:#38bdf8;">0 aktif</b></span>
        <span id="sp-activity-hint" style="opacity:0.8;">Klik alur di atas</span>
      </div>
    </div>
  `;

  // Append styling if not already present
  if (document.head && !document.getElementById('sp-ui-styles')) {
    const style = document.createElement('style');
    style.id = 'sp-ui-styles';
    style.textContent = `
      .sp-btn {
        background: #1e293b;
        border: 1px solid #334155;
        color: #f8fafc;
        padding: 5px 8px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 700;
        font-size: 11px;
        text-align: left;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .sp-btn:hover { background: #334155; border-color: #38bdf8; transform: translateX(2px); }
      .sp-btn.active {
        background: rgba(56, 189, 248, 0.2);
        border-color: #38bdf8;
        color: #38bdf8;
        box-shadow: 0 0 8px rgba(56, 189, 248, 0.25);
      }
      .sp-btn-sm {
        background: #0f172a;
        border: 1px solid #38bdf8;
        color: #38bdf8;
        padding: 4px 6px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 700;
        font-size: 10px;
        transition: all 0.15s ease;
      }
      .sp-btn-sm:hover { background: #38bdf8; color: #0f172a; }
    `;
    document.head.appendChild(style);
  }

  if (document.body) {
    document.body.appendChild(panel);
  }

  // Hook minimize / collapse toggle
  let isMinimized = false;
  const btnMin = document.getElementById('btn-sp-minimize');
  const content = document.getElementById('sp-panel-content');
  const togglePanelVisibility = (forceMinimize = null) => {
    isMinimized = forceMinimize !== null ? forceMinimize : !isMinimized;
    if (content) content.style.display = isMinimized ? 'none' : 'block';
    if (btnMin) {
      btnMin.textContent = isMinimized ? '+' : '−';
      btnMin.title = isMinimized ? 'Buka Simulator' : 'Sembunyikan Simulator';
    }
    panel.style.width = isMinimized ? '200px' : '250px';
    panel.style.padding = isMinimized ? '6px 10px' : '10px 12px';

    const btnSuperpowers = document.getElementById('btnSuperpowers');
    if (btnSuperpowers) {
      btnSuperpowers.setAttribute('aria-pressed', isMinimized ? 'false' : 'true');
    }
  };

  if (btnMin) {
    btnMin.onclick = () => togglePanelVisibility();
  }

  // Hook top toolbar toggle button "⚡ Simulator" if present
  const btnSuperpowers = document.getElementById('btnSuperpowers');
  if (btnSuperpowers) {
    btnSuperpowers.onclick = () => {
      // If fully hidden or minimized, toggle
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        togglePanelVisibility(false);
      } else if (isMinimized) {
        togglePanelVisibility(false);
      } else {
        togglePanelVisibility(true);
      }
    };
  }


  // Update active button indicator
  const updateActiveButton = (state) => {
    const buttons = panel.querySelectorAll('.sp-btn[data-stage]');
    if (buttons && buttons.forEach) {
      buttons.forEach((btn) => {
        if (btn.dataset && btn.dataset.stage === state) {
          btn.classList.add('active');
        } else if (btn.classList) {
          btn.classList.remove('active');
        }
      });
    }
  };

  // Helper to update subagent count badge
  const updateBotCount = () => {
    const countEl = document.getElementById('sp-bot-count');
    if (!countEl) return;
    let count = 0;
    if (spawner && typeof spawner.getActiveSubagents === 'function') {
      const active = spawner.getActiveSubagents();
      count = active && active.size !== undefined ? active.size : 0;
    }
    countEl.textContent = `${count} aktif`;
  };

  // Hook stage transition handlers
  const btnBrainstorm = document.getElementById('btn-sp-brainstorm');
  if (btnBrainstorm && engine) {
    btnBrainstorm.onclick = () => {
      if (typeof engine.startBrainstorming === 'function') {
        engine.startBrainstorming('Sistem Otomatisasi Subagent 3D');
      }
      const hint = document.getElementById('sp-activity-hint');
      if (hint) hint.textContent = 'Whiteboard aktif';
    };
  }

  const btnApproach = document.getElementById('btn-sp-approach');
  if (btnApproach && engine) {
    btnApproach.onclick = () => {
      if (typeof engine.selectApproach === 'function') {
        engine.selectApproach('Architectural');
      }
      const hint = document.getElementById('sp-activity-hint');
      if (hint) hint.textContent = 'Jalur Architectural disetujui';
    };
  }

  const btnPlan = document.getElementById('btn-sp-plan');
  if (btnPlan && engine) {
    btnPlan.onclick = () => {
      if (typeof engine.generateImplementationPlan === 'function') {
        engine.generateImplementationPlan();
      }
      const hint = document.getElementById('sp-activity-hint');
      if (hint) hint.textContent = 'Plan tasks terurai';
    };
  }

  const btnSubagents = document.getElementById('btn-sp-subagents');
  if (btnSubagents && engine) {
    btnSubagents.onclick = () => {
      if (typeof engine.dispatchSubagents === 'function') {
        engine.dispatchSubagents();
      }
      const hint = document.getElementById('sp-activity-hint');
      if (hint) hint.textContent = 'Portal spawn subagent!';
      updateBotCount();
    };
  }

  const btnFinish = document.getElementById('btn-sp-finish');
  if (btnFinish && engine) {
    btnFinish.onclick = () => {
      if (typeof engine.finishWorkflow === 'function') {
        engine.finishWorkflow();
      }
      const hint = document.getElementById('sp-activity-hint');
      if (hint) hint.textContent = 'Selesai 100%! Evaluasi tim';
    };
  }

  // Hook promote / despawn buttons
  const resolveSubagents = (action) => {
    if (!spawner || typeof spawner.resolveSubagent !== 'function') return;
    spawner.resolveSubagent('sub-builder-1', action);
    spawner.resolveSubagent('sub-tester-1', action);
    if (typeof spawner.getActiveSubagents === 'function') {
      const active = spawner.getActiveSubagents();
      if (active && typeof active.forEach === 'function') {
        const ids = Array.from(active.keys());
        ids.forEach((id) => spawner.resolveSubagent(id, action));
      }
    }
    const hint = document.getElementById('sp-activity-hint');
    if (hint) {
      hint.textContent = action === 'promote' ? 'Subagent diangkat staf!' : 'Subagent kembali ke lobby';
    }
    setTimeout(updateBotCount, 800);
  };

  const btnPromote = document.getElementById('btn-sp-promote');
  if (btnPromote) {
    btnPromote.onclick = () => resolveSubagents('promote');
  }

  const btnDespawn = document.getElementById('btn-sp-despawn');
  if (btnDespawn) {
    btnDespawn.onclick = () => resolveSubagents('despawn');
  }

  // Reset button
  const btnReset = document.getElementById('btn-sp-reset');
  if (btnReset && engine) {
    btnReset.onclick = () => {
      if (typeof engine.resetWorkflow === 'function') {
        engine.resetWorkflow();
      }
      resolveSubagents('despawn');
      const hint = document.getElementById('sp-activity-hint');
      if (hint) hint.textContent = 'Reset ke IDLE';
      updateBotCount();
    };
  }

  // Auto demo runner
  let autoTimer = null;
  const btnAuto = document.getElementById('btn-sp-auto');
  if (btnAuto && engine) {
    btnAuto.onclick = () => {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
        btnAuto.textContent = '▶ Jalankan Demo Otomatis';
        btnAuto.style.background = '#4f46e5';
        return;
      }
      btnAuto.textContent = '⏹ Hentikan Demo';
      btnAuto.style.background = '#ef4444';
      let step = 0;
      autoTimer = setInterval(() => {
        step++;
        if (step === 1) {
          if (typeof engine.startBrainstorming === 'function') {
            engine.startBrainstorming('Sistem Otomatisasi Subagent 3D');
          }
        } else if (step === 2) {
          if (typeof engine.selectApproach === 'function') {
            engine.selectApproach('Architectural');
          }
        } else if (step === 3) {
          if (typeof engine.generateImplementationPlan === 'function') {
            engine.generateImplementationPlan();
          }
        } else if (step === 4) {
          if (typeof engine.dispatchSubagents === 'function') {
            engine.dispatchSubagents();
          }
          updateBotCount();
        } else if (step === 5) {
          if (typeof engine.finishWorkflow === 'function') {
            engine.finishWorkflow();
          }
        } else if (step === 6) {
          clearInterval(autoTimer);
          autoTimer = null;
          btnAuto.textContent = '▶ Jalankan Demo Otomatis';
          btnAuto.style.background = '#4f46e5';
        }
      }, 3500);
    };
  }

  // Badge colors and state listeners
  const stageColors = {
    IDLE: '#64748b',
    BRAINSTORMING: '#0284c7',
    WRITING_PLAN: '#d97706',
    EXECUTING_SUBAGENTS: '#7c3aed',
    FINISHED: '#10b981'
  };

  if (eventBus && typeof eventBus.on === 'function') {
    eventBus.on('SUPERPOWER_STAGE_CHANGE', (payload) => {
      const state = payload && payload.state ? payload.state : 'IDLE';
      const badge = document.getElementById('sp-stage-badge');
      if (badge) {
        badge.textContent = state;
        badge.style.background = stageColors[state] || '#0284c7';
      }
      updateActiveButton(state);
      updateBotCount();
    });

    eventBus.on('SUPERPOWER_SUBAGENT_SPAWNED', () => {
      updateBotCount();
    });

    eventBus.on('SUPERPOWER_SUBAGENT_RESOLVED', () => {
      updateBotCount();
    });
  }

  return panel;
}

if (typeof window !== 'undefined') {
  window.initSuperpowersUI = initSuperpowersUI;
}
