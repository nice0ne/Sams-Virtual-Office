/**
 * Procedural Dynamic Canvas Texture for Brainstorming & Planning Whiteboard
 */
export class WhiteboardDisplay {
  constructor(targetMesh, width = 1024, height = 512, customCanvas = null) {
    if (customCanvas) {
      this.canvas = customCanvas;
    } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      this.canvas = document.createElement('canvas');
    } else {
      // Mock canvas fallback for headless or Node.js environment
      this.canvas = {
        width,
        height,
        getContext: () => null
      };
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = (this.canvas && typeof this.canvas.getContext === 'function') ? this.canvas.getContext('2d') : null;
    this.texture = (typeof THREE !== 'undefined' && THREE.CanvasTexture) ? new THREE.CanvasTexture(this.canvas) : null;
    this.targetMesh = targetMesh;

    this.attachTexture();
    this.renderDefault();
  }

  attachTexture() {
    if (this.targetMesh && this.texture) {
      const applyToMesh = (mesh) => {
        if (!mesh) return;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            if (mat) {
              mat.map = this.texture;
              mat.needsUpdate = true;
            }
          });
        } else if (mesh.material) {
          mesh.material.map = this.texture;
          mesh.material.needsUpdate = true;
        }
      };

      if (Array.isArray(this.targetMesh)) {
        this.targetMesh.forEach(applyToMesh);
      } else {
        applyToMesh(this.targetMesh);
      }
    }
  }

  setTargetMesh(targetMesh) {
    this.targetMesh = targetMesh;
    this.attachTexture();
  }

  renderDefault() {
    this.updateContent({
      stage: 'READY',
      title: 'SUPERPOWERS WORKFLOW',
      subtitle: 'Siap memulai sesi Brainstorming...',
      items: [
        '1. /superpowers:brainstorming -> Ideas into designs',
        '2. /superpowers:writing-plans -> Detailed plan & tasks',
        '3. Subagent Dispatch -> Autonomous parallel coding'
      ],
      approvals: 'Gate: Menunggu Inisiasi'
    });
  }

  updateContent({ stage = 'BRAINSTORMING', title = '', subtitle = '', items = [], approvals = '' } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - Dark architectural whiteboard
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // Stage Badge
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(24, 24, 220, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Nunito, sans-serif';
    ctx.fillText(`⚡ FASE: ${stage}`, 36, 48);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Fredoka, sans-serif';
    ctx.fillText(title || 'SESI SUPERPOWERS', 270, 50);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Nunito, sans-serif';
    ctx.fillText(subtitle, 28, 95);

    // Divider line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 115); ctx.lineTo(w - 24, 115);
    ctx.stroke();

    // Items / Tasks / Steps
    let startY = 150;
    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 20px Nunito, sans-serif';

        if (typeof item === 'string') {
          if (item.startsWith('[x]')) {
            ctx.fillStyle = '#4ade80';
          } else if (item.startsWith('[>]')) {
            ctx.fillStyle = '#38bdf8';
          }
        }

        ctx.fillText(String(item), 36, startY + (index * 38));
      });
    }

    // Approval Gate at bottom
    if (approvals) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(24, h - 60, w - 48, 36);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px Nunito, sans-serif';
      ctx.fillText(`🔒 ${approvals}`, 36, h - 36);
    }

    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  getTexture() {
    return this.texture;
  }
}

if (typeof window !== 'undefined') {
  window.WhiteboardDisplay = WhiteboardDisplay;
}
