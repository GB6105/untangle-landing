# STRUCTURE — 디렉토리 구조 가이드

이 문서는 **에이전트가 이 저장소를 빠르게 파악하고, 새 코드를 올바른 위치에 작성하도록** 돕는 지도입니다.

```
app-landing/
├── public/  # 정적 파일 저장소
│   ├── images/
│   └── icons/
│
├── app/  # 라우팅 + 페이지 진입점
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│
├── components/  # 여러 곳에서 재사용하는 작은 UI 조각
│
├── sections/  # 랜딩 페이지를 이루는 큰 단위 블록
│
├── .env.local
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── CLAUDE.md
└── AGENTS.md
```
