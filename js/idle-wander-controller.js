/**
 * IdleWanderController: Manages realistic autonomous wandering and roaming
 * for standby/idle AI agents in the 3D Virtual Office.
 * 
 * Agents will occasionally leave the lobby to explore other spots (coffee bar,
 * water cooler, ping-pong, gaming corner, outdoor garden, whiteboard, or own desk),
 * display contextual speech bubbles, and avoid crowding the same spot.
 */

export const DEFAULT_ROAMING_SPOTS = [
  // 1. Pantry & Refreshment Bar
  {
    id: 'coffee_machine',
    name: 'Espresso Coffee Bar',
    room: 'lobby',
    x: 13.8,
    z: 4.0,
    yaw: -Math.PI / 2,
    quotes: [
      '☕ Seduh kopi espresso hangat dulu...',
      '☕ Wangi aroma espresso arabika fresh!',
      '☕ Refill kafein biar ide coding makin lancar.'
    ]
  },
  {
    id: 'water_cooler',
    name: 'Water Cooler Dispenser',
    room: 'lobby',
    x: 16.0,
    z: 4.0,
    yaw: -Math.PI / 2,
    quotes: [
      '🥤 Ambil air minum dingin di dispenser...',
      '🥤 Tetap terhidrasi saat masa standby!',
      '🥤 Segarnya air dingin sejenak melepas penat.'
    ]
  },

  // 2. Breakroom & Entertainment
  {
    id: 'lobby_gaming',
    name: 'PS Gaming Corner Lounge',
    room: 'lobby',
    x: 6.0,
    z: 5.2,
    yaw: 0,
    quotes: [
      '🎮 Main game santai di PS gaming corner!',
      '🕹️ Coba satu match game retro arcade dulu.',
      '🎮 Rehat sejenak sambil pegang controller!'
    ]
  },
  {
    id: 'pingpong_p1',
    name: 'Pingpong Table (West Side)',
    room: 'lobby',
    x: 9.2,
    z: 7.2,
    yaw: Math.PI / 2,
    quotes: [
      '🏓 Latihan servis spin tenis meja!',
      '🏓 Siap tanding santai bareng rekan kantor.',
      '🏓 Pemanasan gerakan refleks di meja pingpong.'
    ]
  },
  {
    id: 'pingpong_p2',
    name: 'Pingpong Table (East Side)',
    room: 'lobby',
    x: 13.8,
    z: 7.2,
    yaw: -Math.PI / 2,
    quotes: [
      '🏓 Smash backhand tajam di meja pingpong!',
      '🏓 Menunggu lawan tanding tenis meja berikutnya.',
      '🏓 Olahraga tangan sejenak biar badan bugar.'
    ]
  },
  {
    id: 'lobby_lounge_sofa',
    name: 'Lobby Sofa Lounge',
    room: 'lobby',
    x: 5.0,
    z: 5.2,
    yaw: 0,
    quotes: [
      '🛋️ Duduk rileks di sofa lobi kantor.',
      '☕ Menikmati suasana kantor yang nyaman.',
      '🛋️ Sandaran sejenak sambil menunggu brief task.'
    ]
  },

  // 3. Technical Whiteboards & Diagrams
  {
    id: 'dev_whiteboard',
    name: 'Dev Architecture Whiteboard',
    room: 'devops',
    x: -2.0,
    z: -10.5,
    yaw: 0,
    quotes: [
      '📋 Mengecek diagram arsitektur sprint di papan...',
      '🔍 Menganalisis dependency graph dan API flow.',
      '📋 Skema modul microservice tampak solid!'
    ]
  },
  {
    id: 'creative_whiteboard',
    name: 'Brainstorming Whiteboard',
    room: 'creative',
    x: -10.0,
    z: 8.2,
    yaw: 0,
    quotes: [
      '💡 Baca ide-ide brainstorming di sticky notes.',
      '🎨 Menjelajahi konsep visual dan fitur baru.',
      '✨ Banyak ide menarik dari sesi riset kemarin!'
    ]
  },

  // 4. Outdoor Task Garden
  {
    id: 'outdoor_walkway',
    name: 'Task Garden Walkway',
    room: 'outdoor',
    x: 0.0,
    z: 14.5,
    yaw: 0,
    quotes: [
      '🌿 Jalan-jalan santai di taman outdoor...',
      '🌸 Menghirup udara segar di Task Garden.',
      '🍃 Suasana taman hijau bikin pikiran jernih.'
    ]
  },
  {
    id: 'outdoor_monument',
    name: "Sam's Office Monument Landmark",
    room: 'outdoor',
    x: -4.0,
    z: 14.5,
    yaw: 0,
    quotes: [
      '🏛️ Memandangi landmark Sam Virtual Office.',
      '✨ Kantor virtual masa depan yang mandiri!',
      '🏛️ Desain arsitektur openspace yang keren.'
    ]
  }
];

