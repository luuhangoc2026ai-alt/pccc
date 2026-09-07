import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Zap,
  BarChart3,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function DynamicDashboard({
  stats,
  scans,
  discrepancies,
  auditLogs,
  onOpenScanner,
  onNavigateToDiscrepancies,
  onExportFullReport,
}) {
  const {
    totalSystemTags = 0,
    totalScannedTags = 0,
    totalScannedQty = 0,
    discrepancyCount = 0,
    qtyMismatchCount = 0,
    unregisteredCount = 0,
    matchCount = 0,
    accuracyRate = 0,
  } = stats || {};

  // Completion percentage
  const completionRate = totalSystemTags > 0 ? ((totalScannedTags / totalSystemTags) * 100).toFixed(1) : 0;

  // Breakdown by warehouse from scans
  const warehouseMap = {};
  scans.forEach((s) => {
    const pos = s.position || 'Chưa rõ';
    warehouseMap[pos] = (warehouseMap[pos] || 0) + (Number(s.quantity) || 0);
  });
  const warehouseEntries = Object.entries(warehouseMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Status breakdown percentages
  const matchPct = totalScannedTags > 0 ? ((matchCount / totalScannedTags) * 100).toFixed(1) : 0;
  const mismatchPct = totalScannedTags > 0 ? ((qtyMismatchCount / totalScannedTags) * 100).toFixed(1) : 0;
  const unregPct = totalScannedTags > 0 ? ((unregisteredCount / totalScannedTags) * 100).toFixed(1) : 0;

  return (
    <div className="dynamic-dashboard-wrapper">
      {/* Dashboard Top Banner */}
      <div className="dashboard-hero-card">
        <div className="hero-info">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>BÁO CÁO LINH ĐỘNG THỜI GIAN THỰC</span>
          </div>
          <h2>BẢNG ĐIỀU HÀNH & KIỂM SOÁT KIỂM KÊ KHO VPA</h2>
          <p>
            Dữ liệu tự động tổng hợp trực tiếp từ Supabase và các trạm quét mã vạch.
            Theo dõi tiến độ, phân bổ chênh lệch và lịch sử điều chỉnh tức thời.
          </p>

          <div className="hero-quick-actions">
            <button className="btn-hero-primary" onClick={onOpenScanner}>
              <Zap size={18} />
              <span>Bật Máy Quét Nổi</span>
            </button>

            <button className="btn-hero-secondary" onClick={onExportFullReport}>
              <Download size={16} />
              <span>Tải Báo Cáo Tổng Hợp (Excel)</span>
            </button>
          </div>
        </div>

        <div className="hero-health-box">
          <div className="health-title">TỔNG THỂ ĐỘ CHÍNH XÁC</div>
          <div className="health-circle-val">{accuracyRate.toFixed(1)}%</div>
          <div className="health-status-text">
            {accuracyRate >= 95 ? (
              <span className="text-success font-bold">Rất Tốt • Độ tin cậy cao</span>
            ) : accuracyRate >= 80 ? (
              <span className="text-warning font-bold">Khá • Cần rà soát chênh lệch</span>
            ) : (
              <span className="text-danger font-bold">Cần Hiệu Chỉnh Ngay</span>
            )}
          </div>
          <div className="health-sub">
            Đã khớp <strong>{matchCount}</strong> / {totalScannedTags} mã quét
          </div>
        </div>
      </div>

      {/* Main Grid Sections */}
      <div className="dashboard-grid-layout">
        {/* Progress & Breakdown Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="header-icon-title">
              <BarChart3 size={18} className="text-primary" />
              <h3>PHÂN BỔ TRẠNG THÁI ĐỐI CHIẾU</h3>
            </div>
            <span className="text-muted text-sm">{totalScannedTags} mã đã kiểm kê</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="audit-segment-bar-container">
            <div className="audit-segment-bar">
              <div
                className="seg-match"
                style={{ width: `${matchPct}%` }}
                title={`Khớp: ${matchPct}%`}
              />
              <div
                className="seg-mismatch"
                style={{ width: `${mismatchPct}%` }}
                title={`Lệch SL: ${mismatchPct}%`}
              />
              <div
                className="seg-unreg"
                style={{ width: `${unregPct}%` }}
                title={`Ngoài HT: ${unregPct}%`}
              />
            </div>
          </div>

          <div className="audit-legend-grid">
            <div className="legend-item">
              <span className="legend-color-dot dot-match" />
              <div className="legend-desc">
                <span className="legend-label">Khớp Chuẩn 100%</span>
                <strong>{matchCount} mã ({matchPct}%)</strong>
              </div>
            </div>

            <div className="legend-item">
              <span className="legend-color-dot dot-mismatch" />
              <div className="legend-desc">
                <span className="legend-label">Lệch Số Lượng</span>
                <strong className="text-danger">{qtyMismatchCount} mã ({mismatchPct}%)</strong>
              </div>
            </div>

            <div className="legend-item">
              <span className="legend-color-dot dot-unreg" />
              <div className="legend-desc">
                <span className="legend-label">Ngoài Hệ Thống Gốc</span>
                <strong className="text-warning">{unregisteredCount} mã ({unregPct}%)</strong>
              </div>
            </div>
          </div>

          {/* Detailed Progress to total */}
          <div className="audit-system-completion">
            <div className="completion-header">
              <span>Tiến độ kiểm đếm trên tổng kho:</span>
              <strong>{completionRate}%</strong>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
              />
            </div>
            <span className="text-xs text-muted">
              {totalScannedTags.toLocaleString()} mã đã quét / {totalSystemTags.toLocaleString()} mã trong sổ sách gốc
            </span>
          </div>
        </div>

        {/* Location & Warehouse Breakdown */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="header-icon-title">
              <MapPin size={18} className="text-primary" />
              <h3>SẢN LƯỢNG QUÉT THEO VỊ TRÍ (BIN)</h3>
            </div>
            <span className="text-muted text-sm">{warehouseEntries.length} vị trí ghi nhận</span>
          </div>

          <div className="location-list">
            {warehouseEntries.length === 0 ? (
              <div className="empty-mini-state">
                <p>Chưa có dữ liệu vị trí nào được quét.</p>
              </div>
            ) : (
              warehouseEntries.map(([bin, count]) => {
                const pct = totalScannedQty > 0 ? ((count / totalScannedQty) * 100).toFixed(0) : 0;
                return (
                  <div key={bin} className="loc-item-row">
                    <div className="loc-meta">
                      <span className="loc-tag">BIN {bin}</span>
                      <strong className="loc-qty">{count.toLocaleString()} SP</strong>
                    </div>
                    <div className="loc-bar-bg">
                      <div className="loc-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="loc-pct">{pct}%</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Discrepancies Alerts Preview */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="header-icon-title">
              <AlertTriangle size={18} className="text-danger" />
              <h3>CẢNH BÁO CHÊNH LỆCH CẦN XỬ LÝ ({discrepancyCount})</h3>
            </div>
            {discrepancyCount > 0 && (
              <button className="btn-link-action" onClick={onNavigateToDiscrepancies}>
                <span>Xử lý tất cả</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className="mini-discrepancy-feed">
            {discrepancies.length === 0 ? (
              <div className="empty-mini-state">
                <CheckCircle2 size={32} className="text-success" />
                <p>Không có cảnh báo chênh lệch nào cần xử lý.</p>
              </div>
            ) : (
              discrepancies.slice(0, 4).map((d) => (
                <div key={d.tag_id} className="mini-disc-item">
                  <div className="disc-left">
                    <span className="disc-tag">#{d.tag_id}</span>
                    <span className="disc-sub">{d.stock_code ? `Mã: ${d.stock_code}` : 'Ngoài hệ thống'}</span>
                  </div>
                  <div className="disc-right">
                    {d.delta !== undefined && d.delta !== null ? (
                      <span className={`disc-pill ${d.delta < 0 ? 'pill-deficit' : 'pill-surplus'}`}>
                        {d.delta > 0 ? `+${d.delta}` : d.delta} SP
                      </span>
                    ) : (
                      <span className="disc-pill pill-unreg">Ngoài HT</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log Activity Preview */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="header-icon-title">
              <Clock size={18} className="text-primary" />
              <h3>NHẬT KÝ ĐIỀU CHỈNH GẦN ĐÂY ({auditLogs.length})</h3>
            </div>
            <span className="text-muted text-sm">Ghi nhận minh bạch</span>
          </div>

          <div className="mini-audit-feed">
            {auditLogs.length === 0 ? (
              <div className="empty-mini-state">
                <p>Chưa có thao tác chỉnh sửa TagID nào được thực hiện.</p>
              </div>
            ) : (
              auditLogs.slice(0, 4).map((log, idx) => (
                <div key={log.id || idx} className="mini-log-item">
                  <div className="log-top">
                    <span className="log-tag">#{log.tag_id}</span>
                    <span className="log-time">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="log-bottom">
                    <span className="log-action">{log.action_label}</span>
                    <span className="log-detail font-mono">{log.old_value} ➔ {log.new_value}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
