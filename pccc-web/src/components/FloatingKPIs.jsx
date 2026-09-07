import React from 'react';
import {
  PackageCheck,
  ScanLine,
  Scale,
  AlertOctagon,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export default function FloatingKPIs({ stats, onNavigateToDiscrepancies }) {
  const {
    totalSystemTags = 0,
    totalSystemQty = 0,
    totalScannedTags = 0,
    totalScannedQty = 0,
    totalVarianceQty = 0,
    discrepancyCount = 0,
    qtyMismatchCount = 0,
    unregisteredCount = 0,
    matchCount = 0,
    accuracyRate = 0,
  } = stats || {};

  // Determine variance display status
  const isZeroVariance = totalVarianceQty === 0 && totalScannedTags > 0;
  const isDeficit = totalVarianceQty < 0;
  const isSurplus = totalVarianceQty > 0;

  return (
    <section className="kpi-floating-container">
      <div className="kpi-grid">
        {/* KPI 1: Sổ sách hệ thống */}
        <div className="kpi-card kpi-system">
          <div className="kpi-icon-wrapper system-color">
            <PackageCheck size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">SỔ SÁCH HỆ THỐNG</div>
            <div className="kpi-value-group">
              <span className="kpi-value">{totalSystemTags.toLocaleString()}</span>
              <span className="kpi-unit">mã Tag</span>
            </div>
            <div className="kpi-footer-sub">
              <span>Tổng SL tồn sổ:</span>
              <strong>{totalSystemQty.toLocaleString()} SP</strong>
            </div>
          </div>
          <div className="kpi-accent-bar system-accent" />
        </div>

        {/* KPI 2: Thực tế scan */}
        <div className="kpi-card kpi-scanned">
          <div className="kpi-icon-wrapper scanned-color">
            <ScanLine size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">THỰC TẾ SCAN ĐƯỢC</div>
            <div className="kpi-value-group">
              <span className="kpi-value">{totalScannedTags.toLocaleString()}</span>
              <span className="kpi-unit">mã đã quét</span>
            </div>
            <div className="kpi-footer-sub">
              <span>Tổng SL thực tế:</span>
              <strong>{totalScannedQty.toLocaleString()} SP</strong>
            </div>
          </div>
          <div className="kpi-accent-bar scanned-accent" />
        </div>

        {/* KPI 3: CHÊNH LỆCH SỐ LƯỢNG (KPI NỔI BẬT) */}
        <div className={`kpi-card kpi-variance ${isZeroVariance ? 'variance-match' : isDeficit ? 'variance-deficit' : 'variance-surplus'}`}>
          <div className="kpi-icon-wrapper variance-color">
            {isZeroVariance ? (
              <CheckCircle2 size={22} />
            ) : isDeficit ? (
              <TrendingDown size={22} />
            ) : (
              <TrendingUp size={22} />
            )}
          </div>
          <div className="kpi-content">
            <div className="kpi-label">CHÊNH LỆCH SỐ LƯỢNG (Δ)</div>
            <div className="kpi-value-group">
              <span className="kpi-value">
                {totalVarianceQty > 0 ? `+${totalVarianceQty.toLocaleString()}` : totalVarianceQty.toLocaleString()}
              </span>
              <span className="kpi-unit">SP</span>
            </div>
            <div className="kpi-badge-status">
              {isZeroVariance && <span className="pill-success">✓ Khớp hoàn hảo 100%</span>}
              {isDeficit && <span className="pill-danger">Thiếu {Math.abs(totalVarianceQty).toLocaleString()} SP so với sổ</span>}
              {isSurplus && <span className="pill-warning">Thừa +{totalVarianceQty.toLocaleString()} SP so với sổ</span>}
              {totalScannedTags === 0 && <span className="pill-neutral">Chưa có lượt quét nào</span>}
            </div>
          </div>
          <div className="kpi-accent-bar variance-accent" />
        </div>

        {/* KPI 4: CẢNH BÁO CHÊNH LỆCH CẦN CHỈNH SỬA */}
        <div
          className={`kpi-card kpi-action ${discrepancyCount > 0 ? 'kpi-has-alerts' : ''}`}
          onClick={onNavigateToDiscrepancies}
          style={{ cursor: 'pointer' }}
          title="Nhấn để xem và chỉnh sửa ngay các mã chênh lệch"
        >
          <div className="kpi-icon-wrapper action-color">
            <AlertOctagon size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">CẢNH BÁO CẦN SỬA</div>
            <div className="kpi-value-group">
              <span className="kpi-value warning-highlight">{discrepancyCount}</span>
              <span className="kpi-unit">mã cần xử lý</span>
            </div>
            <div className="kpi-action-links">
              <span>{qtyMismatchCount} lệch SL • {unregisteredCount} ngoài HT</span>
              <ArrowRight size={14} className="arrow-pulse" />
            </div>
          </div>
          <div className="kpi-accent-bar action-accent" />
        </div>

        {/* KPI 5: TỶ LỆ CHUẨN XÁC */}
        <div className="kpi-card kpi-accuracy">
          <div className="kpi-icon-wrapper accuracy-color">
            <Scale size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">ĐỘ CHÍNH XÁC KIỂM KÊ</div>
            <div className="kpi-value-group">
              <span className="kpi-value">{accuracyRate.toFixed(1)}%</span>
              <span className="kpi-unit">chuẩn xác</span>
            </div>
            <div className="kpi-progress-wrapper">
              <div className="kpi-progress-bar">
                <div
                  className="kpi-progress-fill"
                  style={{ width: `${Math.min(100, Math.max(0, accuracyRate))}%` }}
                />
              </div>
              <span className="kpi-progress-text">{matchCount} / {totalScannedTags || 0} mã khớp</span>
            </div>
          </div>
          <div className="kpi-accent-bar accuracy-accent" />
        </div>
      </div>
    </section>
  );
}
