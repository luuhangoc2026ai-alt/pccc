import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export default function ExcelImport({ balanceStats, onImportSuccess }) {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importMessage, setImportMessage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  const parseExcelData = (arrayBuffer) => {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;
      const lowerRow = row.map((cell) => String(cell || '').trim().toLowerCase());
      if (
        lowerRow.some((c) => c.includes('stock code') || c.includes('mã hàng') || c === 'stock') ||
        lowerRow.some((c) => c === 'batch' || c.includes('lô'))
      ) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error('Không tìm thấy dòng tiêu đề cột hợp lệ trong file Excel.');
    }

    const header = rawRows[headerRowIdx].map((cell) => String(cell || '').trim());
    const findCol = (keywords) => {
      return header.findIndex((h) => {
        const lower = h.toLowerCase();
        return keywords.some((kw) => lower === kw || lower.includes(kw));
      });
    };

    const stockCodeIdx = findCol(['stock code', 'mã hàng', 'stock', 'code']);
    const warehouseIdx = findCol(['warehouse', 'kho']);
    const createdateIdx = findCol(['createdate', 'ngày tạo', 'ngày', 'date']);
    const batchIdx = findCol(['batch', 'lô']);
    const binIdx = findCol(['bin', 'vị trí', 'kho bin']);
    const qtyIdx = findCol(['qty', 'số lượng', 'quantity']);
    const tagIdIdx = findCol(['tagid', 'tag_id', 'tag id', 'tag']);

    const formatDate = (val) => {
      if (typeof val === 'number' && val > 20000 && val < 70000) {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
      }
      return String(val || '').trim();
    };

    const tagCounts = new Map();
    const rowsToProcess = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const stockCode = stockCodeIdx !== -1 ? String(row[stockCodeIdx] || '').trim() : '';
      const warehouse = warehouseIdx !== -1 ? String(row[warehouseIdx] || '').trim() : '';
      const createdate = createdateIdx !== -1 ? formatDate(row[createdateIdx]) : '';
      const batch = batchIdx !== -1 ? String(row[batchIdx] || '').trim() : '';
      const bin = binIdx !== -1 ? String(row[binIdx] || '').trim() : '';
      const qtyRaw = qtyIdx !== -1 ? row[qtyIdx] : 0;
      const qty = Number(qtyRaw) || 0;

      if (!stockCode && !batch && !warehouse && qty === 0) continue;

      let tagCandidate = '';
      if (tagIdIdx !== -1 && String(row[tagIdIdx] || '').trim()) {
        tagCandidate = String(row[tagIdIdx]).trim();
      } else if (batch) {
        tagCandidate = batch;
      }

      if (tagCandidate && !tagCandidate.startsWith('*')) {
        tagCounts.set(tagCandidate, (tagCounts.get(tagCandidate) || 0) + 1);
      }

      rowsToProcess.push({
        stockCode,
        warehouse,
        createdate,
        batch,
        bin,
        qty,
        tagCandidate,
      });
    }

    return rowsToProcess.map((item) => ({
      stock_code: item.stockCode,
      warehouse: item.warehouse,
      createdate: item.createdate,
      batch: item.batch,
      bin: item.bin,
      qty: item.qty,
      tag_id: item.tagCandidate && tagCounts.get(item.tagCandidate) === 1 ? item.tagCandidate : null,
    }));
  };

  const processFile = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportProgress({ current: 0, total: 0, status: 'Đang đọc và phân tích cấu trúc file Excel...' });
    setImportMessage(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const records = parseExcelData(e.target.result);
        const total = records.length;

        if (total === 0) {
          throw new Error('File không chứa bản ghi hợp lệ nào.');
        }

        const chunkSize = 500;
        let inserted = 0;

        for (let i = 0; i < total; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          setImportProgress({
            current: inserted,
            total,
            status: `Đang đồng bộ lên Supabase: ${inserted} / ${total} dòng...`,
          });

          const { error } = await supabase.from('stock_balances').insert(chunk);
          if (error) {
            throw new Error(`Lỗi ở khối dòng ${i + 1}: ${error.message}`);
          }
          inserted += chunk.length;
        }

        setImportProgress(null);
        setImportMessage({
          type: 'success',
          text: `Nhập kho thành công! Đã nạp ${total.toLocaleString()} bản ghi tồn kho vào hệ thống Supabase.`,
        });
        if (fileRef.current) fileRef.current.value = '';
        onImportSuccess();
      } catch (err) {
        console.error(err);
        setImportProgress(null);
        setImportMessage({
          type: 'error',
          text: `Lỗi nhập dữ liệu: ${err.message || 'Thao tác thất bại'}`,
        });
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      setImporting(false);
      setImportProgress(null);
      setImportMessage({ type: 'error', text: 'Không thể đọc file.' });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="excel-import-wrapper">
      <div className="excel-header-banner">
        <div className="banner-left">
          <div className="banner-icon-badge">
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <h2>NHẬP FILE TỒN KHO GỐC (EXCEL)</h2>
            <p>
              Tải lên file dữ liệu tồn kho tổng (.xlsx, .xls) để thiết lập danh mục đối chiếu cho các máy quét VPA.
            </p>
          </div>
        </div>
      </div>

      {/* Database Current Stats Card */}
      <div className="excel-stats-panel">
        <div className="panel-item">
          <Database size={20} className="text-primary" />
          <div>
            <span className="panel-label">Tổng số bản ghi tồn kho hiện có:</span>
            <strong className="panel-val">{balanceStats.total?.toLocaleString() || 0} dòng</strong>
          </div>
        </div>

        <div className="panel-item">
          <FileCheck size={20} className="text-success" />
          <div>
            <span className="panel-label">Mã TagID hợp lệ sẵn sàng đối chiếu:</span>
            <strong className="panel-val">{balanceStats.tagged?.toLocaleString() || 0} mã</strong>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {importMessage && (
        <div className={`scanner-alert ${importMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {importMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{importMessage.text}</span>
        </div>
      )}

      {/* Progress Bar */}
      {importProgress && (
        <div className="import-progress-card">
          <div className="prog-status-row">
            <span>{importProgress.status}</span>
            {importProgress.total > 0 && (
              <strong>
                {Math.round((importProgress.current / importProgress.total) * 100)}%
              </strong>
            )}
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        className={`drag-drop-zone ${dragActive ? 'drag-active' : ''} ${importing ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !importing && fileRef.current?.click()}
      >
        <UploadCloud size={48} className="drop-icon" />
        <h3>Kéo & thả file Excel tồn kho vào đây</h3>
        <p>hoặc nhấn để chọn file từ máy tính (.xlsx, .xls)</p>
        <span className="file-hint">Hệ thống tự động nhận diện các cột: Stock Code, BATCH, BIN, Qty, TagID...</span>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          disabled={importing}
          style={{ display: 'none' }}
          onChange={(e) => processFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}
