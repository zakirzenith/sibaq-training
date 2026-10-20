import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

/**
 * Bulk Photo Upload Modal
 * Allows controllers to upload multiple candidate photos named after Admission Numbers
 * (e.g., 909.jpg, 104.png, AD-801.jpeg).
 * Automatically detects candidate by AD number, optimizes/compresses images to 360x360 avatars,
 * and updates candidate profiles in bulk across the entire application.
 * 
 * @param {Object} options
 * @param {Function} [options.onComplete] - Callback after photos are successfully applied
 */
export function openBulkPhotoUploadModal({ onComplete = () => {} } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop bulk-photo-modal-backdrop';

  // Array of processed items:
  // { id, file, fileName, detectedKey, previewUrl, candidate, isMatched }
  let processedItems = [];
  let isProcessing = false;
  let activeTab = 'all'; // 'all', 'matched', 'unmatched'

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg bulk-photo-dialog" style="max-width: 820px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
      
      <!-- Modal Header -->
      <div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding: 16px 20px; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #eef2ff, #e0e7ff); color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; box-shadow: 0 1px 3px rgba(79, 70, 229, 0.15);">
            ${getIcon('camera') || getIcon('image') || getIcon('upload')}
          </div>
          <div>
            <div class="modal-badge" style="background: #eef2ff; color: #4338ca; font-weight: 700;">Controller Administration</div>
            <h2 class="modal-title" style="font-size: 18px; margin: 2px 0 0 0; color: #0f172a;">Bulk Upload Candidate Photos</h2>
          </div>
        </div>
        <button class="modal-close-btn" id="btnBulkPhotoClose" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="modal-body" style="overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc; flex: 1;">
        
        <!-- Instruction Banner -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start;">
          <div style="color: #3b82f6; font-size: 18px; flex-shrink: 0; margin-top: 1px;">
            ${getIcon('info') || '💡'}
          </div>
          <div style="font-size: 12.5px; color: #475569; line-height: 1.5;">
            <strong style="color: #0f172a;">Automatic Candidate Detection:</strong>
            Name photo files with the student's Admission No (e.g. <code>909.jpg</code>, <code>104.png</code>, or <code>AD-801.webp</code>). 
            Select all photos at once. The system will automatically detect the student, optimize the avatar, and apply it across all reports, dossiers, and portals.
          </div>
        </div>

        <!-- Interactive Drag & Drop Upload Zone -->
        <div id="bulkPhotoDropzone" class="bulk-photo-dropzone" style="border: 2px dashed #cbd5e1; border-radius: 14px; background: #ffffff; padding: 26px 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
          <input type="file" id="inpBulkPhotoFiles" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" style="display: none;" />
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; color: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 22px;">
            ${getIcon('upload')}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #1e293b;">
            Click to select photos or drag & drop files here
          </div>
          <div style="font-size: 12px; color: #64748b;">
            JPG, PNG, WebP, GIF &bull; Select multiple files at once
          </div>
          <button type="button" class="btn btn-sm btn-outline" id="btnBrowseFiles" style="margin-top: 4px; font-size: 12px; font-weight: 700; border-radius: 8px; pointer-events: none;">
            ${getIcon('image') || getIcon('plus')} Browse Photos
          </button>
        </div>

        <!-- Processing Progress Bar -->
        <div id="bulkProcessingWrap" style="display: none; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; font-weight: 700; color: #334155;">
            <span id="bulkProgressText">Reading &amp; optimizing photos...</span>
            <span id="bulkProgressPct" style="color: #4f46e5;">0%</span>
          </div>
          <div style="width: 100%; height: 7px; background: #f1f5f9; border-radius: 999px; overflow: hidden;">
            <div id="bulkProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); border-radius: 999px; transition: width 0.15s ease;"></div>
          </div>
        </div>

        <!-- Match Overview & Roster Tray (Appears after photos loaded) -->
        <div id="bulkMatchContainer" style="display: none; flex-direction: column; gap: 12px;">
          <!-- Stats Bar & Tab Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button type="button" class="btn-bulk-tab active" data-tab="all" style="padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid #cbd5e1; background: #0f172a; color: #ffffff; cursor: pointer;">
                All (<span id="countAll">0</span>)
              </button>
              <button type="button" class="btn-bulk-tab" data-tab="matched" style="padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; cursor: pointer;">
                ✓ Matched (<span id="countMatched">0</span>)
              </button>
              <button type="button" class="btn-bulk-tab" data-tab="unmatched" style="padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; cursor: pointer;">
                ⚠ Unmatched (<span id="countUnmatched">0</span>)
              </button>
            </div>

            <div style="display: flex; gap: 6px; align-items: center;">
              <button type="button" id="btnClearProcessed" class="btn btn-sm btn-outline text-danger" style="font-size: 11.5px; height: 30px; padding: 0 10px; border-color: #fecaca; background: #fff;">
                ${getIcon('trash')} Clear All
              </button>
              <button type="button" id="btnAddMorePhotos" class="btn btn-sm btn-outline" style="font-size: 11.5px; height: 30px; padding: 0 10px; border-color: #cbd5e1; background: #fff;">
                ${getIcon('plus')} Add More
              </button>
            </div>
          </div>

          <!-- Cards Roster Grid -->
          <div id="bulkPhotosGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; max-height: 380px; overflow-y: auto; padding-right: 4px;">
            <!-- Rendered dynamically -->
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="border-top: 1px solid #e2e8f0; padding: 14px 20px; background: #ffffff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="font-size: 12px; color: #64748b;">
          <span id="footerSummary">No photos selected yet.</span>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button type="button" class="btn btn-secondary" id="btnCancelBulkPhoto" style="font-weight: 600; font-size: 13px; height: 38px; border-radius: 8px;">
            Cancel
          </button>
          <button type="button" class="btn-saas-primary" id="btnApplyBulkPhotos" disabled style="font-weight: 700; font-size: 13px; height: 38px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; padding: 0 18px;">
            ${getIcon('checkCircle')} <span id="btnApplyText">Apply 0 Photos</span>
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // DOM Elements
  const dropzone = overlay.querySelector('#bulkPhotoDropzone');
  const inpFiles = overlay.querySelector('#inpBulkPhotoFiles');
  const progressWrap = overlay.querySelector('#bulkProcessingWrap');
  const progressBar = overlay.querySelector('#bulkProgressBar');
  const progressText = overlay.querySelector('#bulkProgressText');
  const progressPct = overlay.querySelector('#bulkProgressPct');
  const matchContainer = overlay.querySelector('#bulkMatchContainer');
  const photosGrid = overlay.querySelector('#bulkPhotosGrid');
  const btnApply = overlay.querySelector('#btnApplyBulkPhotos');
  const btnApplyText = overlay.querySelector('#btnApplyText');
  const footerSummary = overlay.querySelector('#footerSummary');
  const countAll = overlay.querySelector('#countAll');
  const countMatched = overlay.querySelector('#countMatched');
  const countUnmatched = overlay.querySelector('#countUnmatched');
  const btnClear = overlay.querySelector('#btnClearProcessed');
  const btnAddMore = overlay.querySelector('#btnAddMorePhotos');
  const tabButtons = overlay.querySelectorAll('.btn-bulk-tab');

  const close = () => {
    overlay.remove();
  };

  overlay.querySelector('#btnBulkPhotoClose').onclick = close;
  overlay.querySelector('#btnCancelBulkPhoto').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  // Drag and drop events
  dropzone.onclick = () => {
    if (!isProcessing) inpFiles.click();
  };

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = '#4f46e5';
      dropzone.style.background = '#eef2ff';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = '#cbd5e1';
      dropzone.style.background = '#ffffff';
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt && dt.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  });

  inpFiles.onchange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
      inpFiles.value = ''; // Reset for re-selection
    }
  };

  btnAddMore.onclick = () => {
    if (!isProcessing) inpFiles.click();
  };

  btnClear.onclick = () => {
    processedItems = [];
    renderCards();
    updateUiState();
  };

  // Tab switcher
  tabButtons.forEach(btn => {
    btn.onclick = () => {
      tabButtons.forEach(b => {
        b.style.background = b.getAttribute('data-tab') === 'matched' ? '#f0fdf4' : (b.getAttribute('data-tab') === 'unmatched' ? '#fef2f2' : '#ffffff');
        b.style.color = b.getAttribute('data-tab') === 'matched' ? '#166534' : (b.getAttribute('data-tab') === 'unmatched' ? '#991b1b' : '#334155');
        b.style.borderColor = '#cbd5e1';
      });
      btn.style.background = '#0f172a';
      btn.style.color = '#ffffff';
      btn.style.borderColor = '#0f172a';
      activeTab = btn.getAttribute('data-tab');
      renderCards();
    };
  });

  // Apply button
  btnApply.onclick = () => {
    const matchedItems = processedItems.filter(item => item.isMatched && item.candidate);
    if (matchedItems.length === 0) {
      toast.error('No matched candidate photos to apply.');
      return;
    }

    const photoMatches = matchedItems.map(item => ({
      candidateId: item.candidate.id,
      photo: item.previewUrl
    }));

    const result = state.bulkUpdateCandidatePhotos(photoMatches);
    toast.success(`Successfully applied ${result.updatedCount} candidate profile photos!`);
    close();
    onComplete();
  };

  // ========================================================
  // PROCESS UPLOADED IMAGE FILES (AUTO COMPRESS & MATCH)
  // ========================================================
  async function handleFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('No valid image files found. Please upload JPG, PNG, or WebP images.');
      return;
    }

    isProcessing = true;
    progressWrap.style.display = 'block';
    dropzone.style.display = 'none';

    let doneCount = 0;
    const total = imageFiles.length;

    for (const file of imageFiles) {
      doneCount++;
      const pct = Math.round((doneCount / total) * 100);
      progressPct.textContent = `${pct}%`;
      progressBar.style.width = `${pct}%`;
      progressText.textContent = `Optimizing photo ${doneCount} of ${total}: ${file.name}`;

      try {
        const optimizedDataUrl = await readAndCompressImage(file, 360, 360, 0.85);
        const matchResult = matchCandidateByFileName(file.name);

        processedItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          file,
          fileName: file.name,
          detectedKey: matchResult.detectedKey,
          previewUrl: optimizedDataUrl,
          candidate: matchResult.candidate,
          isMatched: Boolean(matchResult.candidate)
        });
      } catch (err) {
        console.warn(`Failed to process image ${file.name}:`, err);
      }
    }

    isProcessing = false;
    progressWrap.style.display = 'none';
    matchContainer.style.display = 'flex';

    updateUiState();
    renderCards();

    const matchedCount = processedItems.filter(i => i.isMatched).length;
    toast.info(`Processed ${imageFiles.length} photos: ${matchedCount} matched automatically.`);
  }

  // ========================================================
  // CANDIDATE MATCHING ENGINE BY FILENAME
  // ========================================================
  function matchCandidateByFileName(fileName) {
    // 1. Remove extension
    const dotIdx = fileName.lastIndexOf('.');
    let base = dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName;
    base = base.trim();

    // 2. Normalize key: remove surrounding brackets, prefixes
    const cleanKey = base.trim();
    const candidates = state.getCandidates();

    // Strategy A: Exact Admission Number match (case-insensitive)
    let matched = candidates.find(c => String(c.adNo || '').trim().toLowerCase() === cleanKey.toLowerCase());
    if (matched) return { detectedKey: cleanKey, candidate: matched };

    // Strategy B: Exact Chest Number match
    matched = candidates.find(c => String(c.chestNo || '').trim().toLowerCase() === cleanKey.toLowerCase());
    if (matched) return { detectedKey: cleanKey, candidate: matched };

    // Strategy C: Digits extraction match
    // E.g. "AD-909" or "ad_909" or "cand-909" or "909 photo" -> "909"
    const digitsMatch = cleanKey.match(/\d+/g);
    if (digitsMatch) {
      const numericKey = digitsMatch.join('');
      matched = candidates.find(c => {
        const candDigits = String(c.adNo || '').match(/\d+/g)?.join('');
        if (candDigits && candDigits === numericKey) return true;
        const chestDigits = String(c.chestNo || '').match(/\d+/g)?.join('');
        if (chestDigits && chestDigits === numericKey) return true;
        return false;
      });
      if (matched) return { detectedKey: numericKey, candidate: matched };
    }

    // Strategy D: Exact Name match
    matched = candidates.find(c => c.name.toLowerCase() === cleanKey.toLowerCase());
    if (matched) return { detectedKey: cleanKey, candidate: matched };

    // Strategy E: Candidate ID match
    matched = candidates.find(c => c.id.toLowerCase() === cleanKey.toLowerCase());
    if (matched) return { detectedKey: cleanKey, candidate: matched };

    return { detectedKey: cleanKey, candidate: null };
  }

  // ========================================================
  // COMPRESSION & SQUARE HEADSHOT CROPPING VIA CANVAS
  // ========================================================
  function readAndCompressImage(file, targetWidth = 360, targetHeight = 360, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          // Center crop to square aspect ratio
          const srcW = img.width;
          const srcH = img.height;
          const minDim = Math.min(srcW, srcH);
          const startX = (srcW - minDim) / 2;
          const startY = (srcH - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ========================================================
  // RENDER CARDS GRID
  // ========================================================
  function renderCards() {
    photosGrid.innerHTML = '';

    const itemsToDisplay = processedItems.filter(item => {
      if (activeTab === 'matched') return item.isMatched;
      if (activeTab === 'unmatched') return !item.isMatched;
      return true;
    });

    if (itemsToDisplay.length === 0) {
      photosGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 32px 16px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 12px;">
          <div style="font-size: 24px; margin-bottom: 6px;">📷</div>
          <div style="font-size: 13px; font-weight: 700; color: #334155;">No photos in this filter</div>
          <div style="font-size: 11.5px; color: #64748b;">Switch tabs or upload more photos.</div>
        </div>
      `;
      return;
    }

    const allCandidates = state.getCandidates();

    itemsToDisplay.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bulk-card-item';
      card.style.cssText = `
        background: #ffffff;
        border: 1.5px solid ${item.isMatched ? '#bbf7d0' : '#fed7aa'};
        border-radius: 12px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        position: relative;
      `;

      card.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
          <div style="width: 58px; height: 58px; border-radius: 10px; overflow: hidden; background: #f1f5f9; flex-shrink: 0; border: 1px solid #e2e8f0;">
            <img src="${item.previewUrl}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>

          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 11px; font-mono; color: #64748b; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${item.fileName}">
              ${item.fileName}
            </div>

            ${item.isMatched && item.candidate ? `
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; margin-top: 1px;">
                ${item.candidate.name}
              </div>
              <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #475569; margin-top: 2px;">
                <span class="badge badge-primary-subtle" style="font-weight: 700; font-size: 10px; padding: 1px 5px;">AD: ${item.candidate.adNo}</span>
                <span>&bull;</span>
                <span>${item.candidate.category || 'General'}</span>
              </div>
            ` : `
              <div style="font-size: 12px; font-weight: 700; color: #c2410c; margin-top: 2px;">
                No Match for "${item.detectedKey}"
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
                Select student manually below:
              </div>
            `}
          </div>

          <button type="button" class="btn-remove-item saas-circle-btn text-danger" title="Remove this photo" style="width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; flex-shrink: 0;">
            ${getIcon('x')}
          </button>
        </div>

        <!-- Manual Candidate Selector (For Unmatched or Reassigning) -->
        <div style="border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 2px;">
          ${item.isMatched ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 10.5px; font-weight: 700; color: #166534; display: flex; align-items: center; gap: 4px;">
                ${getIcon('checkCircle')} Ready to update
              </span>
              <button type="button" class="btn-toggle-reassign" style="background: none; border: none; padding: 0; font-size: 11px; color: #4f46e5; font-weight: 600; cursor: pointer;">
                Change Candidate
              </button>
            </div>
            <select class="sel-reassign-candidate form-select" style="display: none; height: 28px; font-size: 11px; margin-top: 4px; padding: 2px 6px;">
              <option value="">-- Choose Candidate --</option>
              ${allCandidates.map(c => `
                <option value="${c.id}" ${item.candidate && item.candidate.id === c.id ? 'selected' : ''}>
                  [AD: ${c.adNo}] ${c.name} (${c.category})
                </option>
              `).join('')}
            </select>
          ` : `
            <select class="sel-manual-candidate form-select" style="height: 28px; font-size: 11px; padding: 2px 6px; width: 100%; border-color: #fdba74;">
              <option value="">-- Assign to Candidate --</option>
              ${allCandidates.map(c => `
                <option value="${c.id}">
                  [AD: ${c.adNo}] ${c.name} (${c.category})
                </option>
              `).join('')}
            </select>
          `}
        </div>
      `;

      // Remove photo handler
      card.querySelector('.btn-remove-item').onclick = () => {
        processedItems = processedItems.filter(i => i.id !== item.id);
        updateUiState();
        renderCards();
      };

      // Toggle reassign dropdown
      const btnToggle = card.querySelector('.btn-toggle-reassign');
      const selReassign = card.querySelector('.sel-reassign-candidate');
      if (btnToggle && selReassign) {
        btnToggle.onclick = () => {
          const isShown = selReassign.style.display !== 'none';
          selReassign.style.display = isShown ? 'none' : 'block';
          btnToggle.textContent = isShown ? 'Change Candidate' : 'Cancel';
        };

        selReassign.onchange = (e) => {
          const selectedCid = e.target.value;
          if (selectedCid) {
            const cand = state.getCandidateById(selectedCid);
            if (cand) {
              item.candidate = cand;
              item.isMatched = true;
              updateUiState();
              renderCards();
            }
          }
        };
      }

      // Manual assign dropdown
      const selManual = card.querySelector('.sel-manual-candidate');
      if (selManual) {
        selManual.onchange = (e) => {
          const selectedCid = e.target.value;
          if (selectedCid) {
            const cand = state.getCandidateById(selectedCid);
            if (cand) {
              item.candidate = cand;
              item.isMatched = true;
              updateUiState();
              renderCards();
            }
          }
        };
      }

      photosGrid.appendChild(card);
    });
  }

  // ========================================================
  // UI COUNTS & STATE SYNC
  // ========================================================
  function updateUiState() {
    const total = processedItems.length;
    const matched = processedItems.filter(i => i.isMatched).length;
    const unmatched = total - matched;

    countAll.textContent = `${total}`;
    countMatched.textContent = `${matched}`;
    countUnmatched.textContent = `${unmatched}`;

    if (total === 0) {
      matchContainer.style.display = 'none';
      dropzone.style.display = 'flex';
      btnApply.disabled = true;
      btnApplyText.textContent = 'Apply 0 Photos';
      footerSummary.textContent = 'No photos selected yet.';
    } else {
      matchContainer.style.display = 'flex';
      btnApply.disabled = matched === 0;
      btnApplyText.textContent = `Apply ${matched} Profile Photo${matched === 1 ? '' : 's'}`;
      footerSummary.innerHTML = `
        <strong>${matched}</strong> candidate photo${matched === 1 ? '' : 's'} matched and ready to save.
        ${unmatched > 0 ? `<span style="color: #ea580c; font-weight: 600;">(${unmatched} unmatched)</span>` : ''}
      `;
    }
  }
}
