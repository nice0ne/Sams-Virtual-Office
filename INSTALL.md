# 🛠️ Panduan Instalasi & Konfigurasi — Sam's Virtual Office 3D

Panduan langkah demi langkah untuk menginstalasi, menjalankan, dan mengonfigurasikan **Sam's Virtual Office** secara lokal maupun terintegrasi dengan berbagai AI Coding Assistant.

---

## 📋 Prasyarat Sistem

Sebelum memulai, pastikan perangkat Anda telah terinstal:
- **Node.js** versi **18.0.0 atau lebih tinggi** (`node -v`)
- **NPM** versi **9.0.0 atau lebih tinggi** (`npm -v`)
- Browser modern dengan dukungan **WebGL** (Google Chrome, Microsoft Edge, Brave, Mozilla Firefox, Safari)

---

## 🚀 Langkah 1: Instalasi Dependensi Proyek

Buka terminal di direktori proyek `Sam-Virtual-Office`:

```powershell
cd E:\VIBE-CODE-WS\Sam-Virtual-Office
npm install
```

> **Catatan Dependensi:** Proyek ini dirancang sangat ringan. Dependensi utama server hanyalah pustaka WebSocket `ws`, sementara sisi client Three.js di-load menggunakan ES Modules browser bawaan tanpa memerlukan build tool/bundler berat (zero bundler overhead).

---

## 🏃 Langkah 2: Menjalankan Server Kantor

### Di Sistem Operasi Windows:
Cukup klik ganda berkas `start-server.bat`, atau jalankan di PowerShell:
```powershell
.\start-server.bat
```

### Menggunakan Node.js Langsung:
```bash
npm start
# atau:
node server.js
```

Saat server berhasil menyala, Anda akan melihat log berikut:
```text
====================================================
🚀 All-in-One Office Server berjalan!
🌐 HTTP Web:      http://localhost:8000
⚡ WebSocket:     ws://localhost:8000
📄 Open-Space:    http://localhost:8000/index-openspace.html
📄 Cyber-Dark:    http://localhost:8000/index.html
====================================================
```

Buka browser Anda dan akses:  
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🌐 Langkah 3: Konfigurasi Environment (Opsional)

Jika Anda ingin menjalankan Virtual Office di komputer/monitor terpisah, di server lokal (LAN), atau di VPS Cloud, Anda dapat menggunakan environment variable `SAMS_OFFICE_URL`:

### Windows PowerShell:
```powershell
$env:SAMS_OFFICE_URL = "http://192.168.1.50:8000" # Contoh IP komputer kantor
```

### Linux / macOS:
```bash
export SAMS_OFFICE_URL="http://192.168.1.50:8000"
```

Semua perintah `node notify.js ...` atau MCP Server otomatis mengarahkan event ke alamat tersebut.

---

## 🔌 Langkah 4: Integrasi dengan AI Coding Agents

### A. Integrasi dengan Google Antigravity / Agy CLI
Sam's Virtual Office telah dilengkapi dengan MCP Server bawaan. Untuk mengintegrasikannya dengan Antigravity:

Tambahkan blok berikut ke berkas konfigurasi MCP global:  
📁 `C:\Users\<Username>\.gemini\config\mcp_config.json`

```json
{
  "mcpServers": {
    "sams-virtual-office": {
      "command": "node",
      "args": ["E:/VIBE-CODE-WS/Sam-Virtual-Office/mcp-server.js"],
      "env": {
        "SAMS_OFFICE_URL": "http://localhost:8000"
      }
    }
  }
}
```

---

