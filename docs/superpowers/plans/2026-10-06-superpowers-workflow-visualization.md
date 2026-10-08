# Superpowers Workflow & Subagent Spawner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghadirkan visualisasi 3D interaktif siklus kerja skill superpowers (`/superpowers:brainstorming` -> `writing-plans` -> `subagent dispatch`) dengan whiteboard dinamis, efek rekrutmen/spawning subagent di lobby, pathfinding A* ke Dev Lab, dan kontrol UI/Event Bus hybrid.

**Architecture:** Memisahkan logika workflow dan visualisasi ke dalam modul ES Modules terpisah (`js/event-bus.js`, `js/whiteboard-display.js`, `js/subagent-spawner.js`, `js/superpowers-engine.js`, `js/superpowers-ui.js`) yang dihubungkan secara bersih ke Three.js instance di `index.html`.

**Tech Stack:** Three.js, CSS2DRenderer, Native Browser ES Modules, HTML5 Canvas 2D procedural textures, A* Pathfinding.

**Spec:** `docs/superpowers/specs/2026-10-06-superpowers-workflow-visualization-design.md`

## Global Constraints

- Platform: Modern web browsers via local lightweight server or direct ESM runner.
- Three.js: Reuse instance and coordinate system existing in `index.html`.
- Zero External Bundler: Menggunakan native ES Modules tanpa Webpack/Vite.
- Non-destructive: Tidak merusak bot existing (Kamala, Devin, Audit, Rani, Aura, Raka).

---

### Task 1: Event Bus & Event Streaming Hub

**Files:**
- Create: `js/event-bus.js`
- Test: `test-event-bus.html`

**Interfaces:**
- Produces:
  - `class SuperpowersEventBus`:
    - `on(eventName: string, callback: function): function` (returns unsubscribe)
    - `emit(eventName: string, data: any): void`
    - `clear(): void`
  - `export const eventBus = new SuperpowersEventBus();`
  - `window.SuperpowersEventBus = eventBus;`

- [x] **Step 1: Write test runner for EventBus**

Create `test-event-bus.html`:
```html
<!DOCTYPE html>
<html>
<head><title>Event Bus Test</title></head>
<body>
<div id="output">Running tests...</div>
<script type="module">
  import { eventBus } from './js/event-bus.js';
  let passed = true;
  let received = null;
  const unsub = eventBus.on('test:event', data => { received = data; });
  eventBus.emit('test:event', { hello: 'world' });
  if (!received || received.hello !== 'world') passed = false;
  unsub();
  eventBus.emit('test:event', { hello: 'after' });
  if (received.hello !== 'world') passed = false;
  document.getElementById('output').textContent = passed ? 'TESTS PASS' : 'TESTS FAIL';
</script>
</body>
</html>
```

- [x] **Step 2: Implement `js/event-bus.js`**

Create `js/event-bus.js`:
```javascript
/**
 * Event Bus decoupling UI simulator and external agent stream
 */
export class SuperpowersEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return () => {
      const set = this.listeners.get(eventName);
      if (set) set.delete(callback);
    };
  }

  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for ${eventName}:`, err);
        }
      });
    }
    // Also dispatch native CustomEvent on window for external listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new SuperpowersEventBus();
if (typeof window !== 'undefined') {
  window.SuperpowersEventBus = eventBus;
}
```

- [x] **Step 3: Verify test passes**
Inspect `test-event-bus.html` behavior or verify syntax.

---

### Task 2: Whiteboard Display (Procedural Dynamic 3D Texture)

**Files:**
- Create: `js/whiteboard-display.js`

**Interfaces:**
- Consumes: Three.js canvas texture & mesh target
- Produces:
  - `class WhiteboardDisplay`:
    - `constructor(targetMesh, width = 1024, height = 512)`
    - `updateContent({ stage, title, subtitle, items, approvals })`
    - `getTexture()`

- [x] **Step 1: Implement `js/whiteboard-display.js`**

Create `js/whiteboard-display.js`:
```javascript
/**
 * Procedural Dynamic Canvas Texture for Brainstorming & Planning Whiteboard
 */
export class WhiteboardDisplay {
  constructor(targetMesh, width = 1024, height = 512) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = (typeof THREE !== 'undefined') ? new THREE.CanvasTexture(this.canvas) : null;
    this.targetMesh = targetMesh;

    if (this.targetMesh && this.texture) {
      if (Array.isArray(this.targetMesh.material)) {
        this.targetMesh.material[0].map = this.texture;
        this.targetMesh.material[0].needsUpdate = true;
      } else if (this.targetMesh.material) {
        this.targetMesh.material.map = this.texture;
        this.targetMesh.material.needsUpdate = true;
      }
    }

