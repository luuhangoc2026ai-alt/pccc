# Agent - VPA Stock Scan System

## Role
Agent responsible for managing the VPA (Variable Product Area) stock scanning system, including data ingestion, Supabase storage, comparison logic, and user interface management.

## Workflow

### 1. Initialization
- Initialize React + Vite project with Supabase integration
- Set up Supabase database tables (stock_balances, stock_scans)
- Configure environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

### 2. Data Import
- Import original stock balance data from Excel file (.xlsx, .xls)
- Parse Excel using sheet parser (xlsx library)
- Map Excel columns to database fields:
  - Stock Code -> stock_code
  - Warehouse -> warehouse
  - CREATEDATE -> createdate
  - BATCH -> batch
  - BIN -> bin
  - Qty -> qty
  - TagID -> tag_id (unique constraint)

### 3. VPA Scanning
- Provide web interface for scanning via barcode gun
- Input fields:
  - TagID (text, required)
  - Quantity (numeric, required)
  - Position (text, required)
- On scan submission:
  - Validate all fields are filled
  - Check for duplicate TagID in existing scans
  - If duplicate: show warning "TagID already exists! Please use a different TagID."
  - If unique: insert into stock_scans table
  - Clear input fields after successful save
  - Refresh scans list

### 4. Data Comparison
- Provide "Compare Data" button on web interface
- When clicked:
  - Fetch all stock_scans from Supabase
  - Fetch all stock_balances from Supabase
  - Compare scanned data against original balance data
  - Display comparison results in table format:
    - TagID
    - Scanned Quantity
    - Scanned Position
    - Original TagID (from stock_balances)
    - Match Status: "Found", "Not in original", or "No original data available"
- Show comparison results only when button is clicked

### 5. Duplicate Detection
- Before saving any scan, check if TagID already exists in current scan session
- Also check against stock_balances table for existing tag IDs
- If duplicate found, prevent insertion and show warning message

### 6. Supabase Operations
- All data operations use supabase client
- Tables involved:
  - stock_balances: Original stock balance data (imported from Excel)
  - stock_scans: Scanned VPA data (real-time scanning)
- Relationships:
  - stock_scans has optional reference to stock_balances.id (source_id)
  - stock_balances.tag_id is unique

## Error Handling
- Supabase query errors: logged to console, UI shows no crash
- File import errors: alert user with error details
- Duplicate TagID: show inline warning, prevent submission
- Missing fields: form validation prevents submission

## Exit Conditions
- Agent completes when:
  - Web interface is functional
  - Scans can be saved to Supabase
  - Compare Data button works
  - Duplicate detection is active
  - Excel import works