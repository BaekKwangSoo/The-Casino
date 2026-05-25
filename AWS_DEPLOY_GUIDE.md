# 🎲 Casino Royal — AWS EC2 배포 가이드

## 아키텍처 개요

```
인터넷
  │
  ▼
[EC2 인스턴스 (t3.small 권장)]
  │
  └── Docker Compose
        ├── nginx         (80/443 포트, 리버스 프록시)
        ├── frontend      (React 빌드 서빙)
        ├── backend       (Node.js + Socket.io, 100명 동시접속)
        ├── postgres      (EC2 내부, 비용 0원)
        └── redis         (게임 상태 캐시, 비용 0원)
```

---

## 1단계 — GitHub 개인 레포지토리 설정

### 1-1. GitHub 레포 생성
1. https://github.com/new 접속
2. Repository name: `casino-royal` (Private 선택)
3. README 없이 생성

### 1-2. 로컬에서 푸시
```bash
cd casino-game
git init
git add .
git commit -m "feat: initial casino project setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/casino-royal.git
git push -u origin main
```

---

## 2단계 — AWS EC2 인스턴스 생성

### 2-1. EC2 설정값
| 항목 | 권장값 | 비고 |
|------|--------|------|
| AMI | Ubuntu 22.04 LTS | 무료 tier 사용 가능 |
| Instance Type | t3.small | 2vCPU / 2GB RAM (100명 동시접속 적합) |
| Storage | 20GB gp3 | DB 데이터 포함 |
| 키 페어 | 새로 생성 (.pem 저장) | 분실 시 복구 불가 |

### 2-2. 보안 그룹 (인바운드 규칙)
| 유형 | 포트 | 소스 | 용도 |
|------|------|------|------|
| SSH | 22 | 내 IP | 서버 관리 |
| HTTP | 80 | 0.0.0.0/0 | 웹 접속 |
| HTTPS | 443 | 0.0.0.0/0 | SSL (도메인 연결 후) |

### 2-3. 탄력적 IP (Elastic IP) 설정
- EC2 대시보드 → 탄력적 IP → 주소 할당 → 인스턴스에 연결
- **중요**: 탄력적 IP 없으면 EC2 재시작 시 IP가 바뀜

---

## 3단계 — EC2 초기 환경 설정

### 3-1. EC2 접속
```bash
# 로컬 터미널에서 (Windows: Git Bash 또는 WSL 사용)
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 3-2. 시스템 업데이트 및 Docker 설치
```bash
# 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com | sudo sh

# 현재 유저를 docker 그룹에 추가 (재로그인 필요)
sudo usermod -aG docker ubuntu
newgrp docker

# Docker 버전 확인
docker --version
docker compose version
```

### 3-3. Git 설치 및 레포 클론
```bash
sudo apt install git -y

# GitHub 개인 레포 클론
git clone https://github.com/YOUR_USERNAME/casino-royal.git
cd casino-royal
```

---

## 4단계 — 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env
nano .env
```

**.env 파일 내용 (실제 값으로 교체):**
```env
NODE_ENV=production

# DB 비밀번호 (영문+숫자 조합 권장)
DB_NAME=casino_db
DB_USER=casino_user
DB_PASSWORD=MyStr0ngDBPass!

# Redis 비밀번호
REDIS_PASSWORD=MyStr0ngRedisPass!

# JWT 시크릿 (아래 명령어로 생성)
# openssl rand -hex 32
JWT_SECRET=여기에_64자리_랜덤_문자열_입력

# EC2 퍼블릭 IP 또는 도메인
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP
VITE_SOCKET_URL=http://YOUR_EC2_PUBLIC_IP
CORS_ORIGIN=http://YOUR_EC2_PUBLIC_IP
```

---

## 5단계 — Docker 빌드 및 실행

