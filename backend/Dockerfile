FROM node:20-alpine

WORKDIR /app

# 의존성 먼저 복사 (캐시 최적화)
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사
COPY src/ ./src/
COPY migrations/ ./migrations/

EXPOSE 3001

CMD ["node", "src/index.js"]
