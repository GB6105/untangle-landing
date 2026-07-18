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

## 사전 등록 저장 연동 (Google Sheets)

`/register` 폼 제출은 서버 액션(`app/register/actions.ts`)을 거쳐 Google Apps Script
웹 앱으로 전달되고, 지정한 스프레드시트에 `등록일시 · 휴대폰 · 이메일 · 동의` 한 줄이
추가됩니다. 연동에는 환경변수 2개가 필요합니다.

### 1. 시트에 헤더 행 만들기

1행에 다음 컬럼을 순서대로 입력합니다.

| 등록일시 | 휴대폰 | 이메일 | 동의 |
| --- | --- | --- | --- |

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
       sheet.appendRow([new Date(), body.phone || '', body.email || '', body.consent ? 'Y' : 'N']);
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
