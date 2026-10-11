import { IdleWanderController, DEFAULT_ROAMING_SPOTS } from './js/idle-wander-controller.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- Testing IdleWanderController ---');

// Mock Bots and EventBus
const mockEventBus = {
  listeners: {},
  on(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  },
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(data));
    }
  }
};

const createMockBot = (id, x = 0, z = 0, state = 'idle') => {
  return {
    id,
    name: id.toUpperCase(),
    state,
    mesh: { position: { x, y: 0, z } },
    waypoints: [],
    quoteLog: [],
    walkTarget: null,
    speech: '',
    walkTo(target, onComplete) {
      this.walkTarget = target;
      if (typeof onComplete === 'function') {
        this.onComplete = onComplete;
      }
    },
    say(text) {
      this.speech = text;
    }
  };
};

// Test 1: Roaming spots collection is properly defined
assert(DEFAULT_ROAMING_SPOTS.length >= 8, 'Default roaming spots has at least 8 spots');
const coffeeSpot = DEFAULT_ROAMING_SPOTS.find(s => s.id === 'coffee_machine');
assert(coffeeSpot !== undefined, 'Espresso coffee spot exists');
assert(coffeeSpot.quotes.length > 0, 'Espresso coffee spot has quotes');

// Test 2: Instantiation & Bot List Resolution
const botsMap = new Map();
botsMap.set('devin', createMockBot('devin', 5.2, 5.2, 'idle'));
botsMap.set('audit', createMockBot('audit', 13.8, 4.0, 'idle'));

const controller = new IdleWanderController({
  bots: botsMap,
  eventBus: mockEventBus,
  minInterval: 100,
  maxInterval: 200
});

assert(controller.enabled === true, 'Controller is initialized enabled');

// Test 3: Spot selection avoids nearby spots and occupied spots
const devin = botsMap.get('devin');
const targetSpot = controller.pickNextSpot(devin);
assert(targetSpot !== null, 'PickNextSpot returns a spot for idle bot');
assert(targetSpot.id !== undefined, 'Selected spot has an id');

// Test 4: Spot reservation prevents other bots from choosing the same spot
controller.occupiedSpots.set('coffee_machine', 'devin');
controller.botCurrentSpot.set('devin', 'coffee_machine');

const audit = botsMap.get('audit');
// Audit is at (13.8, 4.0) which is coffee_machine position
const nextSpotAudit = controller.pickNextSpot(audit);
assert(nextSpotAudit.id !== 'coffee_machine', 'Audit will not select coffee_machine because it is occupied by Devin');

// Test 5: Execute wander sets walkTo and triggers arrival speech
let arrivalTriggered = false;
controller.executeWander('devin');
assert(devin.walkTarget !== null, 'Devin receives walk target');

if (devin.onComplete) {
  devin.onComplete();
  assert(devin.speech.length > 0, 'Devin displays speech bubble upon arrival');
  assert(devin.quoteLog.length > 0, 'Quote is recorded in Devin quoteLog');
}

// Test 6: Interrupting bot clears spot and timer
controller.interruptBot('devin');
assert(!controller.occupiedSpots.has('coffee_machine'), 'Occupied spot released on interrupt');
assert(!controller.botCurrentSpot.has('devin'), 'Current spot tracking cleared on interrupt');

// Test 7: Superpower stage change pauses / resumes roaming
mockEventBus.emit('SUPERPOWER_STAGE_CHANGE', { state: 'BRAINSTORMING' });
assert(controller.botTimers.size === 0, 'All timers cleared when entering working stage');

mockEventBus.emit('SUPERPOWER_STAGE_CHANGE', { state: 'FINISHED' });
// Timers should be scheduled again when stage returns to FINISHED/IDLE
assert(controller.botTimers.size > 0, 'Timers scheduled when returning to FINISHED state');

controller.stop();
assert(controller.botTimers.size === 0, 'All timers stopped after controller.stop()');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
