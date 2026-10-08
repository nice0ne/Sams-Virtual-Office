import http from 'node:http';

function sendEvent(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      updatedAt: new Date().toISOString(),
      ...payload
    });

    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body || '{}')));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSimulation() {
  console.log('===========================================================');
  console.log('🚀 MEMULAI SIMULASI GERAKAN & ALUR PEKERJAAN VIRTUAL OFFICE');
  console.log('   (Lobby Relaxation -> Workstation Tasks -> Return to Lobby)');
  console.log('===========================================================');
  console.log('Silakan amati layar browser Anda di http://localhost:8000\n');

  // Langkah 0: Inisialisasi Posisi Santai di Lobby
  console.log('▶ [0/5] Kondisi Awal: Semua Agen Bersantai di Lobby:');
  console.log('  -> Kamala di Sofa Lounge, Devin di PS Gaming Corner,');
  console.log('  -> Audit di Espresso Bar Pantry, Rani & Raka di Pingpong Table,');
  console.log('  -> Aura di Water Cooler Dispenser.');
  await sendEvent({
    sessionId: `simulasi-${Date.now()}`,
    topic: 'Standby di Lobby',
    stage: 'IDLE',
    speaker: 'kamala',
    speakerMessage: '☕ Menikmati waktu istirahat di lobby sambil menunggu tugas baru.'
  });

  await sleep(4000);

  // Langkah 1: Sesi Baru & Brainstorming (Ada Tugas Baru!)
  console.log('\n▶ [1/5] Fase Brainstorming (Tugas Baru Masuk):');
  console.log('  -> Kamala bangun dari sofa lobby, berjalan ke Whiteboard Studio...');
  await sendEvent({
    topic: 'Implementasi Fitur Realtime 3D',
    stage: 'BRAINSTORMING',
    speaker: 'kamala',
    speakerMessage: '👑 Tugas baru masuk! Mari kita diskusikan arsitektur sistem di whiteboard.',
    whiteboard: {
      stage: 'BRAINSTORMING',
      title: 'ARSITEKTUR VIRTUAL OFFICE',
      subtitle: 'Diskusi Alur Interaksi & Robotika 3D',
      items: [
        '[>] 1. Pathfinding A* Snapping & Duduk Kursi',
        '    2. Default Santai di Lobby & Kembali ke Meja',
        '    3. Recruitment Subagent via Portal',
        '    4. Integrasi WebSocket Instan'
      ],
      approvals: 'Status: Diskusi Berlangsung'
    }
  });

  await sleep(6000);

  // Langkah 2: Writing Plan
  console.log('\n▶ [2/5] Fase Penyusunan Rencana (Writing Plan):');
  console.log('  -> Devin meninggalkan PS gaming corner, berjalan ke meja kerjanya di Dev Lab...');
  await sendEvent({
    stage: 'WRITING_PLAN',
    speaker: 'devin',
    speakerMessage: '⚡ Menerima arahan arsitektur. Menuju meja kerja Dev Lab menyusun plan.',
    whiteboard: {
      stage: 'WRITING_PLAN',
      title: 'IMPLEMENTATION CHECKLIST',
      subtitle: 'Breakdown Tugas Developer & QA',
      items: [
        '[x] Task 1: Konfigurasi default lobbySpot & state idle',
        '[>] Task 2: Dispatch Subagent Builder ke Dev Lab',
        '[ ] Task 3: Dispatch Subagent QA Tester',
        '[ ] Task 4: Verifikasi Akhir 100%'
      ],
      approvals: 'Gate: Disetujui untuk Eksekusi'
    }
  });

  await sleep(5500);

  // Langkah 3: Rekrut Subagent 1 (Neo) & Audit Menuju Meja Kerja
  console.log('\n▶ [3/5] Merekrut Subagent 1 (Neo - Frontend Builder):');
  console.log('  -> Audit beranjak dari coffee bar pantry menuju meja kerjanya di Dev Lab.');
  console.log('  -> Portal biru menyala di Lobby...');
  console.log('  -> Neo spawn dan berjalan ke Subagent Station Alpha di Dev Lab...');
  await sendEvent({
    stage: 'EXECUTING_SUBAGENTS',
    speaker: 'audit',
    speakerMessage: '🔍 Menuju meja kerja untuk audit kesiapan kode subagent.',
    subagents: [{
      id: `sub-neo-${Date.now()}`,
      name: 'Neo',
      role: 'Frontend Builder',
      color: '#38bdf8',
      task: 'Menyusun komponen UI interaktif'
    }],
    whiteboard: {
      stage: 'EXECUTING',
      title: 'SUBAGENTS CODING POOL',
      subtitle: 'Eksekusi Paralel Dev & Ops Lab',
      items: [
        '[x] Task 1: Konfigurasi default lobbySpot & state idle',
        '[x] Task 2: Dispatch Subagent Builder (Neo)',
        '[>] Task 3: Dispatch Subagent QA Tester (Trinity)',
        '[ ] Task 4: Verifikasi Akhir 100%'
      ],
      approvals: 'Status: Subagents Sedang Bekerja'
    }
  });

  await sleep(6500);

  // Langkah 4: Rekrut Subagent 2 (Trinity)
  console.log('\n▶ [4/5] Merekrut Subagent 2 (Trinity - Security QA):');
  console.log('  -> Portal menyala kembali di Lobby...');
  console.log('  -> Trinity spawn dan berjalan ke Subagent Station Beta di Dev Lab...');
  await sendEvent({
    stage: 'EXECUTING_SUBAGENTS',
    speaker: 'audit',
    speakerMessage: '🔍 Merekrut Trinity untuk validasi keamanan dan performa.',
    subagents: [{
      id: `sub-trinity-${Date.now()}`,
      name: 'Trinity',
      role: 'Security & QA Auditor',
      color: '#22c55e',
      task: 'Menjalankan audit memori dan fps counter'
    }],
    whiteboard: {
      stage: 'EXECUTING',
      title: 'SUBAGENTS CODING POOL',
      subtitle: 'Semua Workstation Dev Lab Beroperasi Penuh',
      items: [
        '[x] Task 1: Konfigurasi default lobbySpot & state idle',
        '[x] Task 2: Dispatch Subagent Builder (Neo)',
        '[x] Task 3: Dispatch Subagent QA Tester (Trinity)',
        '[>] Task 4: Menjalankan Testing Terpadu'
      ],
      approvals: 'Status: Menuju Penyelesaian'
    }
  });

  await sleep(6500);

  // Langkah 5: Selesai & Kembali Bersantai di Lobby
  console.log('\n▶ [5/5] Seluruh Pekerjaan Selesai (Finished):');
  console.log('  -> Whiteboard menampilkan konfirmasi status 100% selesai!');
  console.log('  -> Seluruh agen inti (Kamala, Devin, Audit, Rani, Aura, Raka) berjalan KEMBALI KE LOBBY');
  console.log('     untuk bersantai di sofa, PS corner, espresso bar, dan meja pingpong!');
  await sendEvent({
    stage: 'FINISHED',
    speaker: 'kamala',
    speakerMessage: '🎉 Luar biasa! Seluruh task selesai 100%! Mari kembali istirahat di lobby!',
    whiteboard: {
      stage: 'COMPLETED',
      title: 'ALL TASKS VERIFIED ✅',
      subtitle: 'Siklus Pekerjaan Berhasil Sempurna',
      items: [
        '[x] Task 1: Konfigurasi default lobbySpot & state idle',
        '[x] Task 2: Dispatch Subagent Builder (Neo)',
        '[x] Task 3: Dispatch Subagent QA Tester (Trinity)',
        '[x] Task 4: Verifikasi Akhir 100% Lulus'
      ],
      approvals: 'VERIFIKASI: LULUS 100% (AGEN KEMBALI KE LOBBY)'
    }
  });

  console.log('\n===========================================================');
  console.log('✅ SIMULASI SELESAI DENGAN SUKSES!');
  console.log('===========================================================');
}

runSimulation().catch(err => {
  console.error('Error saat simulasi:', err);
  process.exit(1);
});
