import { Octokit } from 'octokit';
import { Handler } from 'aws-lambda';
import { SSM } from 'aws-sdk';

const ssm = new SSM();

// manually exluded repos
const NONO_REPO_LIST = process.env?.NONO_REPO_LIST
  ? process.env?.NONO_REPO_LIST?.split(',')
  : [];

const AMOUNT_OF_REPOS = Number(process.env?.AMOUNT_OF_REPOS) || 3;
const AMOUNT_OF_TOPICS = Number(process.env?.AMOUNT_OF_TOPICS) || 10;
const ALLOWED_ORIGINS = process.env?.ALLOWED_ORIGINS?.split(',');

export const handler: Handler = async (event: any) => {
  const getResponseHeaders = (origin: string) => {
    return ALLOWED_ORIGINS.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin }
      // fallback to first allowed origin if it doesn't match
      : { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] };
  };

  try {
    const { Parameter: { Value: token } } = await ssm.getParameter({
      Name: process.env?.GITHUB_PAT_PARAMETER_NAME,
      WithDecryption: true,
    }).promise();
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.graphql(
      `
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
      `,
      {
        repoCount: 10,
        topicsPerRepoCount: 5,
      }
    );

    const repos = (data.repositories?.nodes || [])
      .filter(({ isArchived, name }) => !isArchived && !NONO_REPO_LIST.includes(name));

    return {
      statusCode: 200,
      headers: getResponseHeaders(event.headers.origin),
      body: JSON.stringify(
        {
          ...data,
          repositories: repos
            .map((repo) => ({
              name: repo.name,
              description: repo.description,
              url: repo.url,
            }))
            .splice(0, AMOUNT_OF_REPOS),
          topics: repos
            .map((repo) => (repo.topics?.nodes || [])
              .map(({ topic }) => topic?.name),
            )
            .flat()
            .splice(0, AMOUNT_OF_TOPICS),
        },
        null,
        2
      ),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: getResponseHeaders(event.headers.origin),
    };
  }
}
