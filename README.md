# 한의원 재고관리

GitHub: https://github.com/wainny06/erowl

공용 비밀번호 로그인과 **일별 재고** 화면을 추가했습니다. 현재 재고는 기존 Supabase를 사용하고, 일별 재고 목록은 **Vercel Private Blob**에 JSON 파일로 보관합니다. Supabase에 백업 테이블을 만들지 않습니다.

## 기존 사용자: 이번 업데이트 설정

Vercel의 `erowl` 프로젝트 **Production 환경변수**에 다음을 설정합니다. 실제 값은 GitHub에 올리지 마세요.

| 이름 | 설정할 값 |
|---|---|
| `STOCK_PASSWORD` | 직원에게 공유할 12~256자 비밀번호. 길고 추측하기 어려운 값을 사용합니다. |
| `SUPABASE_URL` | 기존 `https://dectzytbigvkbizfiosu.supabase.co` 유지 |
| `SUPABASE_SECRET_KEY` | Supabase Settings → API Keys의 `sb_secret_…` 키 또는 기존 service_role 키. 서버에서만 사용합니다. |
| `CRON_SECRET` | 비밀번호와 다른, 임의의 32자 이상 문자열. Vercel 예약 호출 인증용입니다. |

`SUPABASE_PUBLISHABLE_KEY`는 새 코드에서 더 이상 사용하지 않습니다. 모든 키는 `NEXT_PUBLIC_` 접두사 없이 등록합니다. 비밀번호 미설정 시 사이트는 로그인 설정 대기 화면으로 닫히며, 서버용 Supabase 키 미설정 시 재고 요청은 실패합니다.

1. 위 환경변수를 Production에 저장합니다.
2. Vercel **Storage → Create Database → Blob → Private**로 저장소를 만들고 `erowl`의 **Production**에 연결합니다. `BLOB_READ_WRITE_TOKEN` 환경변수가 등록되어야 합니다. 공개(Public) 저장소는 사용하지 않습니다. 설치된 SDK가 사용하는 읽기·쓰기 토큰을 확인하세요.
3. 최신 GitHub 코드를 Vercel에 배포하거나 **Redeploy**하고 Ready를 기다립니다.
4. Supabase SQL Editor에서 **`supabase/04-require-server-auth.sql`**만 실행합니다. 기존 01·02번은 재실행하지 않습니다. 이 SQL은 재고를 바꾸지 않고 DB의 익명 조회·수정 권한을 제거합니다. 결과의 anon/authenticated 네 값은 false, server 두 값은 true여야 합니다.
5. 시크릿 창에서 비밀번호 없이 재고가 보이지 않는지, 로그인 후 조회·입출고가 정상인지 확인합니다.
6. 사이트 상단 **일별 재고**를 누릅니다. 첫 예약 실행 전에는 날짜 목록이 비어 있는 것이 정상입니다. 첫 실행 다음 날 해당 목록과 실제 저장 시각을 확인합니다.

**4번까지 완료해야 직접 DB로 우회하는 접근도 차단됩니다.** 로그인 화면만으로 기존 익명 DB 권한이 자동 변경되지는 않습니다. 이전 Vercel 배포는 공개 키만 사용하므로 4번 실행 후 현재 재고에 접근할 수 없습니다. 기존 GitHub에 커밋된 과거 장부 파일과 Git 기록은 이 변경으로 비공개가 되지 않습니다.

Vercel 연결 앱에서 이 프로젝트가 조회되지 않아 환경변수 등록, Blob 생성, 실제 배포 설정은 자동 수행하지 않았습니다. SQL 04도 운영 중단을 피하기 위해 자동 실행하지 않았습니다.

## 일별 재고 동작