    this.renderDefault();
  }

  renderDefault() {
    this.updateContent({
      stage: 'READY',
      title: 'SUPERPOWERS WORKFLOW',
      subtitle: 'Siap memulai sesi Brainstorming...',
      items: [
        '1. /superpowers:brainstorming -> Ideas into designs',
        '2. /superpowers:writing-plans -> Detailed plan & tasks',
        '3. Subagent Dispatch -> Autonomous parallel coding'
      ],
      approvals: 'Gate: Menunggu Inisiasi'
    });
  }

  updateContent({ stage = 'BRAINSTORMING', title = '', subtitle = '', items = [], approvals = '' }) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - Dark architectural whiteboard
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // Stage Badge
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(24, 24, 220, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Nunito, sans-serif';
    ctx.fillText(`⚡ FASE: ${stage}`, 36, 48);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Fredoka, sans-serif';
    ctx.fillText(title || 'SESI SUPERPOWERS', 270, 50);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Nunito, sans-serif';
    ctx.fillText(subtitle, 28, 95);

    // Divider line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 115); ctx.lineTo(w - 24, 115);
    ctx.stroke();

    // Items / Tasks / Steps
    let startY = 150;
    items.forEach((item, index) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 20px Nunito, sans-serif';

      if (item.startsWith('[x]')) {
        ctx.fillStyle = '#4ade80';
      } else if (item.startsWith('[>]')) {
        ctx.fillStyle = '#38bdf8';
      }

      ctx.fillText(item, 36, startY + (index * 38));
    });

    // Approval Gate at bottom
    if (approvals) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(24, h - 60, w - 48, 36);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px Nunito, sans-serif';
      ctx.fillText(`🔒 ${approvals}`, 36, h - 36);
    }

    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  getTexture() {
    return this.texture;
  }
}
```

---

### Task 3: Subagent Spawner & 3D Recruitment Animation

**Files:**
- Create: `js/subagent-spawner.js`

**Interfaces:**
- Consumes: Three.js scene, CSS2DRenderer label container, pathfinding grid
- Produces:
  - `class SubagentSpawner`:
    - `spawnSubagent({ id, name, role, color, taskTitle, targetDesk })`
    - `resolveSubagent(id, action: 'promote' | 'despawn')`
    - `update(delta)`

- [x] **Step 1: Implement `js/subagent-spawner.js`**

Create `js/subagent-spawner.js`:
```javascript
/**
 * Spawns dynamic subagents with portal lighting effect, pathfinding to Dev Lab desks,
 * and handles completion lifecycle (Promote or Despawn).
 */
export class SubagentSpawner {
  constructor(scene, office, botsManager, eventBus) {
    this.scene = scene;
    this.office = office;
    this.botsManager = botsManager;
    this.eventBus = eventBus;
    this.activeSubagents = new Map();
    this.portalParticles = [];
    this.spawnPoint = { x: 8, y: 0, z: 5 }; // Lobby entrance / teleport pad
  }

