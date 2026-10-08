# 한판 (Hanpan)

브라우저에서 바로 즐기는 미니게임 모음 사이트

## 게임

- 스네이크, 핀볼, 지뢰찾기, 솔리테어 (예정)
- 현재는 M1 단계로, 라우팅 확인용 더미 게임만 있다

## 기술 스택

Vite, React, TypeScript, Tailwind CSS, React Router

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 빌드
npm run lint     # 린트
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

## 진행 상황

- [x] M1 프로젝트 뼈대
- [ ] M2 공통 결과 화면
- [ ] M3 스네이크
- [ ] M4 지뢰찾기
- [ ] M5 솔리테어
- [ ] M6 핀볼
- [ ] M7 마무리와 배포

자세한 계획은 [PLAN.md](./PLAN.md) 참고