- Vercel Cron: `0 15 * * *` (UTC), 한국 시간 자정입니다.
- Hobby 요금제는 실제 실행이 **00:00~00:59** 사이에 이루어질 수 있습니다. 정확히 00:00 시점의 결산을 보장하지 않습니다.
- 목록의 기준일은 방금 끝난 전날입니다. **수량은 실제 실행 시점**의 현재 재고이며 목록과 CSV에 실제 저장 시각을 표시합니다. 자정 이후 입력은 포함될 수 있습니다.
- 품목명, 분류, 수량, 단위, 최소 재고와 메모를 저장하고 화면에서 부족 수량을 계산합니다. 입출고 이력 전체의 백업이나 DB 복원 기능은 포함하지 않습니다.
- 저장 후의 재고 수정은 기존 날짜 목록에 반영되지 않습니다. 같은 날짜의 중복 실행은 기존 파일을 유지합니다.
- 재고 조회 또는 저장소 오류가 나면 빈 목록을 성공한 기록처럼 저장하지 않습니다. Cron 실패는 Vercel 로그에서 확인하고 당일 자정 실행 시간대에 재시도하세요. 실패한 과거 날짜를 현재 재고로 소급 생성하지 않습니다.
- 자동 저장은 Production에서만 실행됩니다. 컴퓨터나 브라우저가 켜져 있을 필요는 없습니다.
- 각 날짜를 선택해 화면 조회 또는 CSV 다운로드가 가능합니다. 삭제·보존기간 자동 정리는 없습니다. 저장소 사용량은 Vercel에서 확인합니다.
- Blob은 영구 파일 저장소입니다. 임시 서버 디스크나 브라우저 localStorage를 백업으로 사용하지 않습니다.

## 로그인 동작

- 공용 비밀번호, 12시간 만료 세션, HttpOnly·SameSite=Strict 쿠키, HTTPS에서 Secure 쿠키를 사용합니다.
- 비밀번호 변경 후 재배포하면 이전 비밀번호로 만든 세션은 무효가 됩니다. 오래된 배포 주소를 계속 사용할 수 없도록 Vercel의 이전 배포도 관리하세요.
- `/`, `/daily`, 재고 API, 일별 API 및 CSV는 서버에서 인증을 확인합니다. 쓰기 요청은 동일 출처 여부도 검사합니다.
- 로그인 실패는 서버 인스턴스/IP별 10분에 5회로 제한합니다. 이 제한은 인스턴스 메모리를 사용하므로 분산 공격 방어를 보장하지 않습니다. 필요시 Vercel Firewall에 `/api/login` 속도 제한 규칙을 추가합니다.
- 담당자 이름은 직원이 입력하는 기록용 값입니다. 공용 비밀번호로 개인 신원을 검증하지 않습니다.

## 처음 설치할 때만

Supabase SQL Editor에서 `01-schema.sql`, `02-import-snapshot.sql`, `03-verify.sql`을 순서대로 한 번씩 실행한 후, 위 설정과 `04-require-server-auth.sql`을 적용합니다. 기존 재고 사이트를 운영 중이면 초기 스냅샷을 다시 넣지 마세요.

## 개발 및 검증

Node.js 22 이상, pnpm을 사용합니다. `.env.example`을 `.env.local`로 복사하고 로컬 테스트용 값을 입력합니다.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
node tests/security-daily.cjs
pnpm build
node tests/http-auth.cjs
pnpm dev
```

보안·일별 목록 테스트는 세션 변조/만료/비밀번호 교체, API 인증, Cron 인증, 한국 날짜 경계, 중복 저장 방지, 원본 조회 실패 시 저장 방지, CSV 수식 이스케이프를 확인합니다. Blob 테스트에는 가짜 저장소를 사용하며 실제 Production 연결 및 예약 실행 검증을 대신하지 않습니다.

## 공식 문서

- https://vercel.com/docs/vercel-blob/using-blob-sdk
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://supabase.com/docs/guides/getting-started/api-keys

이번 변경의 TypeScript 검사와 프로덕션 빌드, 보안/목록 단위 검증을 통과했습니다. 브라우저 검증은 실행 환경과 브라우저 다운로드 제한으로 완료하지 못했습니다. 실제 HTTP 서버에서도 로그인, 비인증 API 차단, 다른 출처의 요청 거부를 확인했습니다. 실제 Blob 연결과 자정 작업은 설정 후 확인해야 합니다.