  createSpawnPortalEffect(pos) {
    if (typeof THREE === 'undefined') return;
    const geom = new THREE.CylinderGeometry(1.2, 1.2, 3, 24, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const cylinder = new THREE.Mesh(geom, mat);
    cylinder.position.set(pos.x, 1.5, pos.z);
    this.scene.add(cylinder);

    // Animate portal fadeout
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      cylinder.scale.y = 1 + progress * 0.5;
      mat.opacity = Math.max(0, 0.8 - progress);
      if (progress >= 0.8) {
        clearInterval(interval);
        this.scene.remove(cylinder);
        geom.dispose();
        mat.dispose();
      }
    }, 30);
  }

  spawnSubagent({
    id = `subagent-${Date.now()}`,
    name = 'Worker Subagent',
    role = 'Coder',
    color = '#38bdf8',
    taskTitle = 'Mengerjakan Sub-task...',
    targetDesk = { x: 2, z: -6 }
  }) {
    this.createSpawnPortalEffect(this.spawnPoint);

    // Create 3D Bot model using office bot creator or procedural box bot
    const botData = {
      id,
      name,
      role: `[SUBAGENT] ${role}`,
      emoji: '⚡',
      color,
      state: 'working',
      x: this.spawnPoint.x,
      z: this.spawnPoint.z,
      targetDesk,
      activeTask: { title: taskTitle },
      isSubagent: true
    };

    // Add bot to global bots collection if botsManager provided
    if (this.botsManager && typeof this.botsManager.addBot === 'function') {
      const bot = this.botsManager.addBot(botData);
      this.activeSubagents.set(id, bot);

      // Walk to Dev Lab desk
      if (typeof bot.walkTo === 'function') {
        setTimeout(() => {
          bot.walkTo(targetDesk.x, targetDesk.z);
        }, 600);
      }
    }

    if (this.eventBus) {
      this.eventBus.emit('SUPERPOWER_SUBAGENT_SPAWNED', botData);
    }

    return botData;
  }

  resolveSubagent(id, action = 'despawn') {
    const bot = this.activeSubagents.get(id);
    if (!bot) return;

    if (action === 'promote') {
      bot.role = bot.role.replace('[SUBAGENT] ', '');
      bot.isSubagent = false;
      this.activeSubagents.delete(id);
      if (this.eventBus) {
        this.eventBus.emit('SUPERPOWER_SUBAGENT_RESOLVED', { id, action: 'promote' });
      }
    } else {
      // Despawn: Walk back to lobby then remove
      if (typeof bot.walkTo === 'function') {
        bot.walkTo(this.spawnPoint.x, this.spawnPoint.z, () => {
          if (this.botsManager && typeof this.botsManager.removeBot === 'function') {
            this.botsManager.removeBot(id);
          }
          this.activeSubagents.delete(id);
        });
      } else {
        if (this.botsManager && typeof this.botsManager.removeBot === 'function') {
          this.botsManager.removeBot(id);
        }
        this.activeSubagents.delete(id);
      }
      if (this.eventBus) {
        this.eventBus.emit('SUPERPOWER_SUBAGENT_RESOLVED', { id, action: 'despawn' });
      }
    }
  }
}
```

---

### Task 4: Superpowers FSM Engine

**Files:**
- Create: `js/superpowers-engine.js`
- Test: `test-superpowers-engine.js` (headless Node.js), `test-superpowers-engine.html` (interactive runner)

**Interfaces:**
- Consumes: `event-bus.js`, `whiteboard-display.js`, `subagent-spawner.js`
- Produces:
  - `class SuperpowersWorkflowEngine`:
    - `startBrainstorming(topic)`
    - `selectApproach(path)`
    - `generateImplementationPlan()`
    - `dispatchSubagents()`
    - `completeCurrentStage()`
    - `getCurrentState()`

- [x] **Step 1: Implement `js/superpowers-engine.js`**

Create `js/superpowers-engine.js`:
```javascript
/**
 * Superpowers Workflow State Machine:
 * BRAINSTORMING -> WRITING_PLAN -> EXECUTING_SUBAGENTS -> REVIEW
 */
export class SuperpowersWorkflowEngine {
  constructor({ eventBus, whiteboard, spawner }) {
    this.eventBus = eventBus;
    this.whiteboard = whiteboard;
    this.spawner = spawner;

    this.state = 'IDLE';
    this.currentTopic = '';
    this.selectedPath = 'Architectural';
    this.subagents = [];
  }

  startBrainstorming(topic = 'Sistem Otomatisasi Subagent 3D') {
    this.state = 'BRAINSTORMING';
    this.currentTopic = topic;

    if (this.whiteboard) {
      this.whiteboard.updateContent({
        stage: 'BRAINSTORMING',
        title: topic,
        subtitle: 'Eksplorasi konteks & klasifikasi jalur...',
        items: [
          '[>] 1. Explore project context & scope',
          '    2. Classify Path: [Spike] | [Bounded] | [Architectural]',
          '    3. Propose approaches with trade-offs',
          '    4. Human approval gate on design sections'
        ],
        approvals: 'Gate: Menunggu konfirmasi pendekatan (Human Partner)'
      });
    }

    this.eventBus.emit('SUPERPOWER_STAGE_CHANGE', { state: this.state, topic });
  }

  selectApproach(path = 'Architectural') {
    this.selectedPath = path;

    if (this.whiteboard) {
      this.whiteboard.updateContent({
        stage: 'BRAINSTORMING',
        title: this.currentTopic,
        subtitle: `Jalur Terpilih: ${path} (Spec Doc Validated)`,
        items: [
          '[x] 1. Scope & Context Analyzed',
          `[x] 2. Path: ${path} Confirmed`,
          '[x] 3. 2-3 Approaches evaluated',
          '[>] 4. Spec Written & Approved by Human!'
        ],
        approvals: '✅ Approved! Siap masuk ke Writing Plan'
      });
    }

    this.eventBus.emit('SUPERPOWER_STAGE_CHANGE', { state: this.state, path });
  }

