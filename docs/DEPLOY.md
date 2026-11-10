# 배포 가이드 (Vercel + Supabase)

행사장에서 참가자 폰 100여 대가 접속하려면, 맥에서 돌리는 개발 서버(`192.168.x.x:3000`) 대신 인터넷 주소가 필요합니다.
화면은 Vercel에 올리고, 데이터는 지금 쓰는 Supabase를 그대로 씁니다. 약 15분 걸립니다.

---

## 0. 준비물

- GitHub 저장소 `danielKim614/super-bible-verse-party`에 최신 코드가 푸시되어 있을 것
- Supabase 프로젝트 URL과 Publishable(anon) 키 (`.env.local`에 있는 값)
- Vercel 계정 (GitHub 계정으로 로그인하면 됨, 무료 Hobby 플랜으로 충분)

---

## 1. Supabase 마무리 (한 번만)

Supabase 대시보드 → **SQL Editor**에서 아직 안 돌린 파일을 순서대로 실행합니다. 이미 실행한 파일을 다시 실행해도 안전합니다.

| 파일 | 내용 |
|---|---|
| `supabase/migrations/0001_init.sql` | 테이블, 권한, 어드민 함수 (맨 아래 패스코드를 바꿔서 실행) |
| `supabase/migrations/0002_verses.sql` | 본문 테이블 |
| `supabase/migrations/0003_version.sql` | 변경 감지 함수 |
| `supabase/migrations/0004_hardening.sql` | 패스코드 대입 지연, 참가자 300명 상한, 변경 감지 경량화 |

패스코드를 바꾸고 싶으면 SQL Editor에서:

```sql
select public.admin_change_passcode('main', '현재 패스코드', '새 패스코드');
```

---

## 2. Vercel에 프로젝트 만들기

1. <https://vercel.com/new> 접속 → **Import Git Repository**에서 `super-bible-verse-party` 선택
   - 저장소가 안 보이면 "Adjust GitHub App Permissions"에서 이 저장소 접근을 허용
2. 설정 화면
   - **Framework Preset**: Next.js (자동 인식)
   - **Root Directory**: `./` 그대로
   - **Build / Output / Install Command**: 기본값 그대로 (바꾸지 않음)
3. **Environment Variables**에 아래 3개 추가

   | 이름 | 값 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` (`.env.local`과 같은 값) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` (`.env.local`과 같은 값) |
   | `NEXT_PUBLIC_GAME_ID` | `main` |

   - `STATIC_EXPORT`는 **넣지 않습니다** (로컬 테스트용 옵션)
   - `NEXT_PUBLIC_DEMO_PASSCODE`도 필요 없습니다
4. **Deploy** 클릭 → 1~2분 뒤 `https://super-bible-verse-party-xxxx.vercel.app` 같은 주소가 나옵니다

> 환경변수는 빌드할 때 화면 코드에 들어갑니다. 나중에 값을 바꾸면 Vercel → Deployments → 최신 배포 ⋯ → **Redeploy**를 해야 반영됩니다.

---

## 3. 주소 정리

배포 주소가 `https://(주소)`라면:

| 화면 | 주소 | 어디서 |
|---|---|---|
| 메인 스크린 | `https://(주소)/display` | 프로젝터에 연결한 노트북, 전체 화면(F11 / Ctrl+Cmd+F) |
| 어드민 | `https://(주소)/admin` | 오퍼레이터 노트북 |
| 참가자 | `https://(주소)/` | 메인 스크린의 QR을 찍으면 자동으로 이 주소 |

- 메인 스크린의 QR은 지금 열린 주소를 그대로 씁니다. 그래서 반드시 **배포 주소로** 메인 스크린을 열어야 합니다(로컬 주소로 열면 QR도 로컬 주소가 됨).
- 주소를 짧게 하고 싶으면 Vercel → Settings → Domains에서 `xxx.vercel.app` 이름을 바꾸거나 갖고 있는 도메인을 연결합니다.

---

## 4. 배포 후 확인 (리허설 전 10분)

1. `/admin` → 패스코드로 입장 → 상단에 **로컬 데모** 표시가 없어야 함(= Supabase 연결)
2. **본문** 탭: 로마서 8장 39절이 모두 들어가 있는지 (없으면 붙여 넣고 저장)
3. **팀·참가자** 탭: 팀 이름, 색, 말 이미지 확인
4. 폰 2~3대로 QR 접속 → 팀 선택 → 어드민 참가자 목록에 바로 뜨는지
5. 테스트로 몇 턴 진행 → 메인 스크린과 폰에 1~2초 안에 반영되는지
6. **설정** 탭 → **게임 기록 초기화** (팀과 참가자 등록은 남음)

---

## 5. 이후 수정 반영

`main` 브랜치에 푸시하면 Vercel이 자동으로 다시 배포합니다. GitHub Actions(CI)가 lint, 타입 검사, 규칙 테스트, 빌드를 함께 돌리니 배지가 초록인지 확인하세요.

```bash
npm run check   # 푸시 전에 로컬에서 lint + 타입 + 테스트
git push
```

> 행사 당일에는 푸시하지 마세요. 배포가 바뀌는 순간 열려 있던 화면들이 새 코드로 바뀌면서 연출이 끊길 수 있습니다.

---

## 6. 무료 플랜에서 주의할 점

- **Supabase 무료 프로젝트는 1주일 동안 활동이 없으면 일시 정지됩니다.** 행사 2~3일 전에 대시보드에 들어가 "Paused"가 아닌지 확인하고, 정지되어 있으면 **Restore**를 누르세요(몇 분 걸림). 리허설을 행사 주간에 하면 자연히 깨어 있습니다.
- Supabase 무료 플랜의 실시간 동시 접속은 200개까지입니다. 폰 100대 + 스크린·어드민이면 충분하지만, 한 사람이 여러 탭을 열면 각각 1개씩 쓰니 참고하세요. (실시간이 끊겨도 화면은 몇 초마다 스스로 새로 받아 오도록 되어 있습니다.)
- Vercel 미리보기 배포(브랜치·PR)도 같은 Supabase를 씁니다. 미리보기 주소에서 게임을 진행하면 본 게임 기록이 바뀌니 조심하세요.

---

## 문제가 생기면

| 증상 | 확인할 것 |
|---|---|
| 어드민에 "로컬 데모"가 뜸 | Vercel 환경변수 이름 오타, 값 넣은 뒤 Redeploy 했는지 |
| "연결 오류"가 뜸 | Supabase가 일시 정지됐는지, URL/키 값이 맞는지 |
| 패스코드가 계속 틀림 | 0001 실행 때 넣은 패스코드. 모르면 SQL Editor에서 `update public.games set admin_passcode_hash = extensions.crypt('새 패스코드', extensions.gen_salt('bf', 10)) where id = 'main';` |
| 폰에서 화면이 안 바뀜 | 폰 새로고침. 실시간이 끊겨도 4~10초 안에 따라잡음 |
| 참가가 안 됨 ("가득 찼어요") | 참가자 300명 상한. 어드민 팀·참가자 탭에서 테스트 참가자 삭제 |
