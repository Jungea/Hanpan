# 한판 (Hanpan)

브라우저에서 바로 즐기는 미니게임 모음 사이트

## 게임

- 스네이크
- 지뢰찾기
- 클론다이크 솔리테어
- 스파이더 솔리테어
- 숫자야구
- 메모리 카드
- 2048
- 스도쿠

점수는 게임이 끝났을 때 결과 화면에 표시된다 (랭킹은 2단계 예정)

## 기술 스택

Vite, React, TypeScript, Tailwind CSS, React Router

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 빌드
npm run lint     # 린트
npm test         # 단위 테스트
```

## 폴더 구조

```
src/
  pages/         # Home, GamePage
  components/    # GameCard 등 공통 컴포넌트
  games/
    registry.ts  # 게임 설정 목록
    types.ts     # GameConfig, GameProps 타입
    <id>/        # 게임별 폴더
```

## 게임 추가 방법

1. `src/games/<id>/`에 게임 컴포넌트를 만든다
2. `src/games/registry.ts`에 설정 1건을 등록한다

메인 카드 목록과 `/games/:id` 라우팅은 레지스트리에서 자동으로 생성된다.

자세한 계획은 [PLAN.md](./PLAN.md) 참고
