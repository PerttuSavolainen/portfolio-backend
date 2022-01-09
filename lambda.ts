import { Octokit } from 'octokit';
import { Handler } from 'aws-lambda';
import { SSM } from 'aws-sdk';
import gqlQuery from './query';

const ssm = new SSM();

// manually exluded repos
const NONO_REPO_LIST = process.env?.NONO_REPO_LIST
  ? process.env?.NONO_REPO_LIST?.split(',')
  : [];

const AMOUNT_OF_REPOS = Number(process.env?.AMOUNT_OF_REPOS) || 3;
const AMOUNT_OF_TOPICS = Number(process.env?.AMOUNT_OF_TOPICS) || 10;
const ALLOWED_ORIGIN = process.env?.IS_OFFLINE
  ? 'http://localhost:3000'
  : process.env?.ALLOWED_ORIGIN;

const responseHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
};

export const handler: Handler = async (event: any) => {
  try {
    const { Parameter: { Value: token } } = await ssm.getParameter({
      Name: process.env?.GITHUB_PAT_PARAMETER_NAME,
      WithDecryption: true,
    }).promise();
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.graphql(gqlQuery, {
      repoCount: 10,
      topicsPerRepoCount: 5,
    });

    const repos = (data.repositories?.nodes || [])
      .filter(({ isArchived, name }) => !isArchived && !NONO_REPO_LIST.includes(name));

    const topics = repos
      .map((repo) => (repo.topics?.nodes || [])
        .map(({ topic }) => topic?.name),
      )
      .flat();

    return {
      statusCode: 200,
      headers: responseHeaders,
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
          topics: topics
            // remove duplicates
            .filter((topic, index) => topics.indexOf(topic) === index)
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
      headers: responseHeaders,
    };
  }
}
