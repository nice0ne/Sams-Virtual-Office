# Spec Desain: Visualisasi Alur Superpowers Workflow & Rekrutmen Subagent 3D

- **Tanggal:** 2026-10-06
- **Status:** Approved by Human Partner
- **Cakupan:** Visualisasi 3D Interaktif Superpowers Coding Workflow (`/superpowers:brainstorming` -> `writing-plans` -> `executing-plans` / subagent recruitment) di AI Agent Virtual Office.

---

## 1. Ringkasan & Tujuan (Overview & Goals)

Menghadirkan representasi visual 3D yang hidup dan interaktif atas siklus kerja Agent Skill Superpowers di dalam Virtual Office 3D (`MSAM-OFFICE`). Visualisasi ini mencakup:
1. **Fase Brainstorming (`/superpowers:brainstorming`)**: Agen berkumpul di ruang strategi/kreatif, whiteboard 3D menampilkan alur klasifikasi (Spike/Bounded/Architectural), trade-offs pendekatan, dan gate persetujuan manusia.
2. **Fase Writing Plan (`/superpowers:writing-plans`)**: Papan tulis bertransisi menampilkan checklist rencana implementasi bertahap.
3. **Fase Eksekusi & Perekrutan Subagent (`subagent-driven-development`)**: Efek animasi portal / kedatangan pekerja baru di lobby, berjalan via pathfinding A* menuju meja kerja di Dev Lab, mulai coding dengan status monitor aktif.
4. **Lifecycle Subagent (Promote vs Despawn)**: Opsi fleksibel bagi subagent setelah tugas selesai: dipromosikan menjadi staf tetap atau pamit/despawn dengan efek visual perpisahan/confetti.
5. **Mode Hybrid (Simulator UI + Event Bus Streaming)**: Dapat dimainkan secara manual/otomatis via HUD browser, dan siap dihubungkan ke event stream CLI eksternal.

---

## 2. Arsitektur Sistem (Modular Split Native ESM)

Sistem menggunakan arsitektur modular tanpa bundler (pure native ES Modules) yang terhubung ke `index.html`:

```
MSAM-OFFICE/
├── index.html                   # Entry point aplikasi & Three.js canvas
├── js/
│   ├── event-bus.js             # Pub/Sub event bridge untuk simulator & external listener
│   ├── superpowers-engine.js    # Finite State Machine (FSM) alur superpowers
│   ├── subagent-spawner.js      # Generator model 3D bot dinamis, efek portal, desk allocation
│   ├── whiteboard-display.js    # Render tekstur dinamis 2D canvas ke whiteboard 3D
│   └── superpowers-ui.js        # Panel kontrol HUD interaktif di browser
```

---

## 3. Spesifikasi Komponen & Modul

### 3.1. `event-bus.js`
- Mengimplementasikan pola Observer (Pub/Sub) yang ringan.
- Event standar:
  - `SUPERPOWER_STAGE_CHANGE`: Perpindahan status (`BRAINSTORMING`, `PLANNING`, `EXECUTING`, `FINISHED`).
  - `WHITEBOARD_UPDATE`: Memperbarui konten visual papan tulis 3D.
  - `SUBAGENT_SPAWNED`: Memicu pembuatan bot baru dan animasi kedatangan.
  - `SUBAGENT_TASK_UPDATE`: Memperbarui status dialog dan progress task.
  - `SUBAGENT_RESOLVED`: Menentukan aksi promosi atau despawn.

### 3.2. `whiteboard-display.js`
- Menghubungkan kanvas tekstur procedural Three.js ke papan tulis di ruang Creative / CEO.
- Mendukung render teks dinamis, kartu alur proses, dan ikon status:
  - Header fase aktif dengan warna aksen neon.
  - Diagram branching: `Spike` | `Bounded` | `Architectural`.
  - Checklist interaktif rencana kerja `[x]` / `[ ]`.

### 3.3. `subagent-spawner.js`
- **Dynamic 3D Bot Factory**:
  - Memanfaatkan fungsi pembuatan karakter voxel/low-poly Three.js yang sudah ada di office.
  - Memberikan skema warna dinamis, badge nama floating CSS2D bertuliskan role subagent (misal: `[Subagent #1: TDD Specialist]`).
- **Portal Spawn Effect**:
  - Efek silinder partikel / cahaya neon di lobby koordinat `(8, 0, 5)`.
- **Desk Assignment & Pathfinding**:
  - Menentukan koordinat meja kosong di Dev Lab.
  - Mengarahkan bot menggunakan A* pathfinding menuju kursi kerja, bot duduk dan mulai animasi mengetik.
- **Despawn & Promotion**:
  - `Promote`: Bot diintegrasikan ke daftar staf permanen kantor.
  - `Despawn`: Bot berdiri, berjalan ke lobby, memainkan lambaian tangan, dan memudar (opacity fade out).

### 3.4. `superpowers-engine.js`
- Mengatur Finite State Machine:
  1. `IDLE`: Kondisi normal kantor.
  2. `BRAINSTORMING`: Whiteboard aktif, dialog ide agen muncul.
  3. `WRITING_PLAN`: Whiteboard berganti checklist pekerjaan terstruktur.
  4. `EXECUTING_SUBAGENTS`: Memanggil 1 atau lebih subagent untuk bekerja paralel.
  5. `REVIEW_FINISHING`: Evaluasi hasil, selebrasi keberhasilan.

### 3.5. `superpowers-ui.js`
- Panel kontrol floating glassmorphism di pojok layar:
  - Step buttons: `Mulai Brainstorming`, `Generate Plan`, `Spawn Subagent`, `Selesaikan Task`.
  - Tombol aksi subagent: `Promote ke Tim Tetap` & `Selesai Kontrak (Despawn)`.
  - Tombol `Auto Demo` untuk pemutaran alur otomatis berkelanjutan.

---

## 4. Rencana Pengujian & Verifikasi

1. **Verifikasi Visual 3D**:
   - Memastikan whiteboard 3D menampilkan teks dan alur dengan tajam tanpa penurunan performa FPS.
   - Efek portal spawn muncul di lokasi yang tepat tanpa menembus dinding.
2. **Verifikasi Pathfinding**:
   - Subagent yang baru dibuat dapat berjalan dari lobby ke meja kerja tanpa *collision glitch*.
3. **Verifikasi Lifecycle**:
   - Memastikan subagent dapat di-despawn dengan membersihkan Three.js mesh & memory leak prevention.
   - Memastikan subagent yang di-promote tetap tersimpan dalam state aktif.
4. **Verifikasi Event Bus**:
   - Dispatch event manual via console browser (`window.SuperpowersEventBus.emit(...)`) dapat memicu respon visual yang sesuai.

---

## 5. Langkah Selanjutnya

Setelah dokumen spesifikasi ini disetujui, alur dilanjutkan dengan memanggil skill `writing-plans` untuk menyusun rencana implementasi baris per baris yang dapat dieksekusi secara terstruktur.
