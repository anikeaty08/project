FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .
ARG VITE_INGEST_TOKEN=rag-dev-ingest-xk9m2p7q
ARG VITE_UNSPLASH_ACCESS_KEY=
ENV VITE_API_BASE_URL=
ENV VITE_INGEST_TOKEN=${VITE_INGEST_TOKEN}
ENV VITE_UNSPLASH_ACCESS_KEY=${VITE_UNSPLASH_ACCESS_KEY}
RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
