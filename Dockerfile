FROM node:16.13.1-alpine

RUN mkdir -p /opt/cadence/node_modules && chown -R node:node /opt/cadence

WORKDIR /opt/cadence

COPY package*.json ./

RUN npm ci --only=production

COPY . .

COPY --chown=node:node . .

USER node

CMD [ "./docker-entry.sh" ]
