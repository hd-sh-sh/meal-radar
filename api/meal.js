// =====================================================
// 급식 레이더 🍱 - 급식 메뉴 API (Vercel 서버 함수)
// 주소: /api/meal?from=20261116&to=20261120
// - 나이스 인증키는 Vercel 환경변수 NEIS_KEY 에 넣어 둡니다 (화면 코드에 노출 안 됨)
// - 학교코드는 학교 이름으로 자동 검색합니다
// =====================================================

const ATPT_CODE = 'G10';              // 대전광역시교육청
const SCHOOL_NAME = '대전용전중학교';
const MEAL_CODE = '2';                // 1 조식, 2 중식, 3 석식

// 나이스 알레르기 번호 → 재료 이름
const ALLERGY_MAP = {
  1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두', 6: '밀', 7: '고등어',
  8: '게', 9: '새우', 10: '돼지고기', 11: '복숭아', 12: '토마토', 13: '아황산류',
  14: '호두', 15: '닭고기', 16: '쇠고기', 17: '오징어', 18: '조개류', 19: '잣'
};

let cachedSchoolCode = process.env.SCHOOL_CODE || null;

// 학교 이름으로 학교코드 찾기 (한 번 찾으면 기억)
async function getSchoolCode(key) {
  if (cachedSchoolCode) return cachedSchoolCode;
  const url = 'https://open.neis.go.kr/hub/schoolInfo?Type=json'
    + `&KEY=${key}&ATPT_OFCDC_SC_CODE=${ATPT_CODE}`
    + `&SCHUL_NM=${encodeURIComponent(SCHOOL_NAME)}`;
  const json = await (await fetch(url)).json();
  if (!json.schoolInfo) {
    throw new Error('학교를 찾지 못했어요: ' + JSON.stringify(json.RESULT || json));
  }
  cachedSchoolCode = json.schoolInfo[1].row[0].SD_SCHUL_CODE;
  return cachedSchoolCode;
}

// "잡곡밥 (5.6)<br/>크림수프(2.5.6)" → [{name, allergies}]
export function parseDishes(ddish) {
  return String(ddish || '')
    .split(/<br\s*\/?>/i)
    .map((line) => {
      line = line.trim();
      if (!line) return null;
      let allergies = [];
      const m = line.match(/\(([\d.\s]+)\)/);
      if (m) {
        allergies = m[1].split('.')
          .map((n) => ALLERGY_MAP[Number(n.trim())])
          .filter(Boolean);
      }
      const name = line
        .replace(/\([\d.\s]+\)/g, '')   // 알레르기 번호 괄호 지우기
        .replace(/[*@#&]+/g, '')        // 특수 표시 지우기
        .trim();
      return name ? { name, allergies } : null;
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  try {
    const key = process.env.NEIS_KEY;
    if (!key) throw new Error('Vercel 환경변수 NEIS_KEY 가 설정되지 않았어요.');

    const { from, to } = req.query;
    if (!/^\d{8}$/.test(from || '') || !/^\d{8}$/.test(to || '')) {
      return res.status(400).json({ ok: false, message: '날짜 형식이 올바르지 않아요.' });
    }

    const schoolCode = await getSchoolCode(key);
    const url = 'https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json'
      + `&KEY=${key}&ATPT_OFCDC_SC_CODE=${ATPT_CODE}&SD_SCHUL_CODE=${schoolCode}`
      + `&MMEAL_SC_CODE=${MEAL_CODE}&MLSV_FROM_YMD=${from}&MLSV_TO_YMD=${to}`
      + '&pIndex=1&pSize=100';
    const json = await (await fetch(url)).json();

    // 날짜별 메뉴 모으기 (급식이 없는 기간이면 빈 객체)
    const days = {};
    if (json.mealServiceDietInfo) {
      for (const r of json.mealServiceDietInfo[1].row) {
        days[r.MLSV_YMD] = parseDishes(r.DDISH_NM);
      }
    }

    // 1시간 동안 결과를 캐시해서 나이스 호출 횟수 줄이기
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ ok: true, school: SCHOOL_NAME, days });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
}
