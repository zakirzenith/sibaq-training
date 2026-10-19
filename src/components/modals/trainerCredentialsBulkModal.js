import { excelService } from '../../services/excelService.js';
import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

/**
 * Bulk Trainer Username & Password Update Modal
 * Allows administrators to download an Excel sheet pre-populated with current trainers,
 * change usernames/passwords in bulk, preview changes, and apply them securely.
 */
export function openTrainerCredentialsBulkModal({ onComplete = () => {} }) {
  const existingTrainers = state.getTrainers();

  let parsedData = null;
  let showPasswords = false;

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg" style="max-width: 820px; width: 95%; max-height: 92vh; display: flex; flex-direction: column;">
      
      <!-- Modal Header -->
      <div class="modal-header" style="background: #ffffff; border-bottom: 1.5px solid #e2e8f0; padding: 18px 22px;">
        <div>
          <div class="modal-badge" style="background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; margin-bottom: 4px;">
            ${getIcon('key')} <span>Trainer Security & Access</span>
          </div>
          <h2 class="modal-title" style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.01em;">
            Bulk Update Trainer Usernames & Passwords
          </h2>
          <p class="modal-subtitle" style="font-size: 12.5px; color: #64748b; margin: 4px 0 0 0;">
            Download the pre-filled spreadsheet of existing mentors, enter new credentials, and upload to update in bulk.
          </p>
        </div>
        <button class="modal-close-btn" id="btnModalClose" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body" style="overflow-y: auto; padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc;">
        
        <!-- Step 1: Pre-filled Template Download Banner -->
        <div style="background: #ffffff; border: 1.5px solid #e0e7ff; border-radius: 14px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; box-shadow: 0 1px 3px rgba(99, 102, 241, 0.04);">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 240px; flex: 1;">
            <div style="width: 42px; height: 42px; border-radius: 10px; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
              ${getIcon('fileSpreadsheet')}
            </div>
            <div>
              <strong style="font-size: 13.5px; color: #0f172a; display: block;">1. Download Pre-filled Excel Template</strong>
              <p style="margin: 2px 0 0 0; font-size: 11.5px; color: #64748b;">
                Contains all <strong>${existingTrainers.length} active trainers</strong>, their IDs, and current usernames pre-populated.
              </p>
            </div>
          </div>
          <button type="button" id="btnDownloadCredTemplate" class="btn btn-outline btn-sm" style="font-weight: 700; height: 36px; padding: 0 14px; gap: 6px; border-color: #6366f1; color: #4f46e5; background: #ffffff;">
            ${getIcon('download')} <span>Download Template (.xlsx)</span>
          </button>
        </div>

        <!-- Step 2: Drop Zone -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 18px;">
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.04em;">
            2. Upload Completed Spreadsheet
          </div>
          
          <div id="credDropZone" style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.18s ease; background: #fbfcfe;">
            <input type="file" id="credFileInput" accept=".xlsx, .xls, .csv" style="display: none;" />
            <div style="width: 48px; height: 48px; border-radius: 50%; background: #eef2ff; color: #6366f1; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; font-size: 22px;">
              ${getIcon('upload')}
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
              <strong>Click to browse</strong> or drag & drop updated Excel file
            </div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">
              Accepts .xlsx, .xls, or .csv containing Trainer ID/Name, New Username, and New Password
            </div>
          </div>

          <!-- File Selected Pill (Hidden until chosen) -->
          <div id="credFileBar" style="display: none; align-items: center; justify-content: space-between; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 14px; margin-top: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <span style="color: #4f46e5;">${getIcon('fileSpreadsheet')}</span>
              <span id="credFileName" style="font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">filename.xlsx</span>
              <span id="credFileSize" style="font-size: 11px; color: #64748b;">(0 KB)</span>
            </div>
            <button type="button" id="btnChangeCredFile" class="btn btn-text btn-sm" style="font-size: 11.5px; font-weight: 700; color: #4f46e5;">
              ${getIcon('refresh')} Change File
            </button>
          </div>
        </div>

        <!-- Step 3: Verification & Preview Section (Hidden until parsed) -->
        <div id="credPreviewContainer" style="display: none; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
          
          <!-- Summary Header Strip -->
          <div style="padding: 14px 18px; border-bottom: 1.5px solid #e2e8f0; background: #ffffff; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span id="badgeValidUpdates" class="badge badge-ready" style="font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 6px;">
                0 Ready to Update
              </span>
              <span id="badgeUnchanged" class="badge badge-neutral" style="font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">
                0 Unchanged
              </span>
              <span id="badgeErrors" class="badge badge-attention" style="font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 6px; display: none;">
                0 Issues
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <button type="button" id="btnToggleShowPasswords" class="btn btn-sm btn-outline" style="height: 28px; padding: 0 10px; font-size: 11px; font-weight: 700; gap: 4px; border-color: #cbd5e1;">
                ${getIcon('eye')} <span id="lblTogglePwd">Show Passwords</span>
              </button>
            </div>
          </div>

          <!-- Preview Table -->
          <div style="max-height: 280px; overflow-y: auto;">
            <table class="saas-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-size: 10.5px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; position: sticky; top: 0; z-index: 10;">
                  <th style="padding: 9px 14px; width: 45px;">#</th>
                  <th style="padding: 9px 14px; width: 130px;">Status</th>
                  <th style="padding: 9px 14px; min-width: 180px;">Trainer Name</th>
                  <th style="padding: 9px 14px; min-width: 190px;">Username Update</th>
                  <th style="padding: 9px 14px; width: 140px;">New Password</th>
                  <th style="padding: 9px 14px; min-width: 160px;">Details</th>
                </tr>
              </thead>
              <tbody id="credPreviewTableBody">
                <!-- Dynamically rendered rows -->
              </tbody>
            </table>
          </div>

        </div>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="background: #ffffff; border-top: 1.5px solid #e2e8f0; padding: 14px 22px; display: flex; justify-content: space-between; align-items: center;">
        <span id="credFooterNote" style="font-size: 12px; color: #64748b;">
          Download template or select file to begin.
        </span>
        <div style="display: flex; gap: 10px;">
          <button type="button" id="btnCancelModal" class="btn btn-secondary btn-sm" style="font-weight: 700; height: 36px; padding: 0 16px;">
            Cancel
          </button>
          <button type="button" id="btnApplyCredentials" class="btn btn-primary btn-sm" disabled style="font-weight: 800; height: 36px; padding: 0 18px; gap: 6px;">
            ${getIcon('check')} <span id="lblApplyBtn">Apply Updates</span>
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
  };

  overlay.querySelector('#btnModalClose').addEventListener('click', closeModal);
  overlay.querySelector('#btnCancelModal').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  // 1. Download Template Button
  overlay.querySelector('#btnDownloadCredTemplate').addEventListener('click', () => {
    excelService.downloadTrainersCredentialsTemplate(existingTrainers);
    toast.info('Downloaded pre-filled trainer credentials template.');
  });

  // 2. Drop Zone & File Selection
  const dropZone = overlay.querySelector('#credDropZone');
  const fileInput = overlay.querySelector('#credFileInput');
  const fileBar = overlay.querySelector('#credFileBar');
  const fileNameEl = overlay.querySelector('#credFileName');
  const fileSizeEl = overlay.querySelector('#credFileSize');
  const btnChangeFile = overlay.querySelector('#btnChangeCredFile');

  dropZone.addEventListener('click', () => fileInput.click());
  btnChangeFile.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.style.borderColor = '#4f46e5';
    dropZone.style.background = '#eef2ff';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#cbd5e1';
    dropZone.style.background = '#fbfcfe';
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.style.borderColor = '#cbd5e1';
    dropZone.style.background = '#fbfcfe';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Handle parsing selected file
  async function handleFileSelected(file) {
    if (!file) return;

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
    fileBar.style.display = 'flex';
    dropZone.style.display = 'none';

    try {
      toast.info('Parsing credentials spreadsheet...');
      parsedData = await excelService.parseTrainersCredentialsFile(file, existingTrainers);
      renderPreviewTable();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to read Excel file.');
      dropZone.style.display = 'block';
      fileBar.style.display = 'none';
      overlay.querySelector('#credPreviewContainer').style.display = 'none';
    }
  }

  // Toggle show/hide passwords
  overlay.querySelector('#btnToggleShowPasswords').addEventListener('click', () => {
    showPasswords = !showPasswords;
    overlay.querySelector('#lblTogglePwd').textContent = showPasswords ? 'Hide Passwords' : 'Show Passwords';
    renderPreviewTable();
  });

  // Render Table of Parsed Rows
  function renderPreviewTable() {
    if (!parsedData) return;

    const { allRows, validRows, unchangedRows, errorRows } = parsedData;
    const previewContainer = overlay.querySelector('#credPreviewContainer');
    const tbody = overlay.querySelector('#credPreviewTableBody');
    const badgeValid = overlay.querySelector('#badgeValidUpdates');
    const badgeUnchanged = overlay.querySelector('#badgeUnchanged');
    const badgeErrors = overlay.querySelector('#badgeErrors');
    const btnApply = overlay.querySelector('#btnApplyCredentials');
    const lblApplyBtn = overlay.querySelector('#lblApplyBtn');
    const footerNote = overlay.querySelector('#credFooterNote');

    previewContainer.style.display = 'block';

    badgeValid.textContent = `${validRows.length} Ready to Update`;
    badgeUnchanged.textContent = `${unchangedRows.length} Unchanged`;

    if (errorRows.length > 0) {
      badgeErrors.style.display = 'inline-flex';
      badgeErrors.textContent = `${errorRows.length} Issues`;
    } else {
      badgeErrors.style.display = 'none';
    }

    if (validRows.length > 0) {
      btnApply.disabled = false;
      lblApplyBtn.textContent = `Apply Updates (${validRows.length} Trainers)`;
      footerNote.innerHTML = `<strong style="color: #047857;">${validRows.length} trainers</strong> ready for credential update.`;
    } else {
      btnApply.disabled = true;
      lblApplyBtn.textContent = 'No Changes to Apply';
      footerNote.textContent = errorRows.length > 0 
        ? 'Please fix spreadsheet issues before applying.'
        : 'All records in spreadsheet match current credentials without changes.';
    }

    tbody.innerHTML = allRows.map((r, i) => {
      let statusBadge = '';
      let rowBg = '#ffffff';

      if (r.status === 'valid') {
        statusBadge = `<span class="badge badge-ready" style="font-size: 10.5px; font-weight: 700; padding: 2px 7px;">Ready</span>`;
        rowBg = '#f0fdf4';
      } else if (r.status === 'unchanged') {
        statusBadge = `<span class="badge badge-neutral" style="font-size: 10.5px; font-weight: 700; padding: 2px 7px;">Unchanged</span>`;
        rowBg = '#ffffff';
      } else {
        statusBadge = `<span class="badge badge-attention" style="font-size: 10.5px; font-weight: 700; padding: 2px 7px;">Error</span>`;
        rowBg = '#fef2f2';
      }

      const displayPassword = r.newPassword
        ? (showPasswords ? `<code style="font-weight: 700; color: #047857; background: #e6f9ed; padding: 2px 6px; border-radius: 4px;">${r.newPassword}</code>` : `<span style="font-family: monospace; letter-spacing: 2px; color: #047857;">••••••••</span>`)
        : `<span style="color: #94a3b8; font-style: italic;">Keeps current</span>`;

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; background: ${rowBg};">
          <td style="padding: 9px 14px; font-weight: 700; color: #64748b;">${r.rowIndex}</td>
          <td style="padding: 9px 14px;">${statusBadge}</td>
          <td style="padding: 9px 14px;">
            <strong style="color: #0f172a; font-size: 13px;">${r.trainerName}</strong>
            ${r.trainer ? `<div style="font-size: 11px; color: #64748b;">${r.trainer.expertise || 'Specialized Mentor'}</div>` : ''}
          </td>
          <td style="padding: 9px 14px;">
            ${r.usernameChanged ? `
              <div style="display: flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11.5px;">
                <span style="color: #94a3b8; text-decoration: line-through;">@${r.oldUsername}</span>
                <span style="color: #4f46e5; font-weight: 800;">&rarr;</span>
                <span style="color: #4338ca; font-weight: 800; background: #e0e7ff; padding: 1.5px 6px; border-radius: 4px;">@${r.newUsername}</span>
              </div>
            ` : `
              <span style="font-family: ui-monospace, monospace; color: #334155; font-size: 11.5px;">@${r.oldUsername}</span>
            `}
          </td>
          <td style="padding: 9px 14px;">
            ${displayPassword}
          </td>
          <td style="padding: 9px 14px;">
            <span style="font-size: 11.5px; color: ${r.status === 'error' ? '#dc2626' : (r.status === 'valid' ? '#15803d' : '#64748b')}; font-weight: 600;">
              ${r.message}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Apply Changes Execution
  overlay.querySelector('#btnApplyCredentials').addEventListener('click', () => {
    if (!parsedData || parsedData.validRows.length === 0) return;

    const { validRows } = parsedData;
    let successCount = 0;

    validRows.forEach(r => {
      const updatePayload = {};
      if (r.usernameChanged) {
        updatePayload.username = r.newUsername;
      }
      if (r.passwordChanged && r.newPassword) {
        updatePayload.password = r.newPassword;
      }

      if (Object.keys(updatePayload).length > 0) {
        const updated = state.updateTrainer(r.trainerId, updatePayload);
        if (updated) successCount++;
      }
    });

    toast.success(`Successfully updated credentials for ${successCount} trainers!`);
    closeModal();
    onComplete();
  });
}