export class IdleWanderController {
  /**
   * @param {object} options
   * @param {Map|object} options.bots Collection of active agents
   * @param {object} [options.office] Office layout reference
   * @param {object} [options.eventBus] Superpowers EventBus
   * @param {number} [options.minInterval=18000] Min pause at spot (ms)
   * @param {number} [options.maxInterval=38000] Max pause at spot (ms)
   * @param {Array} [options.spots] Custom roaming spots list
   * @param {boolean} [options.enabled=true] Initial state
   */
  constructor({
    bots,
    office = null,
    eventBus = null,
    minInterval = 18000,
    maxInterval = 38000,
    spots = DEFAULT_ROAMING_SPOTS,
    enabled = true
  } = {}) {
    this.bots = bots;
    this.office = office;
    this.eventBus = eventBus;
    this.minInterval = minInterval;
    this.maxInterval = maxInterval;
    this.spots = Array.isArray(spots) ? [...spots] : [...DEFAULT_ROAMING_SPOTS];
    // Check localStorage preference if available
    let initialEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('sams_office_roaming');
        if (saved !== null) {
          initialEnabled = saved === 'true';
        }
      } catch (e) {}
    }
    this.enabled = initialEnabled;

    // Track active timers per botId
    this.botTimers = new Map();
    // Track occupied spots: spotKey -> botId
    this.occupiedSpots = new Map();
    // Track current spot assigned to bot: botId -> spotKey
    this.botCurrentSpot = new Map();

    this._bindEvents();
  }

  _bindEvents() {
    if (this.eventBus && typeof this.eventBus.on === 'function') {
      // Pause wandering when workflow enters working phases
      this.eventBus.on('SUPERPOWER_STAGE_CHANGE', (evt) => {
        const stage = evt?.state;
        if (stage === 'FINISHED' || stage === 'IDLE') {
          this.resumeAll();
        } else if (stage) {
          // Working or executing: interrupt all bots that are dispatched
          this.pauseAll();
        }
      });

      // Remote or UI toggle event
      this.eventBus.on('ROAMING_TOGGLE', (evt) => {
        if (evt && typeof evt.enabled === 'boolean') {
          this.toggle(evt.enabled);
        } else {
          this.toggle();
        }
      });
    }
  }

  /**
   * Start autonomous wandering for all idle bots.
   * Staggers initial movement so agents don't move simultaneously.
   */
  start() {
    this.enabled = true;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('sams_office_roaming', 'true'); } catch (e) {}
    }
    const botList = this._getBotsList();

    botList.forEach((bot, index) => {
      if (!bot || bot.state !== 'idle') return;
      // Stagger initial check between 3s and 12s
      const initialDelay = 3000 + (index * 2500) + Math.random() * 2000;
      this.scheduleWander(bot.id, initialDelay);
    });
  }

  /**
   * Return all currently idle bots to their designated lobby spots.
   */
  returnAllToLobby() {
    const botList = this._getBotsList();
    botList.forEach((bot) => {
      if (!bot || bot.state !== 'idle') return;
      if (bot.lobbySpot && typeof bot.walkTo === 'function') {
        const currentSpotKey = this.botCurrentSpot.get(bot.id);
        if (currentSpotKey) {
          this.occupiedSpots.delete(currentSpotKey);
          this.botCurrentSpot.delete(bot.id);
        }
        bot.walkTo(bot.lobbySpot, () => {
          if (typeof bot.say === 'function') {
            bot.say(bot.defaultSpeech || '☕ Santai di lobby', 3500);
          }
        });
      }
    });
  }

  /**
   * Stop/Pause all roaming timers and clear spot assignments.
   * @param {object} [options]
   * @param {boolean} [options.returnToLobby=true] If true, sends all idle agents back to lobby
   */
  stop({ returnToLobby = true } = {}) {
    this.enabled = false;
    this.botTimers.forEach((timerId) => clearTimeout(timerId));
    this.botTimers.clear();
    this.occupiedSpots.clear();
    this.botCurrentSpot.clear();
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('sams_office_roaming', 'false'); } catch (e) {}
    }
    if (returnToLobby) {
      this.returnAllToLobby();
    }
  }

  /**
   * Toggle roaming state on or off.
   * @param {boolean} [forceVal]
   * @returns {boolean} New enabled state
   */
  toggle(forceVal = null) {
    const nextState = typeof forceVal === 'boolean' ? forceVal : !this.enabled;
    if (nextState) {
      this.start();
    } else {
      this.stop({ returnToLobby: true });
    }
    return this.enabled;
  }

  pauseAll() {
    this.botTimers.forEach((timerId) => clearTimeout(timerId));
    this.botTimers.clear();
    this.occupiedSpots.clear();
    this.botCurrentSpot.clear();
  }

  resumeAll() {
    if (!this.enabled) return;
    this.start();
  }

  /**
   * Interupt a specific bot (e.g. when assigned a task).
   * @param {string} botId 
   */
  interruptBot(botId) {
    if (this.botTimers.has(botId)) {
      clearTimeout(this.botTimers.get(botId));
      this.botTimers.delete(botId);
    }
    const currentSpotKey = this.botCurrentSpot.get(botId);
    if (currentSpotKey) {
      this.occupiedSpots.delete(currentSpotKey);
      this.botCurrentSpot.delete(botId);
    }
  }

  /**
   * Schedules next wandering movement for a bot.
   * @param {string} botId 
   * @param {number} [customDelay]
   */
  scheduleWander(botId, customDelay = null) {
    if (!this.enabled) return;

    // Clear existing timer if any
    if (this.botTimers.has(botId)) {
      clearTimeout(this.botTimers.get(botId));
      this.botTimers.delete(botId);
    }

    const delay = customDelay !== null
      ? customDelay
      : Math.floor(this.minInterval + Math.random() * (this.maxInterval - this.minInterval));

    const timerId = setTimeout(() => {
      this.executeWander(botId);
    }, delay);

    this.botTimers.set(botId, timerId);
  }

  /**
   * Executes a random wander step for a given bot.
   * @param {string} botId 
   */
  executeWander(botId) {
    if (!this.enabled) return;

    const bot = this._getBot(botId);
    if (!bot) return;

    // Only wander if bot is currently in standby/idle state
    if (bot.state !== 'idle') {
      this.interruptBot(botId);
      return;
    }

    // Don't interrupt if bot is currently walking along waypoints
    if (bot.waypoints && bot.waypoints.length > 0) {
      // Re-check after 4 seconds
      this.scheduleWander(botId, 4000);
      return;
    }

    const targetSpot = this.pickNextSpot(bot);
    if (!targetSpot) {
      // No available spot, retry in 6 seconds
      this.scheduleWander(botId, 6000);
      return;
    }

    // Release previously occupied spot
    const prevSpotKey = this.botCurrentSpot.get(botId);
    if (prevSpotKey) {
      this.occupiedSpots.delete(prevSpotKey);
    }

    // Reserve new spot
    const spotKey = targetSpot.id || `${targetSpot.x}_${targetSpot.z}`;
    this.occupiedSpots.set(spotKey, botId);
    this.botCurrentSpot.set(botId, spotKey);

    // Navigate to target spot using A* pathfinding
    if (typeof bot.walkTo === 'function') {
      bot.walkTo(
        { x: targetSpot.x, z: targetSpot.z, yaw: targetSpot.yaw },
        () => {
          // Callback upon arrival at spot
          this._handleSpotArrival(bot, targetSpot);
        }
      );
    }
  }

  /**
   * Invoked when agent completes walk and arrives at the chosen roaming spot.
   * @private
   */
  _handleSpotArrival(bot, targetSpot) {
    if (!this.enabled || !bot) return;

    // Check if bot is still idle (could have been assigned work mid-walk)
    if (bot.state !== 'idle') {
      this.interruptBot(bot.id);
      return;
    }

    // Pick contextual quote
    let quote = null;
    if (Array.isArray(targetSpot.quotes) && targetSpot.quotes.length > 0) {
      quote = targetSpot.quotes[Math.floor(Math.random() * targetSpot.quotes.length)];
    } else if (targetSpot.quote) {
      quote = targetSpot.quote;
    }

    if (quote && typeof bot.say === 'function') {
      bot.say(quote, 4200);
      if (!bot.quoteLog) bot.quoteLog = [];
      bot.quoteLog.push(quote);
      if (bot.quoteLog.length > 8) bot.quoteLog.shift();
    }

    // Schedule next wander move after staying at this spot
    this.scheduleWander(bot.id);
  }

  /**
   * Selects the next best available spot for the bot that is free and not nearby.
   * @param {object} bot 
   * @returns {object|null}
   */
  pickNextSpot(bot) {
    const curX = bot.mesh?.position?.x ?? bot.x ?? 0;
    const curZ = bot.mesh?.position?.z ?? bot.z ?? 0;

    // Build pool of candidate spots
    const candidates = [];

    // 1. Shared roaming spots
    this.spots.forEach(s => {
      candidates.push({ ...s });
    });

    // 2. Bot's own personal desk (if exists and not already there)
    if (bot.desk) {
      candidates.push({
        id: `desk_${bot.id}`,
        name: `${bot.name || bot.id}'s Workstation`,
        x: bot.desk.x,
        z: bot.desk.z,
        yaw: bot.desk.yaw !== undefined ? bot.desk.yaw : 0,
        quotes: [
          '💻 Mampir ke meja kerja, cek notifikasi terminal...',
          '📂 Merapikan berkas workspace sejenak.',
          '💻 Monitor meja terlihat tenang dan stabil.'
        ]
      });
    }

    // 3. Bot's own personal lobby spot (if exists)
    if (bot.lobbySpot) {
      candidates.push({
        id: `lobby_${bot.id}`,
        name: `${bot.name || bot.id}'s Lobby Base`,
        x: bot.lobbySpot.x,
        z: bot.lobbySpot.z,
        yaw: bot.lobbySpot.yaw !== undefined ? bot.lobbySpot.yaw : 0,
        quotes: [
          '☕ Kembali santai di spot lobi utama.',
          '🛋️ Duduk santai mengamati aktivitas rekan kantor.',
          '☕ Menikmati waktu santai di lobi.'
        ]
      });
    }

    // Filter out spots that are:
    // a) Already occupied by another bot
    // b) Too close to current bot position (< 1.5 units) to ensure meaningful movement
    const freeCandidates = candidates.filter(cand => {
      const spotKey = cand.id || `${cand.x}_${cand.z}`;
      const occupant = this.occupiedSpots.get(spotKey);
      if (occupant && occupant !== bot.id) {
        return false;
      }

      const dx = cand.x - curX;
      const dz = cand.z - curZ;
      const distSq = dx * dx + dz * dz;
      // Must be at least 1.8 units away to feel like a real walk
      return distSq >= 3.24;
    });

    if (freeCandidates.length === 0) {
      // Fallback: pick any spot not occupied, even if closer
      const fallback = candidates.filter(cand => {
        const spotKey = cand.id || `${cand.x}_${cand.z}`;
        const occupant = this.occupiedSpots.get(spotKey);
        return !occupant || occupant === bot.id;
      });
      if (fallback.length > 0) {
        return fallback[Math.floor(Math.random() * fallback.length)];
      }
      return null;
    }

    // Pick a random free candidate
    return freeCandidates[Math.floor(Math.random() * freeCandidates.length)];
  }

  _getBot(botId) {
    if (!this.bots) return null;
    if (typeof this.bots.get === 'function') return this.bots.get(botId);
    if (this.bots[botId]) return this.bots[botId];
    return null;
  }

  _getBotsList() {
    if (!this.bots) return [];
    if (Array.isArray(this.bots)) return this.bots;
    if (typeof this.bots.values === 'function') return Array.from(this.bots.values());
    return Object.values(this.bots);
  }
}
