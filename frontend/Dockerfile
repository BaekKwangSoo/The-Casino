# ── 빌드 단계 ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN cp node_modules/@dimforge/rapier3d-compat/rapier_wasm3d_bg.wasm public/
RUN npm run build

# ── 서빙 단계 (Nginx) ─────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-app.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