### B. Integrasi dengan Claude Desktop / Claude Code
Tambahkan konfigurasi berikut ke berkas konfigurasi Claude Desktop Anda (`claude_desktop_config.json`):

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sams-virtual-office": {
      "command": "node",
      "args": ["E:/VIBE-CODE-WS/Sam-Virtual-Office/mcp-server.js"]
    }
  }
}
```

---

### C. Integrasi dengan Cursor & Windsurf
Pada pengaturan MCP Editor (`Settings` > `Features` > `MCP Servers` atau berkas `.cursor/mcp.json`):
- **Name:** `sams-virtual-office`
- **Type:** `command`
- **Command:** `node E:/VIBE-CODE-WS/Sam-Virtual-Office/mcp-server.js`

---

### D. Integrasi dengan Hermes Agent (Nous Research)
Hermes Agent mendukung tool calling native dan eksekusi Python. Anda dapat menghubungkannya melalui dua cara:

#### Opsi 1: Menggunakan Python SDK (`office.py`)
Salin atau import `office.py` ke dalam environment project Hermes Anda:
```python
from office import OfficeReporter

reporter = OfficeReporter()

# 1. Saat Hermes memulai reasoning atau merencanakan tugas
reporter.report_task(
    stage="BRAINSTORMING",
    agent_name="hermes",
    message="Hermes sedang menganalisis arsitektur...",
    topic="Desain Arsitektur Baru"
)

# 2. Saat Hermes membagi task ke worker agent
reporter.spawn_worker(
    name="Hermes-Coder",
    role="Backend Dev",
    task="Implementasi API endpoint",
    color="#06b6d4"
)
```

#### Opsi 2: Daftarkan sebagai MCP Tool di Hermes
Jika Hermes dijalankan dengan flag `--mcp-config`, arahkan ke file konfigurasi yang memuat:
```json
{
  "mcpServers": {
    "sams-virtual-office": {
      "command": "node",
      "args": ["E:/VIBE-CODE-WS/Sam-Virtual-Office/mcp-server.js"]
    }
  }
}
```

---

### E. Integrasi dengan OpenClaw (dan Multi-Agent Orchestrators: AutoGen / CrewAI / LangGraph)
Untuk framework orchestrator seperti OpenClaw yang menjalankan pipeline bertahap:

Tambahkan callback atau event hook di pipeline orchestrator Anda:
```python
import os
from office import OfficeReporter

# Inisialisasi reporter (opsional: definisikan URL custom jika kantor di server lain)
office = OfficeReporter(base_url=os.getenv("SAMS_OFFICE_URL", "http://localhost:8000"))

# Lifecycle Hook OpenClaw:
def on_workflow_start(workflow_name):
    office.report_task(stage="BRAINSTORMING", agent_name="openclaw", message=f"Memulai workflow {workflow_name}")

def on_subtask_spawn(agent_name, role, task):
    office.spawn_worker(name=agent_name, role=role, task=task)

def on_workflow_complete():
    office.report_task(stage="FINISHED", agent_name="openclaw", message="Seluruh pipeline OpenClaw selesai!")
```

---

## 🧪 Langkah 5: Verifikasi Sistem

Untuk memverifikasi visualisasi dan event bridge berjalan lancar:
```powershell
# Jalankan simulasi aktivitas AI agent:
npm run simulate

# Atau kirim single event test:
node notify.js --stage BRAINSTORMING --speaker kamala --msg "Test verifikasi koneksi Virtual Office"
```

---

## ❓ Troubleshooting & Tanya Jawab

1. **Port 8000 sudah digunakan aplikasi lain?**
   - Anda dapat mengubah konstanta `PORT = 8000;` di baris ke-9 pada berkas [`server.js`](./server.js), lalu sesuaikan environment variable `SAMS_OFFICE_URL`.
2. **Karakter tidak bergerak atau whiteboard tidak terupdate?**
   - Pastikan browser Anda tidak memblokir koneksi WebSocket lokal (`ws://localhost:8000`). Buka Developer Tools (F12) untuk melihat log konsol koneksi.
3. **Subagent tidak muncul saat direkrut?**
   - Pastikan server `server.js` sedang aktif dan berjalan di background sebelum perintah `notify.js` dikirim.
