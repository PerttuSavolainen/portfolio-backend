export default `
query portfolioData($repoCount: Int!, $topicsPerRepoCount: Int!) {
  # use global node id to get the viewer's (authenticated user's) data
  data: node(id:"MDQ6VXNlcjE1MTgzMTMx") {
    ... on User {
      name
      bio
      location
      url
      repositories(
        ownerAffiliations: [OWNER],
        first: $repoCount,
        isFork: false,
        isLocked: false,
        privacy: PUBLIC,
        orderBy: { direction: DESC, field: CREATED_AT }
      ) {
        nodes {
          name
          description
          isArchived
          url
          topics: repositoryTopics(first: $topicsPerRepoCount) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }
  }
}
`