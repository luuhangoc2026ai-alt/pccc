import React, { useState, useRef } from 'react';
import {
  ScanBarcode,
  Maximize2,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export default function FloatingScannerBar({
  onOpenScannerModal,
  onQuickScan,
  lastScanned,
  systemBalancesMap,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [tagId, setTagId] = useState('');
  const [qty, setQty] = useState('');
  const [pos, setPos] = useState('KHO-01');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Live lookup balance info if user types tag
  const matchedBalance = tagId.trim() ? systemBalancesMap.get(tagId.trim()) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tagId.trim() || !qty) return;

    setLoading(true);
    const success = await onQuickScan({
      tag_id: tagId.trim(),
      quantity: Number(qty),
      position: pos.trim() || 'KHO-01',
    });
    setLoading(false);

    if (success) {
      setTagId('');
      setQty('');
      inputRef.current?.focus();
    }
  };

  const handleTagChange = (e) => {
    const val = e.target.value;
    setTagId(val);
    // If exact match in system, auto prefill expected qty if user hasn't typed one
    const trimmed = val.trim();
    if (trimmed && systemBalancesMap.has(trimmed) && !qty) {
      const match = systemBalancesMap.get(trimmed);
      if (match?.qty) {
        setQty(String(match.qty));
      }
      if (match?.bin) {
        setPos(match.bin);
      }
    }
  };

  return (
    <div className={`floating-dynamic-bar ${collapsed ? 'bar-collapsed' : ''}`}>
      <div className="floating-bar-inner">
        {/* Toggle collapse */}
        <button
          className="btn-collapse-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Mở rộng thanh quét nổi' : 'Thu nhỏ thanh quét nổi'}
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Left: Indicator & Last Scanned */}
        <div className="bar-status-section">
          <div className="scanner-live-badge">
            <span className="live-pulse"></span>
            <span className="badge-text">SCANNER ACTIVE</span>
          </div>

          {lastScanned ? (
            <div className="last-scan-pill">
              {lastScanned.match === 'Found' ? (
                <CheckCircle2 size={15} className="text-success" />
              ) : (
                <AlertTriangle size={15} className="text-warning" />
              )}
              <span className="pill-tag">#{lastScanned.tag_id}</span>
              <span className="pill-qty">{lastScanned.quantity} SP</span>
              <span className="pill-loc">[{lastScanned.position}]</span>
            </div>
          ) : (
            <div className="last-scan-pill pill-idle">
              <span>Sẵn sàng tiếp nhận súng bắn mã vạch...</span>
            </div>
          )}
        </div>

        {/* Middle: Fast input form */}
        {!collapsed && (
          <form className="bar-fast-form" onSubmit={handleSubmit}>
            <div className="bar-input-group bar-tag-group">
              <ScanBarcode size={16} className="bar-input-icon" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Bắn / Nhập TagID..."
                value={tagId}
                onChange={handleTagChange}
                className="bar-input bar-input-tag"
                required
              />
              {matchedBalance && (
                <span className="tag-system-preview" title={`Mã hàng: ${matchedBalance.stock_code} | Tồn: ${matchedBalance.qty}`}>
                  ✓ {matchedBalance.stock_code} ({matchedBalance.qty} SP)
                </span>
              )}
            </div>

            <div className="bar-input-group bar-qty-group">
              <input
                type="number"
                placeholder="SL"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="bar-input bar-input-qty"
                min="0.01"
                step="any"
                required
              />
            </div>

            <div className="bar-input-group bar-pos-group">
              <input
                type="text"
                placeholder="Vị trí (Bin)"
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                className="bar-input bar-input-pos"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-bar-submit"
              disabled={loading || !tagId.trim() || !qty}
            >
              <Send size={15} />
              <span>{loading ? '...' : 'Lưu'}</span>
            </button>
          </form>
        )}

        {/* Right: Expand to Full Floating Scanner Modal */}
        <div className="bar-action-section">
          <button
            className="btn-expand-scanner"
            onClick={onOpenScannerModal}
            title="Mở giao diện máy scan nổi chuyên nghiệp trên màn hình chính"
          >
            <Zap size={16} className="icon-zap" />
            <span>MÁY SCAN NỔI</span>
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
