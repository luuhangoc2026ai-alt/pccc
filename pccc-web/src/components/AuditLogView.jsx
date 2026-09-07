import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  User,
  Database,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AuditLogView({ logs, onRefreshLogs, isSupabaseConfigured }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const tagMatch = log.tag_id?.toLowerCase().includes(q);
        const reasonMatch = log.note?.toLowerCase().includes(q) || log.action_label?.toLowerCase().includes(q);
        const operatorMatch = log.operator?.toLowerCase().includes(q);
        return tagMatch || reasonMatch || operatorMatch;
      }
      return true;
    });
  }, [logs, actionFilter, searchTerm]);

  // Summary statistics
  const uniqueTags = new Set(logs.map((l) => l.tag_id)).size;
  const totalAdjustments = logs.reduce((acc, l) => acc + (Number(l.difference) || 0), 0);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) return;
    const rows = filteredLogs.map((l, index) => ({
      'STT': index + 1,
      'Thời Gian': new Date(l.created_at).toLocaleString(),
      'Mã TagID': l.tag_id,
      'Hành Động': l.action_label || l.action,
      'Giá Trị Cũ': l.old_value || '',
      'Giá Trị Mới': l.new_value || '',
      'Độ Chênh Lệch Điều Chỉnh': l.difference || 0,
      'Lý Do / Ghi Chú': l.note || '',
      'Người Thực Hiện': l.operator || 'Kiểm kê viên',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nhat_Ky_Chinh_Sua_TagID');
    XLSX.writeFile(wb, `Nhat_Ky_Chinh_Sua_TagID_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const sqlCode = `-- SQL Migration cho bảng scan_edit_logs
create table if not exists scan_edit_logs (
  id uuid default gen_random_uuid() primary key,
  tag_id text not null,
  action text not null,
  old_value text,
  new_value text,
  difference numeric default 0,
  note text,
  operator text default 'Kiểm kê viên',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table scan_edit_logs enable row level security;
create policy "Allow anon all on scan_edit_logs" on scan_edit_logs for all using (true) with check (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="audit-log-container">
      {/* Header Banner */}
      <div className="audit-hero-banner">
        <div className="banner-left">
          <div className="banner-icon-badge">
            <History size={26} />
          </div>
          <div>
            <h2>NHẬT KÝ KIỂM TOÁN & CHỈNH SỬA TAGID</h2>
            <p>
              Theo dõi và ghi nhận tự động toàn bộ thao tác sửa số lượng, đổi vị trí và giải trình chênh lệch
              đối với từng mã TagID trong toàn hệ thống.
              {isSupabaseConfigured ? ' (Đã kết nối Supabase Cloud)' : ' (Lưu trữ bộ nhớ Local)'}
            </p>
          </div>
        </div>

        <div className="banner-actions">
          <button className="btn-secondary" onClick={() => setShowSqlModal(true)}>
            <Database size={15} />
            <span>SQL Supabase</span>
          </button>

          <button className="btn-secondary" onClick={onRefreshLogs} title="Làm mới dữ liệu nhật ký">
            <RefreshCw size={15} />
            <span>Làm Mới</span>
          </button>

          <button className="btn-primary" onClick={handleExportExcel} disabled={filteredLogs.length === 0}>
            <Download size={15} />
            <span>Xuất Excel Nhật Ký ({filteredLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Mini Stats Row */}
      <div className="audit-stats-grid">
        <div className="audit-stat-card">
          <span className="stat-num">{logs.length}</span>
          <span className="stat-desc">Tổng Lượt Chỉnh Sửa</span>
        </div>
        <div className="audit-stat-card">
          <span className="stat-num">{uniqueTags}</span>
          <span className="stat-desc">Mã TagID Đã Can Thiệp</span>
        </div>
        <div className="audit-stat-card">
          <span className="stat-num text-primary">
            {totalAdjustments > 0 ? `+${totalAdjustments}` : totalAdjustments}
          </span>
          <span className="stat-desc">Tổng Số Lượng Đã Điều Chỉnh (SP)</span>
        </div>
        <div className="audit-stat-card">
          <span className="stat-num text-success">
            {logs.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
          </span>
          <span className="stat-desc">Ghi Nhận Trong Ngày Hôm Nay</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="audit-control-bar">
        <div className="action-filters">
          <button
            className={`filter-pill ${actionFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActionFilter('ALL')}
          >
            Tất cả ({logs.length})
          </button>
          <button
            className={`filter-pill ${actionFilter === 'UPDATE_QTY' ? 'active' : ''}`}
            onClick={() => setActionFilter('UPDATE_QTY')}
          >
            Sửa Số Lượng
          </button>
          <button
            className={`filter-pill ${actionFilter === 'UPDATE_ALL' ? 'active' : ''}`}
            onClick={() => setActionFilter('UPDATE_ALL')}
          >
            Cập Nhật Toàn Diện
          </button>
          <button
            className={`filter-pill ${actionFilter === 'DELETE_SCAN' ? 'active' : ''}`}
            onClick={() => setActionFilter('DELETE_SCAN')}
          >
            Xóa Quét
          </button>
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo TagID, người sửa, lý do..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="audit-table-wrapper">
        {filteredLogs.length === 0 ? (
          <div className="empty-audit-state">
            <History size={40} className="text-muted" />
            <p>Chưa có bản ghi nhật ký chỉnh sửa nào phù hợp.</p>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th style={{ width: '160px' }}>Thời Gian</th>
                <th style={{ width: '170px' }}>Mã TagID</th>
                <th style={{ width: '180px' }}>Hành Động</th>
                <th>Trước Khi Sửa</th>
                <th>Sau Khi Sửa</th>
                <th style={{ width: '120px' }}>Chênh Lệch</th>
                <th>Lý Do / Ghi Chú</th>
                <th style={{ width: '150px' }}>Người Thực Hiện</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="text-muted">{idx + 1}</td>
                  <td className="text-sm font-mono">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td>
                    <span className="table-tag-badge">#{item.tag_id}</span>
                  </td>
                  <td>
                    <span className={`log-action-pill ${item.action === 'DELETE_SCAN' ? 'pill-danger' : 'pill-info'}`}>
                      {item.action_label || item.action}
                    </span>
                  </td>
                  <td className="text-sm font-mono">{item.old_value || '--'}</td>
                  <td className="text-sm font-mono font-bold text-primary">{item.new_value || '--'}</td>
                  <td>
                    {item.difference ? (
                      <span className={`diff-badge ${item.difference > 0 ? 'diff-up' : 'diff-down'}`}>
                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                      </span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="text-sm">{item.note || 'Không có ghi chú'}</td>
                  <td className="text-sm">
                    <div className="operator-cell">
                      <User size={13} />
                      <span>{item.operator || 'Kiểm kê viên'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SQL Migration Modal */}
      {showSqlModal && (
        <div className="scanner-modal-overlay" onClick={() => setShowSqlModal(false)}>
          <div className="sql-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="sql-modal-header">
              <h3>MÃ TẠO BẢNG SUPABASE CHO SCAN_EDIT_LOGS</h3>
              <button className="btn-modal-close" onClick={() => setShowSqlModal(false)}>×</button>
            </div>
            <p className="sql-desc">
              Nếu bạn muốn lưu trữ vĩnh viễn nhật ký trên cơ sở dữ liệu Supabase đám mây, hãy copy đoạn mã dưới đây
              và dán vào <strong>Supabase SQL Editor</strong> để khởi tạo bảng:
            </p>
            <pre className="sql-code-block">{sqlCode}</pre>
            <div className="sql-modal-actions">
              <button className="btn-primary" onClick={handleCopySql}>
                {copiedSql ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedSql ? 'Đã Sao Chép SQL' : 'Sao Chép Mã SQL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
