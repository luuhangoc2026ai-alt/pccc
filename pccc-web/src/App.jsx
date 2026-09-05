import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import './App.css';

function App() {
  const [scans, setScans] = useState([]);
  const [inputTagId, setInputTagId] = useState('');
  const [inputQuantity, setInputQuantity] = useState('');
  const [inputPosition, setInputPosition] = useState('');
  const [warning, setWarning] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const fileRef = useRef(null);

  const fetchScans = async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('stock_scans')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setScans(data);
    if (error) console.error(error);
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!inputTagId || !inputQuantity || !inputPosition) return;

    // Check for duplicate TagID
    const hasDuplicate = scans.some(s => s.tag_id === inputTagId);
    if (hasDuplicate) {
      setWarning('TagID already exists! Please use a different TagID.');
      return;
    }

    const { error } = await supabase.from('stock_scans').insert([
      { tag_id: inputTagId, quantity: Number(inputQuantity), position: inputPosition }
    ]);

    if (error) console.error(error);
    else {
      setWarning(null);
      setInputTagId('');
      setInputQuantity('');
      setInputPosition('');
      fetchScans();
    }
  };

  const compareData = async () => {
    setComparing(true);
    setWarning(null);
    setComparisonResult(null);

    const { data: scanData, error: scanError } = await supabase
      .from('stock_scans')
      .select('*');

    if (scanError) {
      console.error(scanError);
      setComparing(false);
      return;
    }

    const { data: balanceData, error: balanceError } = await supabase
      .from('stock_balances')
      .select('tag_id');

    if (balanceError) console.error(balanceError);

    setComparing(false);

    if (balanceData && balanceData.length > 0) {
      const result = scanData.map(scan => {
        const matchingBalance = balanceData.find(b => b.tag_id === scan.tag_id);
        return {
          tag_id: scan.tag_id,
          scanned_quantity: scan.quantity,
          scanned_position: scan.position,
          original_tag_id: matchingBalance ? matchingBalance.tag_id : null,
          match: matchingBalance ? 'Found' : 'Not in original',
        };
      });
      setComparisonResult(result);
    } else {
      setComparisonResult(
        scanData.map(s => ({
          tag_id: s.tag_id,
          scanned_quantity: s.quantity,
          scanned_position: s.position,
          original_tag_id: null,
          match: 'No original data available',
        }))
      );
    }
  };

  const importStockBalance = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const { error } = await supabase.from('stock_balances').insert(
        json.map(row => ({
          stock_code: row['Stock Code'] || '',
          warehouse: row['Warehouse'] || '',
          createdate: row['CREATEDATE'] || '',
          batch: row['BATCH'] || '',
          bin: row['BIN'] || '',
          qty: row['Qty'] || 0,
          tag_id: row['TagID'] || null,
        }))
      );

      if (error) console.error(error);
      else {
        alert('Stock balance imported successfully!');
        fetchScans();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="app">
      <h1>VPA Stock Scan Interface</h1>

      {!isSupabaseConfigured && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #ffeeba',
          textAlign: 'left'
        }}>
          <strong>⚠️ Lưu ý cấu hình Vercel:</strong> Chưa thiết lập biến môi trường <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code>. Vui lòng thêm hai biến này trong phần <em>Vercel Project Settings &gt; Environment Variables</em> để ứng dụng kết nối với Supabase.
        </div>
      )}

      <div className="scan-section">
        <h2>Scan VPA</h2>
        {warning && <p className="warning">{warning}</p>}
        <form onSubmit={handleScan}>
          <div>
            <label>TagID:</label>
            <input
              type="text"
              value={inputTagId}
              onChange={(e) => setInputTagId(e.target.value)}
              placeholder="Enter TagID"
              required
            />
          </div>
          <div>
            <label>Quantity:</label>
            <input
              type="number"
              value={inputQuantity}
              onChange={(e) => setInputQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
            />
          </div>
          <div>
            <label>Position:</label>
            <input
              type="text"
              value={inputPosition}
              onChange={(e) => setInputPosition(e.target.value)}
              placeholder="Enter position"
              required
            />
          </div>
          <button type="submit">Save Scan</button>
        </form>
      </div>

      <div className="section">
        <h2>Import Original Stock Balance (Excel)</h2>
        <input
          type="file"
          accept=".xlsx,.xls"
          ref={fileRef}
          onChange={(e) => importStockBalance(e.target.files[0])}
        />
      </div>

      <div className="section">
        <h2>Compare Data</h2>
        {comparing && <p>Comparing data...</p>}
        <button onClick={compareData} disabled={comparing}>
          {comparing ? 'Comparing...' : 'Compare Data'}
        </button>

        {comparisonResult && comparisonResult.length > 0 && (
          <div>
            <h3>Comparison Results</h3>
            <table>
              <thead>
                <tr>
                  <th>TagID</th>
                  <th>Scanned Qty</th>
                  <th>Scanned Position</th>
                  <th>Original TagID</th>
                  <th>Match Status</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResult.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.tag_id}</td>
                    <td>{item.scanned_quantity}</td>
                    <td>{item.scanned_position}</td>
                    <td>{item.original_tag_id || 'N/A'}</td>
                    <td>{item.match}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section">
        <h2>Scanned Records</h2>
        {scans.length === 0 && <p>No scans yet.</p>}
        <table>
          <thead>
            <tr>
              <th>TagID</th>
              <th>Quantity</th>
              <th>Position</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan, idx) => (
              <tr key={idx}>
                <td>{scan.tag_id}</td>
                <td>{scan.quantity}</td>
                <td>{scan.position}</td>
                <td>{new Date(scan.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;