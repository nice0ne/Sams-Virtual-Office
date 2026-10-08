/**
 * Superpowers Workflow State Machine:
 * IDLE -> BRAINSTORMING -> WRITING_PLAN -> EXECUTING_SUBAGENTS -> FINISHED
 */
export class SuperpowersWorkflowEngine {
  /**
   * @param {object|SuperpowersEventBus} [optionsOrEventBus]
   * @param {WhiteboardDisplay} [whiteboard]
   * @param {SubagentSpawner} [spawner]
   */
  constructor(optionsOrEventBus = {}, whiteboard = null, spawner = null) {
    if (
      optionsOrEventBus &&
      typeof optionsOrEventBus === 'object' &&
      ('eventBus' in optionsOrEventBus || 'whiteboard' in optionsOrEventBus || 'spawner' in optionsOrEventBus)
    ) {
      this.eventBus = optionsOrEventBus.eventBus || null;
      this.whiteboard = optionsOrEventBus.whiteboard || null;
      this.spawner = optionsOrEventBus.spawner || null;
    } else {
      this.eventBus = optionsOrEventBus || null;
      this.whiteboard = whiteboard;
      this.spawner = spawner;
    }

    this.state = 'IDLE';
    this.currentTopic = '';
    this.selectedPath = 'Architectural';
    this.subagents = [];
    this.approachSelected = false;

    // Optional event bus listeners for external triggers
    if (this.eventBus && typeof this.eventBus.on === 'function') {
      this.eventBus.on('SUPERPOWER_START_BRAINSTORMING', (data) => {
        this.startBrainstorming(data && data.topic ? data.topic : undefined);
      });
      this.eventBus.on('SUPERPOWER_SELECT_APPROACH', (data) => {
        this.selectApproach(data && data.path ? data.path : undefined);
      });
      this.eventBus.on('SUPERPOWER_GENERATE_PLAN', () => {
        this.generateImplementationPlan();
      });
      this.eventBus.on('SUPERPOWER_DISPATCH_SUBAGENTS', () => {
        this.dispatchSubagents();
      });
      this.eventBus.on('SUPERPOWER_FINISH_WORKFLOW', () => {
        this.finishWorkflow();
      });
      this.eventBus.on('SUPERPOWER_RESET', () => {
        this.resetWorkflow();
      });
      this.eventBus.on('SUPERPOWER_NEXT_STAGE', () => {
        this.completeCurrentStage();
      });
    }
  }

  /**
   * Returns current FSM stage string ('IDLE', 'BRAINSTORMING', 'WRITING_PLAN', 'EXECUTING_SUBAGENTS', 'FINISHED')
   * @returns {string}
   */
  getCurrentState() {
    return this.state;
  }

  /**
   * Returns full state snapshot
   * @returns {{ state: string, topic: string, path: string, subagents: any[], approachSelected: boolean }}
   */
  getStateInfo() {
    return {
      state: this.state,
      topic: this.currentTopic,
      path: this.selectedPath,
      subagents: [...this.subagents],
      approachSelected: this.approachSelected
    };
  }

