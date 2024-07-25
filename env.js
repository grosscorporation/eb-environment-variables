#!/usr/bin/env node// Author: Gross Corporation, https://github.com/grosscorporation/eb-environment-variables

const { SecretsManager } = require('@aws-sdk/client-secrets-manager');
const fs = require('fs')
const dotenv = require('dotenv')

try {
	dotenv.config()
	if (process.env.NODE_ENV === 'development') {
		dotenv.config({ path: process.cwd() + '/.env', override: true })
	}
} catch (e) {
	// @ts-ignore
}

const appName = process.argv.splice(2)[0] || process.env.INPUT_SLUG || process.env.SLUG
const region = process.env.INPUT_REGION || process.env.AWS_REGION || 'us-east-1'

const secretName = process.env.INPUT_SECRET_NAME
const releaseTag = process.env.INPUT_RELEASE_TAG || process.env.RELEASE_TAG || (new Date() * 1000).toString()

console.log('###############################################################')
console.log('APP_SLUG ENV ~ ', appName)
console.log('###############################################################')

console.log('###############################################################')
console.log('REGION ~ ', region)
console.log('###############################################################')

console.log('###############################################################')
console.log('RELEASE TAG ~ ', releaseTag)
console.log('###############################################################')

console.log('###############################################################')
console.log('SECRET NAME ~ ', secretName)
console.log('###############################################################')

const awsConfig = {
	region,
	accessKeyId: process.env.INPUT_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.INPUT_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY
}

const client = new SecretsManager(awsConfig)

client.getSecretValue({ SecretId: secretName }, (err, data) => {
	if (err) {
		throw err
	} else if ('SecretString' in data) {
			const secrets = JSON.parse(data.SecretString)
			secrets.CURRENT_RELEASE = releaseTag

			let envFile = ''
			let ebFile = ''
			for (const key of Object.keys(secrets)) {
				envFile += `${key}=${secrets[key]}\n`
				ebFile += `    ${key}: ${secrets[key]}\n`
			}

			const ebMap = `option_settings:
  aws:elasticbeanstalk:application:environment:
${ebFile}`


			const fp = `./.ebextensions/${appName ?? releaseTag }-options.config`

			fs.writeFile(fp, ebMap, function(err, data) {
				if(err) throw err
				console.log(data)
			})
			
			console.log('###############################################################')
			console.log('GITHUB_ACTION EB ~ ', appName)
			console.log('###############################################################')
		}
})

setTimeout(() => { }, 5000)

return 'done'
