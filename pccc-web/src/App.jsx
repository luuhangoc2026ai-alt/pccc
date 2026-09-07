import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { auditLogger, ActionTypes, ActionLabels } from './lib/auditLogger';
import { soundFX } from './lib/sound';

import Header from './components/Header';
import FloatingKPIs from './components/FloatingKPIs';
import FloatingScannerBar from './components/FloatingScannerBar';
import ScannerModal from './components/ScannerModal';
import EditModal from './components/EditModal';
import DiscrepancyCenter from './components/DiscrepancyCenter';
import DynamicDashboard from './components/DynamicDashboard';
import ComparisonMatrix from './components/ComparisonMatrix';
import AuditLogView from './components/AuditLogView';
import ExcelImport from './components/ExcelImport';

import './App.css';

function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [targetScanForEdit, setTargetScanForEdit] = useState(null);

  // Settings & Sound
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    return localStorage.getItem('pccc_sound_fx') !== 'false';
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30); // 30s default
  const [refreshing, setRefreshing] = useState(false);

  // Core Data State
  const [scans, setScans] = useState([]);
  const [balanceStats, setBalanceStats] = useState({ total: 0, tagged: 0, totalQty: 0, loading: false });
  const [systemBalancesMap, setSystemBalancesMap] = useState(new Map());
  const [auditLogs, setAuditLogs] = useState([]);
  const [lastScannedItem, setLastScannedItem] = useState(null);
  const [dbError, setDbError] = useState(null);

  // Sound FX sync
  const toggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    soundFX.enabled = next;
    localStorage.setItem('pccc_sound_fx', String(next));
    if (next) soundFX.playClick();
  };

  useEffect(() => {
    soundFX.enabled = isSoundEnabled;
  }, [isSoundEnabled]);

  // Fetch Balances for Cache / Mapping
  const fetchBalanceData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      // 1. Get exact counts
      const { count: total } = await supabase
        .from('stock_balances')
        .select('*', { count: 'exact', head: true });

      const { count: tagged } = await supabase
        .from('stock_balances')
        .select('*', { count: 'exact', head: true })
        .not('tag_id', 'is', null);

      // 2. Load up to 2500 balances for immediate lookup
      const { data: bData } = await supabase
        .from('stock_balances')
        .select('id, stock_code, warehouse, createdate, batch, bin, qty, tag_id')
        .limit(2500);

      if (bData) {
        setSystemBalancesMap((prevMap) => {
          const newMap = new Map(prevMap);
          bData.forEach((row) => {
            if (row.tag_id) {
              newMap.set(String(row.tag_id).trim(), row);
            }
            if (row.batch && !newMap.has(String(row.batch).trim())) {
              newMap.set(String(row.batch).trim(), row);
            }
          });
          return newMap;
        });

        // Approximate totalQty
        const avgQty = bData.length > 0 ? bData.reduce((acc, r) => acc + (Number(r.qty) || 0), 0) / bData.length : 0;
        const estimatedTotalQty = Math.round(avgQty * (total || bData.length));

        setBalanceStats({
          total: total || bData.length,
          tagged: tagged || bData.length,
          totalQty: estimatedTotalQty,
          loading: false,
        });
      }
    } catch (err) {
      console.warn('Balance fetch note:', err);
    }
  }, []);

  // Fetch Scans
  const fetchScans = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('stock_scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setScans(data);
        setDbError(null);

        // Fetch balances for any scanned tags not yet in memory
        const scannedTags = Array.from(new Set(data.map((s) => s.tag_id).filter(Boolean)));
        const missingTags = scannedTags.filter((t) => !systemBalancesMap.has(t));

        if (missingTags.length > 0) {
          const batchSize = 200;
          for (let i = 0; i < missingTags.length; i += batchSize) {
            const chunk = missingTags.slice(i, i + batchSize);
            const { data: chunkData } = await supabase
              .from('stock_balances')
              .select('id, stock_code, warehouse, createdate, batch, bin, qty, tag_id')
              .in('tag_id', chunk);

            if (chunkData && chunkData.length > 0) {
              setSystemBalancesMap((curr) => {
                const updated = new Map(curr);
                chunkData.forEach((b) => {
                  if (b.tag_id) updated.set(String(b.tag_id).trim(), b);
                });
                return updated;
              });
            }
          }
        }
      }
      if (error) {
        console.error(error);
        if (error.code === 'PGRST205' || error.message?.includes('stock_scans')) {
          setDbError('Bảng "stock_scans" chưa được khởi tạo trên Supabase.');
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [systemBalancesMap]);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    const logs = await auditLogger.fetchLogs();
    setAuditLogs(logs);
  }, []);

  // Refresh All Data
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchScans(), fetchBalanceData(), fetchLogs()]);
    setRefreshing(false);
  }, [fetchScans, fetchBalanceData, fetchLogs]);

  // Initial Load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto Refresh Interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const intervalId = setInterval(() => {
      refreshAll();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, refreshAll]);

  // COMPUTE DETAILED COMPARISON DATA
  const comparisonData = useMemo(() => {
    return scans.map((scan) => {
      const match = systemBalancesMap.get(scan.tag_id);
      const expectedQty = match ? Number(match.qty) : null;
      const actualQty = Number(scan.quantity);
      const delta = expectedQty !== null ? actualQty - expectedQty : null;

      return {
        id: scan.id,
        tag_id: scan.tag_id,
        scanned_quantity: actualQty,
        scanned_position: scan.position,
        stock_code: match ? match.stock_code : null,
        warehouse: match ? match.warehouse : null,
        bin: match ? match.bin : null,
        batch: match ? match.batch : null,
        expected_qty: expectedQty,
        delta,
        match: match ? 'Found' : 'Not in original',
        created_at: scan.created_at,
      };
    });
  }, [scans, systemBalancesMap]);

  // COMPUTE DISCREPANCIES LIST
  const discrepancies = useMemo(() => {
    const list = [];
    const tagCountMap = new Map();

    // Track duplicates
    scans.forEach((s) => {
      tagCountMap.set(s.tag_id, (tagCountMap.get(s.tag_id) || 0) + 1);
    });

    comparisonData.forEach((item) => {
      // 1. Quantity Mismatch
      if (item.match === 'Found' && item.delta !== 0) {
        list.push({
          type: 'QTY_MISMATCH',
          tag_id: item.tag_id,
          scan_id: item.id,
          stock_code: item.stock_code,
          warehouse: item.warehouse,
          bin: item.bin,
          batch: item.batch,
          expected_qty: item.expected_qty,
          actual_qty: item.scanned_quantity,
          scanned_position: item.scanned_position,
          delta: item.delta,
          created_at: item.created_at,
        });
      }
      // 2. Not In System
      else if (item.match !== 'Found') {
        list.push({
          type: 'NOT_IN_SYSTEM',
          tag_id: item.tag_id,
          scan_id: item.id,
          stock_code: null,
          warehouse: null,
          bin: null,
          batch: null,
          expected_qty: null,
          actual_qty: item.scanned_quantity,
          scanned_position: item.scanned_position,
          delta: null,
          created_at: item.created_at,
        });
      }

      // 3. Duplicate scan
      if ((tagCountMap.get(item.tag_id) || 0) > 1) {
        const alreadyInDup = list.some((d) => d.type === 'DUPLICATE_SCAN' && d.tag_id === item.tag_id);
        if (!alreadyInDup) {
          list.push({
            type: 'DUPLICATE_SCAN',
            tag_id: item.tag_id,
            scan_id: item.id,
            stock_code: item.stock_code,
            actual_qty: item.scanned_quantity,
            scanned_position: item.scanned_position,
            delta: item.delta,
            created_at: item.created_at,
          });
        }
      }
    });

    return list;
  }, [comparisonData, scans]);

  // COMPUTE FLOATING KPI STATS
  const stats = useMemo(() => {
    const totalScannedTags = scans.length;
    const totalScannedQty = scans.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);

    let totalMatchedExpectedQty = 0;
    let matchCount = 0;
    let qtyMismatchCount = 0;
    let unregisteredCount = 0;

    comparisonData.forEach((item) => {
      if (item.match === 'Found') {
        totalMatchedExpectedQty += Number(item.expected_qty) || 0;
        if (item.delta === 0) {
          matchCount++;
        } else {
          qtyMismatchCount++;
        }
      } else {
        unregisteredCount++;
      }
    });

    // Net variance between actual scanned and system expected for scanned tags
    const totalVarianceQty = totalScannedQty - totalMatchedExpectedQty;
    const accuracyRate = totalScannedTags > 0 ? (matchCount / totalScannedTags) * 100 : 100;

    return {
      totalSystemTags: balanceStats.tagged || balanceStats.total || 8844,
      totalSystemQty: balanceStats.totalQty || 1250000,
      totalScannedTags,
      totalScannedQty,
      totalVarianceQty,
      discrepancyCount: discrepancies.length,
      qtyMismatchCount,
      unregisteredCount,
      matchCount,
      accuracyRate,
    };
  }, [scans, comparisonData, balanceStats, discrepancies]);

  // ACTION: QUICK SCAN (from Floating Bar or Modal)
  const handleQuickScan = async ({ tag_id, quantity, position }) => {
    const trimmedTag = tag_id.trim();
    const hasDuplicate = scans.some((s) => s.tag_id === trimmedTag);

    if (hasDuplicate) {
      soundFX.playWarning();
      alert(`⚠️ Cảnh báo: Mã TagID #${trimmedTag} đã được quét trước đó trong phiên kiểm kê này!`);
      return false;
    }

    try {
      const match = systemBalancesMap.get(trimmedTag);
      const { error } = await supabase
        .from('stock_scans')
        .insert([
          {
            tag_id: trimmedTag,
            quantity: Number(quantity),
            position: position.trim(),
            source_id: match ? match.id : null,
          },
        ]);

      if (error) {
        throw error;
      }

      // Record audit log
      const expectedQty = match ? Number(match.qty) : null;
      const diff = expectedQty !== null ? Number(quantity) - expectedQty : 0;
      await auditLogger.log({
        tag_id: trimmedTag,
        action: ActionTypes.NEW_SCAN,
        action_label: ActionLabels.NEW_SCAN,
        old_value: match ? `Sổ sách: ${expectedQty} SP [${match.bin}]` : 'Mã mới ngoài hệ thống',
        new_value: `Quét: ${quantity} SP [${position}]`,
        difference: diff,
        note: match ? (diff === 0 ? 'Khớp hoàn toàn' : `Chênh lệch: ${diff > 0 ? '+' : ''}${diff} SP`) : 'Mã ngoài danh mục gốc',
        operator: 'Kiểm kê viên',
      });

      // Update state
      setLastScannedItem({
        tag_id: trimmedTag,
        quantity,
        position,
        match: match ? 'Found' : 'Unregistered',
      });

      if (diff === 0) {
        soundFX.playSuccess();
      } else {
        soundFX.playWarning();
      }

      fetchScans();
      fetchLogs();
      return true;
    } catch (err) {
      console.error(err);
      soundFX.playError();
      alert(`Lỗi lưu vào Supabase: ${err.message || 'Thao tác thất bại'}`);
      return false;
    }
  };

  // ACTION: SAVE SCAN EDIT (From Edit Modal)
  const handleSaveEdit = async ({
    id,
    tag_id,
    old_quantity,
    new_quantity,
    old_position,
    new_position,
    difference,
    reason,
    note,
    operator,
  }) => {
    try {
      const { error } = await supabase
        .from('stock_scans')
        .update({
          quantity: new_quantity,
          position: new_position,
        })
        .eq('id', id);

      if (error) throw error;

      // Log the adjustment
      await auditLogger.log({
        tag_id,
        action: ActionTypes.UPDATE_ALL,
        action_label: ActionLabels.UPDATE_ALL,
        old_value: `SL: ${old_quantity} [${old_position}]`,
        new_value: `SL: ${new_quantity} [${new_position}]`,
        difference,
        note: `${reason}${note ? ` - ${note}` : ''}`,
        operator: operator || 'Kiểm kê viên',
      });

      fetchScans();
      fetchLogs();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  // ACTION: DELETE SCAN
  const handleDeleteScan = async (targetScan, reason, note, operator) => {
    try {
      const { error } = await supabase
        .from('stock_scans')
        .delete()
        .eq('id', targetScan.id);

      if (error) throw error;

      // Log the deletion
      await auditLogger.log({
        tag_id: targetScan.tag_id,
        action: ActionTypes.DELETE_SCAN,
        action_label: ActionLabels.DELETE_SCAN,
        old_value: `SL: ${targetScan.quantity} [${targetScan.position}]`,
        new_value: 'Đã xóa bản quét',
        difference: -Number(targetScan.quantity),
        note: `${reason}${note ? ` - ${note}` : ''}`,
        operator: operator || 'Kiểm kê viên',
      });

      fetchScans();
      fetchLogs();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  // ACTION: OPEN EDIT MODAL
  const handleOpenEditModal = (item) => {
    const scanObj = scans.find((s) => s.tag_id === item.tag_id) || {
      id: item.id || item.scan_id,
      tag_id: item.tag_id,
      quantity: item.actual_qty || item.scanned_quantity || item.quantity,
      position: item.scanned_position || item.position || '01',
    };
    setTargetScanForEdit(scanObj);
    setEditModalOpen(true);
  };

  // ACTION: EXPORT COMPREHENSIVE MULTI-SHEET REPORT
  const handleExportFullReport = () => {
    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().slice(0, 10);

    // Sheet 1: KPI Summary
    const summaryRows = [
      { 'Chỉ Số KPI': 'Thời Điểm Xuất Báo Cáo', 'Giá Trị': new Date().toLocaleString() },
      { 'Chỉ Số KPI': 'Tổng Số Mã Sổ Sách Hệ Thống', 'Giá Trị': stats.totalSystemTags },
      { 'Chỉ Số KPI': 'Ước Tính Tổng SL Tồn Sổ', 'Giá Trị': stats.totalSystemQty },
      { 'Chỉ Số KPI': 'Tổng Số Mã Đã Quét Thực Tế', 'Giá Trị': stats.totalScannedTags },
      { 'Chỉ Số KPI': 'Tổng SL Thực Tế Quét Được', 'Giá Trị': stats.totalScannedQty },
      { 'Chỉ Số KPI': 'Độ Chênh Lệch Số Lượng Ròng (Delta)', 'Giá Trị': stats.totalVarianceQty },
      { 'Chỉ Số KPI': 'Số Mã Có Cảnh Báo Chênh Lệch', 'Giá Trị': stats.discrepancyCount },
      { 'Chỉ Số KPI': 'Số Mã Lệch Số Lượng', 'Giá Trị': stats.qtyMismatchCount },
      { 'Chỉ Số KPI': 'Số Mã Ngoài Hệ Thống', 'Giá Trị': stats.unregisteredCount },
      { 'Chỉ Số KPI': 'Số Mã Khớp Chuẩn 100%', 'Giá Trị': stats.matchCount },
      { 'Chỉ Số KPI': 'Độ Chính Xác Kiểm Kê (%)', 'Giá Trị': `${stats.accuracyRate.toFixed(2)}%` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Quan_KPI');

    // Sheet 2: Discrepancies
    const discRows = discrepancies.map((d, idx) => ({
      'STT': idx + 1,
      'Mã TagID': d.tag_id,
      'Loại Cảnh Báo': d.type === 'QTY_MISMATCH' ? 'Lệch Số Lượng' : d.type === 'NOT_IN_SYSTEM' ? 'Ngoài Hệ Thống' : 'Trùng Lặp',
      'Mã Hàng': d.stock_code || 'N/A',
      'Kho / Bin Sổ': `${d.warehouse || ''} / ${d.bin || ''}`,
      'SL Sổ Sách': d.expected_qty ?? 'N/A',
      'Vị Trí Quét': d.scanned_position || 'N/A',
      'SL Quét Thực Tế': d.actual_qty,
      'Chênh Lệch (Delta)': d.delta ?? 'N/A',
      'Thời Gian': d.created_at ? new Date(d.created_at).toLocaleString() : 'N/A',
    }));
    const wsDisc = XLSX.utils.json_to_sheet(discRows);
    XLSX.utils.book_append_sheet(wb, wsDisc, 'Canh_Bao_Chenh_Lech');

    // Sheet 3: Full Comparison Matrix
    const matrixRows = comparisonData.map((c, idx) => ({
      'STT': idx + 1,
      'Mã TagID': c.tag_id,
      'Mã Hàng': c.stock_code || 'N/A',
      'Kho': c.warehouse || 'N/A',
      'Bin': c.bin || 'N/A',
      'SL Sổ': c.expected_qty ?? 'N/A',
      'Vị Trí Quét': c.scanned_position || 'N/A',
      'SL Quét': c.scanned_quantity,
      'Chênh Lệch': c.delta ?? 'N/A',
      'Trạng Thái': c.match === 'Found' ? (c.delta === 0 ? 'Khớp Chuẩn' : 'Lệch SL') : 'Ngoài HT',
      'Thời Điểm Quét': c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A',
    }));
    const wsMatrix = XLSX.utils.json_to_sheet(matrixRows);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Doi_Chieu_Chi_Tiet');

    // Sheet 4: Audit Logs
    const logRows = auditLogs.map((l, idx) => ({
      'STT': idx + 1,
      'Thời Gian': new Date(l.created_at).toLocaleString(),
      'Mã TagID': l.tag_id,
      'Hành Động': l.action_label,
      'Trước Khi Sửa': l.old_value,
      'Sau Khi Sửa': l.new_value,
      'Chênh Lệch': l.difference,
      'Lý Do': l.note,
      'Người Thực Hiện': l.operator,
    }));
    const wsLogs = XLSX.utils.json_to_sheet(logRows);
    XLSX.utils.book_append_sheet(wb, wsLogs, 'Nhat_Ky_Chinh_Sua');

    XLSX.writeFile(wb, `Bao_Cao_Kiem_Ke_VPA_${dateStr}.xlsx`);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setScannerModalOpen(true)}
        discrepancyCount={discrepancies.length}
        auditLogCount={auditLogs.length}
        balanceCount={stats.totalSystemTags}
        scansCount={scans.length}
        isSoundEnabled={isSoundEnabled}
        toggleSound={toggleSound}
        refreshData={refreshAll}
        refreshing={refreshing}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
        onExportReport={handleExportFullReport}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {dbError && (
          <div className="scanner-alert alert-danger">
            <span>⚠️ {dbError}</span>
          </div>
        )}

        {/* Floating KPI Cards (Always prominent on top) */}
        <FloatingKPIs
          stats={stats}
          onNavigateToDiscrepancies={() => setActiveTab('discrepancies')}
        />

        {/* Tab View: Dashboard & Báo Cáo Linh Động */}
        {activeTab === 'dashboard' && (
          <DynamicDashboard
            stats={stats}
            scans={scans}
            discrepancies={discrepancies}
            auditLogs={auditLogs}
            onOpenScanner={() => setScannerModalOpen(true)}
            onNavigateToDiscrepancies={() => setActiveTab('discrepancies')}
            onExportFullReport={handleExportFullReport}
          />
        )}

        {/* Tab View: Trạm Quét VPA */}
        {activeTab === 'scanner' && (
          <div className="tab-scanner-container">
            <ScannerModal
              isOpen={true}
              onClose={() => setActiveTab('dashboard')}
              onSaveScan={handleQuickScan}
              scans={scans}
              systemBalancesMap={systemBalancesMap}
              isSoundEnabled={isSoundEnabled}
              toggleSound={toggleSound}
              onEditScan={handleOpenEditModal}
            />
          </div>
        )}

        {/* Tab View: Cảnh Báo Chênh Lệch & Chỉnh Sửa */}
        {activeTab === 'discrepancies' && (
          <DiscrepancyCenter
            discrepancies={discrepancies}
            onOpenEditModal={handleOpenEditModal}
            onOpenScanner={() => setScannerModalOpen(true)}
          />
        )}

        {/* Tab View: Bảng Đối Chiếu Chi Tiết */}
        {activeTab === 'matrix' && (
          <ComparisonMatrix
            comparisonData={comparisonData}
            onOpenEditModal={handleOpenEditModal}
            onRefresh={refreshAll}
            refreshing={refreshing}
          />
        )}

        {/* Tab View: Nhật Ký Chỉnh Sửa TagID (Audit Logs) */}
        {activeTab === 'logs' && (
          <AuditLogView
            logs={auditLogs}
            onRefreshLogs={fetchLogs}
            isSupabaseConfigured={isSupabaseConfigured}
          />
        )}

        {/* Tab View: Nhập Kho Gốc Excel */}
        {activeTab === 'excel' && (
          <ExcelImport
            balanceStats={balanceStats}
            onImportSuccess={refreshAll}
          />
        )}
      </main>

      {/* Floating Dynamic Bottom Scanner Bar */}
      <FloatingScannerBar
        onOpenScannerModal={() => setScannerModalOpen(true)}
        onQuickScan={handleQuickScan}
        lastScanned={lastScannedItem}
        systemBalancesMap={systemBalancesMap}
      />

      {/* Prominent Floating Scanner Overlay Modal (When opened from Header or Bar) */}
      <ScannerModal
        isOpen={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onSaveScan={handleQuickScan}
        scans={scans}
        systemBalancesMap={systemBalancesMap}
        isSoundEnabled={isSoundEnabled}
        toggleSound={toggleSound}
        onEditScan={handleOpenEditModal}
      />

      {/* Edit Modal (When adjusting a discrepancy or editing a tag) */}
      <EditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTargetScanForEdit(null);
        }}
        targetScan={targetScanForEdit}
        systemBalance={targetScanForEdit ? systemBalancesMap.get(targetScanForEdit.tag_id) : null}
        onSaveEdit={handleSaveEdit}
        onDeleteScan={handleDeleteScan}
      />
    </div>
  );
}

export default App;
