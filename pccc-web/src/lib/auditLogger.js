import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'pccc_scan_edit_logs_v1';

export const ActionTypes = {
  UPDATE_QTY: 'UPDATE_QTY',
  UPDATE_POSITION: 'UPDATE_POSITION',
  UPDATE_ALL: 'UPDATE_ALL',
  DELETE_SCAN: 'DELETE_SCAN',
  RESOLVE_DISCREPANCY: 'RESOLVE_DISCREPANCY',
  NEW_SCAN: 'NEW_SCAN',
};

export const ActionLabels = {
  UPDATE_QTY: 'Cập nhật số lượng',
  UPDATE_POSITION: 'Điều chỉnh vị trí',
  UPDATE_ALL: 'Chỉnh sửa toàn diện',
  DELETE_SCAN: 'Xóa bản quét',
  RESOLVE_DISCREPANCY: 'Xử lý chênh lệch',
  NEW_SCAN: 'Quét mới TagID',
};

export const auditLogger = {
  // Get all local logs
  getLocalLogs() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Save to local
  saveLocalLogs(logs) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs.slice(0, 1000)));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  },

  // Record an audit log entry
  async log({
    tag_id,
    action,
    action_label,
    old_value = '',
    new_value = '',
    difference = 0,
    note = '',
    operator = 'Kiểm kê viên',
  }) {
    const logItem = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      tag_id: String(tag_id || '').trim(),
      action: action || ActionTypes.UPDATE_QTY,
      action_label: action_label || ActionLabels[action] || 'Chỉnh sửa',
      old_value: typeof old_value === 'object' ? JSON.stringify(old_value) : String(old_value ?? ''),
      new_value: typeof new_value === 'object' ? JSON.stringify(new_value) : String(new_value ?? ''),
      difference: Number(difference) || 0,
      note: String(note || '').trim(),
      operator: String(operator || 'Kiểm kê viên').trim(),
      created_at: new Date().toISOString(),
    };

    // Always update local cache first
    const current = this.getLocalLogs();
    const updated = [logItem, ...current];
    this.saveLocalLogs(updated);

    // If Supabase configured, attempt remote persistence
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('scan_edit_logs').insert([
          {
            tag_id: logItem.tag_id,
            action: logItem.action,
            old_value: logItem.old_value,
            new_value: logItem.new_value,
            difference: logItem.difference,
            note: logItem.note,
            operator: logItem.operator,
            created_at: logItem.created_at,
          },
        ]);
        if (error) {
          // If table doesn't exist, we don't break app flow, logs remain safe in localStorage
          console.info('Supabase scan_edit_logs note:', error.message);
        }
      } catch (err) {
        console.warn('Could not write log to Supabase:', err);
      }
    }

    return logItem;
  },

  // Fetch all logs (Supabase first, fallback to local)
  async fetchLogs() {
    const localLogs = this.getLocalLogs();
    if (!isSupabaseConfigured) {
      return localLogs;
    }

    try {
      const { data, error } = await supabase
        .from('scan_edit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data && data.length > 0) {
        // Map data with labels
        const mapped = data.map((d) => ({
          ...d,
          action_label: ActionLabels[d.action] || d.action || 'Chỉnh sửa',
        }));
        // Merge with local if any unique
        const dbIds = new Set(mapped.map((m) => m.created_at + m.tag_id));
        const localUnique = localLogs.filter((l) => !dbIds.has(l.created_at + l.tag_id));
        return [...localUnique, ...mapped].slice(0, 500);
      }
    } catch {
      // fallback to local
    }

    return localLogs;
  },

  // Clear logs helper
  clearLocalLogs() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  },
};
