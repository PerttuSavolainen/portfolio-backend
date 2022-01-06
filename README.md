# portfolio-backend

Microservice with AWS Lambda to use Github GraphQL API to request portfolio data.

## Prerequisites

- npm
- aws cli
- aws-vault (optional, but recommended for AWS credential handling)

## Github access with PAT

- [Personal Access Token](https://github.com/settings/tokens/new) with only `read:user` is enough, since mostly publicly available information will be shown.

## Install

- `npm ci`

## Run locally with serverless-offline

- `aws-vault exec <YOUR_PROFILE> -- npm start`

## Deploy

- `aws-vault exec <YOUR_PROFILE> -- npm run deploy`