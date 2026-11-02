FROM node:24-alpine
WORKDIR /app
COPY server/*.mjs server/cameras.json ./
ENV HOST=0.0.0.0 PORT=8080 DB_PATH=/data/crewline.sqlite
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8080
CMD ["node","server.mjs"]
