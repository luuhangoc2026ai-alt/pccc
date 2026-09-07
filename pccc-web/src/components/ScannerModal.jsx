import React, { useState, useEffect, useRef } from 'react';
import {
  ScanBarcode,
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Info
} from 'lucide-react';
import { soundFX } from '../lib/sound';

export default function ScannerModal({
  isOpen,
  onClose,
  onSaveScan,
  scans,
  systemBalancesMap,
  isSoundEnabled,
  toggleSound,
  onEditScan,
}) {
  const [tagId, setTagId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [position, setPosition] = useState('01');
  const [rapidGunMode, setRapidGunMode] = useState(true);
  const [warningMessage, setWarningMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const tagInputRef = useRef(null);
  const qtyInputRef = useRef(null);

  // Auto focus tag input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        tagInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time lookup
  const trimmedTag = tagId.trim();
  const matchedBalance = trimmedTag ? systemBalancesMap.get(trimmedTag) : null;
  const numQty = Number(quantity);
  const systemQty = matchedBalance ? Number(matchedBalance.qty) : null;
  const variance = systemQty !== null && !isNaN(numQty) && quantity !== '' ? numQty - systemQty : null;

  // Check duplicate scan in session
  const isDuplicate = trimmedTag ? scans.some((s) => s.tag_id === trimmedTag) : false;

  const handleTagChange = (val) => {
    setTagId(val);
    setWarningMessage(null);

    const clean = val.trim();
    if (clean && systemBalancesMap.has(clean)) {
      const match = systemBalancesMap.get(clean);
      if (!quantity && match?.qty) {
        setQuantity(String(match.qty));
      }
      if (match?.bin) {
        setPosition(match.bin);
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!trimmedTag || quantity === '' || isNaN(numQty) || numQty <= 0 || !position.trim()) {
      setWarningMessage('Vui lòng nhập đầy đủ Mã TagID, Số lượng (> 0) và Vị trí!');
      soundFX.playWarning();
      return;
    }

    if (isDuplicate) {
      setWarningMessage(`Cảnh báo: TagID "${trimmedTag}" đã được quét trước đó!`);
      soundFX.playError();
      return;
    }

    setSubmitting(true);
    const result = await onSaveScan({
      tag_id: trimmedTag,
      quantity: numQty,
      position: position.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      if (variance === 0) {
        soundFX.playSuccess();
        setSuccessToast(`✓ Đã quét Tag #${trimmedTag}: Khớp chuẩn hệ thống (${numQty} SP)`);
      } else {
        soundFX.playWarning();
        setSuccessToast(`⚠️ Đã lưu Tag #${trimmedTag} với chênh lệch: ${variance > 0 ? '+' : ''}${variance} SP`);
      }

      // Reset for next scan
      setTagId('');
      if (!rapidGunMode) {
        setQuantity('');
      }
      setWarningMessage(null);
      tagInputRef.current?.focus();

      setTimeout(() => setSuccessToast(null), 3500);
    } else {
      soundFX.playError();
      setWarningMessage(result.error || 'Lỗi khi lưu dữ liệu vào hệ thống.');
    }
  };

  // Quick fill expected
  const handleFillExpected = () => {
    if (systemQty !== null) {
      setQuantity(String(systemQty));
      qtyInputRef.current?.focus();
    }
  };

  // Quick sample test
  const handleQuickTest = (sampleTag) => {
    setTagId(sampleTag);
    const match = systemBalancesMap.get(sampleTag);
    if (match) {
      setQuantity(String(match.qty));
      if (match.bin) setPosition(match.bin);
    }
    tagInputRef.current?.focus();
  };

  // 4 sample tags for easy testing
  const sampleTags = ['900002880622', '999900001054', '900002922834', '900002880615'];

  return (
    <div className="scanner-modal-overlay" onClick={onClose}>
      <div
        className="scanner-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Laser Scanning Line */}
        <div className="scanner-laser-line"></div>

        {/* Modal Header */}
        <div className="scanner-modal-header">
          <div className="scanner-header-title">
            <div className="scanner-icon-badge">
              <ScanBarcode size={26} />
            </div>
            <div>
              <h3>TRẠM QUÉT VPA THÔNG MINH</h3>
              <p>Giao diện nổi đa nhiệm • Tự động nhận diện súng quét mã vạch</p>
            </div>
          </div>

          <div className="scanner-header-tools">
            <button
              className={`tool-pill ${isSoundEnabled ? 'active' : ''}`}
              onClick={toggleSound}
              title="Bật/Tắt âm thanh"
            >
              {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{isSoundEnabled ? 'Bíp ON' : 'Bíp OFF'}</span>
            </button>

            <button
              className={`tool-pill ${rapidGunMode ? 'active-rapid' : ''}`}
              onClick={() => setRapidGunMode(!rapidGunMode)}
              title="Chế độ quét liên tục bằng súng barcode gun"
            >
              <Zap size={16} />
              <span>{rapidGunMode ? 'Súng Quét: TỰ ĐỘNG' : 'Nhập Thủ Công'}</span>
            </button>

            <button className="btn-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notification alerts */}
        {warningMessage && (
          <div className="scanner-alert alert-danger">
            <AlertTriangle size={18} />
            <span>{warningMessage}</span>
          </div>
        )}

        {successToast && (
          <div className="scanner-alert alert-success">
            <CheckCircle2 size={18} />
            <span>{successToast}</span>
          </div>
        )}

        {/* Main Workstation Layout */}
        <div className="scanner-workstation-grid">
          {/* Left: Input Form */}
          <div className="scanner-form-container">
            <form onSubmit={handleSubmit}>
              {/* TagID Big Input */}
              <div className="form-field-hero">
                <label className="hero-label">
                  <span>MÃ TAGID / MÃ VẠCH SẢN PHẨM:</span>
                  <span className="label-guide">Bắn súng quét hoặc gõ mã rồi ấn Enter</span>
                </label>
                <div className="hero-input-wrapper">
                  <ScanBarcode size={24} className="hero-input-icon" />
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagId}
                    onChange={(e) => handleTagChange(e.target.value)}
                    placeholder="VD: 900002880622"
                    className="hero-input"
                    autoComplete="off"
                    autoFocus
                  />
                  {tagId && (
                    <button
                      type="button"
                      className="btn-clear-input"
                      onClick={() => {
                        setTagId('');
                        tagInputRef.current?.focus();
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quantity & Position Row */}
              <div className="form-row-duo">
                <div className="form-field">
                  <label>
                    <span>SỐ LƯỢNG THỰC TẾ SCAN ĐƯỢC:</span>
                  </label>
                  <div className="qty-input-wrapper">
                    <input
                      ref={qtyInputRef}
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Nhập số lượng"
                      className="form-input qty-input"
                      min="0.01"
                      step="any"
                      required
                    />
                    {/* Quick Stepper */}
                    <div className="qty-steppers">
                      <button type="button" onClick={() => setQuantity((q) => String(Number(q || 0) + 1))}>+1</button>
                      <button type="button" onClick={() => setQuantity((q) => String(Number(q || 0) + 5))}>+5</button>
                      <button type="button" onClick={() => setQuantity((q) => String(Number(q || 0) + 10))}>+10</button>
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <label>
                    <span>VỊ TRÍ LƯU KHO (BIN / KHU VỰC):</span>
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="VD: 01, A-12, KHO-B"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-scanner-submit"
                disabled={submitting || !trimmedTag || !quantity}
              >
                <Zap size={20} />
                <span>{submitting ? 'ĐANG LƯU VÀO HỆ THỐNG...' : 'LƯU BẢN QUÉT & ĐỐI CHIẾU (ENTER)'}</span>
              </button>
            </form>

            {/* Quick Test Samples */}
            <div className="sample-tags-bar">
              <span className="sample-label">
                <Sparkles size={14} /> Thử nhanh mã có sẵn trong kho:
              </span>
              <div className="sample-tags-list">
                {sampleTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="sample-tag-btn"
                    onClick={() => handleQuickTest(t)}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Instant System Lookup Card */}
          <div className="scanner-lookup-container">
            <div className="lookup-header">
              <Info size={16} />
              <span>ĐỐI CHIẾU THỜI GIAN THỰC VỚI HỆ THỐNG GỐC</span>
            </div>

            {matchedBalance ? (
              <div className="system-match-card">
                <div className="match-status-badge match-found">
                  <CheckCircle2 size={16} />
                  <span>MÃ HỢP LỆ TRONG HỆ THỐNG</span>
                </div>

                <div className="match-specs-grid">
                  <div className="spec-item">
                    <span className="spec-label">Mã Hàng (Stock Code):</span>
                    <strong className="spec-value">{matchedBalance.stock_code}</strong>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Lô Sản Xuất (Batch):</span>
                    <strong className="spec-value">{matchedBalance.batch}</strong>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Kho Hệ Thống:</span>
                    <strong className="spec-value">{matchedBalance.warehouse}</strong>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Vị Trí Sổ Sách (Bin):</span>
                    <strong className="spec-value">{matchedBalance.bin}</strong>
                  </div>
                </div>

                {/* Instant Comparison Delta Preview */}
                <div className="instant-delta-box">
                  <div className="delta-numbers">
                    <div className="delta-col">
                      <span>SL Sổ Sách:</span>
                      <strong>{systemQty} SP</strong>
                    </div>
                    <ArrowRight size={18} className="delta-arrow" />
                    <div className="delta-col">
                      <span>SL Quét Thực Tế:</span>
                      <strong className={variance === 0 ? 'text-success' : 'text-danger'}>
                        {quantity ? `${quantity} SP` : '--'}
                      </strong>
                    </div>
                  </div>

                  {variance !== null && (
                    <div className={`delta-result-pill ${variance === 0 ? 'pill-match' : variance < 0 ? 'pill-deficit' : 'pill-surplus'}`}>
                      {variance === 0 ? (
                        <span>✓ Trùng khớp hoàn toàn (0 SP chênh lệch)</span>
                      ) : variance < 0 ? (
                        <span>⚠️ CHÊNH LỆCH THIẾU: {variance} SP</span>
                      ) : (
                        <span>⚠️ CHÊNH LỆCH THỪA: +{variance} SP</span>
                      )}
                    </div>
                  )}

                  {systemQty !== null && Number(quantity) !== systemQty && (
                    <button
                      type="button"
                      className="btn-fill-expected"
                      onClick={handleFillExpected}
                    >
                      Khớp với số lượng sổ sách ({systemQty})
                    </button>
                  )}
                </div>
              </div>
            ) : trimmedTag ? (
              <div className="system-match-card unregister-card">
                <div className="match-status-badge match-unregistered">
                  <AlertTriangle size={16} />
                  <span>MÃ NGOÀI HỆ THỐNG GỐC</span>
                </div>
                <p className="unregistered-notice">
                  TagID <code>{trimmedTag}</code> chưa được ghi nhận trong bảng tồn kho gốc (8,844 bản ghi).
                  Bản quét này sẽ được đánh dấu là <strong>"Hàng Thừa / Ngoài Danh Mục"</strong> để đối chiếu.
                </p>
              </div>
            ) : (
              <div className="system-match-card match-idle">
                <Layers size={36} className="idle-icon" />
                <p>Hãy bắn hoặc nhập TagID vào ô bên trái để xem thông tin tồn kho gốc tức thời.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Quick Recent Scans list */}
        <div className="scanner-recent-footer">
          <div className="recent-header">
            <span>DANH SÁCH VỪA QUÉT GẦN ĐÂY ({scans.length} lượt):</span>
          </div>
          <div className="recent-scroll-chips">
            {scans.slice(0, 8).map((s) => (
              <div key={s.id || s.tag_id} className="recent-chip">
                <span className="chip-tag">#{s.tag_id}</span>
                <span className="chip-qty">{s.quantity} SP</span>
                <span className="chip-pos">[{s.position}]</span>
                <button
                  className="chip-edit-btn"
                  onClick={() => onEditScan(s)}
                  title="Chỉnh sửa bản ghi này"
                >
                  Sửa
                </button>
              </div>
            ))}
            {scans.length === 0 && <span className="text-muted">Chưa có lượt quét nào trong phiên hiện tại.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
