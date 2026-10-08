"""
office.py - Universal Python SDK & Reporter for Sam's Virtual Office 3D
Kompatibel dengan Hermes Agent, OpenClaw, AutoGen, CrewAI, LangGraph, & Custom AI Scripts.

Penggunaan Ringkas:
    from office import OfficeReporter

    reporter = OfficeReporter() # Otomatis baca env SAMS_OFFICE_URL / MSAM_OFFICE_URL atau fallback http://localhost:8000
    reporter.report_task(stage="BRAINSTORMING", agent_name="hermes", message="Menganalisis user request...")
    reporter.spawn_worker(name="DataScraper", role="Web Crawler", task="Mengumpulkan data pasar")
    reporter.update_whiteboard(title="HERMES EXECUTION PLAN", items=["[x] Init", "[>] Crawling data"])
"""

import os
import json
import urllib.request
import urllib.error
from typing import List, Optional, Dict, Any

class OfficeReporter:
    def __init__(self, base_url: Optional[str] = None, timeout: float = 2.5):
        self.base_url = (base_url or os.getenv("SAMS_OFFICE_URL") or os.getenv("MSAM_OFFICE_URL") or "http://localhost:8000").rstrip("/")
        self.event_url = f"{self.base_url}/api/event"
        self.timeout = timeout

    def send_event(self, payload: Dict[str, Any], silent: bool = False) -> bool:
        """Mengirimkan raw event dictionary ke Virtual Office 3D secara non-blocking / fail-safe."""
        try:
            req_data = json.dumps(payload).encode("utf-8")
            headers = {"Content-Type": "application/json"}
            auth_key = os.getenv("SAMS_OFFICE_KEY") or os.getenv("MSAM_OFFICE_KEY")
            if auth_key:
                headers["Authorization"] = f"Bearer {auth_key}"

            req = urllib.request.Request(
                self.event_url,
                data=req_data,
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as res:
                if not silent and res.status == 200:
                    print(f"[OfficeReporter] [OK] Terkirim ke 3D Office ({self.base_url})")
                return True

        except Exception as e:
            if not silent:
                print(f"[OfficeReporter] [OFFLINE] Virtual Office offline ({e}). Melanjutkan tugas.")
            return False

    def report_task(self, stage: str, agent_name: str = "hermes", message: str = "", topic: str = "") -> bool:
        """Melaporkan progress stage tugas agent saat ini."""
        return self.send_event({
            "stage": stage,
            "speaker": agent_name.lower(),
            "speakerMessage": message or f"Sedang menjalankan tahap {stage}",
            "topic": topic
        })

    def spawn_worker(self, name: str, role: str, task: str, color: str = "#38bdf8") -> bool:
        """Memicu portal 3D untuk memunculkan worker bot baru di lobby."""
        return self.send_event({
            "stage": "EXECUTING_SUBAGENTS",
            "speaker": "kamala",
            "speakerMessage": f"Merekrut subagent baru: {name} ({role})",
            "subagents": [{
                "name": name,
                "role": role,
                "task": task,
                "color": color
            }]
        })

    def update_whiteboard(self, title: str, items: List[str], subtitle: str = "", approvals: str = "Active") -> bool:
        """Memperbarui papan whiteboard 3D dengan item checklist."""
        return self.send_event({
            "whiteboard": {
                "title": title,
                "subtitle": subtitle,
                "items": items,
                "approvals": approvals
            }
        })

    def agent_speak(self, speaker: str, message: str) -> bool:
        """Membuat salah satu karakter menampilkan balon dialog."""
        return self.send_event({
            "speaker": speaker.lower(),
            "speakerMessage": message
        })

# Default global instance
reporter = OfficeReporter()

if __name__ == "__main__":
    import sys
    print("[TEST] Menguji OfficeReporter Python SDK...")
    success = reporter.report_task(
        stage="BRAINSTORMING",
        agent_name="hermes",
        message="Hermes Python SDK berhasil terkoneksi ke 3D Office!",
        topic="Integrasi Hermes Agent"
    )
    if success:
        print("[SUCCESS] Integrasi Python SDK Berhasil!")
    else:
        print("[WARNING] Gagal terhubung (Pastikan server.js berjalan).")