  /**
   * Transition to BRAINSTORMING stage
   * @param {string} [topic]
   * @returns {string} current state
   */
  startBrainstorming(topic = 'Sistem Otomatisasi Subagent 3D') {
    this.state = 'BRAINSTORMING';
    this.currentTopic = topic;
    this.approachSelected = false;

    if (this.whiteboard && typeof this.whiteboard.updateContent === 'function') {
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

    this._emitStageChange({ topic });
    return this.state;
  }

  /**
   * Confirms design path approach during brainstorming
   * @param {string} [path]
   * @returns {string} selected path
   */
  selectApproach(path = 'Architectural') {
    this.selectedPath = path;
    this.approachSelected = true;

    if (this.whiteboard && typeof this.whiteboard.updateContent === 'function') {
      this.whiteboard.updateContent({
        stage: 'BRAINSTORMING',
        title: this.currentTopic || 'BRAINSTORMING',
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

    this._emitStageChange({ path, topic: this.currentTopic });
    return this.selectedPath;
  }

  /**
   * Transition to WRITING_PLAN stage
   * @returns {string} current state
   */
  generateImplementationPlan() {
    this.state = 'WRITING_PLAN';

    if (this.whiteboard && typeof this.whiteboard.updateContent === 'function') {
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

    this._emitStageChange({ topic: this.currentTopic });
    return this.state;
  }

  /**
   * Transition to EXECUTING_SUBAGENTS stage and recruit worker subagents
   * @returns {any[]} spawned subagents array
   */
  dispatchSubagents() {
    this.state = 'EXECUTING_SUBAGENTS';

    if (this.whiteboard && typeof this.whiteboard.updateContent === 'function') {
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

    // Spawn 2 subagents if spawner provided
    if (this.spawner && typeof this.spawner.spawnSubagent === 'function') {
      const sub1 = this.spawner.spawnSubagent({
        id: 'sub-builder-1',
        name: 'Neo (Subagent)',
        role: 'Frontend Builder',
        color: '#38bdf8',
        taskTitle: 'Mengerjakan UI Glassmorphism & Controls',
        targetDesk: { x: -2.5, z: -9.05, yaw: Math.PI } // Subagent Station Alpha in Dev Lab
      });
      const sub2 = this.spawner.spawnSubagent({
        id: 'sub-tester-1',
        name: 'Trinity (Subagent)',
        role: 'TDD Specialist',
        color: '#a855f7',
        taskTitle: 'Menulis Unit Tests & Verifikasi State',
        targetDesk: { x: 2.5, z: -9.05, yaw: Math.PI } // Subagent Station Beta in Dev Lab
      });
      this.subagents = [sub1, sub2];
    } else {
      this.subagents = [];
    }

    this._emitStageChange({ subagents: this.subagents });
    return this.subagents;
  }

  /**
   * Transition to FINISHED stage
   * @returns {string} current state
   */
  finishWorkflow() {
    this.state = 'FINISHED';

    if (this.whiteboard && typeof this.whiteboard.updateContent === 'function') {
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

    this._emitStageChange();
    return this.state;
  }

  /**
   * Progressively advances to the next stage in workflow
   * @returns {string} current state
   */
  completeCurrentStage() {
    switch (this.state) {
      case 'IDLE':
        this.startBrainstorming(this.currentTopic || 'Sistem Otomatisasi Subagent 3D');
        break;
      case 'BRAINSTORMING':
        if (!this.approachSelected) {
          this.selectApproach(this.selectedPath || 'Architectural');
        } else {
          this.generateImplementationPlan();
        }
        break;
      case 'WRITING_PLAN':
        this.dispatchSubagents();
        break;
      case 'EXECUTING_SUBAGENTS':
        this.finishWorkflow();
        break;
      case 'FINISHED':
        // Remain in finished state
        break;
      default:
        this.startBrainstorming();
    }
    return this.state;
  }

  /**
   * Resets workflow back to IDLE
   * @returns {string} current state
   */
  resetWorkflow() {
    this.state = 'IDLE';
    this.currentTopic = '';
    this.selectedPath = 'Architectural';
    this.subagents = [];
    this.approachSelected = false;

    if (this.whiteboard && typeof this.whiteboard.renderDefault === 'function') {
      this.whiteboard.renderDefault();
    }

    this._emitStageChange();
    return this.state;
  }

  /**
   * Alias for resetWorkflow()
   */
  reset() {
    return this.resetWorkflow();
  }

  /**
   * Helper to emit SUPERPOWER_STAGE_CHANGE event
   * @private
   */
  _emitStageChange(extraData = {}) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('SUPERPOWER_STAGE_CHANGE', {
        state: this.state,
        ...extraData
      });
    }
  }
}
