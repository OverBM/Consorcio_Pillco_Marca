# Dockerfile para módulo Frontend (Laboratorio DevOps)
FROM node:22-alpine

ARG PORT=4200
ENV PORT=${PORT}

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE ${PORT}
CMD npm run dev -- --host 0.0.0.0 --port ${PORT}
