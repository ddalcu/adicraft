FROM node:24-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.cjs .
ENV HOST=0.0.0.0
ENV PORT=1234
ENV YPERSISTENCE=/app/dbDir
VOLUME /app/dbDir
EXPOSE 1234
CMD ["node", "server.cjs"]
