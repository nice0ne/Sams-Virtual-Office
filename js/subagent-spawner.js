export const SUBAGENT_CHAIR_SEATS = [
  // 1. Dedicated Dev Lab Subagent Stations (Alpha, Beta, Gamma, Delta)
  { id: 'dev_alpha', name: 'Dev Lab Station Alpha', x: -2.5, z: -9.05, yaw: Math.PI },
  { id: 'dev_beta', name: 'Dev Lab Station Beta', x: 2.5, z: -9.05, yaw: Math.PI },
  { id: 'dev_gamma', name: 'Dev Lab Station Gamma', x: -6.5, z: -9.05, yaw: Math.PI },
  { id: 'dev_delta', name: 'Dev Lab Station Delta', x: -6.5, z: -6.05, yaw: Math.PI },

  // 2. Creative & Strategy Hot-Desks
  { id: 'creative_pod_1', name: 'Creative Pod North', x: -10.0, z: 4.8, yaw: 0 },
  { id: 'creative_pod_2', name: 'Creative Pod South', x: -10.0, z: 7.6, yaw: Math.PI },

  // 3. Collaboration & Visitor Chairs
  { id: 'ceo_guest_w', name: 'CEO Strategy Chair West', x: 11.1, z: -8.0, yaw: Math.PI },
  { id: 'ceo_guest_e', name: 'CEO Strategy Chair East', x: 12.9, z: -8.0, yaw: Math.PI },

  // 4. Lounge & Breakroom Pods
  { id: 'lobby_lounge_c', name: 'Lobby Lounge Central', x: 6.0, z: 5.2, yaw: 0 },
  { id: 'lobby_lounge_w', name: 'Lobby Lounge West', x: 4.2, z: 5.2, yaw: 0 },
  { id: 'lobby_cafe_table', name: 'Lobby Cafe Pod', x: 11.5, z: 5.2, yaw: 0 },
  { id: 'outdoor_patio_bench', name: 'Outdoor Patio Pod', x: -4.0, z: 14.5, yaw: 0 }
];

/**
 * Spawns dynamic subagents with portal lighting effect, pathfinding to Dev Lab desks,
 * and handles completion lifecycle (Promote or Despawn).
 */
export class SubagentSpawner {
  constructor(sceneOrOptions = null, office = null, botsManager = null, eventBus = null) {
    if (sceneOrOptions && typeof sceneOrOptions === 'object' && ('scene' in sceneOrOptions || 'botsManager' in sceneOrOptions || 'eventBus' in sceneOrOptions || 'office' in sceneOrOptions)) {
      this.scene = sceneOrOptions.scene || null;
      this.office = sceneOrOptions.office || null;
      this.botsManager = sceneOrOptions.botsManager || null;
      this.eventBus = sceneOrOptions.eventBus || null;
      this.spawnPoint = sceneOrOptions.spawnPoint ? { ...sceneOrOptions.spawnPoint } : { x: 8, y: 0, z: 5 };
    } else {
      this.scene = sceneOrOptions;
      this.office = office;
      this.botsManager = botsManager;
      this.eventBus = eventBus;
      this.spawnPoint = { x: 8, y: 0, z: 5 }; // Lobby entrance / teleport pad
    }

    this.activeSubagents = new Map();
    this.portalParticles = [];
    this.portalEffects = [];

    // Optional event bus listeners for external triggers
    if (this.eventBus && typeof this.eventBus.on === 'function') {
      this.eventBus.on('SUBAGENT_SPAWN_REQUEST', data => this.spawnSubagent(data || {}));
      this.eventBus.on('SUBAGENT_RESOLVE_REQUEST', data => {
        if (data && data.id) this.resolveSubagent(data.id, data.action);
      });
    }
  }

