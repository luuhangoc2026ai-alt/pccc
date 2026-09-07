import React from 'react';
import {
  ScanBarcode,
  LayoutDashboard,
  AlertTriangle,
  ClipboardCheck,
  History,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  Download,
  Database
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  onOpenScanner,
  discrepancyCount,
  auditLogCount,
  balanceCount,
  scansCount,
  isSoundEnabled,
  toggleSound,
  refreshData,
  refreshing,
  autoRefreshInterval,
  setAutoRefreshInterval,
  onExportReport,
}) {
  return (
    <header className="site-header">
      <div className="header-top">
        <div className="brand-group">
          <div className="brand-icon-wrapper">
            <ScanBarcode className="brand-icon" size={24} />
            <span className="pulse-dot"></span>
          </div>
          <div>
            <div className="brand-title">
              VPA SMART AUDIT <span>PRO</span>
            </div>
            <div className="brand-subtitle">
              Hệ thống quét mã vạch & Báo cáo kiểm kê kho tự động
            </div>
          </div>
        </div>

        <div className="header-actions">
          {/* Connection & DB status */}
          <div className="header-badge db-badge" title="Dữ liệu tồn kho hệ thống">
            <Database size={14} />
            <span>HT: <strong>{balanceCount.toLocaleString()}</strong> | Quét: <strong>{scansCount.toLocaleString()}</strong></span>
          </div>

          {/* Sound toggle */}
          <button
            className={`icon-btn ${isSoundEnabled ? 'active' : ''}`}
            onClick={toggleSound}
            title={isSoundEnabled ? 'Tắt âm thanh bíp' : 'Bật âm thanh bíp máy quét'}
          >
            {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Auto refresh dropdown */}
          <div className="refresh-control" title="Tự động cập nhật báo cáo">
            <button
              className={`icon-btn ${refreshing ? 'spinning' : ''}`}
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw size={17} />
            </button>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="refresh-select"
            >
              <option value={0}>Cập nhật tay</option>
              <option value={15}>Tự động 15s</option>
              <option value={30}>Tự động 30s</option>
              <option value={60}>Tự động 60s</option>
            </select>
          </div>

          {/* Export Report */}
          <button
            className="btn-header-export"
            onClick={onExportReport}
            title="Xuất toàn bộ báo cáo đối chiếu ra Excel"
          >
            <Download size={16} />
            <span>Xuất Báo Cáo</span>
          </button>

          {/* Floating Scanner Action */}
          <button
            className="btn-scanner-launch"
            onClick={onOpenScanner}
            title="Mở giao diện máy quét nổi trên màn hình chính"
          >
            <Zap size={18} className="zap-icon" />
            <span>MÁY SCAN NỔI</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="header-nav">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard & Báo Cáo</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <ScanBarcode size={18} />
          <span>Trạm Quét VPA</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'discrepancies' ? 'active' : ''}`}
          onClick={() => setActiveTab('discrepancies')}
        >
          <AlertTriangle size={18} />
          <span>Cảnh Báo Chênh Lệch</span>
          {discrepancyCount > 0 && (
            <span className="tab-pill badge-danger">{discrepancyCount}</span>
          )}
        </button>

        <button
          className={`nav-tab ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <ClipboardCheck size={18} />
          <span>Đối Chiếu Chi Tiết</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <History size={18} />
          <span>Nhật Ký Chỉnh Sửa</span>
          {auditLogCount > 0 && (
            <span className="tab-pill badge-info">{auditLogCount}</span>
          )}
        </button>

        <button
          className={`nav-tab ${activeTab === 'excel' ? 'active' : ''}`}
          onClick={() => setActiveTab('excel')}
        >
          <FileSpreadsheet size={18} />
          <span>Nhập Kho Gốc</span>
        </button>
      </nav>
    </header>
  );
}