```bash
# 배포 스크립트 실행 권한 부여
chmod +x deploy.sh

# 첫 배포 실행
./deploy.sh

# 또는 직접 실행
docker compose build
docker compose up -d
```

### 실행 확인
```bash
# 컨테이너 상태 확인
docker compose ps

# 백엔드 헬스 체크
curl http://localhost/health

# 로그 확인
docker compose logs -f backend
docker compose logs -f nginx
```

---

## 6단계 — 접속 테스트

브라우저에서 `http://YOUR_EC2_PUBLIC_IP` 접속

---

## 7단계 (선택) — 도메인 + HTTPS 설정

### 7-1. 도메인 연결 (Route 53 또는 외부 DNS)
- EC2 탄력적 IP → DNS A 레코드 등록
- 예: `casino.yourdomain.com` → `YOUR_EC2_IP`

### 7-2. Let's Encrypt SSL 인증서 발급
```bash
# certbot 설치
sudo apt install certbot -y

# 인증서 발급 (80포트 임시 사용, 미리 docker compose down 필요)
docker compose down
sudo certbot certonly --standalone -d casino.yourdomain.com
docker compose up -d

# 인증서 위치
# /etc/letsencrypt/live/casino.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/casino.yourdomain.com/privkey.pem

# nginx/ssl 폴더에 심볼릭 링크
sudo ln -s /etc/letsencrypt/live/casino.yourdomain.com/fullchain.pem nginx/ssl/fullchain.pem
sudo ln -s /etc/letsencrypt/live/casino.yourdomain.com/privkey.pem nginx/ssl/privkey.pem
```

### 7-3. nginx.conf HTTPS 설정 추가
`nginx/nginx.conf` 의 server 블록에 추가:
```nginx
server {
    listen 443 ssl;
    server_name casino.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # ... 나머지 location 블록 동일
}

# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

---

## 8단계 — 이후 업데이트 배포 방법

로컬에서 코드 수정 후:
```bash
# 로컬: GitHub에 푸시
git add .
git commit -m "feat: 새로운 기능"
git push origin main

# EC2: SSH 접속 후 배포 스크립트 실행
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
cd casino-royal
./deploy.sh
```

---

## 비용 예상 (월간)

| 항목 | 사양 | 월 비용 (USD) |
|------|------|--------------|
| EC2 t3.small | 2vCPU / 2GB | ~$15 |
| EBS 스토리지 | 20GB gp3 | ~$1.6 |
| 탄력적 IP | 연결 시 | 무료 |
| 데이터 전송 | 첫 100GB | 무료 |
| **합계** | | **~$17/월** |

> PostgreSQL, Redis 모두 EC2 내 Docker로 실행하므로 DB 추가 비용 없음.
> AWS Free Tier(신규 계정 12개월) 사용 시 t3.micro로 무료 운영 가능 (단, 성능 제한).

---

## 유용한 관리 명령어

```bash
# 전체 로그 보기
docker compose logs -f

# 특정 서비스 재시작
docker compose restart backend

# DB 접속
docker compose exec postgres psql -U casino_user -d casino_db

# Redis 접속
docker compose exec redis redis-cli -a YOUR_REDIS_PASSWORD

# 디스크 사용량 확인
df -h
docker system df

# 오래된 이미지 정리
docker system prune -f
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 502 Bad Gateway | 백엔드 아직 시작 중 | `docker compose logs backend` 확인 후 대기 |
| DB 연결 오류 | .env 비밀번호 불일치 | .env 확인, `docker compose down -v && docker compose up -d` |
| 포트 80 사용 중 | 기존 프로세스 | `sudo lsof -i :80` 확인 후 종료 |
| Socket.io 연결 안됨 | CORS 설정 오류 | .env의 CORS_ORIGIN, VITE_SOCKET_URL 확인 |
| 메모리 부족 | t3.micro 사용 시 | swap 추가 또는 t3.small 업그레이드 |

### swap 메모리 추가 (t3.micro 사용 시)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
