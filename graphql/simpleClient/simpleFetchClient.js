const fetch = require('node-fetch');

fetch("http://localhost:5000/graphql", {"credentials":"include","headers":{"accept":"application/json","accept-language":"en-US,en;q=0.9,fr;q=0.8","content-type":"application/json","sec-fetch-dest":"empty","sec-fetch-mode":"cors","sec-fetch-site":"same-origin"},"referrer":"http://localhost:5000/graphiql","referrerPolicy":"no-referrer-when-downgrade","body":"{\"query\":\"{\\n  allLocations(first: 2) {\\n    nodes {\\n      centroid {\\n        geojson\\n        srid\\n        x\\n        y\\n      }\\n\\t\\t\\tdeathCountsByLocationId {\\n        totalCount\\n      }\\n    }\\n  }\\n}\\n\",\"variables\":{\"projectReference\":{\"projectReference\":{\"projectId\":\"3\"}}}}","method":"POST","mode":"cors"})
  .then((response) => {
    return response.json()
  })
  .then((data) => {
    console.log(JSON.stringify(data, null, 2))
  })