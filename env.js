#!/usr/bin/env node// Author: Gross Corporation, https://github.com/grosscorporation/eb-environment-variables



const { SecretsManager } = require('@aws-sdk/client-secrets-manager');

let fs = require('fs')
try {
	if (process.env.NODE_ENV === 'development') {
		require('dotenv').config({ path: process.cwd() + '/.env' })
	}
} catch (e) {}

const IS_GITHUB_ACTION = !!process.env.GITHUB_ACTIONS

const appName = process.argv.splice(2)[0] || process.env.INPUT_SLUG
const region = process.env.INPUT_REGION || 'eu-west-1'

const secretName = process.env.INPUT_SECRET_NAME

console.log('###############################################################')
console.log('APP_SLUG ENV ~ ', appName)
console.log('###############################################################')

console.log('###############################################################')
console.log('REGION ~ ', region)
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
	} else {
		if ('SecretString' in data) {
			const secrets = JSON.parse(data.SecretString)
			let envFile = ''
			let ebFile = ''
			for (const key of Object.keys(secrets)) {
				envFile += `${key}=${secrets[key]}\n`
				ebFile += `    ${key}: ${secrets[key]}\n`
			}

			const ebMap = `option_settings:
  aws:elasticbeanstalk:application:environment:
${ebFile}`

			if (IS_GITHUB_ACTION) {
				fs.writeFileSync('./.ebextensions/options.config', ebMap, function (err) {
					if (err) {
						throw err
					} else {
						console.log('###############################################################')
						console.log('GITHUB_ACTION EB ~ ', appName)
						console.log('###############################################################')
					}
				})
			}
		}
	}
})

setTimeout(() => {}, 5000)

return 'done'
