# 미니게임 모음 사이트 — 개발 계획서

> Claude Code용 계획서. 이 문서를 기준으로 단계별로 구현한다.
> 사이트 이름(가칭): **한판 (Hanpan)** — 최종 이름은 확정 시 교체

## 1. 목표

- 브라우저에서 바로 즐기는 미니게임 모음 사이트
- 게임 종류당 1개만 제공 (스네이크, 핀볼, 지뢰찾기, 솔리테어)
- **1단계**: 게임이 끝나면 점수를 결과 화면에 보여준다 (스크린샷으로 캡처해서 공유할 수 있게). **랭킹, 닉네임, DB는 없다**
- **2단계**: DB 도입 후 **브라우저 단위**(로그인 없음)로 닉네임 + 점수 랭킹 제공
- 대기실, 매칭 같은 기능 없음
- **1차 범위는 1인 게임만.** 턴제 멀티플레이는 8장 로드맵에만 포함하고 지금은 구현하지 않는다

## 2. 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Vite + React + TypeScript (React Router로 페이지 구성) |
| 스타일 | Tailwind CSS |
| 액션 게임 | HTML5 Canvas (스네이크), Canvas + Matter.js (핀볼) |
| 격자/카드 게임 | React + DOM/CSS (지뢰찾기, 솔리테어) |
| 솔리테어 드래그 | dnd-kit (1차는 클릭 이동으로 시작해도 됨) |
| 랭킹 저장소 | 1단계 없음 → 2단계 Supabase (3-2 참고) |
| 배포 | Vercel 정적 배포 (Netlify, Cloudflare Pages도 가능) |

## 3. 점수 표시와 랭킹

### 3-1. 1단계: 점수 표시만 (랭킹 없음)

- 1단계에서는 **랭킹, 닉네임, 점수 저장을 만들지 않는다.** DB도 쓰지 않는다
- 게임이 끝나면 공통 결과 화면(`GameOverDialog`)에 점수를 크게 보여준다. 목적은 사용자가 **스크린샷으로 캡처해서 공유**하는 것이다
- 결과 화면 구성: 사이트 이름, 게임 이름, 난이도(지뢰찾기), **점수(큰 글씨)**, 다시하기 / 메인으로 버튼
- 캡처 친화 디자인: 필요한 정보가 한 화면 안에 다 들어오고, 배경은 단순하며, 모바일 세로 화면에서도 깔끔해야 한다
- 점수 표기는 `GameConfig`의 `scoreUnit`을 따른다 (예: 1,240점 / 지뢰찾기는 02:35 형식의 시간)
- 각 게임은 `onGameOver({ score, variant })`만 호출한다. 2단계에서 같은 지점에 점수 저장을 붙인다

### 3-2. 랭킹 설계 (2단계에서 구현, 1단계에서는 만들지 않는다)

#### 식별
- Supabase 익명 로그인으로 얻은 `auth.uid()`를 `playerId`로 사용한다 (3단계 멀티와 신원 통일, 8-1 참고)
- 닉네임은 최초 1회 입력받아 저장하고, 헤더에서 변경 가능 (2~12자)
- 로그인 없음. 브라우저 데이터를 지우면 기록 연결이 끊긴다는 안내 문구를 설정 화면에 표시

#### 저장소 인터페이스
랭킹 저장 로직은 인터페이스 뒤에 둔다.

```ts
interface ScoreRepository {
  submit(entry: { gameId: string; playerId: string; nickname: string; score: number }): Promise<void>;
  getTop(gameId: string, limit: number): Promise<RankEntry[]>;
  getMyBest(gameId: string, playerId: string): Promise<RankEntry | null>;
}
```

- `SupabaseScoreRepository`: Supabase 구현 (2단계)

#### 랭킹 규칙
- 게임별 `scoreOrder`로 정렬 방향 결정
  - `desc`: 높을수록 좋음 (스네이크, 핀볼, 솔리테어 점수)
  - `asc`: 낮을수록 좋음 (지뢰찾기 클리어 시간)
- 같은 playerId는 게임당 **최고 기록 1개만** 랭킹에 표시
- 지뢰찾기는 난이도별(초급/중급/고급)로 랭킹을 분리

#### Supabase 사용 시 주의
- 테이블: `scores(id, game_id, player_id, nickname, score, created_at)`
- 친구끼리/개인용이므로 별도 서버 없이 클라이언트에서 Supabase에 직접 저장 (anon key 사용)
- 점수 조작이 가능하다는 점은 감수한다. 최소한 RLS로 insert/select만 허용하고, 점수 범위 CHECK 제약을 건다
- service key는 절대 클라이언트 코드에 넣지 않는다 (anon key만 사용)
- 나중에 공개 서비스로 키우게 되면 그때 서버 검증을 도입한다

