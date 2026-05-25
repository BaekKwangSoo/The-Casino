# 🎲 Casino Royal

실시간 멀티플레이어 카지노 게임 플랫폼 — **다이사이(식보)** 구현

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 18 + Vite + Zustand |
| 백엔드 | Node.js + Express + Socket.io |
| 실시간 통신 | WebSocket (Socket.io) |
| 데이터베이스 | PostgreSQL (EC2 내 Docker) |
| 캐시 / 게임 상태 | Redis (EC2 내 Docker) |
| 인프라 | AWS EC2 + Docker Compose + Nginx |

## 프로젝트 구조

```
casino-game/
├── docker-compose.yml        # 전체 서비스 오케스트레이션
├── .env.example              # 환경변수 템플릿
├── deploy.sh                 # EC2 배포 스크립트
├── AWS_DEPLOY_GUIDE.md       # 상세 배포 가이드
│
├── backend/                  # Node.js 백엔드
│   ├── src/
│   │   ├── index.js          # 서버 진입점
│   │   ├── config/           # DB / Redis 연결
│   │   ├── routes/           # REST API (인증, 게임)
│   │   ├── socket/           # Socket.io 이벤트 핸들러
│   │   └── services/         # 게임 로직, 상태 관리
│   └── migrations/init.sql   # DB 초기화
│
├── frontend/                 # React 프론트엔드
│   └── src/
│       ├── pages/            # 메인, 로그인, 로비, 다이사이
│       ├── components/SicBo/ # 주사위, 베팅 테이블, 결과 오버레이
│       ├── socket/           # Socket.io 클라이언트
│       └── store/            # Zustand 전역 상태
│
└── nginx/nginx.conf          # 리버스 프록시 설정
```

## 게임 플로우

```
[베팅 30초] → [주사위 굴리기 3초] → [결과 10초] → [반복]

- 최대 100명 동시접속 (Socket.io Room)
- Redis: 게임 상태(페이즈, 타이머, 베팅) 실시간 저장
- PostgreSQL: 유저, 베팅 내역, 트랜잭션 영구 저장
```

## 베팅 종류 및 배당률

| 베팅 | 배당 |
|------|------|
| 대(大) / 소(小) | 1:1 |
| 홀(奇) / 짝(偶) | 1:1 |
| 합계 (4~17) | 6:1 ~ 50:1 |
| 단일 숫자 | ×1~3 |
| 더블 | ×8 |
| 모든 트리플 | ×24 |
| 특정 트리플 | ×150 |

## 로컬 개발 실행

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일에서 DB_PASSWORD, JWT_SECRET 등 입력

# 2. Docker로 전체 실행
docker compose up -d

# 3. 브라우저에서 접속
open http://localhost
```

### 개별 서비스 개발 모드

```bash
# DB/Redis만 Docker로 실행
docker compose up -d postgres redis

# 백엔드 개발 서버
cd backend && npm install && npm run dev

# 프론트엔드 개발 서버
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

## AWS 배포

`AWS_DEPLOY_GUIDE.md` 파일의 단계별 가이드를 참조하세요.

**요약:**
```bash
# EC2 접속 후
git clone https://github.com/YOUR_USERNAME/casino-royal.git
cd casino-royal
cp .env.example .env && nano .env  # 실제 값 입력
./deploy.sh
```

## 예상 AWS 비용

- EC2 t3.small: **~$17/월**
- PostgreSQL, Redis: **$0** (EC2 내 Docker)
- 신규 AWS 계정 Free Tier: t3.micro로 **무료** (12개월)
