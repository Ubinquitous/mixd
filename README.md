# Mixd

Apple Music 최근 재생 기록을 섞어 친구들과 취향 일치도, 공통곡, 공동 플레이리스트를 만드는 Next.js 앱입니다.

## 로컬 실행

1. `.env.example`을 참고해 Apple MusicKit 키를 `.env`에 설정합니다.
2. `MIXD_SESSION_SECRET`에는 충분히 긴 무작위 문자열을 넣습니다.
3. `npm install && npm run dev`를 실행합니다.

LAN이나 ngrok으로 개발 서버를 열 때는 `MIXD_DEV_ORIGINS`에 접속 호스트를 추가하고 서버를 재시작합니다. 외부 공유에는 HMR이 필요 없으므로 `npm run build && npm run start`를 사용하면 WebSocket 경고 없이 안정적으로 확인할 수 있습니다.

## 백엔드 흐름

- `POST /api/session`: MusicKit 권한 획득 후 서명된 HttpOnly 세션을 발급합니다. 이름은 입력하지 않으며 기본 표시명은 `사용자`입니다.
- `POST /api/mixd`: 최근 재생곡을 가져와 방을 만들고 안전한 초대 코드를 반환합니다.
- `POST /api/mixd/:inviteCode/join`: 현재 사용자의 최근 재생곡을 동기화하고 결과를 다시 계산합니다.
- `GET /api/mixd/:inviteCode`: 공개 방 정보만 반환하며, 참여자에게만 분석 결과를 포함합니다.
- `POST /api/mixd/:inviteCode/playlist`: 계산된 최대 50곡을 현재 사용자의 Apple Music 보관함에 저장합니다.

Music User Token은 저장하지 않습니다. 로컬 MVP 데이터는 `data/mixds.json`에 원자적으로 기록됩니다. 단일 프로세스 안에서는 쓰기 잠금을 사용하지만, 서버리스나 여러 인스턴스로 운영할 때는 이 파일 저장소를 Postgres 같은 영속 DB로 교체해야 합니다.

참고로 Apple ID의 일반적인 Sign in with Apple OAuth 토큰만으로는 Apple Music 최근 재생 기록을 읽을 수 없습니다. 음악 데이터를 사용하려면 로그인 후 MusicKit의 Apple Music 사용자 권한도 필요합니다. 현재 버튼은 이 MusicKit 권한 흐름을 사용하며 별도 이름 입력은 받지 않습니다.

## 검증

```bash
npm test
npm run lint
npm run build
```
