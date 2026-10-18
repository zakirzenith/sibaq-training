# MentorFlow • Controllers Panel (Trainers & Mentees Management)

A web application designed for operations controllers and festival/camp coordinators to manage **Trainers**, **Candidates (Mentees)**, and **Stage & Non-Stage Programs**.

---

## 🌟 Key Features

### 1. Candidates / Mentees Section
- **Excel Bulk Upload (`.xlsx`, `.xls`, `.csv`)**: Intelligently parses Admission Number (`ad no`), Name, Category (`Senior`, `Junior`, `Sub-Junior`, `General`), and Class.
- **Pre-Import Verification**: Displays a live table preview showing valid rows and duplicate detection before committing.
- **One-Click Sample Template Download**: Generates and downloads a pre-formatted Excel template (`candidates_sample_template.xlsx`).
- **Complete Management**: Add individual candidates, edit, delete, search by name/ad no, and filter by category or class.
- **Export Roster**: Export all candidates with their enrolled programs list to Excel.

### 2. Programs Hub (2-Side Split Layout)
- **Left Side: Programs Directory**:
  - Live search and filtering by Stage / Non-Stage and Category.
  - Interactive cards showing program Code, Name, Stage/Non-Stage badge, Schedule, Venue, assigned Trainer, and candidate enrollment counts.
  - One-click active selection that immediately populates the right control center.
- **Right Side: Dedicated Program Control Center**:
  - **Section 1: Candidates Management for Selected Program**:
    - Table of all enrolled candidates for this program.
    - **Clickable Candidate Names**: Clicking any candidate's name immediately opens their **Candidate Profile Modal**.
    - Instant removal (`✕`) of assigned candidates.
    - **"Add Candidates" Drawer**: Search directory, one-click "Match Category", and bulk checkbox enrollment.
  - **Section 2: Trainer Assignment for Selected Program**:
    - Direct dropdown selector to assign or re-assign a trainer for this program.
    - Active Trainer Card preview with domain of expertise, experience, contact details, and mentee count.
    - Option to unassign trainer with 1 click.

### 3. Candidate Profile Modal
- Accessible by clicking on ANY candidate name across the application (Programs view, Candidates view, etc.):
  - Displays Candidate Name, Admission No, Category badge, and Class.
  - Operational KPIs: Total assigned programs, Stage items, Non-Stage items, and assigned mentors.
  - Complete list of assigned programs with details and the specific designated trainer/mentor for each program.
  - Faculty summary of all mentors coaching this student.
  - Quick option to unenroll from a program directly from their profile.

### 4. Trainers & Mentors Directory
- Add/Edit trainer profiles: Name, Email, Phone, Domain of Expertise, Experience, and Bio.
- Profile cards displaying:
  - Number of assigned programs and total unique mentees coached.
  - Clickable program badges that link directly to each program.

### 5. Assignment Matrix View
- High-level bird's-eye view displaying each program card with its assigned trainer and candidate list.
- Quick search across programs, trainers, and candidate names.

### 6. Controller Tools & Light Mode Design
- **Default Light Mode**: Modern, high-contrast, clean SaaS aesthetic designed for daily operational clarity.
- **Auto-Persistence**: All changes automatically sync to browser `localStorage`.
- **System Data Actions**:
  - Export full database backup as JSON.
  - Restore database from JSON backup.
  - Reset to sample demo data with 1 click.
  - Clear all data.

---

## 🚀 Running the Website Locally

### Prerequisites
- Node.js (v18 or higher)

### Start Dev Server
```powershell
npm.cmd run dev
```

The application will be live at:
```
http://localhost:5173/
```

### Build for Production
```powershell
npm.cmd run build
```
The compiled bundle will be output to the `dist/` directory.

---

## 📁 Project Structure

```
d:\TRAINING\
├── index.html                         # Main application HTML shell
├── package.json                       # Scripts and dependencies (vite, xlsx, lucide)
├── README.md                          # Documentation
└── src/
    ├── main.js                        # Router, theme management, and app coordinator
    ├── style.css                      # Design tokens, glassmorphism, responsive styles
    ├── data/
    │   └── initialData.js             # Initial sample dataset (candidates, programs, trainers)
    ├── services/
    │   ├── state.js                   # Central state manager, localStorage sync, CRUD
    │   └── excelService.js            # SheetJS Excel parser, template downloader, and exporter
    └── components/
        ├── icons.js                   # Lightweight SVG icon system
        ├── toast.js                   # Animated toast notification system
        ├── dashboardView.js           # Metrics, distribution bars, workload summaries
        ├── candidatesView.js          # Candidates table, search, filters, Excel bulk import
        ├── programsView.js            # Programs catalog with in-row assignment triggers
        ├── trainersView.js            # Faculty directory and mentee counts
        ├── matrixView.js              # Bird's-eye matrix view
        └── modals/
            ├── assignCandidatesModal.js # Dedicated program candidate & trainer assigner
            ├── excelUploadModal.js    # Bulk spreadsheet upload with live validation
            ├── candidateFormModal.js  # Add/edit candidate form
            ├── programFormModal.js    # Add/edit program form
            └── trainerFormModal.js    # Add/edit trainer profile form
```
