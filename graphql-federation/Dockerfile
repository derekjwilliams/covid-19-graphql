FROM node:13
ENV JOHNS_HOPKINS_ENDPOINT=http://localhost:5000/graphql/
ENV APPLE_MOBILITY_ENDPOINT=http://localhost:5001/graphql/
ENV GOOGLE_MOBILITY_ENDPOINT=http://localhost:5002/graphql/

WORKDIR /usr/src/app

copy package.json ./

RUN npm install

COPY . .

EXPOSE 5100
cmd["node", "federation.js"]
