Promise = require('bluebird')
_ = require('lodash')
Docker = require('docker-toolbelt')
form = require('resin-cli-form')
chalk = require('chalk')

exports.dockerPort = dockerPort = 2375
exports.dockerTimeout = dockerTimeout = 2000

exports.filterOutSupervisorContainer = filterOutSupervisorContainer = (container) ->
	for name in container.Names
		return false if name.includes('resin_supervisor')
	return true

exports.selectContainerFromDevice = Promise.method (deviceIp, filterSupervisor = false) ->
	docker = new Docker(host: deviceIp, port: dockerPort, timeout: dockerTimeout)

	# List all containers, including those not running
	docker.listContainersAsync(all: true)
	.filter (container) ->
		return true if not filterSupervisor
		filterOutSupervisorContainer(container)
	.then (containers) ->
		if _.isEmpty(containers)
			throw new Error("No containers found in #{deviceIp}")

		return form.ask
			message: 'Select a container'
			type: 'list'
			choices: _.map containers, (container) ->
				containerName = container.Names[0] or 'Untitled'
				shortContainerId = ('' + container.Id).substr(0, 11)
				containerStatus = container.Status

				return {
					name: "#{containerName} (#{shortContainerId}) - #{containerStatus}"
					value: container.Id
				}

exports.pipeContainerStream = Promise.method ({ deviceIp, name, outStream, follow = false }) ->
	docker = new Docker(host: deviceIp, port: dockerPort)

	container = docker.getContainer(name)
	container.inspectAsync()
	.then (containerInfo) ->
		return containerInfo?.State?.Running
	.then (isRunning) ->
		container.attachAsync
			logs: not follow or not isRunning
			stream: follow and isRunning
			stdout: true
			stderr: true
	.then (containerStream) ->
		containerStream.pipe(outStream)
	.catch (err) ->
		err = '' + err.statusCode
		if err is '404'
			return console.log(chalk.red.bold("Container '#{name}' not found."))
		throw err

# A function to reliably execute a command
# in all supported operating systems, including
# different Windows environments like `cmd.exe`
# and `Cygwin` should be encapsulated in a
# re-usable package.
exports.getSubShellCommand = (command) ->
	os = require('os')

	if os.platform() is 'win32'
		return {
			program: 'cmd.exe'
			args: [ '/s', '/c', command ]
		}
	else
		return {
			program: '/bin/sh'
			args: [ '-c', command ]
		}
