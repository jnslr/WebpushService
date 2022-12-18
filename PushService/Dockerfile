FROM node:slim

CMD ["/bin/sh"]
LABEL version="1.0"
LABEL description="This text illustrates"


VOLUME [/config]
EXPOSE 1883

WORKDIR /usr/src/app

COPY package*.json ./
COPY *.js   ./

RUN npm install

CMD [ "node", "main.js" ]