  generateImplementationPlan() {
    this.state = 'WRITING_PLAN';

    if (this.whiteboard) {
      this.whiteboard.updateContent({
        stage: 'WRITING_PLAN',
        title: 'IMPLEMENTATION PLAN',
        subtitle: 'Memecah spec menjadi bite-sized executable tasks',
        items: [
          '[>] Task 1: Setup Event-Bus & Whiteboard Hub',
          '[ ] Task 2: Subagent Spawner & 3D Recruiter',
          '[ ] Task 3: Dev Lab Desk Allocation & Parallel Coding',
          '[ ] Task 4: Verification & Two-Stage Review'
        ],
        approvals: 'Review Plan: Siap Dispatch Subagent Workers'
      });
    }

    this.eventBus.emit('SUPERPOWER_STAGE_CHANGE', { state: this.state });
  }

  dispatchSubagents() {
    this.state = 'EXECUTING_SUBAGENTS';

    if (this.whiteboard) {
      this.whiteboard.updateContent({
        stage: 'EXECUTING',
        title: 'SUBAGENT-DRIVEN WORKERS',
        subtitle: 'Subagent direkrut untuk pengerjaan paralel TDD',
        items: [
          '[x] Task 1: Architecture Initialized',
          '[>] Task 2: Subagent #1 (Frontend Worker) Coding...',
          '[>] Task 3: Subagent #2 (TDD Specialist) Testing...',
          '[ ] Task 4: Integration Review'
        ],
        approvals: '⚡ Active: 2 Subagents di Dev Lab'
      });
    }

    // Spawn 2 subagents
    if (this.spawner) {
      const sub1 = this.spawner.spawnSubagent({
        id: 'sub-builder-1',
        name: 'Neo (Subagent)',
        role: 'Frontend Builder',
        color: '#38bdf8',
        taskTitle: 'Mengerjakan UI Glassmorphism & Controls',
        targetDesk: { x: 2, z: -7 }
      });
      const sub2 = this.spawner.spawnSubagent({
        id: 'sub-tester-1',
        name: 'Trinity (Subagent)',
        role: 'TDD Specialist',
        color: '#a855f7',
        taskTitle: 'Menulis Unit Tests & Verifikasi State',
        targetDesk: { x: -2, z: -7 }
      });
      this.subagents = [sub1, sub2];
    }

    this.eventBus.emit('SUPERPOWER_STAGE_CHANGE', { state: this.state, subagents: this.subagents });
  }

  finishWorkflow() {
    this.state = 'FINISHED';

    if (this.whiteboard) {
      this.whiteboard.updateContent({
        stage: 'COMPLETED',
        title: 'SEMUA TASK SELESAI',
        subtitle: 'Verifikasi sukses 100% test pass',
        items: [
          '[x] Task 1: Complete',
          '[x] Task 2: Complete',
          '[x] Task 3: Complete',
          '[x] Task 4: Verified by Reviewer'
        ],
        approvals: '🎉 Sukses! Subagent dapat dipromosikan / despawn'
      });
    }

    this.eventBus.emit('SUPERPOWER_STAGE_CHANGE', { state: this.state });
  }
}
```

---

### Task 5: Floating HUD Control Panel & Integration to `index.html`

**Files:**
- Create: `js/superpowers-ui.js`
- Modify: `index.html` (mount script & whiteboard integration)

**Interfaces:**
- Consumes: `SuperpowersWorkflowEngine`, `SuperpowersEventBus`
- Produces:
  - Interactive Floating Panel on screen
  - Real-time step buttons and auto demo toggle

- [x] **Step 1: Implement `js/superpowers-ui.js`**

Create `js/superpowers-ui.js`:
```javascript
/**
 * Glassmorphism Control Panel for Superpowers Workflow
 */