## 4. 게임 설정 구조

게임을 하나의 설정 객체로 등록하면 목록, 라우팅이 자동 생성되도록 한다 (2단계에서 랭킹 페이지도 같은 방식으로 자동 생성).

```ts
type GameConfig = {
  id: string;                 // 'snake'
  name: string;               // '스네이크'
  description: string;
  mode: 'single' | 'multi';   // 지금은 전부 'single'
  maxPlayers?: number;        // multi 전용 (나중에)
  scoreOrder: 'asc' | 'desc';
  thumbnail: string;          // '/thumbnails/snake.png'
  scoreUnit?: string;         // '점', '초'
  component: React.ComponentType<GameProps>;
};

type GameProps = {
  onGameOver: (result: { score: number; variant?: string }) => void;
};
```

- 각 게임 컴포넌트는 `onGameOver`만 호출하고, 결과 화면 표시는 공통 래퍼(`GameOverDialog`)가 처리한다. 2단계에서 이 래퍼에 점수 저장을 붙인다
- 게임 추가 = `games/<id>/` 폴더 + 설정 1건 등록으로 끝나야 한다

### 4-1. 메인 페이지

- 게임을 **썸네일 카드 그리드**로 나열한다. 데스크톱은 **4열** (`lg:grid-cols-4`), 모바일(360px)은 가독성을 위해 2열
- 카드 전체가 링크이며, 클릭/탭하면 `/games/:id`로 이동한다
- 카드 구성: 썸네일(비율 1:1 또는 4:3) + 게임 이름 (+ 한 줄 설명은 선택)
- 썸네일 이미지는 `public/thumbnails/<id>.png`. 초기에는 SVG/CSS로 만든 임시 그림으로 대체해도 된다
- hover/포커스 효과와 `alt` 텍스트를 넣는다
- 카드 목록은 `registry.ts`에서 자동 생성한다 (카드를 직접 하드코딩하지 않는다)
- 멀티 게임이 추가되면 `mode === 'multi'`인 카드에 "멀티" 배지를 표시한다

## 5. 폴더 구조

```
src/
  main.tsx
  App.tsx                     # React Router 라우트 정의
  pages/
    Home.tsx                  # 게임 카드 목록 (/)
    GamePage.tsx              # 게임 플레이 (/games/:id)
  games/
    registry.ts               # GameConfig 목록
    snake/
    pinball/
    minesweeper/
    solitaire/
  components/
    GameCard.tsx
    GameOverDialog.tsx        # 결과 화면: 점수 표시 + 다시하기 (캡처용)

# 2단계에서 추가
  pages/RankingPage.tsx       # 게임별 랭킹 (/ranking/:id)
  lib/player.ts               # playerId(auth.uid), 닉네임 관리
  lib/scores/repository.ts    # 인터페이스
  lib/scores/supabase.ts
  components/NicknameModal.tsx
  components/RankingTable.tsx
```

## 6. 게임별 명세

### 6-1. 스네이크
- Canvas, 격자 기반 (예: 20x20)
- 방향키 / WASD, 모바일은 스와이프
- 먹이 1개당 +10점, 속도는 점수에 따라 점진적으로 증가
- 벽 또는 자기 몸에 충돌 시 종료
- 일시정지(Space), 반대 방향 즉시 전환 금지
- 점수: `desc`

### 6-2. 핀볼
- Canvas + Matter.js
- 구성: 공, 좌/우 플리퍼, 범퍼 3~4개, 하단 아웃 라인
- 조작: 좌/우 방향키(또는 Z / `/`), 모바일은 화면 좌/우 터치, 스페이스로 발사
- 범퍼 점수 + 연속 타격 보너스, 공 3개 소진 시 종료
- 고정 타임스텝(예: 1/60초)으로 물리 업데이트, 탭이 비활성화되면 일시정지
- 점수: `desc`

### 6-3. 지뢰찾기
- React + DOM, 난이도 3종: 초급 9x9/10개, 중급 16x16/40개, 고급 30x16/99개
- 첫 클릭은 항상 안전 (지뢰 배치를 첫 클릭 이후에 수행)
- 좌클릭 열기, 우클릭 깃발, 숫자 칸 더블클릭(chord) 지원
- 모바일은 길게 누르기로 깃발, 깃발/열기 모드 토글 버튼 제공
- 클리어 시간과 난이도를 결과 화면에 표시 (2단계에서 난이도별 랭킹 분리)
- 점수: `asc`, 단위 초

