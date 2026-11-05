# Back-office Baara : construction Angular, puis site statique servi par nginx (port 80)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN NG_CLI_ANALYTICS=false npx ng build --configuration production

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/baara-web/browser /usr/share/nginx/html
EXPOSE 80
