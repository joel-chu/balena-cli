/**
 * @license
 * Copyright 2016-2019 Balena Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Command, flags } from '@oclif/command';
import {
	ApplicationVariable,
	DeviceVariable,
	EnvironmentVariableBase,
} from 'balena-sdk';
import { stripIndent } from 'common-tags';
import * as _ from 'lodash';

import { ExpectedError } from '../errors';
import * as cf from '../utils/common-flags';
import { CommandHelp } from '../utils/oclif-utils';

interface FlagsDef {
	application?: string;
	config: boolean;
	device?: string;
	json: boolean;
	help: void;
	verbose: boolean;
}

export default class EnvsCmd extends Command {
	public static description = stripIndent`
		List the environment or config variables of an app or device.

		List the environment or config variables of an application or device,
		as selected by the respective command-line options.

		The --config option is used to list "configuration variables" that
		control balena features.

		Service-specific variables are not currently supported. The following
		examples list variables that apply to all services in an app or device.
`;
	public static examples = [
		'$ balena envs --application MyApp',
		'$ balena envs --application MyApp --config',
		'$ balena envs --device 7cf02a6',
	];

	public static usage = (
		'envs ' + new CommandHelp({ args: EnvsCmd.args }).defaultUsage()
	).trim();

	public static flags: flags.Input<FlagsDef> = {
		application: _.assign({ exclusive: ['device'] }, cf.application),
		config: flags.boolean({
			char: 'c',
			description: 'show config variables',
		}),
		device: _.assign({ exclusive: ['application'] }, cf.device),
		help: cf.help,
		json: flags.boolean({
			char: 'j',
			description: 'produce JSON output instead of tabular output',
		}),
		verbose: cf.verbose,
	};

	public async run() {
		const { flags: options } = this.parse<FlagsDef, {}>(EnvsCmd);
		const balena = (await import('balena-sdk')).fromSharedOptions();
		const visuals = await import('resin-cli-visuals');
		const { checkLoggedIn } = await import('../utils/patterns');
		const cmd = this;
		let environmentVariables: ApplicationVariable[] | DeviceVariable[];

		await checkLoggedIn();

		if (options.application) {
			environmentVariables = await balena.models.application[
				options.config ? 'configVar' : 'envVar'
			].getAllByApplication(options.application);
		} else if (options.device) {
			environmentVariables = await balena.models.device[
				options.config ? 'configVar' : 'envVar'
			].getAllByDevice(options.device);
		} else {
			throw new ExpectedError('You must specify an application or device');
		}

		if (_.isEmpty(environmentVariables)) {
			throw new ExpectedError('No environment variables found');
		}

		const fields = ['id', 'name', 'value'];

		if (options.json) {
			cmd.log(
				stringifyVarArray<EnvironmentVariableBase>(
					environmentVariables,
					fields,
				),
			);
		} else {
			cmd.log(visuals.table.horizontal(environmentVariables, fields));
		}
	}
}

function stringifyVarArray<T = Dictionary<any>>(
	varArray: T[],
	fields: string[],
): string {
	// Transform each object (item) of varArray to preserve
	// only the fields (keys) listed in the fields argument.
	const transformed = _.map(varArray, (o: Dictionary<any>) =>
		_.transform(
			o,
			(result, value, key) => {
				if (fields.includes(key)) {
					result[key] = value;
				}
			},
			{},
		),
	);
	return JSON.stringify(transformed, null, 4);
}
