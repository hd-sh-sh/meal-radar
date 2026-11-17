// =====================================================
// 급식 레이더 🍱 - 투표 API (Vercel 서버 함수)
// GET  /api/vote?dates=20261116,20261117   → 투표 수 불러오기
// POST /api/vote  {date, name, type:'up'|'down'} → 투표하기
//
// Vercel 프로젝트의 Storage 탭에서 Upstash Redis 를 연결하면
// 학교 전체가 같은 투표 수를 보게 됩니다.
// 연결하지 않으면 shared:false 를 돌려주고, 화면은 '내 기기 투표'로 동작합니다.
// =====================================================

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash Redis 에 명령 보내기
async function redis(command) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: JSON.stringify(command)
  });
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

// 날짜 하나의 투표 수 → { "20261117|잡곡밥": {up, down} }
async function readDate(date) {
  const flat = (await redis(['HGETALL', `votes:${date}`])) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) {
    const field = flat[i];                     // "잡곡밥|up"
    const count = Number(flat[i + 1]) || 0;
    const cut = field.lastIndexOf('|');
    const name = field.slice(0, cut);
    const type = field.slice(cut + 1);
    const k = `${date}|${name}`;
    out[k] = out[k] || { up: 0, down: 0 };
    out[k][type] = count;
  }
  return out;
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(200).json({ ok: true, shared: false });
  }
  try {
    if (req.method === 'POST') {
      const { date, name, type } = req.body || {};
      if (!/^\d{8}$/.test(date || '') || !name || String(name).length > 60 || !['up', 'down'].includes(type)) {
        return res.status(400).json({ ok: false, message: '잘못된 투표예요.' });
      }
      await redis(['HINCRBY', `votes:${date}`, `${name}|${type}`, 1]);
      await redis(['EXPIRE', `votes:${date}`, 60 * 60 * 24 * 60]); // 60일 뒤 자동 삭제
      return res.status(200).json({ ok: true, shared: true, votes: await readDate(date) });
    }

    const dates = String(req.query.dates || '').split(',').filter((d) => /^\d{8}$/.test(d)).slice(0, 7);
    const votes = {};
    for (const d of dates) Object.assign(votes, await readDate(d));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, shared: true, votes });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
}
