const d3 = require("d3-fetch")
const gql = require("graphql-tag")

if (typeof fetch !== 'function') {
  global.fetch = require('node-fetch');
}
const g = gql`{
  allLocations(first: 1) {
    nodes {
      deathCountsByLocationId {
        totalCount
      }
    }
  }
}
`

const query = `{"query":${JSON.stringify(g.loc.source.body)}}`
console.log(query)
d3.json("http://localhost:5000/graphql", {
  headers: {
    accept: "application/json",
    "accept-language": "en-US,en;q=0.9,fr;q=0.8",
    "content-type": "application/json",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
  },
  referrer: "http://localhost:5000/graphiql",
  referrerPolicy: "no-referrer-when-downgrade",
  body:
  query,
  method: "POST",
  mode: "cors",
}).then((data) => {
  console.log(JSON.stringify(data, null, 2));
});
