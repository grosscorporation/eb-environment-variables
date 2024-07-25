#!/bin/bash

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is required but it's not installed. Install jq and try again."
  exit 1
fi

# Set default region
REGION=${INPUT_REGION:-${AWS_REGION:-us-east-1}}

# Set secret name
SECRET_NAME=${INPUT_SECRET_NAME:-${SECRET_NAME}}

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Check if running in GitHub Actions
IS_GITHUB_ACTION=${GITHUB_ACTIONS:-false}

# Application name or slug
APP_NAME=${1:-${INPUT_SLUG}}

# Logging function
log() {
  echo '###############################################################'
  echo "$1"
  echo '###############################################################'
}

log "APP_SLUG ENV ~ $APP_NAME"
log "REGION ~ $REGION"
log "SECRET NAME ~ $SECRET_NAME"

# Fetch secrets from AWS Secrets Manager
fetch_secrets() {
  aws secretsmanager get-secret-value --region "$REGION" --secret-id "$SECRET_NAME" --query SecretString --output text
}

# Process and write secrets to files
process_secrets() {
  local secrets_json
  secrets_json=$(fetch_secrets)
  if [ -z "$secrets_json" ]; then
    echo "Failed to fetch secrets or secret is empty"
    exit 1
  fi

  local env_file=""
  local eb_file=""

  # Loop through each key-value pair in the JSON
  echo "$secrets_json" | jq -r 'to_entries|map("\(.key)=\(.value|tostring)")|.[]' | while IFS= read -r line; do
    key=$(echo $line | cut -d'=' -f1)
    value=$(echo $line | cut -d'=' -f2)
    env_file+="${key}=${value}\n"
    eb_file+="    ${key}: ${value}\n"
  done

  local eb_map="option_settings:
  aws:elasticbeanstalk:application:environment:
$eb_file"

  if [ "$IS_GITHUB_ACTION" = true ]; then
    echo -e "$eb_map" > ./.ebextensions/options.config
    echo -e "$env_file" > ./.env
    log "GITHUB_ACTION EB ~ $APP_NAME"
  fi
}

# Main execution
process_secrets

# Dummy wait to replicate original JavaScript delay
sleep 5

echo "done"