### 6-4. 솔리테어 (클론다이크)
- React + DOM, 7개 탭 컬럼 + 4개 파운데이션 + 스톡/웨이스트
- 스톡에서 1장 뽑기 기본 (3장 뽑기는 옵션으로 추후)
- 카드 이동: 드래그 앤 드롭 + 더블클릭 시 파운데이션 자동 이동
- 실행 취소(Undo) 지원
- 점수: 윈도우 솔리테어 방식 (파운데이션 +10, 웨이스트→탭 +5 등), 클리어 시 시간 보너스
- 항상 클리어 가능한 덱 보장은 하지 않아도 됨
- 점수: `desc`

## 7. 구현 순서 (마일스톤)

**M1. 프로젝트 뼈대**
- Vite(React + TS) + Tailwind + React Router 초기화
- 레이아웃, 메인 썸네일 그리드(4열), 게임 레지스트리, 더미 게임 1개로 라우팅 확인

**M2. 공통 결과 화면**
- `GameOverDialog`: 사이트 이름, 게임 이름, 난이도, 점수(큰 글씨), 다시하기 / 메인으로 버튼
- 캡처했을 때 깔끔하게 보이는지 데스크톱/모바일에서 확인

**M3. 스네이크**
- 가장 먼저 구현해서 `onGameOver → 결과 화면 표시` 전체 흐름 검증

**M4. 지뢰찾기**
- 난이도별 결과 표시 확인 (`variant` 사용)

**M5. 솔리테어**

**M6. 핀볼**
- 물리 튜닝에 시간이 걸리므로 마지막에 진행

**M7. 마무리**
- 모바일 반응형 점검, 다크 모드, 메타 태그/OG 이미지
- Vercel 배포

각 마일스톤이 끝날 때마다 로컬에서 실행해서 직접 플레이 가능한 상태로 남긴다.

## 8. 로드맵 (지금 구현하지 않음)

### 2단계: DB 도입 + 랭킹 (3-2 참고)
- Supabase 연동 (클라이언트에서 직접 저장, RLS + CHECK 제약으로 최소한만 방어)
- 익명 로그인으로 playerId 확보, 닉네임 입력 (`NicknameModal`)
- `GameOverDialog`에 닉네임 확인 + 점수 등록 추가
- `RankingPage` / `RankingTable` 구현 (게임 설정의 `scoreOrder`, `variant`로 자동 생성)

### 3단계: 턴제 멀티플레이
- 대상: 턴제 게임만 (실시간 액션 게임은 멀티 제외)
- 1호 후보: **오목 (2인)**. 이후 오델로/체커 → 스플랜더류 보석 모으기 게임 (2~4인) 순으로 확장
- 스플랜더류는 게임 이름/그림/카드 데이터를 그대로 쓰지 않고 오리지널로 만든다 (상업 게임의 저작물 보호)
- 모든 멀티 게임은 아래 8-1의 **서버 확정 구조**를 따른다 (오목도 동일)
- 대기실 없이 **방 코드 / 링크 공유** 방식 (`/games/omok/:roomCode`)
- 통신: Supabase Realtime 또는 PartyKit
- 서버에 게임 상태(보드, 현재 차례)를 저장해 재접속 시 이어서 진행
- 규칙 검증, 턴 종료 처리, 숨겨야 하는 데이터는 전부 서버에서 처리 (8-1 참고)
- 멀티 랭킹은 점수 대신 승수/승률 기준
- 이를 위해 `GameConfig`의 `mode`, `maxPlayers` 필드를 미리 둔다 (지금은 사용 안 함)

## 8-1. 멀티 설계 원칙: 서버가 상태를 완성한다 (3단계 상세)

**핵심**: 클라이언트는 "보여도 되는 데이터"만 받는다. 숨겨야 하는 데이터는 서버에서만 다루고 클라이언트로 내려보내지 않는다. 클라이언트는 "이 행동을 하겠다"는 요청만 보내고, 검증, 계산, 턴 종료까지 서버가 완성한다. 비밀 데이터는 애초에 전송되지 않으므로 개발자 도구로 볼 수 없다.

### 신원
- Supabase **익명 로그인(Anonymous Sign-ins)**으로 `auth.uid()`를 얻어 RLS에서 "내 데이터"를 구분한다
- 3단계에서 신원이 바뀌지 않도록, **2단계(Supabase 랭킹)부터 익명 로그인의 `auth.uid()`를 `playerId`로 사용**하는 것을 권장한다
- 닉네임은 기존대로 사용자가 입력한다

### 데이터 분리 (테이블)

