###
Copyright 2016-2017 Balena

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
###

commandOptions = require('./command-options')

exports.list =
	signature: 'keys'
	description: 'list all ssh keys'
	help: '''
		Use this command to list all your SSH keys.

		Examples:

			$ balena keys
	'''
	permission: 'user'
	action: (params, options, done) ->
		balena = require('balena-sdk').fromSharedOptions()
		visuals = require('resin-cli-visuals')

		balena.models.key.getAll().then (keys) ->
			console.log visuals.table.horizontal keys, [
				'id'
				'title'
			]
		.nodeify(done)

exports.info =
	signature: 'key <id>'
	description: 'list a single ssh key'
	help: '''
		Use this command to show information about a single SSH key.

		Examples:

			$ balena key 17
	'''
	permission: 'user'
	action: (params, options, done) ->
		balena = require('balena-sdk').fromSharedOptions()
		visuals = require('resin-cli-visuals')

		balena.models.key.get(params.id).then (key) ->
			console.log visuals.table.vertical key, [
				'id'
				'title'
			]

			# Since the public key string is long, it might
			# wrap to lines below, causing the table layout to break.
			# See https://github.com/balena-io/balena-cli/issues/151
			console.log('\n' + key.public_key)
		.nodeify(done)

exports.remove =
	signature: 'key rm <id>'
	description: 'remove a ssh key'
	help: '''
		Use this command to remove a SSH key from balena.

		Notice this command asks for confirmation interactively.
		You can avoid this by passing the `--yes` boolean option.

		Examples:

			$ balena key rm 17
			$ balena key rm 17 --yes
	'''
	options: [ commandOptions.yes ]
	permission: 'user'
	action: (params, options, done) ->
		balena = require('balena-sdk').fromSharedOptions()
		patterns = require('../utils/patterns')

		patterns.confirm(options.yes, 'Are you sure you want to delete the key?').then ->
			balena.models.key.remove(params.id)
		.nodeify(done)

exports.add =
	signature: 'key add <name> [path]'
	description: 'add a SSH key to balena'
	help: '''
		Use this command to associate a new SSH key with your account.

		If `path` is omitted, the command will attempt
		to read the SSH key from stdin.

		Examples:

			$ balena key add Main ~/.ssh/id_rsa.pub
			$ cat ~/.ssh/id_rsa.pub | balena key add Main
	'''
	permission: 'user'
	action: (params, options, done) ->
		_ = require('lodash')
		Promise = require('bluebird')
		readFileAsync = Promise.promisify(require('fs').readFile)
		capitano = require('capitano')
		balena = require('balena-sdk').fromSharedOptions()

		Promise.try ->
			return readFileAsync(params.path, encoding: 'utf8') if params.path?

			# TODO: should this be promisified for consistency?
			Promise.fromNode (callback) ->
				capitano.utils.getStdin (data) ->
					return callback(null, data)

		.then(_.partial(balena.models.key.create, params.name))
		.nodeify(done)
