#!/usr/bin/env node
// Author: Gross Corporation, https://github.com/grosscorporation/eb-environment-variables

let AWS = require('aws-sdk')
let fs = require('fs')
try {
	if (process.env.NODE_ENV === 'development') {
		require('dotenv').config({ path: process.cwd() + '/.env' })
	}
} catch (e) {}

const IS_GITHUB_ACTION = !!process.env.GITHUB_ACTIONS

const appName = process.argv.splice(2)[0] || process.env.APP_SLUG
console.log('###############################################################')
console.log('APP_SLUG ENV ~ ', appName)
console.log('###############################################################')
const secretName = process.env.NODE_ENV === 'production' ? 'production/' + appName : 'development/' + appName

const client = new AWS.SecretsManager({
	region: 'eu-west-1',
	accessKeyId: process.env.INPUT_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.INPUT_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY
})

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

			fs.writeFileSync('./_env.current', envFile)
			if (process.env.NODE_ENV === 'production' && IS_GITHUB_ACTION) {
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
