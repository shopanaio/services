FROM mcr.microsoft.com/playwright:v1.51.1-jammy

USER pwuser

WORKDIR /home/pwuser/app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY --chown=pwuser:pwuser . .
