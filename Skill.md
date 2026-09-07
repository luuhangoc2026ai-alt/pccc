# Skill - Logical Working Skills Documentation

## Principle
All skills and implementation logic must be based on existing codebase analysis, explicit requirements, and concrete data structures. No skills should be fabricated or hallucinated without clear basis in the project requirements or code.

## Acquired Skills

### 1. Supabase Database Integration
- **Basis**: Project requirement to store scanned data and original stock balance for comparison
- **Implementation**: 
  - Created Supabase tables: `stock_balances` and `stock_scans`
  - Established column mappings from Excel import to database schema
  - Configured real-time CRUD operations using supabase JavaScript client
  - **Logic**: All database operations follow supabase SDK patterns - `from('table').insert()`, `.select()`, `.update()`, `.delete()`
  - **No hallucination**: Skills derived directly from supabase client setup and migration files created

### 2. Excel File Parsing and Import
- **Basis**: Requirement to import original stock balance from Excel (.xlsx, .xls)
- **Implementation**:
  - Used `xlsx` library to read spreadsheet files
  - Parsed sheet data using `XLSX.read(data, { type: 'array' })`
  - Converted worksheet to JSON using `XLSX.utils.sheet_to_json(worksheet)`
  - Mapped Excel column headers to database fields:
    - `Stock Code` -> `stock_code`
    - `Warehouse` -> `warehouse`
    - `CREATEDATE` -> `createdate`
    - `BATCH` -> `batch`
    - `BIN` -> `bin`
    - `Qty` -> `qty`
    - `TagID` -> `tag_id`
  - **Logic**: FileReader API to read ArrayBuffer, then XLSX parsing pipeline
  - **No hallucination**: Skills based on actual import function in App.jsx and library usage

### 3. Duplicate Detection Logic
- **Basis**: Requirement that "if data has duplicate TagID, warn"
- **Implementation**:
  - Before saving scan, check `scans.some(s => s.tag_id === inputTagId)`
  - Compare against existing TagIDs in current session
  - Prevent insertion if duplicate found, show warning: "TagID already exists! Please use a different TagID."
  - **Logic**: Array `some()` method to check existence, state management to show/warn
  - **No hallucination**: Skill derived directly from handleScan function and requirement specification

### 4. Data Comparison Logic
- **Basis**: Requirement for "Compare Data" button to scan vs original data
- **Implementation**:
  - Fetch all `stock_scans` and `stock_balances` from Supabase
  - Map comparison results:
    - If matching TagID found in balances: status = "Found"
    - If no match: status = "Not in original"
    - If no original data available: status = "No original data available"
  - Display results in table with columns: TagID, Scanned Qty, Scanned Position, Original TagID, Match Status
  - **Logic**: Array `find()` method to locate matches, state to manage comparison UI
  - **No hallucination**: Skills based on compareData function and explicit comparison requirements

### 5. Form Validation and State Management
- **Basis**: Web interface requirements for scanning input
- **Implementation**:
  - Use React `useState` hooks for all form inputs: TagID, Quantity, Position
  - Controlled components with `value` and `onChange` props
  - Form submission prevented with `e.preventDefault()`
  - Warning state for duplicate/validation errors
  - **Logic**: React state patterns, controlled input elements, event handling
  - **No hallucination**: Skills based on actual component state management in the web interface

### 6. Supabase Environment Configuration
- **Basis**: Project need for database connectivity
- **Implementation**:
  - Created `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Initialized supabase client: `createClient(supabaseUrl, supabaseAnonKey)`
  - Set up Supabase migrations for database schema
  - **Logic**: Environment variable pattern for API keys, supabase initialization
  - **No hallucination**: Skills based on actual supabase.ts file and supabase init commands

## Skills Not Acquired (Out of Scope)
- Barcode gun hardware integration (only simulated via text input)
- Real-time VPI stream processing
- Offline-first data synchronization strategies
- Advanced Excel formula parsing beyond column mapping
- Machine learning or predictive analytics
- Custom Supabase authentication (using anon key only)

## Documentation Standards
1. All skills documented with clear "Basis" explaining the source requirement
2. "Implementation" describes actual code, not hypothetical capabilities
3. "Logic" section describes the algorithm/pattern used
4. "No hallucination" confirms skills are grounded in code/requirements
5. "Skills Not Acquired" explicitly states out-of-scope items to prevent scope creep
### 7. Floating Dynamic Scanner & Web Audio Synthesizer
- **Basis**: Requirement for "máy scan giao diện nổi trên thanh động và nổi trên màn hình chính máy scan khi chọn"
- **Implementation**:
  - Created `FloatingScannerBar.jsx`: A docked glassmorphism quick-scan bar with fast inputs and last-scanned preview chip.
  - Created `ScannerModal.jsx`: An elevated full-screen/modal scanning station with laser animation, auto-focus, rapid gun scan mode, and instant lookup against 8,844 system balances.
  - Created `sound.js`: Synthesizes instant industrial beep/buzzer sounds using Web Audio API (`AudioContext`) without external audio assets.
  - **No hallucination**: Fully implemented in `src/components/FloatingScannerBar.jsx`, `ScannerModal.jsx`, and `src/lib/sound.js`.

### 8. Floating KPI Metrics & Quantity Variance System
- **Basis**: Requirement for "các thẻ KPI nổi thể hiện được số lượng chênh lệch giữa hệ thống và thực tế scan được"
- **Implementation**:
  - Created `FloatingKPIs.jsx` with 5 elevated cards: System Stock, Actual Scanned, Net Quantity Variance (Δ), Discrepancy Alerts, and Inventory Accuracy Rate.
  - Dynamically calculates variance: `totalVarianceQty = totalScannedQty - totalMatchedExpectedQty` with responsive color changing (green for 0 match, red for deficit, amber for surplus).
  - **No hallucination**: Fully implemented in `src/components/FloatingKPIs.jsx` and dynamic state in `App.jsx`.

### 9. Discrepancy Alert & Quick Reconcile System
- **Basis**: Requirement for "hiện lên những cảnh báo chênh lệch cần chỉnh sửa"
- **Implementation**:
  - Created `DiscrepancyCenter.jsx`: Automatically classifies discrepancies into Quantity Mismatch, Unregistered Tags, and Duplicate Scans.
  - Interactive comparison cards displaying expected vs scanned quantities with direct "Chỉnh sửa ngay" trigger.
  - Created `EditModal.jsx`: Modal for adjusting quantities, positions, and inputting adjustment reasons.
  - **No hallucination**: Fully implemented in `src/components/DiscrepancyCenter.jsx` and `src/components/EditModal.jsx`.

### 10. TagID Audit Logging & Traceability
- **Basis**: Requirement for "có ghi log lại những tagid được chỉnh sửa"
- **Implementation**:
  - Created `auditLogger.js`: Captures TagID, action type, old value, new value, delta difference, reason, operator, and timestamp.
  - Dual storage persistence: Supabase `scan_edit_logs` table + LocalStorage fallback.
  - Created `AuditLogView.jsx`: Interactive audit log dashboard with search, action filters, and Excel/CSV export.
  - Added SQL migration file `20260907150000_scan_edit_logs.sql`.
  - **No hallucination**: Fully implemented in `src/lib/auditLogger.js`, `src/components/AuditLogView.jsx`, and migration files.