export function initSuperpowersUI(engine, eventBus, spawner) {
  const panel = document.createElement('div');
  panel.id = 'superpowers-panel';
  panel.style.cssText = `
    position: fixed;
    right: 20px;
    top: 75px;
    width: 320px;
    background: rgba(15, 23, 42, 0.88);
    border: 1.5px solid #38bdf8;
    border-radius: 14px;
    backdrop-filter: blur(12px);
    color: #f8fafc;
    padding: 16px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.5);
    z-index: 1000;
    font-family: 'Nunito', sans-serif;
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #334155; padding-bottom:8px;">
      <span style="font-weight:800; font-size:14px; color:#38bdf8;">⚡ SUPERPOWERS SIMULATOR</span>
      <span id="sp-stage-badge" style="font-size:11px; padding:2px 8px; border-radius:6px; background:#0284c7;">IDLE</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:8px;">
      <button id="btn-sp-brainstorm" class="sp-btn">💡 1. Brainstorming</button>
      <button id="btn-sp-approach" class="sp-btn">⚡ 2. Confirm Architectural Path</button>
      <button id="btn-sp-plan" class="sp-btn">📝 3. Generate Plan</button>
      <button id="btn-sp-subagents" class="sp-btn">🚀 4. Rekrut Subagent Baru</button>
      <button id="btn-sp-finish" class="sp-btn">🎉 5. Selesaikan & Selebrasi</button>
    </div>
    <div style="margin-top:12px; padding-top:10px; border-top:1px solid #334155; display:flex; gap:6px;">
      <button id="btn-sp-promote" class="sp-btn-sm" style="flex:1;">👑 Promote Staff</button>
      <button id="btn-sp-despawn" class="sp-btn-sm" style="flex:1;">👋 Despawn Bot</button>
    </div>
    <button id="btn-sp-auto" class="sp-btn" style="margin-top:8px; background:#4f46e5; border-color:#818cf8;">▶ Jalankan Demo Otomatis</button>
  `;

  // Append styling for buttons
  const style = document.createElement('style');
  style.textContent = `
    .sp-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 7px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      text-align: left;
      transition: all 0.2s;
    }
    .sp-btn:hover { background: #334155; border-color: #38bdf8; }
    .sp-btn-sm {
      background: #0f172a;
      border: 1px solid #38bdf8;
      color: #38bdf8;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      font-size: 11px;
    }
    .sp-btn-sm:hover { background: #38bdf8; color: #0f172a; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  // Hook event handlers
  document.getElementById('btn-sp-brainstorm').onclick = () => engine.startBrainstorming();
  document.getElementById('btn-sp-approach').onclick = () => engine.selectApproach('Architectural');
  document.getElementById('btn-sp-plan').onclick = () => engine.generateImplementationPlan();
  document.getElementById('btn-sp-subagents').onclick = () => engine.dispatchSubagents();
  document.getElementById('btn-sp-finish').onclick = () => engine.finishWorkflow();

  document.getElementById('btn-sp-promote').onclick = () => {
    spawner.resolveSubagent('sub-builder-1', 'promote');
    spawner.resolveSubagent('sub-tester-1', 'promote');
  };
  document.getElementById('btn-sp-despawn').onclick = () => {
    spawner.resolveSubagent('sub-builder-1', 'despawn');
    spawner.resolveSubagent('sub-tester-1', 'despawn');
  };

  // Auto demo runner
  let autoTimer = null;
  document.getElementById('btn-sp-auto').onclick = () => {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      document.getElementById('btn-sp-auto').textContent = '▶ Jalankan Demo Otomatis';
      return;
    }
    document.getElementById('btn-sp-auto').textContent = '⏹ Hentikan Demo';
    let step = 0;
    autoTimer = setInterval(() => {
      step++;
      if (step === 1) engine.startBrainstorming();
      else if (step === 2) engine.selectApproach('Architectural');
      else if (step === 3) engine.generateImplementationPlan();
      else if (step === 4) engine.dispatchSubagents();
      else if (step === 5) engine.finishWorkflow();
      else if (step === 6) {
        clearInterval(autoTimer);
        autoTimer = null;
        document.getElementById('btn-sp-auto').textContent = '▶ Jalankan Demo Otomatis';
      }
    }, 3500);
  };

  eventBus.on('SUPERPOWER_STAGE_CHANGE', ({ state }) => {
    const badge = document.getElementById('sp-stage-badge');
    if (badge) badge.textContent = state;
  });
}
```

- [x] **Step 2: Connect modules in `index.html`**

Import ESM scripts dynamically or add module tag at the bottom of `index.html` to instantiate `WhiteboardDisplay`, `SubagentSpawner`, `SuperpowersWorkflowEngine`, and `initSuperpowersUI`.

---

### Task 6: End-to-End Verification

**Files:**
- Inspect: `index.html` and browser runtime console

- [x] **Step 1: Launch web server and verify interactive buttons**
- [x] **Step 2: Verify whiteboard visual rendering**
- [x] **Step 3: Verify subagent portal effect and desk pathfinding**
- [x] **Step 4: Verify Promote and Despawn action**
