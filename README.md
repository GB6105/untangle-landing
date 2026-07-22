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

> ### ⚠️ 배포 전에 반드시 해야 하는 일
>
> 소감 폼에 **사전 신청 연락처**(이메일 또는 휴대폰 번호)가 추가되었습니다.
> Apps Script를 갱신하지 않으면 **연락처가 저장되지 않은 채 사용자에게는 성공으로 보입니다.**
> 스크립트가 `{ ok: true }` 를 돌려주므로 서버 액션은 정상 처리로 판단하고,
> 화면에는 "준비가 되면 남겨주신 연락처로 가장 먼저 알려드릴게요" 가 그대로 뜹니다.
>
> 1. 시트 1행 맨 끝에 **`사전 신청 연락처`** 컬럼을 추가합니다. (아래 [1단계](#1-시트에-헤더-행-만들기))
> 2. Apps Script의 `appendRow` 마지막에 **`body.contact || ''`** 를 추가합니다. (아래 [2단계](#2-apps-script-웹-앱-배포))
>    - 이전에 `body.email` 로 만들어 두셨다면 **`body.contact` 로 바꿔야 합니다.** 필드 이름이 바뀌었습니다.
> 3. **배포 → 배포 관리 → 새 버전**으로 다시 배포합니다. 코드만 저장하면 반영되지 않습니다.
> 4. `/register` 에서 연락처를 넣어 제출해 보고, 시트 마지막 칸에 값이 들어오는지 확인합니다.
>
> 연락처는 **정식 출시 안내를 보낸 뒤 즉시 파기**하기로 되어 있습니다([개인정보 처리방침](app/privacy/page.tsx) 3절).
> 시트에 쌓인 연락처도 안내 발송 후 직접 지워 주세요.

`/register`(체험 소감) 폼 제출은 서버 액션(`app/register/actions.ts`)을 거쳐 Google Apps
Script 웹 앱으로 전달되고, 지정한 스프레드시트에
`제출일시 · 만족도(점수) · 만족도 · 아쉬운 이유 · 자유 의견 · 사전 신청 연락처`
한 줄이 추가됩니다. 만족도는 1~5점이며, 아쉬운 이유는 1~3점일 때만 채워집니다. 자유 의견과
사전 신청 연락처는 언제나 선택이라 비어 있을 수 있습니다. 연동에는 환경변수 2개가 필요합니다.

### 1. 시트에 헤더 행 만들기

1행에 다음 컬럼을 순서대로 입력합니다.

| 제출일시 | 만족도(점수) | 만족도 | 아쉬운 이유 | 자유 의견 | 사전 신청 연락처 |
| --- | --- | --- | --- | --- | --- |

> 마지막 **사전 신청 연락처** 컬럼은 소감 폼에서 함께 받는 선택 항목이며,
> 이메일과 휴대폰 번호를 모두 받습니다. 비워둔 채 제출한 사람은 이 칸이 빈 행으로
> 쌓입니다.

### 2. Apps Script 웹 앱 배포

1. 시트에서 **확장 프로그램 → Apps Script** 를 엽니다.
2. 아래 코드를 붙여넣고 `TOKEN` 을 긴 랜덤 문자열로 바꿉니다.

   > **`SHEET_NAME` 주의** — 한국어 환경에서 만든 시트의 기본 탭 이름은 `Sheet1` 이 아니라
   > **`시트1`** 입니다. 이름이 어긋나면 `getSheetByName` 이 `null` 을 돌려주고
   > `TypeError: Cannot read properties of null (reading 'appendRow')` 로 실패합니다.
   > 아래 코드는 못 찾으면 첫 번째 탭으로 넘어가므로 이름이 무엇이든 동작합니다.

   ```javascript
   const TOKEN = 'PUT_A_LONG_RANDOM_STRING_HERE';
   const SHEET_NAME = '시트1';

   function doPost(e) {
     try {
       const body = JSON.parse(e.postData.contents);
       if (body.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });
       const ss = SpreadsheetApp.getActiveSpreadsheet();
       // 이름이 어긋나도 죽지 않게 — 못 찾으면 첫 번째 탭에 쓴다.
       const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
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

### 4. 연동이 안 될 때 — 웹훅만 따로 찔러보기

브라우저로 `/exec` URL 을 여는 것은 **점검 방법이 아닙니다.** 이 스크립트에는 `doGet` 이 없어서
`다음 스크립트 함수(doGet)를 찾을 수 없습니다` 가 뜨는 게 정상입니다. 아래처럼 POST 로 확인하세요.

```bash
# 1) 배포가 살아 있는지 — 일부러 틀린 토큰. 시트에는 아무것도 쓰이지 않습니다.
curl -sL -X POST "$SHEETS_WEBHOOK_URL" -H 'Content-Type: application/json' \
  -d '{"token":"wrong","rating":5}'
```

| 응답 | 뜻 |
| --- | --- |
| `{"ok":false,"error":"unauthorized"}` | 배포·권한 정상. 토큰만 맞추면 됩니다. |
| `{"ok":false,"error":"TypeError: ... (reading 'appendRow')"}` | 탭 이름이 `SHEET_NAME` 과 다릅니다 (위 2단계 주의 상자). |
| HTML 로그인 페이지 | 액세스 권한이 **모든 사용자** 가 아닙니다. |
| 404 | 배포가 없거나 URL 이 틀렸습니다. |

> **코드를 고친 뒤에는 반드시 다시 배포하세요.** `/exec` 는 버전이 고정된 URL이라 저장만으로는
> 반영되지 않습니다. **배포 → 배포 관리 → (연필) → 버전: 새 버전 → 배포** 로 갱신하면 URL 이
> 유지됩니다. `새 배포` 를 누르면 URL 이 바뀌어 `.env.local` 도 함께 고쳐야 합니다.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
