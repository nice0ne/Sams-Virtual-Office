# AGENTS.md — Workspace Guidelines for AI Agent Virtual Office

Panduan otomatis bagi agen Antigravity (agy) saat bekerja di workspace `Sams-Virtual-Office`.

## Integrasi Otomatis dengan Virtual Office 3D (WebSocket Bridge)

Workspace ini memiliki sistem visualisasi 3D real-time yang terhubung via WebSocket di port `8000`. Setiap kali Anda menjalankan alur skill Superpowers atau merekrut subagent, kirimkan notifikasi event secara proaktif menggunakan script helper `notify.js`:

### 1. Saat Memulai Sesi Brainstorming (`/superpowers:brainstorming`)
Ketika masuk ke sesi brainstorming atau membahas arsitektur baru, jalankan perintah ini di background/terminal:
```powershell
node notify.js --stage BRAINSTORMING --speaker kamala --msg "Mengeksplorasi ide dan klasifikasi alur arsitektur..."
```
Ini akan menggerakkan karakter Kamala ke Whiteboard 3D dan menampilkan judul topik di ruangan.

### 2. Saat Menghasilkan Implementation Plan (`/superpowers:writing-plans`)
Ketika membuat file plan di `docs/superpowers/plans/`, jalankan:
```powershell
node notify.js --stage WRITING_PLAN --speaker devin --msg "Menyusun checklist bite-sized implementation plan..."
```
Ini akan mengubah tampilan whiteboard 3D menjadi checklist task implementasi.

### 3. Saat Merekrut Subagent Baru (`invoke_subagent` / `subagent-driven-development`)
Setiap kali Anda memanggil tool `invoke_subagent` untuk mengerjakan sebuah task, picu efek rekrutmen 3D di kantor:
```powershell
node notify.js --spawn "<Nama Subagent>" --role "<Peran/Spesialisasi>" --task "<Deskripsi Task Singkat>"
```
Contoh:
```powershell
node notify.js --spawn "Alex" --role "Frontend Builder" --task "Menyusun UI Glassmorphism"
```
Ini akan menyalakan silinder portal biru neon di Lobby, memunculkan bot baru, dan menggerakkannya dengan A* Pathfinding menuju meja kerja di Dev & Ops Lab.

### 4. Saat Task Selesai (`finishing-a-development-branch` / Complete)
Ketika seluruh rangkaian task selesai dan diverifikasi:
```powershell
node notify.js --stage FINISHED --speaker kamala --msg "Seluruh task selesai dan lulus verifikasi 100%!"
```
