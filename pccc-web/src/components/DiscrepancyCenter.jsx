import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Search,
  Download,
  CheckCircle2,
  Edit2,
  FileQuestion,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DiscrepancyCenter({
  discrepancies,
  onOpenEditModal,
  onOpenScanner,
}) {
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items
  const filteredList = useMemo(() => {
    return discrepancies.filter((item) => {
      // Type filter
      if (filterType === 'MISMATCH' && item.type !== 'QTY_MISMATCH') return false;
      if (filterType === 'UNREGISTERED' && item.type !== 'NOT_IN_SYSTEM') return false;
      if (filterType === 'DUPLICATE' && item.type !== 'DUPLICATE_SCAN') return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTag = item.tag_id?.toLowerCase().includes(q);
        const matchCode = item.stock_code?.toLowerCase().includes(q);
        const matchBin = item.bin?.toLowerCase().includes(q);
        return matchTag || matchCode || matchBin;
      }
      return true;
    });
  }, [discrepancies, filterType, searchTerm]);

  // Counts
  const mismatchCount = discrepancies.filter((d) => d.type === 'QTY_MISMATCH').length;
  const unregCount = discrepancies.filter((d) => d.type === 'NOT_IN_SYSTEM').length;
  const dupCount = discrepancies.filter((d) => d.type === 'DUPLICATE_SCAN').length;

  // Export discrepancies to Excel
  const handleExport = () => {
    if (filteredList.length === 0) return;
    const rows = filteredList.map((item) => ({
      'Mã TagID': item.tag_id,
      'Loại Cảnh Báo':
        item.type === 'QTY_MISMATCH'
          ? 'Lệch Số Lượng'
          : item.type === 'NOT_IN_SYSTEM'
          ? 'Mã Ngoài Hệ Thống'
          : 'Trùng Lặp Quét',
      'Mã Hàng (Stock Code)': item.stock_code || 'N/A',
      'Lô Hàng (Batch)': item.batch || 'N/A',
      'Kho Hệ Thống': item.warehouse || 'N/A',
      'Vị Trí Sổ Sách (Bin)': item.bin || 'N/A',
      'SL Sổ Sách': item.expected_qty ?? 'N/A',
      'Vị Trí Quét Thực Tế': item.scanned_position || 'N/A',
      'SL Quét Thực Tế': item.actual_qty,
      'Chênh Lệch (Delta)': item.delta ?? 'N/A',
      'Thời Điểm Kiểm Tra': new Date().toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Canh_Bao_Chenh_Lech');
    XLSX.writeFile(wb, `Canh_Bao_Chenh_Lech_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="discrepancy-center-container">
      {/* Top Banner */}
      <div className="discrepancy-hero-banner">
        <div className="banner-left">
          <div className="banner-alert-icon">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2>TRUNG TÂM CẢNH BÁO CHÊNH LỆCH & HIỆU CHỈNH</h2>
            <p>
              Hệ thống phát hiện tự động các điểm sai lệch giữa số liệu sổ sách và thực tế quét.
              Vui lòng bấm <strong>"Chỉnh sửa ngay"</strong> để cân đối và lưu lại nhật ký thay đổi.
            </p>
          </div>
        </div>

        <div className="banner-actions">
          <button className="btn-banner-export" onClick={handleExport} disabled={filteredList.length === 0}>
            <Download size={16} />
            <span>Xuất Excel Cảnh Báo ({filteredList.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Summary Bar */}
      <div className="discrepancy-control-bar">
        <div className="filter-pills-group">
          <button
            className={`filter-pill ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            <Layers size={14} />
            <span>Tất cả ({discrepancies.length})</span>
          </button>

          <button
            className={`filter-pill ${filterType === 'MISMATCH' ? 'active' : ''}`}
            onClick={() => setFilterType('MISMATCH')}
          >
            <AlertCircle size={14} />
            <span>Lệch Số Lượng ({mismatchCount})</span>
          </button>

          <button
            className={`filter-pill ${filterType === 'UNREGISTERED' ? 'active' : ''}`}
            onClick={() => setFilterType('UNREGISTERED')}
          >
            <FileQuestion size={14} />
            <span>Ngoài Hệ Thống ({unregCount})</span>
          </button>

          {dupCount > 0 && (
            <button
              className={`filter-pill ${filterType === 'DUPLICATE' ? 'active' : ''}`}
              onClick={() => setFilterType('DUPLICATE')}
            >
              <AlertTriangle size={14} />
              <span>Trùng Lặp ({dupCount})</span>
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo TagID, Mã hàng, Vị trí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="btn-search-clear" onClick={() => setSearchTerm('')}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Discrepancy List */}
      {filteredList.length === 0 ? (
        <div className="empty-discrepancy-state">
          <CheckCircle2 size={48} className="text-success" />
          <h3>Tuyệt vời! Không có cảnh báo chênh lệch nào</h3>
          <p>
            {discrepancies.length === 0
              ? 'Tất cả các bản quét thực tế đều khớp hoàn hảo với tồn kho hệ thống hoặc chưa phát sinh dữ liệu lệch.'
              : 'Không có kết quả nào phù hợp với bộ lọc tìm kiếm hiện tại.'}
          </p>
          <button className="btn-primary" onClick={onOpenScanner} style={{ marginTop: '16px' }}>
            Tiếp tục quét kho VPA
          </button>
        </div>
      ) : (
        <div className="discrepancy-cards-grid">
          {filteredList.map((item) => {
            const isMismatch = item.type === 'QTY_MISMATCH';
            const isDeficit = item.delta < 0;

            return (
              <div
                key={item.tag_id + (item.scan_id || '')}
                className={`discrepancy-card ${isMismatch ? (isDeficit ? 'card-deficit' : 'card-surplus') : 'card-unregistered'}`}
              >
                {/* Card Top */}
                <div className="card-top-header">
                  <div className="card-tag-badge">
                    <span className="tag-number">#{item.tag_id}</span>
                    {item.stock_code && <span className="stock-code-pill">{item.stock_code}</span>}
                  </div>

                  <div className="card-type-pill">
                    {isMismatch ? (
                      isDeficit ? (
                        <span className="badge badge-deficit">
                          <TrendingDown size={13} /> LỆCH THIẾU ({item.delta} SP)
                        </span>
                      ) : (
                        <span className="badge badge-surplus">
                          <TrendingUp size={13} /> LỆCH THỪA (+{item.delta} SP)
                        </span>
                      )
                    ) : (
                      <span className="badge badge-unregistered">
                        <FileQuestion size={13} /> MÃ NGOÀI HỆ THỐNG
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body: Comparison matrix */}
                <div className="card-comparison-body">
                  <div className="comp-column comp-system">
                    <div className="comp-col-title">SỔ SÁCH HỆ THỐNG</div>
                    <div className="comp-stat-row">
                      <span>SL Tồn:</span>
                      <strong>{item.expected_qty !== null && item.expected_qty !== undefined ? `${item.expected_qty} SP` : 'Chưa có'}</strong>
                    </div>
                    <div className="comp-stat-row">
                      <span>Kho / Bin:</span>
                      <span>{item.warehouse || '--'} / {item.bin || '--'}</span>
                    </div>
                    {item.batch && (
                      <div className="comp-stat-row">
                        <span>Lô:</span>
                        <span className="font-mono">{item.batch}</span>
                      </div>
                    )}
                  </div>

                  <div className="comp-divider">
                    <span className="delta-indicator">
                      {item.delta !== null && item.delta !== undefined ? (item.delta > 0 ? `+${item.delta}` : item.delta) : '?'}
                    </span>
                  </div>

                  <div className="comp-column comp-actual">
                    <div className="comp-col-title">THỰC TẾ QUÉT ĐƯỢC</div>
                    <div className="comp-stat-row">
                      <span>SL Quét:</span>
                      <strong className="text-highlight">{item.actual_qty} SP</strong>
                    </div>
                    <div className="comp-stat-row">
                      <span>Vị trí quét:</span>
                      <span>{item.scanned_position || 'Chưa rõ'}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>Thời điểm:</span>
                      <span className="text-muted">{item.created_at ? new Date(item.created_at).toLocaleTimeString() : '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer with Quick Edit */}
                <div className="card-footer-actions">
                  <div className="footer-warning-desc">
                    <AlertCircle size={14} />
                    <span>
                      {isMismatch
                        ? isDeficit
                          ? `Thực tế thiếu ${Math.abs(item.delta)} SP so với tồn kho ERP.`
                          : `Thực tế dư ${item.delta} SP so với tồn kho ERP.`
                        : 'Mã quét không khớp với 8,844 dòng dữ liệu tồn kho gốc.'}
                    </span>
                  </div>

                  <button
                    className="btn-action-edit"
                    onClick={() => onOpenEditModal(item)}
                    title="Chỉnh sửa số lượng hoặc vị trí của TagID này"
                  >
                    <Edit2 size={15} />
                    <span>Chỉnh Sửa Ngay</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
