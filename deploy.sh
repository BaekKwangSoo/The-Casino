#!/bin/bash
# ══════════════════════════════════════════════════════════
#  Casino Royal — EC2 배포 스크립트
#  사용법: chmod +x deploy.sh && ./deploy.sh
# ══════════════════════════════════════════════════════════

set -e  # 오류 발생 시 즉시 중단

echo "🎲 Casino Royal 배포 시작..."

# ── .env 파일 확인 ─────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "❌ .env 파일이 없습니다. .env.example을 복사하고 값을 채워주세요."
  echo "   cp .env.example .env && nano .env"
  exit 1
fi

# ── 최신 소스 pull ─────────────────────────────────────
echo "📥 GitHub에서 최신 코드 가져오기..."
git pull origin main

# ── 이미지 빌드 ───────────────────────────────────────
echo "🔨 Docker 이미지 빌드..."
docker compose build --no-cache

# ── 기존 컨테이너 중단 및 재시작 ──────────────────────
echo "🔄 컨테이너 재시작..."
docker compose down
docker compose up -d

# ── 실행 확인 ─────────────────────────────────────────
echo "⏳ 서비스 시작 대기 (15초)..."
sleep 15

echo "✅ 컨테이너 상태:"
docker compose ps

echo ""
echo "🏥 헬스 체크:"
curl -sf http://localhost/health && echo " ← 백엔드 정상" || echo " ← 백엔드 응답 없음 (로그 확인 필요)"

echo ""
echo "📋 로그 확인 명령어:"
echo "   docker compose logs -f backend"
echo "   docker compose logs -f nginx"
echo ""
echo "🎲 배포 완료!"
