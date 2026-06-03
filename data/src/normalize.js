// Pure ETL normalizers. These are the only judgment calls in the migration (spec §6.1b):
// every fallthrough to null/'led' is logged by the ETL so mis-classifications are caught.

export function parseScreenSize(raw) {
  if (raw == null) return null;
  const m = String(raw).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export function parseRefreshRate(raw) {
  if (raw == null) return null;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export function classifyResolution(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase();
  if (/8k|4320/.test(s)) return '8k';
  if (/4k|2160/.test(s)) return '4k';
  if (/1080|fhd|full hd/.test(s)) return '1080p';
  return null;
}

// Includes the product name: many QLED/ULED sets label "QLED" only in the name, while the
// spec's Display Technology says "LED"/"Full Array"/"Laser". The old Mongo $search matched on
// productName too, so name must participate or those sets become unreachable by screenType=qled
// (spec §6.1b — verified: 9 such products in sample.json, 0 for oled).
export function classifyScreenType(displayTech, televisionType, name) {
  const s = `${displayTech ?? ''} ${televisionType ?? ''} ${name ?? ''}`.toLowerCase();
  if (/oled/.test(s)) return 'oled';
  if (/qled|uled/.test(s)) return 'qled';
  if (`${displayTech ?? ''} ${televisionType ?? ''}`.trim() === '' && (name ?? '').trim() === '') return null;
  return 'led';
}

export function parseMaybeJson(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}