  /**
   * Finds the best free chair that is NOT occupied by any agent (neither core bots nor other subagents).
   * @param {{x: number, z: number}} [preferredSeat] Optional requested desk
   * @returns {{x: number, z: number, yaw: number}} Available desk coordinates
   */
  findAvailableDesk(preferredSeat = null) {
    // Collect all currently reserved or occupied coordinates across ALL office characters
    const occupiedLocations = [];

    // 1. Check all bots in global manager (Devin, Audit, Kamala, Rani, Aura, Raka, etc.)
    if (this.botsManager) {
      if (typeof this.botsManager.forEach === 'function') {
        this.botsManager.forEach(bot => {
          if (!bot) return;
          // Check assigned desk
          if (bot.desk) occupiedLocations.push({ x: bot.desk.x, z: bot.desk.z });
          if (bot.targetDesk) occupiedLocations.push({ x: bot.targetDesk.x, z: bot.targetDesk.z });
          // Check actual live 3D mesh position if working at a desk
          if (bot.state === 'working' && bot.mesh && bot.mesh.position) {
            occupiedLocations.push({ x: bot.mesh.position.x, z: bot.mesh.position.z });
          }
        });
      } else if (typeof this.botsManager === 'object') {
        Object.values(this.botsManager).forEach(bot => {
          if (!bot) return;
          if (bot.desk) occupiedLocations.push({ x: bot.desk.x, z: bot.desk.z });
          if (bot.targetDesk) occupiedLocations.push({ x: bot.targetDesk.x, z: bot.targetDesk.z });
          if (bot.state === 'working' && bot.mesh && bot.mesh.position) {
            occupiedLocations.push({ x: bot.mesh.position.x, z: bot.mesh.position.z });
          }
        });
      }
    }

    // 2. Check active subagents in spawner
    this.activeSubagents.forEach(bot => {
      if (!bot) return;
      if (bot.targetDesk) occupiedLocations.push({ x: bot.targetDesk.x, z: bot.targetDesk.z });
      if (bot.desk) occupiedLocations.push({ x: bot.desk.x, z: bot.desk.z });
    });

    const isPositionClear = (candidate) => {
      if (!candidate || typeof candidate.x !== 'number' || typeof candidate.z !== 'number') return false;
      // Minimum safe distance: at least 1.4 units clearance to avoid sitting on top of each other
      return !occupiedLocations.some(occ => {
        const dx = occ.x - candidate.x;
        const dz = occ.z - candidate.z;
        return (dx * dx + dz * dz) < 1.96; // 1.4 * 1.4
      });
    };

    // If a preferred desk was explicitly requested and is clear, use it!
    if (preferredSeat && isPositionClear(preferredSeat)) {
      return { ...preferredSeat };
    }

    // Otherwise find the first available chair from the pool
    const freeSeat = SUBAGENT_CHAIR_SEATS.find(seat => isPositionClear(seat));
    if (freeSeat) {
      return { ...freeSeat };
    }

    // Fallback: If all primary chairs are filled, dynamically offset in collaboration area
    const offsetIndex = this.activeSubagents.size;
    const baseSeat = SUBAGENT_CHAIR_SEATS[offsetIndex % SUBAGENT_CHAIR_SEATS.length];
    return {
      x: baseSeat.x + ((offsetIndex % 2 === 0 ? 1 : -1) * 0.8),
      z: baseSeat.z + 0.8,
      yaw: baseSeat.yaw !== undefined ? baseSeat.yaw : Math.PI
    };
  }

