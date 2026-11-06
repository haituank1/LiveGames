'use strict';
/* Đo độ trễ đường webcast: gom mẫu theo loại sự kiện, tính median/p90.
   Định nghĩa các đoạn:
     fanout = lúc sự kiện webcast tới máy này − lúc TikTok tạo sự kiện (eventTs = createTime)
              → đoạn TikTok fan-out + mạng, là đoạn user đang nghi chậm.
     local  = lúc đẩy xong cho game − lúc sự kiện tới máy này → xử lý trong LiveBridge.
     total  = fanout + local (từ lúc TikTok tạo sự kiện tới lúc game nhận).
   Lưu ý: fanout so giờ máy TikTok với giờ máy local — nếu đồng hồ local lệch thì
   fanout lệch đúng bằng độ lệch đó; xem min<0 là dấu hiệu đồng hồ local chậm.
   Chỉ giữ tối đa MAX mẫu/loại (FIFO) để không phình RAM. */
const MAX_SAMPLES = 2000;

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

class LatencyTracker {
  constructor() {
    this.samples = new Map();      // kind -> { fanout: [], local: [], total: [] }
    this.skippedClock = new Map(); // kind -> số mẫu bỏ fanout vì eventTs bất thường
  }

  /* fanoutMs = null khi không có eventTs hợp lệ (vd sự kiện giả lập): chỉ ghi local. */
  record(kind, fanoutMs, localMs) {
    let s = this.samples.get(kind);
    if (!s) { s = { fanout: [], local: [], total: [] }; this.samples.set(kind, s); }
    if (Number.isFinite(fanoutMs)) {
      s.fanout.push(fanoutMs);
      s.total.push(fanoutMs + localMs);
      if (s.fanout.length > MAX_SAMPLES) { s.fanout.shift(); s.total.shift(); }
    } else {
      this.skippedClock.set(kind, (this.skippedClock.get(kind) || 0) + 1);
    }
    s.local.push(localMs);
    if (s.local.length > MAX_SAMPLES) s.local.shift();
  }

  static statsOf(arr) {
    if (!arr.length) return { n: 0, min: null, med: null, p90: null, max: null };
    const sorted = [...arr].sort((a, b) => a - b);
    return { n: sorted.length, min: sorted[0], med: percentile(sorted, 50), p90: percentile(sorted, 90), max: sorted[sorted.length - 1] };
  }

  summary() {
    const out = {};
    for (const [kind, s] of this.samples) {
      out[kind] = {
        fanoutMs: LatencyTracker.statsOf(s.fanout),
        localMs: LatencyTracker.statsOf(s.local),
        totalMs: LatencyTracker.statsOf(s.total),
        skippedClock: this.skippedClock.get(kind) || 0,
      };
    }
    return out;
  }
}

module.exports = { LatencyTracker };
