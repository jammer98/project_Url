FROM node:24-alpine

WORKDIR /app

# Copy only manifest files first so npm ci is cached unless deps actually change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]