| 테이블 | 내용 | 클라이언트 접근 (RLS) |
|---|---|---|
| `rooms` | 방 코드, 게임 종류, 상태(waiting/playing/finished), 인원 | 참가자 읽기 |
| `room_players` | room_id, player_id, 닉네임, 좌석 번호 | 참가자 읽기 |
| `game_public` | room_id, version, state(jsonb): 보드, 토큰, 공개 카드, 점수, 현재 차례, 각자의 예약 카드 **개수** | 참가자 읽기만 (쓰기 불가) |
| `game_private` | room_id, secret(jsonb): 덱 순서 등 | **전면 차단** (서비스 롤 = Edge Function만) |
| `game_hands` | room_id, player_id, hand(jsonb): 본인만 볼 수 있는 정보 (예약한 카드 내용 등) | `player_id = auth.uid()` 본인만 읽기 |

- 클라이언트는 `game_public`과 자기 `game_hands`만 읽는다
- 클라이언트가 상태 테이블을 직접 수정하는 경로는 만들지 않는다

### 행동 처리 흐름
1. 클라이언트가 Edge Function `submit_move(roomId, move, expectedVersion)`을 호출한다 (예: `{ type: 'take_gems', gems: [...] }`)
2. 서버가 로그인 사용자와 방 참가 여부를 확인하고, 내 차례인지 확인하고, 규칙을 검증한다 (보석 개수 제한, 구매 가능 여부 등)
3. 서버가 **턴 종료까지 완성**한다: 행동 효과 적용, 덱에서 카드 보충, 귀족 방문, 보석 10개 초과 시 반환 처리, 게임 종료 판정, 다음 차례로 이동
4. 서버가 트랜잭션으로 `game_public`, `game_private`, `game_hands`를 갱신하고 `version`을 +1 한다
5. Supabase Realtime이 변경된 `game_public`(과 본인 `game_hands`)을 구독 중인 클라이언트에 전달하고, 화면이 갱신된다

- 동시 요청 방어: `expectedVersion`이 현재 `version`과 같을 때만 반영한다 (낙관적 락)
- 클라이언트는 상태를 직접 계산해서 덮어쓰지 않고, 서버가 준 상태만 렌더링한다

### 규칙 코드 구조
- 규칙은 순수 함수(`applyMove(state, move)`)로 `src/shared/` 아래에 둔다
- 서버(Edge Function)는 이 함수를 실행해 결과를 확정하고, 클라이언트는 같은 함수를 UI 보조(가능한 행동 하이라이트, 버튼 활성화)에만 쓴다
- 비밀 데이터가 필요한 계산(덱에서 카드 뽑기, 섞기)은 서버 전용 함수로 분리한다

### 부가 처리
- 재접속: 상태가 DB에 있으므로 `game_public` + 본인 `game_hands`를 다시 읽어서 복구한다
- 접속 끊김/무응답: 턴 타이머(선택)와 방 만료 정리를 둔다
- 오목처럼 숨길 정보가 없는 게임도 같은 `submit_move` 구조로 만들어, 구조를 재사용한다 (오목에서 파이프라인을 검증하고 스플랜더류로 확장)

### 비용/한계 메모
- 모두 Supabase 무료 플랜 범위로 시작할 수 있다. 무료 플랜은 Edge Function 월 호출 한도(약 50만 회로 확인, 가격 페이지 재확인)와 Realtime 동시 접속 한도가 있지만 턴제라 친구끼리는 문제없는 수준이다
- Edge Function은 호출마다 지연이 조금 있으나 턴제 게임에서는 체감되지 않는다
- 무료 프로젝트는 7일 비활성 시 일시정지된다
- 서버 로직이 더 복잡해지거나 호출 한도가 문제되면 PartyKit(방별 서버 코드)을 대안으로 검토한다

## 9. 작업 규칙 (Claude Code용)

- 한 번에 한 마일스톤만 진행하고, 끝나면 실행 방법과 확인 항목을 요약한다
- 게임 로직(순수 함수)과 렌더링을 분리한다 (예: 지뢰찾기 보드 생성/열기 로직은 별도 파일로 두고 테스트 가능하게)
- 게임 로직 핵심부(지뢰 배치, 솔리테어 이동 규칙, 스네이크 충돌)는 단위 테스트를 작성한다
- 새 외부 라이브러리는 필요한 경우에만 추가하고, 추가 이유를 알린다
- 환경변수와 시크릿은 커밋하지 않는다 (`.env.local`, `.gitignore` 확인)
- 모든 화면은 모바일 세로 화면(360px 폭)에서도 깨지지 않아야 한다

## 10. 미정 사항 (진행하며 결정)

- [ ] 최종 사이트 이름 및 도메인
- [ ] 2단계(Supabase) 착수 시점
- [ ] 디자인 톤 (레트로 오락실 vs 미니멀)
- [ ] 솔리테어 3장 뽑기 옵션 포함 여부