  /**
   * Creates a cylinder light effect at spawn location with fade out animation.
   * @param {{x: number, y?: number, z: number}} [pos]
   * @returns {any} Created mesh or null if THREE is not available
   */
  createSpawnPortalEffect(pos) {
    const targetPos = pos || this.spawnPoint;
    const THREE_LIB = (typeof THREE !== 'undefined') ? THREE : null;
    if (!THREE_LIB || !this.scene || typeof this.scene.add !== 'function') return null;

    const geom = new THREE_LIB.CylinderGeometry(1.2, 1.2, 3, 24, 1, true);
    const mat = new THREE_LIB.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8,
      side: THREE_LIB.DoubleSide !== undefined ? THREE_LIB.DoubleSide : 2
    });
    const cylinder = new THREE_LIB.Mesh(geom, mat);
    cylinder.position.set(targetPos.x, (targetPos.y || 0) + 1.5, targetPos.z);
    this.scene.add(cylinder);

    const effectRecord = {
      mesh: cylinder,
      geom,
      mat,
      progress: 0,
      intervalId: null
    };
    this.portalEffects.push(effectRecord);

    // Animate portal fadeout via interval (works with or without update() loop)
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      if (cylinder.scale) cylinder.scale.y = 1 + progress * 0.5;
      if (mat) mat.opacity = Math.max(0, 0.8 - progress);
      if (progress >= 0.8) {
        clearInterval(interval);
        effectRecord.intervalId = null;
        if (this.scene && typeof this.scene.remove === 'function') {
          this.scene.remove(cylinder);
        }
        if (typeof geom.dispose === 'function') geom.dispose();
        if (typeof mat.dispose === 'function') mat.dispose();
        const idx = this.portalEffects.indexOf(effectRecord);
        if (idx !== -1) this.portalEffects.splice(idx, 1);
      }
    }, 30);
    effectRecord.intervalId = interval;

    return cylinder;
  }

  /**
   * Spawns a new subagent worker bot.
   * @param {object} options
   * @returns {object} botData
   */
  spawnSubagent({
    id = `subagent-${Date.now()}`,
    name = 'Worker Subagent',
    role = 'Coder',
    color = '#38bdf8',
    model = 'Claude 3.5 Sonnet',
    taskTitle = 'Mengerjakan Sub-task...',
    targetDesk = null
  } = {}) {
    this.createSpawnPortalEffect(this.spawnPoint);

    const botId = id || `subagent-${Date.now()}`;
    const botName = name || 'Worker Subagent';
    const roleString = typeof role === 'string' ? role : 'Coder';
    const botRole = roleString.startsWith('[SUBAGENT]') ? roleString : `[SUBAGENT] ${roleString}`;
    const botColor = color || '#38bdf8';
    
    const defaultFallbackModel = (typeof window !== 'undefined' && window.OFFICE_CONFIG?.defaultModel) || 'Gemini 3.8 Flash';
    const chosenModel = model && model !== 'Claude 3.5 Sonnet' ? model : defaultFallbackModel;
    
    // Automatically find an unoccupied seat across the entire office
    const deskPos = this.findAvailableDesk(targetDesk);

    // Create 3D Bot model representation
    const botData = {
      id: botId,
      name: botName,
      role: botRole,
      emoji: '⚡',
      color: botColor,
      state: 'working',
      model: chosenModel,
      currentTool: 'Code Sandbox CLI & Terminal',
      x: this.spawnPoint.x,
      z: this.spawnPoint.z,
      targetDesk: deskPos,
      desk: deskPos,
      activeTask: {
        id: `TASK-${botName.toUpperCase().replace(/\s+/g, '-')}`,
        category: 'subagent',
        title: taskTitle || 'Eksekusi tugas terisolasi subagent',
        criteria: [
          'Menyelesaikan implementasi modul sesuai brief',
          'Lulus verifikasi automated test suite',
          'Melaporkan output kembali ke parent session'
        ]
      },
      quoteLog: [`Siap menjalankan tugas: ${taskTitle || 'Autonomous task execution'}`],
      thoughts: [
        'Menerima assignment baru dari parent agent.',
        'Mengonfigurasi workspace sandbox dan path dependencies.',
        'Mengeksekusi langkah-langkah implementasi...'
      ],
      isSubagent: true
    };

    let botInstance = null;

    // Add bot to global bots collection if botsManager provided
    if (this.botsManager) {
      if (typeof this.botsManager.addBot === 'function') {
        botInstance = this.botsManager.addBot(botData);
      } else if (typeof this.botsManager.set === 'function') {
        if (typeof Agent !== 'undefined') {
          const grid = this.office && this.office.grid ? this.office.grid : null;
          const THREE_LIB = (typeof THREE !== 'undefined') ? THREE : null;
          const CSS2D = (typeof CSS2DObject !== 'undefined') ? CSS2DObject : null;
          botInstance = new Agent(
            { ...botData, desk: deskPos },
            grid,
            THREE_LIB,
            CSS2D
          );
          if (this.scene && botInstance.mesh && typeof this.scene.add === 'function') {
            this.scene.add(botInstance.mesh);
          }
          if (typeof botInstance.setPosition === 'function') {
            botInstance.setPosition(this.spawnPoint.x, 0, this.spawnPoint.z);
          }
        } else {
          botInstance = { ...botData };
        }
        this.botsManager.set(botId, botInstance);
      }
    }

    const trackedBot = botInstance || botData;
    // Ensure metadata is linked
    if (trackedBot) {
      trackedBot.id = botId;
      trackedBot.role = botRole;
      trackedBot.isSubagent = true;
    }
    this.activeSubagents.set(botId, trackedBot);

    // Walk to Dev Lab desk chair
    if (trackedBot && typeof trackedBot.walkTo === 'function') {
      setTimeout(() => {
        trackedBot.walkTo(deskPos);
      }, 600);
    }

    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('SUPERPOWER_SUBAGENT_SPAWNED', botData);
    }

    return botData;
  }

  /**
   * Resolves a subagent's lifecycle by either promoting to permanent staff or despawning.
   * @param {string} id
   * @param {'promote' | 'despawn'} [action='despawn']
   */
  resolveSubagent(id, action = 'despawn') {
    const bot = this.activeSubagents.get(id);
    if (!bot) return;

    if (action === 'promote') {
      if (typeof bot.role === 'string') {
        bot.role = bot.role.replace('[SUBAGENT] ', '');
      }
      bot.isSubagent = false;
      this.activeSubagents.delete(id);
      if (this.eventBus && typeof this.eventBus.emit === 'function') {
        this.eventBus.emit('SUPERPOWER_SUBAGENT_RESOLVED', { id, action: 'promote' });
      }
    } else {
      // Despawn: Walk back to lobby then remove
      const finishDespawn = () => {
        if (this.botsManager) {
          if (typeof this.botsManager.removeBot === 'function') {
            this.botsManager.removeBot(id);
          } else if (typeof this.botsManager.delete === 'function') {
            this.botsManager.delete(id);
          }
        }
        if (bot && bot.mesh && this.scene && typeof this.scene.remove === 'function') {
          this.scene.remove(bot.mesh);
        }
        this.activeSubagents.delete(id);
      };

      if (typeof bot.walkTo === 'function') {
        let finished = false;
        const onDespawned = () => {
          if (finished) return;
          finished = true;
          finishDespawn();
        };

        if (bot.walkTo.length >= 2) {
          bot.walkTo(this.spawnPoint.x, this.spawnPoint.z, onDespawned);
        } else {
          bot.walkTo(this.spawnPoint);
          if (bot.waypoints && Array.isArray(bot.waypoints) && bot.waypoints.length > 0) {
            bot._despawnCallback = onDespawned;
          } else {
            onDespawned();
          }
        }
      } else {
        finishDespawn();
      }

      if (this.eventBus && typeof this.eventBus.emit === 'function') {
        this.eventBus.emit('SUPERPOWER_SUBAGENT_RESOLVED', { id, action: 'despawn' });
      }
    }
  }

  /**
   * Per-frame animation tick for active portal effects and subagent transitions.
   * @param {number} [delta=0.016]
   */
  update(delta = 0.016) {
    const dt = delta || 0.016;

    // Advance portal light animations
    for (let i = this.portalEffects.length - 1; i >= 0; i--) {
      const effect = this.portalEffects[i];
      effect.progress += dt * 1.5;
      if (effect.mesh) {
        if (effect.mesh.scale) {
          effect.mesh.scale.y = 1 + effect.progress * 0.5;
        }
        if (effect.mat) {
          effect.mat.opacity = Math.max(0, 0.8 - effect.progress);
        }
      }
      if (effect.progress >= 0.8) {
        if (effect.intervalId) {
          clearInterval(effect.intervalId);
          effect.intervalId = null;
        }
        if (this.scene && typeof this.scene.remove === 'function' && effect.mesh) {
          this.scene.remove(effect.mesh);
        }
        if (effect.geom && typeof effect.geom.dispose === 'function') {
          effect.geom.dispose();
        }
        if (effect.mat && typeof effect.mat.dispose === 'function') {
          effect.mat.dispose();
        }
        this.portalEffects.splice(i, 1);
      }
    }

    // Check despawning bots arrival
    this.activeSubagents.forEach((bot) => {
      if (bot && bot._despawnCallback) {
        if (!bot.waypoints || bot.waypoints.length === 0) {
          const cb = bot._despawnCallback;
          delete bot._despawnCallback;
          cb();
        }
      }
    });
  }

  /**
   * Get map of active subagents currently managed.
   */
  getActiveSubagents() {
    return this.activeSubagents;
  }

  /**
   * Get specific active subagent by ID.
   */
  getSubagent(id) {
    return this.activeSubagents.get(id);
  }
}
