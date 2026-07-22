This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 체험 소감 저장 연동 (Google Sheets)

`/register`(체험 소감) 폼 제출은 서버 액션(`app/register/actions.ts`)을 거쳐 Google Apps
Script 웹 앱으로 전달되고, 지정한 스프레드시트에 `제출일시 · 만족도(점수) · 만족도 · 아쉬운 이유 · 자유 의견`
한 줄이 추가됩니다. 만족도는 1~5점이며, 아쉬운 이유는 1~3점일 때만 채워집니다. 자유 의견은
언제나 선택입니다. 연동에는 환경변수 2개가 필요합니다.

### 1. 시트에 헤더 행 만들기

1행에 다음 컬럼을 순서대로 입력합니다.

| 제출일시 | 만족도(점수) | 만족도 | 아쉬운 이유 | 자유 의견 | 사전 신청 연락처 |
| --- | --- | --- | --- | --- | --- |

> 마지막 **사전 신청 연락처** 컬럼은 소감 폼에서 함께 받는 선택 항목이며,
> 이메일과 휴대폰 번호를 모두 받습니다. 비워둔 채 제출한 사람은 이 칸이 빈 행으로
> 쌓입니다.

### 2. Apps Script 웹 앱 배포

1. 시트에서 **확장 프로그램 → Apps Script** 를 엽니다.
2. 아래 코드를 붙여넣고 `TOKEN` 을 긴 랜덤 문자열로 바꿉니다. `SHEET_NAME` 은 저장할 탭 이름.

   ```javascript
   const TOKEN = 'PUT_A_LONG_RANDOM_STRING_HERE';
   const SHEET_NAME = 'Sheet1';

   function doPost(e) {
     try {
       const body = JSON.parse(e.postData.contents);
       if (body.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });
       const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
       sheet.appendRow([new Date(), body.rating || '', body.ratingLabel || '', body.reason || '', body.comment || '', body.contact || '']);
       return json({ ok: true });
     } catch (err) {
       return json({ ok: false, error: String(err) });
     }
   }
   function json(obj) {
     return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
   }
   ```

3. **배포 → 새 배포 → 유형: 웹 앱** / 실행: **나** / 액세스 권한: **모든 사용자** 로 배포하고,
   생성된 `/exec` URL 을 복사합니다.

> **이미 배포해 둔 스크립트가 있다면 반드시 위 코드로 갱신해 다시 배포하세요.**
> `appendRow` 에 `body.contact` 가 빠져 있으면 사전 신청 연락처가 저장되지 않습니다.
> 이때도 스크립트는 `{ ok: true }` 를 돌려주므로 서버 액션은 성공으로 판단하고,
> 사용자에게는 "출시되면 알려드릴게요" 라고 안내한 채 주소만 사라집니다.

### 3. 환경변수 설정

`.env.example` 을 참고해 `.env.local` 을 만들고 값을 채웁니다.

```bash
SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
SHEETS_WEBHOOK_TOKEN=위 Apps Script 의 TOKEN 과 동일한 값
```

Vercel 에 배포할 때는 프로젝트 **Settings → Environment Variables** 에 같은 두 값을 등록합니다.
두 값은 서버 액션에서만 사용되며 브라우저로 노출되지 않습니다.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
