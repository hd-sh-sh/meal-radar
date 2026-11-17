# 급식 레이더 🍱 (대전용전중학교)

나이스 급식 정보를 불러와 오늘/이번 주 메뉴를 보여 주고,
내 알레르기 재료가 들어간 메뉴를 빨간색으로 알려 주는 웹앱입니다.

## 파일 구성
- `index.html` : 화면 (메뉴 카드, 알레르기 선택, 투표, 인기 순위)
- `api/meal.js` : 나이스 급식 API를 대신 불러오는 서버 함수 (인증키 숨김)
- `api/vote.js` : 투표 저장 서버 함수 (Upstash Redis 연결 시 학교 전체 공유)
- `package.json` : Vercel 설정용

## 배포 방법 (Vercel)
1. 이 폴더를 GitHub 새 저장소(예: `meal-radar`)에 올립니다.
2. Vercel → Add New → Project → 저장소 선택 → Deploy
3. 프로젝트 Settings → Environment Variables 에 추가
   - 이름: `NEIS_KEY` / 값: 나이스에서 발급받은 인증키
4. Deployments 탭에서 최신 배포의 ⋯ → Redeploy (환경변수 반영)
5. 나온 주소를 휴대폰에서 열면 끝!

## (선택) 투표를 학교 전체가 함께 보게 하기
1. Vercel 프로젝트 → Storage 탭 → Upstash(Redis) 선택 → 무료 플랜으로 생성 → 프로젝트에 연결
2. 환경변수(`KV_REST_API_URL`, `KV_REST_API_TOKEN` 또는 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)가 자동으로 추가됩니다.
3. Redeploy 하면 투표가 모두에게 공유됩니다.
   연결하지 않으면 투표는 각자의 기기에만 저장됩니다.

## 다른 학교로 바꾸려면
`api/meal.js` 맨 위의 `ATPT_CODE`(시도교육청 코드)와 `SCHOOL_NAME`(학교 이름)만 바꾸세요.

## 참고
- index.html 파일만 더블클릭해서 열면 '미리보기 모드'로 예시 메뉴가 보입니다.
- 알레르기 정보는 나이스 데이터 기준 참고용입니다.
