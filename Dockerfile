FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run server:build

RUN rm -rf node_modules && npm ci --omit=dev --ignore-scripts

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates wget \
	&& mkdir -p /app/certs \
	&& wget -qO /app/certs/root.crt https://st.timeweb.com/cloud-static/ca.crt \
	&& chmod 0600 /app/certs/root.crt

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server-dist ./server-dist
COPY --from=build /app/server/schema.sql ./server/schema.sql
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production \
	PORT=3000 \
	PGSSLROOTCERT=/app/certs/root.crt

EXPOSE 3000

CMD ["node", "server-dist/index.js"]
