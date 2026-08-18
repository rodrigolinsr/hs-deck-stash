FROM node:24-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

COPY . ./

EXPOSE 3000

CMD ["yarn", "dev", "--host", "0.0.0.0"]
