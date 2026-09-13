# 한의원 재고관리 — Vercel + Supabase

버전 8의 4열 대시보드, 품목 위치 선택·삭제, 입출고·폐기·실사 조정, CSV 내보내기, 과거 장부 조회를 옮긴 프로젝트입니다.

## 준비 상태

- Next.js 프로덕션 빌드와 TypeScript 검사 통과.
- Supabase SQL과 기존 사이트의 품목 38개·입출고 2건 스냅샷 준비.
- Supabase 테이블 생성, SQL 실행 검증, Vercel 배포는 아직 진행하지 않았습니다.
- 기존 Sites 사이트와 데이터는 변경하지 않았습니다.

## 0. GitHub 저장소

대상 저장소: https://github.com/wainny06/erowl

프로젝트 파일은 저장소 최상위에 배치합니다. `package.json`, `app`, `vercel.json`이 최상위에 있어야 합니다. 실제 키를 넣은 `.env.local`은 업로드하지 않습니다.

## 1. Supabase 설정

대상 프로젝트: https://dectzytbigvkbizfiosu.supabase.co

해당 프로젝트 SQL Editor에서 다음 파일을 순서대로 실행합니다.

1. `supabase/01-schema.sql`: 테이블 및 입출고 처리 함수 생성.
2. `supabase/02-import-snapshot.sql`: 기존 데이터 이전.
3. `supabase/03-verify.sql`: 이전 수량과 기록 검증.

`01-schema.sql`은 최초 1회 실행용이며, 같은 이름의 테이블이 있으면 실행을 멈춥니다. `02-import-snapshot.sql`도 동일 ID가 있으면 전체 트랜잭션이 취소됩니다. 기존 데이터 위에 덮어쓰지 않습니다.

스냅샷 추출 시점은 `supabase/source-snapshot.json`의 `captured_at`에서 확인할 수 있습니다. 실제 전환 전에 기존 사이트의 입력을 잠시 멈추고 최신 데이터를 다시 추출해야 합니다. 추출 이후의 변경은 이 파일에 자동 반영되지 않습니다. 전환 후에는 새 사이트를 사용해야 두 저장소의 값이 달라지지 않습니다.

## 2. Vercel 배포

Vercel New Project 화면에서 GitHub를 연결하고 `wainny06/erowl` 저장소의 Import를 누릅니다.

- Project Name: `kmed-stock` (기본 주소 이름은 사용 가능 여부에 따라 달라질 수 있음)
- Framework Preset: Next.js
- Root Directory: `./` (package.json이 있는 위치)
- Build Command: `pnpm build`
- Output Directory: 기본값 유지

 Node.js 22 이상, 프로젝트 프레임워크 Next.js를 사용합니다. `pnpm-lock.yaml`과 `packageManager`에 지정된 버전을 유지합니다.

Environment Variables에 다음 이름으로 **본인 Supabase 프로젝트의 실제 값**을 등록합니다. `.env.example`에는 형식 예시만 들어 있습니다. Publishable key는 Supabase 프로젝트 설정의 API Keys에서 확인합니다.

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Deploy를 실행합니다. 배포 후 로그인하지 않은 브라우저에서 재고 조회, 품목 추가·이동·삭제, 입고·출고·실사 조정이 저장되는지 확인합니다. 검증용 품목을 사용하고 실제 품목의 재고를 임의 변경하지 않습니다.

원하는 `프로젝트명.vercel.app` 주소는 Vercel에서 사용 가능 여부를 확인한 뒤 설정합니다.

## 권한과 데이터 처리

사용자 요청에 따라 링크를 가진 방문자가 로그인 없이 조회·추가·수정·삭제할 수 있는 구성입니다. 담당자 이름은 사용자가 직접 입력하는 기록용 값이며, 로그인으로 검증한 신원은 아닙니다.

기본 테이블은 RLS를 활성화하고 익명·로그인 사용자에게 직접 테이블 접근을 허용하지 않습니다. 입력값 검증, 재고 차감, 삭제 처리는 허용된 RPC 함수로만 수행합니다. 공개용 키로 이 함수들을 호출할 수 있으므로, 이 구성은 초대받은 특정 사람만을 구별하는 접근 제어가 아닙니다.

입출고 시 품목 행을 잠가 동시 출고로 음수 재고가 생기는 것을 방지하고, 동일 요청 ID의 재전송은 중복 처리하지 않습니다. 품목 삭제는 목록에서 제외하는 방식으로 기존 입출고 이력을 보존합니다.

## 로컬 실행

`.env.example`을 `.env.local`로 복사하고 `pnpm install --frozen-lockfile`, `pnpm dev`를 실행합니다. Supabase 설정이 완료되어야 실제 재고가 표시됩니다.

검증: `pnpm typecheck`, `pnpm build`.

## 참고

- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://vercel.com/docs/frameworks/full-stack/nextjs

## 소스 및 검증 범위

Sites 버전 8, 원본 commit `e29e3c73570253d1ab6952ff186660f923427c86`의 화면 코드를 사용했습니다. 이 프로젝트는 GitHub 업로드용 ZIP에서 가져왔으며 Vercel 배포는 별도로 진행해야 합니다. 기존 설치 의존성을 사용한 TypeScript 검사와 프로덕션 빌드를 확인했습니다. 이번 업로드 시 검증 결과는 아래에 기록합니다. 실제 Supabase SQL/RPC 동작은 배포 준비 단계에서 확인해야 합니다.

[GitHub 파일 업로드 안내](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## 이번 업로드 검증

- `pnpm install --frozen-lockfile`: 성공 (제공된 캐시 사용).
- `pnpm typecheck`: 성공.
- `pnpm build`: 성공. `/` 페이지 및 `/api/inventory` 서버 경로 생성 확인.
- 실제 Vercel 배포와 Supabase 연결 동작은 아직 검증하지 않았습니다.
