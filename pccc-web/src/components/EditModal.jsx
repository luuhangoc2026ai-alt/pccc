import React, { useState, useEffect } from 'react';
import {
  Edit3,
  X,
  Save,
  Trash2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { soundFX } from '../lib/sound';

export default function EditModal({
  isOpen,
  onClose,
  targetScan,
  systemBalance,
  onSaveEdit,
  onDeleteScan,
}) {
  const [newQty, setNewQty] = useState('');
  const [newPos, setNewPos] = useState('');
  const [reason, setReason] = useState('Đếm lại thực tế');
  const [note, setNote] = useState('');
  const [operator, setOperator] = useState('Kiểm kê viên 01');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (targetScan) {
      setNewQty(String(targetScan.quantity || ''));
      setNewPos(targetScan.position || '');
      setReason('Đếm lại thực tế');
      setNote('');
      setErrorMsg(null);
    }
  }, [targetScan]);

  if (!isOpen || !targetScan) return null;

  const oldQty = Number(targetScan.quantity || 0);
  const updatedQty = Number(newQty);
  const qtyDiff = updatedQty - oldQty;
  const sysQty = systemBalance ? Number(systemBalance.qty) : null;
  const newVariance = sysQty !== null && !isNaN(updatedQty) ? updatedQty - sysQty : null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (isNaN(updatedQty) || updatedQty <= 0) {
      setErrorMsg('Vui lòng nhập số lượng hợp lệ (> 0)');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const result = await onSaveEdit({
      id: targetScan.id,
      tag_id: targetScan.tag_id,
      old_quantity: oldQty,
      new_quantity: updatedQty,
      old_position: targetScan.position,
      new_position: newPos.trim() || targetScan.position,
      difference: qtyDiff,
      reason,
      note,
      operator,
    });

    setSaving(false);
    if (result.success) {
      soundFX.playSuccess();
      onClose();
    } else {
      soundFX.playError();
      setErrorMsg(result.error || 'Lỗi khi cập nhật bản ghi.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản quét của TagID #${targetScan.tag_id}?`)) {
      return;
    }
    setSaving(true);
    const result = await onDeleteScan(targetScan, reason, note, operator);
    setSaving(false);
    if (result.success) {
      soundFX.playSuccess();
      onClose();
    } else {
      soundFX.playError();
      setErrorMsg(result.error || 'Lỗi khi xóa bản ghi.');
    }
  };

  return (
    <div className="scanner-modal-overlay" onClick={onClose}>
      <div className="edit-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-modal-header">
          <div className="edit-header-title">
            <div className="edit-icon-badge">
              <Edit3 size={20} />
            </div>
            <div>
              <h3>CHỈNH SỬA TAGID & ĐIỀU CHỈNH CHÊNH LỆCH</h3>
              <p>Mã TagID: <strong className="highlight-tag">#{targetScan.tag_id}</strong></p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="scanner-alert alert-danger">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="edit-form-body">
          {/* Reference System Balance Info */}
          {systemBalance ? (
            <div className="edit-ref-box">
              <span className="ref-title">Thông tin sổ sách hệ thống:</span>
              <div className="ref-grid">
                <div>Mã hàng: <strong>{systemBalance.stock_code}</strong></div>
                <div>Lô hàng: <strong>{systemBalance.batch}</strong></div>
                <div>Kho / Bin: <strong>{systemBalance.warehouse} / {systemBalance.bin}</strong></div>
                <div>SL tồn sổ: <strong className="text-primary">{systemBalance.qty} SP</strong></div>
              </div>
            </div>
          ) : (
            <div className="edit-ref-box ref-box-warning">
              <span>⚠️ TagID này là mã ngoài hệ thống gốc (chưa có trong bảng dữ liệu).</span>
            </div>
          )}

          {/* Form fields */}
          <div className="form-row-duo">
            <div className="form-field">
              <label>
                <span>Số lượng thực tế (Hiện tại: {oldQty}):</span>
              </label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="form-input font-bold"
                min="0.01"
                step="any"
                required
                autoFocus
              />
              {qtyDiff !== 0 && (
                <div className="edit-diff-pill">
                  {qtyDiff > 0 ? (
                    <span className="text-success"><TrendingUp size={14} /> Tăng +{qtyDiff} SP</span>
                  ) : (
                    <span className="text-danger"><TrendingDown size={14} /> Giảm {qtyDiff} SP</span>
                  )}
                </div>
              )}
            </div>

            <div className="form-field">
              <label>
                <span>Vị trí kho / Bin:</span>
              </label>
              <input
                type="text"
                value={newPos}
                onChange={(e) => setNewPos(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Resulting comparison with system */}
          {newVariance !== null && (
            <div className={`new-variance-notice ${newVariance === 0 ? 'notice-match' : 'notice-discrepancy'}`}>
              {newVariance === 0 ? (
                <span>✓ Số lượng mới khớp hoàn hảo với sổ sách ({sysQty} SP)</span>
              ) : (
                <span>
                  Chênh lệch mới so với sổ: <strong>{newVariance > 0 ? `+${newVariance}` : newVariance} SP</strong>
                </span>
              )}
            </div>
          )}

          {/* Reason & Audit info */}
          <div className="form-field">
            <label>
              <span>Lý do điều chỉnh (Bắt buộc để ghi Log):</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-input"
            >
              <option value="Đếm lại thực tế">Đếm lại thực tế</option>
              <option value="Nhập nhầm số lượng">Nhập nhầm số lượng khi quét</option>
              <option value="Hàng hư hỏng / loại bỏ">Hàng hư hỏng / loại bỏ</option>
              <option value="Hàng chuyển kho chưa cập nhật">Hàng chuyển kho chưa cập nhật</option>
              <option value="Điều chỉnh sau đối chiếu">Điều chỉnh sau đối chiếu kiểm kê</option>
              <option value="Khác">Lý do khác...</option>
            </select>
          </div>

          <div className="form-row-duo">
            <div className="form-field">
              <label>
                <span>Người thực hiện:</span>
              </label>
              <div className="input-with-icon">
                <UserCheck size={16} className="input-icon-left" />
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="form-input with-left-icon"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>
                <span>Ghi chú bổ sung (Tùy chọn):</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Đã kiểm tra lại thùng số 3..."
                className="form-input"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="edit-modal-actions">
            <button
              type="button"
              className="btn-danger-outline"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 size={16} />
              <span>Xóa Bản Quét</span>
            </button>

            <div className="actions-right">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving || !newQty}
              >
                <Save size={16} />
                <span>{saving ? 'Đang lưu...' : 'Lưu & Ghi Nhật Ký'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
