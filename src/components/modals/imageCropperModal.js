import { getIcon } from '../icons.js';

/**
 * Interactive Image Cropper Modal
 * Provides an intuitive, responsive circular & square framing experience.
 * Features:
 * - Drag/touch to pan image
 * - Zoom slider + zoom in/out buttons + wheel zoom
 * - 90° clockwise rotation (corrects mobile camera orientations)
 * - Live circular avatar preview
 * - High-res 360x360 canvas export with anti-aliasing
 * 
 * @param {Object} options
 * @param {string} options.imageSrc - Base64 data URL or image URL
 * @param {string} [options.title='Crop & Frame Photo']
 * @param {Function} options.onApply - Callback receiving cropped base64 JPEG data URL
 * @param {Function} [options.onCancel] - Optional cancel callback
 */
export function openImageCropperModal({
  imageSrc,
  title = 'Crop & Frame Photo',
  onApply = () => {},
  onCancel = () => {}
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop cropper-modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog cropper-modal-dialog" style="max-width: 480px; width: 95%;">
      <div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
        <div>
          <div class="modal-badge">Photo Framing</div>
          <h2 class="modal-title" style="font-size: 18px; margin: 2px 0 0 0;">${title}</h2>
          <p class="modal-subtitle" style="font-size: 12px; margin-top: 3px;">Drag photo to position headshot. Use zoom and rotate to fit circle.</p>
        </div>
        <button class="modal-close-btn" id="btnCropperClose" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body cropper-modal-body" style="display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 16px 18px;">
        
        <!-- Interactive Crop Viewport -->
        <div class="cropper-viewport-wrap" style="position: relative; width: 320px; height: 320px; max-width: 100%; border-radius: 16px; overflow: hidden; background: #0f172a; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5); user-select: none; touch-action: none;">
          <canvas id="cropMainCanvas" width="320" height="320" style="display: block; width: 100%; height: 100%; cursor: grab;"></canvas>
          
          <div style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); color: #e2e8f0; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; pointer-events: none; display: flex; align-items: center; gap: 4px;">
            ${getIcon('move')} <span>Drag to reposition</span>
          </div>
        </div>

        <!-- Controls Toolbar -->
        <div class="cropper-controls-panel" style="width: 100%; display: flex; flex-direction: column; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
          <!-- Zoom Slider Row -->
          <div style="display: flex; align-items: center; gap: 10px;">
            <button type="button" id="btnCropZoomOut" class="btn btn-sm btn-secondary" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" title="Zoom Out">
              ${getIcon('zoomOut')}
            </button>
            <input 
              type="range" 
              id="rngCropZoom" 
              min="0" 
              max="100" 
              value="0" 
              style="flex: 1; accent-color: #6366f1; cursor: pointer;"
              title="Zoom level"
            />
            <button type="button" id="btnCropZoomIn" class="btn btn-sm btn-secondary" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" title="Zoom In">
              ${getIcon('zoomIn')}
            </button>
          </div>

          <!-- Action Buttons & Live Preview Row -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" id="btnCropRotate" class="btn btn-sm btn-secondary" style="font-size: 12px; height: 32px; padding: 0 10px; gap: 5px; font-weight: 600;" title="Rotate 90 degrees clockwise">
                ${getIcon('rotateCw')} <span>Rotate 90°</span>
              </button>
              <button type="button" id="btnCropReset" class="btn btn-sm btn-secondary" style="font-size: 12px; height: 32px; padding: 0 10px; gap: 5px; font-weight: 600;" title="Reset crop to center">
                ${getIcon('refresh')} <span>Reset</span>
              </button>
            </div>

            <!-- Mini Live Preview -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="text-align: right;">
                <div style="font-size: 11px; font-weight: 700; color: #1e293b;">Avatar Preview</div>
                <div style="font-size: 10px; color: #64748b;">Live circle</div>
              </div>
              <div style="width: 42px; height: 42px; border-radius: 50%; border: 2px solid #6366f1; overflow: hidden; background: #ffffff; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                <canvas id="cropMiniPreview" width="42" height="42" style="display: block; width: 100%; height: 100%;"></canvas>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="modal-footer" style="border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
        <button type="button" id="btnCropperCancel" class="btn btn-secondary" style="padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600;">
          Cancel
        </button>
        <button type="button" id="btnCropperApply" class="btn btn-primary" style="padding: 0 18px; height: 38px; font-size: 13px; font-weight: 700; gap: 6px;">
          ${getIcon('check')} <span>Apply & Save Crop</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#btnCropperClose').addEventListener('click', () => {
    close();
    onCancel();
  });
  overlay.querySelector('#btnCropperCancel').addEventListener('click', () => {
    close();
    onCancel();
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      close();
      onCancel();
    }
  });

  const mainCanvas = overlay.querySelector('#cropMainCanvas');
  const miniCanvas = overlay.querySelector('#cropMiniPreview');
  const rngZoom = overlay.querySelector('#rngCropZoom');
  const btnZoomIn = overlay.querySelector('#btnCropZoomIn');
  const btnZoomOut = overlay.querySelector('#btnCropZoomOut');
  const btnRotate = overlay.querySelector('#btnCropRotate');
  const btnReset = overlay.querySelector('#btnCropReset');
  const btnApply = overlay.querySelector('#btnCropperApply');

  const V = 320; // Viewport dimension
  const cropDiameter = 250; // Circular crop guide diameter
  const cropRadius = cropDiameter / 2;
  const cx = V / 2;
  const cy = V / 2;

  const ctx = mainCanvas.getContext('2d');
  const miniCtx = miniCanvas.getContext('2d');

  // Load the Image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageSrc;

  let panX = 0;
  let panY = 0;
  let rotation = 0;
  let scale = 1;
  let fitScale = 1;
  let minScale = 0.5;
  let maxScale = 3.0;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialPanX = 0;
  let initialPanY = 0;

  function render() {
    if (!img.complete || img.naturalWidth === 0) return;

    // 1. Clear Main Canvas
    ctx.clearRect(0, 0, V, V);

    // 2. Subtle dark checkered background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, V, V);

    // 3. Draw Transformed Image
    ctx.save();
    ctx.translate(cx + panX, cy + panY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // 4. Circular Cutout Dark Mask Overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.beginPath();
    ctx.rect(0, 0, V, V);
    ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();

    // 5. Circular Boundary Outline & Rule-of-Thirds Grid
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Grid inside circle
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

    ctx.beginPath();
    ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2);
    ctx.clip();

    const d3 = cropDiameter / 3;
    const x1 = cx - cropRadius + d3;
    const x2 = cx - cropRadius + 2 * d3;
    const y1 = cy - cropRadius + d3;
    const y2 = cy - cropRadius + 2 * d3;

    ctx.beginPath();
    ctx.moveTo(x1, 0); ctx.lineTo(x1, V);
    ctx.moveTo(x2, 0); ctx.lineTo(x2, V);
    ctx.moveTo(0, y1); ctx.lineTo(V, y1);
    ctx.moveTo(0, y2); ctx.lineTo(V, y2);
    ctx.stroke();
    ctx.restore();

    // 6. Mini Live Avatar Preview
    miniCtx.clearRect(0, 0, 42, 42);
    miniCtx.save();
    miniCtx.beginPath();
    miniCtx.arc(21, 21, 21, 0, Math.PI * 2);
    miniCtx.clip();
    miniCtx.fillStyle = '#ffffff';
    miniCtx.fillRect(0, 0, 42, 42);

    const miniFactor = 42 / cropDiameter;
    miniCtx.translate(21 + panX * miniFactor, 21 + panY * miniFactor);
    miniCtx.rotate((rotation * Math.PI) / 180);
    miniCtx.scale(scale * miniFactor, scale * miniFactor);
    miniCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    miniCtx.restore();
  }

  function updateZoomFromSlider() {
    const t = Number(rngZoom.value) / 100;
    scale = minScale + t * (maxScale - minScale);
    render();
  }

  function setScale(newScale) {
    scale = Math.min(maxScale, Math.max(minScale, newScale));
    const t = (scale - minScale) / (maxScale - minScale);
    rngZoom.value = Math.round(t * 100);
    render();
  }

  function resetCrop() {
    panX = 0;
    panY = 0;
    rotation = 0;
    setScale(fitScale);
  }

  img.onload = () => {
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    fitScale = cropDiameter / minDim;
    minScale = fitScale * 0.4;
    maxScale = fitScale * 3.5;
    resetCrop();
  };

  img.onerror = () => {
    alert('Failed to load image for cropping.');
    close();
  };

  // Pointer Dragging (works seamlessly on desktop mouse and mobile touch)
  mainCanvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialPanX = panX;
    initialPanY = panY;
    mainCanvas.style.cursor = 'grabbing';
    mainCanvas.setPointerCapture(e.pointerId);
  });

  mainCanvas.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    panX = initialPanX + dx;
    panY = initialPanY + dy;
    render();
  });

  const stopDrag = e => {
    if (!isDragging) return;
    isDragging = false;
    mainCanvas.style.cursor = 'grab';
    try {
      mainCanvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  mainCanvas.addEventListener('pointerup', stopDrag);
  mainCanvas.addEventListener('pointercancel', stopDrag);

  // Mouse wheel zoom
  mainCanvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomStep = (maxScale - minScale) * 0.05;
    if (e.deltaY < 0) {
      setScale(scale + zoomStep);
    } else {
      setScale(scale - zoomStep);
    }
  }, { passive: false });

  // Zoom slider event
  rngZoom.addEventListener('input', updateZoomFromSlider);

  // Zoom In / Out buttons
  btnZoomIn.addEventListener('click', () => {
    const zoomStep = (maxScale - minScale) * 0.1;
    setScale(scale + zoomStep);
  });

  btnZoomOut.addEventListener('click', () => {
    const zoomStep = (maxScale - minScale) * 0.1;
    setScale(scale - zoomStep);
  });

  // Rotate 90° Clockwise
  btnRotate.addEventListener('click', () => {
    rotation = (rotation + 90) % 360;
    render();
  });

  // Reset Button
  btnReset.addEventListener('click', resetCrop);

  // Apply & Save Cropped Photo
  btnApply.addEventListener('click', () => {
    const exportDim = 360;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportDim;
    exportCanvas.height = exportDim;
    const eCtx = exportCanvas.getContext('2d');
    eCtx.imageSmoothingEnabled = true;
    eCtx.imageSmoothingQuality = 'high';

    // White background
    eCtx.fillStyle = '#ffffff';
    eCtx.fillRect(0, 0, exportDim, exportDim);

    const factor = exportDim / cropDiameter;
    eCtx.save();
    eCtx.translate(exportDim / 2 + panX * factor, exportDim / 2 + panY * factor);
    eCtx.rotate((rotation * Math.PI) / 180);
    eCtx.scale(scale * factor, scale * factor);
    eCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    eCtx.restore();

    // Export as high quality JPEG (360x360)
    const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.90);
    close();
    onApply(croppedDataUrl);
  });
}
