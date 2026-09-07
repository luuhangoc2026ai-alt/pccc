import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  Edit2,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ComparisonMatrix({
  comparisonData,
  onOpenEditModal,
  onRefresh,
  refreshing,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredItems = useMemo(() => {
    return comparisonData.filter((item) => {
      // Status filter
      if (statusFilter === 'MATCH' && item.match !== 'Found') return false;
      if (statusFilter === 'MISMATCH' && (item.match !== 'Found' || item.delta === 0)) return false;
      if (statusFilter === 'UNREGISTERED' && item.match === 'Found') return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const tagMatch = item.tag_id?.toLowerCase().includes(q);
        const codeMatch = item.stock_code?.toLowerCase().includes(q);
        const binMatch = item.bin?.toLowerCase().includes(q) || item.scanned_position?.toLowerCase().includes(q);
        return tagMatch || codeMatch || binMatch;
      }
      return true;
    });
  }, [comparisonData, statusFilter, searchTerm]);

  // Counts
  const matchCount = comparisonData.filter((c) => c.match === 'Found' && c.delta === 0).length;
  const mismatchCount = comparisonData.filter((c) => c.match === 'Found' && c.delta !== 0).length;
  const unregCount = comparisonData.filter((c) => c.match !== 'Found').length;

  const handleExport = () => {
    if (filteredItems.length === 0) return;
    const rows = filteredItems.map((item, index) => ({
      'STT': index + 1,
      'Mã TagID': item.tag_id,
      'Mã Hàng (Stock Code)': item.stock_code || 'N/A',
      'Kho': item.warehouse || 'N/A',
      'Vị Trí Sổ Sách (Bin)': item.bin || 'N/A',
      'SL Sổ Sách': item.expected_qty ?? 'N/A',
      'Vị Trí Quét': item.scanned_position || 'N/A',
      'SL Quét Thực Tế': item.scanned_quantity,
      'Chênh Lệch': item.delta ?? 'N/A',
      'Trạng Thái':
        item.match === 'Found'
          ? item.delta === 0
            ? 'Khớp Chuẩn 100%'
            : 'Lệch Số Lượng'
          : 'Ngoài Hệ Thống',
      'Thời Gian Quét': item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bang_Doi_Chieu');
    XLSX.writeFile(wb, `Bang_Doi_Chieu_Chi_Tiet_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="matrix-container">
      {/* Header */}
      <div className="matrix-header-bar">
        <div>
          <h2>BẢNG ĐỐI CHIẾU KIỂM KÊ CHI TIẾT</h2>
          <p>Đối chiếu từng mã quét thực tế với toàn bộ cơ sở dữ liệu tồn kho gốc</p>
        </div>

        <div className="matrix-actions">
          <button className="btn-secondary" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spinning' : ''} />
            <span>Làm Mới</span>
          </button>

          <button className="btn-primary" onClick={handleExport} disabled={filteredItems.length === 0}>
            <Download size={15} />
            <span>Xuất Excel Đối Chiếu ({filteredItems.length})</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="matrix-control-bar">
        <div className="matrix-filters">
          <button
            className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Tất cả ({comparisonData.length})
          </button>
          <button
            className={`filter-pill ${statusFilter === 'MATCH' ? 'active' : ''}`}
            onClick={() => setStatusFilter('MATCH')}
          >
            <CheckCircle2 size={14} />
            Khớp Chuẩn ({matchCount})
          </button>
          <button
            className={`filter-pill ${statusFilter === 'MISMATCH' ? 'active' : ''}`}
            onClick={() => setStatusFilter('MISMATCH')}
          >
            <AlertTriangle size={14} />
            Lệch SL ({mismatchCount})
          </button>
          <button
            className={`filter-pill ${statusFilter === 'UNREGISTERED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('UNREGISTERED')}
          >
            <FileQuestion size={14} />
            Ngoài HT ({unregCount})
          </button>
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo TagID, mã hàng, vị trí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="matrix-table-wrapper">
        {filteredItems.length === 0 ? (
          <div className="empty-audit-state">
            <CheckCircle2 size={40} className="text-muted" />
            <p>Không có bản ghi nào phù hợp với bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>STT</th>
                <th style={{ width: '150px' }}>Mã TagID</th>
                <th>Mã Hàng (Stock)</th>
                <th>Kho / Bin Sổ</th>
                <th style={{ textAlign: 'right' }}>SL Sổ Sách</th>
                <th>Vị Trí Quét</th>
                <th style={{ textAlign: 'right' }}>SL Thực Tế</th>
                <th style={{ textAlign: 'center' }}>Chênh Lệch</th>
                <th style={{ textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ textAlign: 'center', width: '110px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const isFound = item.match === 'Found';
                const isExact = isFound && item.delta === 0;
                const isMismatch = isFound && item.delta !== 0;

                return (
                  <tr key={item.id || idx}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>
                      <span className="table-tag-badge">#{item.tag_id}</span>
                    </td>
                    <td>
                      <strong>{item.stock_code || '--'}</strong>
                    </td>
                    <td className="text-sm">
                      {item.warehouse ? `${item.warehouse} / ${item.bin}` : '--'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono">
                      {item.expected_qty !== null && item.expected_qty !== undefined ? item.expected_qty : '--'}
                    </td>
                    <td className="text-sm font-mono">{item.scanned_position}</td>
                    <td style={{ textAlign: 'right' }} className="font-mono font-bold text-primary">
                      {item.scanned_quantity}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.delta !== null && item.delta !== undefined ? (
                        item.delta === 0 ? (
                          <span className="diff-badge diff-zero">0</span>
                        ) : item.delta > 0 ? (
                          <span className="diff-badge diff-up">+{item.delta}</span>
                        ) : (
                          <span className="diff-badge diff-down">{item.delta}</span>
                        )
                      ) : (
                        <span className="text-muted">--</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isExact && <span className="status-pill pill-match">✓ Khớp Chuẩn</span>}
                      {isMismatch && (
                        <span className="status-pill pill-mismatch">
                          {item.delta < 0 ? 'Lệch Thiếu' : 'Lệch Thừa'}
                        </span>
                      )}
                      {!isFound && <span className="status-pill pill-unreg">Ngoài Hệ Thống</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-table-edit"
                        onClick={() =>
                          onOpenEditModal({
                            id: item.id,
                            tag_id: item.tag_id,
                            quantity: item.scanned_quantity,
                            position: item.scanned_position,
                            stock_code: item.stock_code,
                            expected_qty: item.expected_qty,
                            bin: item.bin,
                            warehouse: item.warehouse,
                          })
                        }
                        title="Chỉnh sửa bản quét này"
                      >
                        <Edit2 size={13} />
                        <span>Sửa</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
