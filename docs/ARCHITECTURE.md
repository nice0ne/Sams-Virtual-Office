# 🏢 MSAM Office — 3D AI Agent Virtual Office & Live Superpowers Bridge

Dokumentasi komprehensif arsitektur, fitur, tata ruang 3D, sistem komunikasi real-time, modul JavaScript, dan panduan pengoperasian **MSAM Office**.

---

## 📌 Daftar Isi
1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Arsitektur Sistem & Data Flow](#2-arsitektur-sistem--data-flow)
3. [Fitur Utama & State Terakhir](#3-fitur-utama--state-terakhir)
4. [Tata Ruang 3D & Koordinat Kantor](#4-tata-ruang-3d--koordinat-kantor)
5. [Daftar Agen & Karakter Inti](#5-daftar-agen--karakter-inti)
6. [Struktur Berkas & Modul JavaScript](#6-struktur-berkas--modul-javascript)
7. [Protokol Komunikasi (WebSocket & HTTP API)](#7-protokol-komunikasi-websocket--http-api)
8. [Universal MCP Server (`mcp-server.js`)](#8-universal-mcp-server-mcp-serverjs)
9. [CLI Helper & SDK (`notify.js`)](#9-cli-helper--sdk-notifyjs)
10. [Smart Seating & Anti-Collision Algorithm](#10-smart-seating--anti-collision-algorithm)
11. [Universal Python SDK & Hermes/OpenClaw (`office.py`)](#11-universal-python-sdk--hermesopenclaw-officepy)
12. [Panduan Menjalankan & Integrasi Global](#12-panduan-menjalankan--integrasi-global)
13. [Pengujian Otomatis (Test Suites)](#13-pengujian-otomatis-test-suites)



---

## 1. Ringkasan Proyek

**MSAM Office** adalah aplikasi virtual office 3D berbasis WebGL (Three.js) yang memvisualisasikan aktivitas dan alur kerja agen AI otonom secara interaktif dan real-time.

Aplikasi ini bertindak sebagai **visual digital twin** untuk tim agen AI Anda (seperti Devin, Kamala, Audit, Raka, Aura, Rani, dan subagent dinamis). Setiap kali agen AI sedang melakukan sesi brainstorming, menyusun implementation plan, merekrut pekerja subagent baru, atau menyelesaikan tugas, kantor 3D akan merefleksikan aktivitas tersebut secara visual:
- Karakter berjalan menggunakan algoritma **A\* Pathfinding**.
- Karakter bersantai di lobby saat idle dan berpindah ke stasiun kerja masing-masing saat ada task.
- Subagent baru dipanggil melalui **efek portal neon 3D** di lobby dan mencari kursi kosong secara mandiri.
- Papan Whiteboard 3D di kantor ter-render secara dinamis menampilkan checklist task dan stage terkini.

---

## 2. Arsitektur Sistem & Data Flow

```mermaid
flowchart TD
    subgraph AI Coding Agent / Terminal
        A["Antigravity / agy"] -->|Trigger Event| B["notify.js (CLI Helper)"]
    end

    subgraph Backend Server (Node.js)
        B -->|POST /api/event| C["server.js (HTTP Server :8000)"]
        C -->|Save Cache| D["state.json"]
        C -->|Broadcast Event| E["WebSocket Server (ws://:8000)"]
    end

    subgraph Browser Frontend (Three.js & CSS2DRenderer)
        E -->|WebSocket Stream| F["js/live-state-listener.js"]
        F -->|Emit Local Event| G["js/event-bus.js"]
        
        G --> H["js/superpowers-engine.js"]
        G --> I["js/whiteboard-display.js"]
        G --> J["js/subagent-spawner.js"]
        
        I -->|Update 3D Texture| K["3D Whiteboard Mesh"]
        J -->|Spawn 3D Character| L["Dev Lab & Creative Pods"]
        H -->|Render Overlay| M["js/superpowers-ui.js (Glassmorphism HUD)"]
    end
```

---

## 3. Fitur Utama & State Terakhir

### A. Dynamic 3D Whiteboard Canvas
- Tekstur kanvas 2D yang diperbarui secara prosedural pada mesh Whiteboard 3D.
- Menampilkan:
  - Stage Badge (`BRAINSTORMING`, `WRITING_PLAN`, `EXECUTING`, `COMPLETED`).
  - Judul topik & subtitle deskripsi.
  - Checklist item interaktif: `[>]` (aktif), `[x]` (selesai), `[ ]` (menunggu).
  - Footer status approval.

### B. Smart Autonomous Seat Finder (Terbaru)
- Subagent yang direkrut **tidak akan lagi menimpa atau mereplace** posisi duduk bot lain.
- Memeriksa okupansi global (agen inti + subagent aktif).
- Memiliki kolam 12 stasiun kursi bebas tabrakan (Dev Lab, Creative Studio, CEO Office, Lounge & Cafe Pods, Outdoor Patio).
- Bot inti (Devin dkk.) otomatis berganti mode menjadi posisi berdiri/diskusi tamu (*visitor stance*) jika kursinya diduduki subagent.

### C. Portal Rekrutmen Subagent 3D
- Animasi pilar silinder cahaya neon biru saat subagent direkrut.
- Subagent memiliki warna aksen, badge nama kontras di atas kepala, dan indikator visual status.
- Mendukung siklus hidup lengkap: `Promote` (menjadi permanen) atau `Despawn` (berjalan kembali ke portal lobby lalu keluar).

### D. Default Idle di Lobby Lounge
- Seluruh agen default-nya bersantai dan bercengkerama di area Sofa/Lobby Lounge saat status idle.
- Ketika ada perintah atau tugas baru, bot yang bersangkutan otomatis berjalan ke meja kerjanya.
- Setelah selesai (`FINISHED`), semua bot kembali santai ke lobby.

### E. Penyesuaian UI & Eksterior Terbaru
- **Papan Nama Kantor:** Papan kayu coklat bertuliskan emas **"MSAM Office"** diposisikan rapi di taman depan tanpa menutupi pintu masuk atau tertutup pohon.
- **Badge Nama Karakter:** Warna nama bot di atas karakter menggunakan teks terang (`#FFFFFF` dengan drop shadow gelap) sehingga jelas terbaca dari berbagai sudut kamera.
- **Status HUD:** Card status bawah diminimalkan (*compact glassmorphism*) agar tidak menutupi pemandangan 3D kantor.

---

## 4. Tata Ruang 3D & Koordinat Kantor

Sistem kantor menggunakan sistem koordinat Three.js `(x, y, z)`:

| Zona Kantor | Koordinat Utama (x, z) | Deskripsi |
| :--- | :--- | :--- |
| **Lobby & Entrance Portal** | `x: 0, z: 10.0` s/d `14.0` | Silinder portal spawn subagent, meja resepsionis, pintu kaca depan. |
| **Lobby Lounge & Cafe** | `x: 3.0` s/d `8.0`, `z: 4.0` s/d `7.0` | Sofa santai tempat default bersantai semua agen saat idle, mesin kopi. |
| **Whiteboard Kolaborasi** | `x: -8.0, z: -8.0` | Papan tulis 3D untuk presentasi brainstorming & checklist rencana. |
| **Dev & Ops Lab** | `x: -7.0` s/d `3.0`, `z: -10.0` s/d `-5.0` | Stasiun kerja utama engineer dengan monitor multi-display. |
| **Creative Design Studio** | `x: -11.0` s/d `-9.0`, `z: 4.0` s/d `9.0` | Pod kreatif untuk UI/UX, visual mockups, dan asset builder. |
| **CEO & Strategy Room** | `x: 10.0` s/d `13.5`, `z: -9.0` s/d `-5.0` | Meja eksekutif Kamala, kursi meeting tamu VIP. |
| **Outdoor Patio** | `x: -5.0` s/d `-3.0`, `z: 13.0` s/d `16.0` | Meja santai outdoor taman. |

---

## 5. Daftar Agen & Karakter Inti

| Nama Agen | Peran / Spesialisasi | Karakteristik / Warna | Posisi Default Kerja |
| :--- | :--- | :--- | :--- |
| **Kamala** | Tech Lead & Strategic Architect | Gaun Formal Ungu (`#8b5cf6`) | Meja CEO / Whiteboard |
| **Devin** | Lead Autonomous Software Engineer | Hoodie Coklat/Hitam (`#3b82f6`) | Dev Lab Stasiun Alpha `(-2.5, -6.05)` |
| **Audit** | Security & Code Quality Reviewer | Kemeja Hijau Mint (`#10b981`) | Dev Lab Stasiun Beta `(2.5, -6.05)` |
| **Rani** | Product Manager & User Advocate | Busana Oranye Pastel (`#f97316`) | Meja Kolaborasi Tengah |
| **Aura** | Creative UI/UX Designer | Gaun Pink/Rose (`#ec4899`) | Creative Pods `(-10.0, 5.0)` |
| **Raka** | DevOps & Cloud Infrastructure | Kaos Biru Tua / Topi (`#06b6d4`) | Dev Lab Server Stasiun `(-6.5, -6.05)` |

---

## 6. Struktur Berkas & Modul JavaScript

```
MSAM-OFFICE/
├── AGENTS.md                   # Aturan workspace untuk Antigravity
├── docs/                       # Dokumentasi komprehensif & superpowers specs/plans
│   ├── ARCHITECTURE.md         # File dokumentasi utama ini
│   └── superpowers/
│       ├── plans/              # Rencana implementasi bite-sized
│       └── specs/              # Spesifikasi teknis desain
├── js/
│   ├── event-bus.js            # Pub/sub event hub client-side
│   ├── live-state-listener.js  # WebSocket bridge ke Node.js server
│   ├── subagent-spawner.js     # Portal spawner 3D & smart seat finder
│   ├── superpowers-engine.js   # Finite State Machine alur kerja superpowers
│   ├── superpowers-ui.js       # Glassmorphism floating HUD control panel
│   └── whiteboard-display.js   # Procedural dynamic canvas whiteboard texture
├── notify.js                   # CLI helper untuk trigger event dari terminal/agent
├── server.js                   # HTTP file server + WebSocket broadcaster (:8000)
├── state.json                  # Persistent cache file untuk sinkronisasi state
├── start-server.bat            # Quick launcher Windows untuk server
├── index-openspace.html        # Web app 3D tema Open Space (Utama)
├── index.html                  # Web app 3D tema Cyber Dark
└── test-*.js / test-*.html     # Unit & End-to-End Test Suites (100% passing)
```

---

## 7. Protokol Komunikasi (WebSocket & HTTP API)

### 1. HTTP Endpoint: `POST /api/event`
Digunakan oleh script terminal atau tool agent untuk mengirimkan update status:

**Request Payload Contoh:**
```json
{
  "stage": "BRAINSTORMING",
  "speaker": "kamala",
  "speakerMessage": "Mengeksplorasi ide dan klasifikasi alur...",
  "topic": "Sistem Pembayaran Gateway",
  "subagents": [
    {
      "name": "Alex",
      "role": "Frontend Builder",
      "task": "Menyusun UI Formulir",
      "color": "#38bdf8"
    }
  ]
}
```

### 2. HTTP Endpoint: `GET /api/state`
Mengambil salinan state kantor saat ini (JSON).

### 3. WebSocket Connection: `ws://localhost:8000`
- Setiap browser yang terhubung otomatis menerima state awal via `currentState`.
- Setiap ada event masuk dari `/api/event`, server mem-broadcast payload baru ke seluruh client secara instan.

---

## 8. Universal MCP Server (`mcp-server.js`)

**Model Context Protocol (MCP)** memungkinkan AI agent modern (seperti Claude Code, Cursor, Windsurf, Roo Code, dan Antigravity) untuk mengendalikan Virtual Office 3D secara langsung sebagai *Native Callable Tools* tanpa perlu mengeksekusi shell script manual.

### Tools yang Disediakan MCP Server:
- `office_set_stage({ stage, topic, speaker, message })`: Mengubah fase kerja kantor dan memindahkan bot.
- `office_spawn_agent({ name, role, task, color })`: Merekrut subagent baru via portal 3D di lobby.
- `office_update_whiteboard({ title, subtitle, items, approvals })`: Memperbarui checklist papan tulis 3D.
- `office_agent_speak({ speaker, message })`: Memunculkan balon dialog percakapan di atas bot.

### Cara Mendaftarkan di Editor AI (MCP Config):
Di file konfigurasi MCP (misal: `~/.gemini/config/mcp_config.json`, `.cursor/mcp.json`, atau `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "msam-virtual-office": {
      "command": "node",
      "args": ["E:/VIBE-CODE-WS/MSAM-OFFICE/mcp-server.js"],
      "env": {
        "MSAM_OFFICE_URL": "http://localhost:8000"
      }
    }
  }
}
```

---

## 9. CLI Helper & SDK (`notify.js`)

Script serbaguna yang dapat digunakan via terminal CLI maupun di-import sebagai pustaka ES Module.

### Fitur Utama:
1. **Dukungan `MSAM_OFFICE_URL`:** Mendukung kantor 3D di host/port lain atau cloud VPS.
2. **Fail-Safe & Non-Blocking:** Jika server kantor sedang offline, script keluar secara hening tanpa membuat crash alur agent.
3. **ESM Export:** Dapat di-import di modul Node.js lain:
   ```javascript
   import { spawnAgent, sendOfficeEvent } from './notify.js';
   await spawnAgent('Neo', 'Security Engineer', 'Auditing smart contracts');
   ```

### Contoh Penggunaan CLI:
```powershell
# 1. Brainstorming
node notify.js --stage BRAINSTORMING --speaker kamala --msg "Mengeksplorasi ide arsitektur baru..."

# 2. Writing Plan
node notify.js --stage WRITING_PLAN --speaker devin --msg "Menyusun rencana kerja bite-sized..."

# 3. Rekrut Subagent Baru
node notify.js --spawn "Alex" --role "UI Specialist" --task "Merancang form glassmorphism" --color "#38bdf8"

# 4. Selesai
node notify.js --stage FINISHED --speaker kamala --msg "Seluruh task selesai dan lulus verifikasi 100%!"
```

---

## 10. Smart Seating & Anti-Collision Algorithm

Ketika `subagentSpawner.spawnSubagent(config)` dipanggil:
1. Menghitung jarak Euclidean ke seluruh bot yang ada di kantor:
   $$\text{distance} = \sqrt{(x_1 - x_2)^2 + (z_1 - z_2)^2}$$
2. Titik meja dianggap **terisi (occupied)** jika ada bot lain berjarak $< 1.4$ unit.
3. Mencari kursi kosong pertama dari pool 12 stasiun kursi:
   - Stasiun Dev Lab Alpha, Beta, Gamma, Delta
   - Creative Studio Pods 1 & 2
   - CEO Meeting Chairs 1 & 2
   - Lobby Lounge Pods 1, 2, 3
   - Outdoor Patio Pod
4. Jika seluruh kursi penuh, sistem secara cerdas membuat offset posisi aman di collaboration hub tanpa menumpuk bot lain.
5. Bot inti yang kembali bekerja ke mejanya memeriksa apakah kursinya diduduki subagent; jika ya, bot inti beralih ke posisi berdiri/tamu di sisi meja.

---

## 11. Universal Python SDK & Hermes/OpenClaw (`office.py`)

Untuk framework multi-agent berbasis Python seperti **Hermes Agent (Nous Research)**, **OpenClaw**, **AutoGen**, **CrewAI**, atau **LangGraph**, proyek ini menyediakan SDK ringan tanpa dependensi pihak ketiga (`office.py`).

### Contoh Penggunaan di Python:
```python
from office import reporter

# 1. Melaporkan tahap kerja (misal: saat reasoning / tool execution)
reporter.report_task(
    stage="BRAINSTORMING",
    agent_name="hermes",
    message="Menganalisis arsitektur sistem...",
    topic="Desain API Gateway"
)

# 2. Merekrut worker baru (Portal 3D menyala dan bot menuju ke Dev Lab)
reporter.spawn_worker(
    name="CrawlerBot",
    role="Web Scraper",
    task="Mengumpulkan data dokumentasi",
    color="#38bdf8"
)

# 3. Memperbarui checklist papan tulis 3D
reporter.update_whiteboard(
    title="HERMES EXECUTION PLAN",
    items=["[x] Step 1: Init", "[>] Step 2: Crawling", "[ ] Step 3: Synthesis"]
)
```

---

## 12. Panduan Menjalankan & Integrasi Global


### Cara Menjalankan Server Lokal:
Cukup jalankan script batch atau perintah Node:
```powershell
.\start-server.bat
# Atau:
node server.js
```
Akses di browser:
- **Tampilan Utama:** [http://localhost:8000](http://localhost:8000) (atau `http://localhost:8000/index-openspace.html`)

### Menghubungkan Secara Global dengan Superpowers:
Untuk membuat agent otomatis mengabari Virtual Office dari project mana saja, cukup gunakan path absolut `notify.js` dalam perintah trigger:
```powershell
node E:/VIBE-CODE-WS/MSAM-OFFICE/notify.js --spawn "NamaBot" --role "Role" --task "Tugas"
```

---

## 13. Pengujian Otomatis (Test Suites)

Proyek ini dilengkapi rangkaian pengujian otomatis lengkap yang dapat dijalankan langsung di Node.js:


| File Pengujian | Komponen yang Diuji | Hasil |
| :--- | :--- | :--- |
| `node test-subagent-spawner.js` | Spawn subagent, registrasi, promosi, despawn, & alokasi kursi unik | ✅ PASS (100%) |
| `node test-superpowers-engine.js` | Transisi state FSM, sinkronisasi whiteboard, emisi event bus | ✅ PASS (100%) |
| `node test-e2e-integration.js` | Alur lengkap E2E: Brainstorming $\to$ Plan $\to$ Subagent Spawn $\to$ Finish | ✅ PASS (100%) |
| `node test-pathfinding-integrity.js` | Grid A* pathfinding, deteksi halangan dinding & navigasi karakter | ✅ PASS (100%) |

Untuk menjalankan seluruh test secara serentak:
```powershell
node test-e2e-integration.js
```
Semua modul terintegrasi rapi, stabil, dan siap mendampingi sesi coding Anda! 🚀
