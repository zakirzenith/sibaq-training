import { excelService } from '../../services/excelService.js';
import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

export function openExcelUploadModal({ type = 'candidates', onComplete = () => {} }) {
  // type can be 'candidates', 'programs', or 'trainers'
  const isCandidates = type === 'candidates';
  const isTrainers = type === 'trainers';
  const isPrograms = type === 'programs';

  let title = 'Bulk Upload Candidates';
  let subtitle = 'Upload an Excel (.xlsx, .xls) or CSV file with Admission No, Name, Category, and Class.';
  let badgeName = 'Candidates Registry';

  if (isPrograms) {
    title = 'Bulk Upload Programs';
    subtitle = 'Upload an Excel (.xlsx, .xls) or CSV file with Program Code, Program Name, Category, and Stage Type.';
    badgeName = 'Programs Roster';
  } else if (isTrainers) {
    title = 'Bulk Upload Trainers';
    subtitle = 'Upload an Excel (.xlsx, .xls) or CSV file with Trainer Name, Expertise / Field, and Experience.';
    badgeName = 'Trainers Directory';
  }

  let parsedRows = [];
  let selectedFile = null;

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-header">
        <div>
          <div class="modal-badge">${badgeName}</div>
          <h2 class="modal-title">${title}</h2>
          <p class="modal-subtitle">${subtitle}</p>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body">
        <!-- Template Download Banner -->
        <div class="template-callout">
          <div class="template-callout-info">
            <span class="template-icon">${getIcon('fileSpreadsheet')}</span>
            <div>
              <strong>Need a standard spreadsheet template?</strong>
              <p>Download our pre-formatted template with all required columns and sample rows.</p>
            </div>
          </div>
          <button id="btnDownloadTemplate" class="btn btn-outline btn-sm">
            ${getIcon('download')} Download ${isCandidates ? 'Candidates' : isTrainers ? 'Trainers' : 'Programs'} Template (.xlsx)
          </button>
        </div>

        <!-- Drop Zone -->
        <div id="dropZone" class="file-drop-zone">
          <input type="file" id="excelFileInput" accept=".xlsx, .xls, .csv" class="file-input-hidden" />
          <div class="drop-zone-icon">${getIcon('upload')}</div>
          <div class="drop-zone-text">
            <strong>Click to browse</strong> or drag & drop spreadsheet here
          </div>
          <div class="drop-zone-hint">Supports .xlsx, .xls, and .csv formats</div>
        </div>

        <!-- File preview bar (hidden until file chosen) -->
        <div id="fileSelectedBar" class="file-selected-bar hidden">
          <div class="file-info">
            <span class="file-icon">${getIcon('fileSpreadsheet')}</span>
            <div>
              <div id="fileName" class="file-name">filename.xlsx</div>
              <div id="fileSize" class="file-size">0 KB</div>
            </div>
          </div>
          <button id="btnChangeFile" class="btn btn-text btn-sm">${getIcon('refresh')} Change</button>
        </div>

        <!-- Preview Results Container (hidden initially) -->
        <div id="previewContainer" class="preview-container hidden">
          <div class="preview-header">
            <div class="preview-counts">
              <span id="validCountBadge" class="badge badge-success">0 Valid</span>
              <span id="invalidCountBadge" class="badge badge-danger">0 Issues</span>
              <span id="totalCountText" class="text-muted">Total 0 records found</span>
            </div>
            <label class="checkbox-label">
              <input type="checkbox" id="chkOverwrite" checked />
              <span>Update existing records if matching identifier found</span>
            </label>
          </div>

          <div class="preview-table-wrapper">
            <table class="data-table preview-table">
              <thead>
                ${
                  isCandidates
                    ? `<tr>
                        <th>Status</th>
                        <th>Row</th>
                        <th>Admission No</th>
                        <th>Candidate Name</th>
                        <th>Category</th>
                        <th>Class</th>
                      </tr>`
                    : isTrainers
                    ? `<tr>
                        <th>Status</th>
                        <th>Row</th>
                        <th>Trainer Name</th>
                        <th>Expertise / Department</th>
                        <th>Experience</th>
                      </tr>`
                    : `<tr>
                        <th>Status</th>
                        <th>Row</th>
                        <th>Program Code</th>
                        <th>Program Name</th>
                        <th>Category</th>
                        <th>Stage Type (Click to Toggle)</th>
                      </tr>`
                }
              </thead>
              <tbody id="previewTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button id="btnCancel" class="btn btn-secondary">Cancel</button>
        <button id="btnConfirmImport" class="btn btn-primary" disabled>
          ${getIcon('check')} Import Records
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus trap / ESC handling
  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#btnCancel').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  const dropZone = overlay.querySelector('#dropZone');
  const fileInput = overlay.querySelector('#excelFileInput');
  const fileSelectedBar = overlay.querySelector('#fileSelectedBar');
  const fileNameEl = overlay.querySelector('#fileName');
  const fileSizeEl = overlay.querySelector('#fileSize');
  const previewContainer = overlay.querySelector('#previewContainer');
  const previewTableBody = overlay.querySelector('#previewTableBody');
  const validCountBadge = overlay.querySelector('#validCountBadge');
  const invalidCountBadge = overlay.querySelector('#invalidCountBadge');
  const totalCountText = overlay.querySelector('#totalCountText');
  const btnConfirmImport = overlay.querySelector('#btnConfirmImport');
  const chkOverwrite = overlay.querySelector('#chkOverwrite');

  // Template download
  overlay.querySelector('#btnDownloadTemplate').addEventListener('click', () => {
    if (isCandidates) {
      excelService.downloadCandidatesTemplate();
      toast.info('Downloading sample candidates Excel template...');
    } else if (isTrainers) {
      excelService.downloadTrainersTemplate();
      toast.info('Downloading sample trainers Excel template...');
    } else {
      excelService.downloadProgramsTemplate();
      toast.info('Downloading sample programs Excel template...');
    }
  });

  // Dropzone events
  dropZone.addEventListener('click', () => fileInput.click());
  overlay.querySelector('#btnChangeFile').addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, e => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, e => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
    });
  });

  dropZone.addEventListener('drop', e => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  async function handleFileSelected(file) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.');
      return;
    }

    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    dropZone.classList.add('hidden');
    fileSelectedBar.classList.remove('hidden');

    try {
      if (isCandidates) {
        parsedRows = await excelService.parseCandidatesFile(file);
      } else if (isTrainers) {
        parsedRows = await excelService.parseTrainersFile(file);
      } else {
        parsedRows = await excelService.parseProgramsFile(file);
      }

      renderPreview(parsedRows);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to read spreadsheet.');
      dropZone.classList.remove('hidden');
      fileSelectedBar.classList.add('hidden');
      previewContainer.classList.add('hidden');
      btnConfirmImport.disabled = true;
    }
  }

  function renderPreview(rows) {
    previewContainer.classList.remove('hidden');
    previewTableBody.innerHTML = '';

    const validRows = rows.filter(r => r.isValid);
    const invalidRows = rows.filter(r => !r.isValid);

    validCountBadge.textContent = `${validRows.length} Valid`;
    invalidCountBadge.textContent = `${invalidRows.length} Issues`;
    invalidCountBadge.style.display = invalidRows.length ? 'inline-flex' : 'none';
    totalCountText.textContent = `Total ${rows.length} rows detected`;

    if (validRows.length > 0) {
      btnConfirmImport.disabled = false;
      btnConfirmImport.innerHTML = `${getIcon('check')} Import ${validRows.length} ${
        isCandidates ? 'Candidates' : isTrainers ? 'Trainers' : 'Programs'
      }`;
    } else {
      btnConfirmImport.disabled = true;
      btnConfirmImport.innerHTML = `${getIcon('x')} No Valid Records`;
    }

    // Render preview slice (first 30 rows for smooth UI)
    const displayRows = rows.slice(0, 30);
    displayRows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      if (!row.isValid) tr.className = 'row-error';

      if (isCandidates) {
        tr.innerHTML = `
          <td>
            ${
              row.isValid
                ? `<span class="badge badge-success-subtle">${getIcon('check')} Valid</span>`
                : `<span class="badge badge-danger-subtle" title="${row.error}">${getIcon('x')} Invalid</span>`
            }
          </td>
          <td>${row.rowNumber}</td>
          <td><strong>${row.adNo || '-'}</strong></td>
          <td>${row.name || '-'}</td>
          <td><span class="badge badge-neutral">${row.category}</span></td>
          <td>${row.class || '-'}</td>
        `;
      } else if (isTrainers) {
        tr.innerHTML = `
          <td>
            ${
              row.isValid
                ? `<span class="badge badge-success-subtle">${getIcon('check')} Valid</span>`
                : `<span class="badge badge-danger-subtle" title="${row.error}">${getIcon('x')} Invalid</span>`
            }
          </td>
          <td>${row.rowNumber}</td>
          <td><strong>${row.name || '-'}</strong></td>
          <td><span class="badge badge-primary-subtle">${row.expertise}</span></td>
          <td>${row.experience || '-'}</td>
        `;
      } else {
        tr.innerHTML = `
          <td>
            ${
              row.isValid
                ? `<span class="badge badge-success-subtle">${getIcon('check')} Valid</span>`
                : `<span class="badge badge-danger-subtle" title="${row.error}">${getIcon('x')} Invalid</span>`
            }
          </td>
          <td>${row.rowNumber}</td>
          <td><code>${row.code || '-'}</code></td>
          <td><strong>${row.name || '-'}</strong></td>
          <td><span class="badge badge-neutral">${row.category}</span></td>
          <td>
            <button type="button" class="btn-toggle-preview-type badge ${row.type === 'Stage' ? 'badge-stage' : 'badge-nonstage'}" data-idx="${idx}" title="Click to toggle between Stage and Non-Stage" style="cursor: pointer; border: none;">
              ${row.type === 'Stage' ? getIcon('stage') : getIcon('nonStage')} ${row.type} ⇄
            </button>
          </td>
        `;

        const toggleBtn = tr.querySelector('.btn-toggle-preview-type');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            row.type = row.type === 'Stage' ? 'Non-Stage' : 'Stage';
            renderPreview(rows);
          });
        }
      }
      previewTableBody.appendChild(tr);
    });

    if (rows.length > 30) {
      const extraTr = document.createElement('tr');
      extraTr.innerHTML = `<td colspan="6" class="text-center text-muted py-2">
        ... and ${rows.length - 30} more rows ready to be imported.
      </td>`;
      previewTableBody.appendChild(extraTr);
    }
  }

  // Confirm import
  btnConfirmImport.addEventListener('click', () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (!validRows.length) return;

    const overwrite = chkOverwrite.checked;

    if (isCandidates) {
      const res = state.addCandidatesBulk(validRows, overwrite);
      toast.success(
        `Bulk import complete! Added: ${res.addedCount}, Updated: ${res.updatedCount}, Skipped: ${res.skippedCount}`
      );
    } else if (isTrainers) {
      const res = state.addTrainersBulk(validRows, overwrite);
      toast.success(
        `Bulk import complete! Added: ${res.addedCount}, Updated: ${res.updatedCount}, Skipped: ${res.skippedCount}`
      );
    } else {
      const res = state.addProgramsBulk(validRows, overwrite);
      toast.success(
        `Bulk import complete! Added: ${res.addedCount}, Updated: ${res.updatedCount}, Skipped: ${res.skippedCount}`
      );
    }

    close();
    onComplete();
  });
}
