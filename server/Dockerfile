FROM node:24-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
ENV HOST=0.0.0.0
ENV PORT=1234
EXPOSE 1234
CMD ["npx", "y-websocket"]
