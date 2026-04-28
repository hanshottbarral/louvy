FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm install

COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

RUN npm run prisma:generate --workspace @korus/backend
RUN npm run build --workspace @korus/shared
RUN npm run build --workspace @korus/backend

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace", "@korus/backend"]

