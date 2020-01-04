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
import * as SDK from 'balena-sdk';
import { stripIndent } from 'common-tags';
import * as _ from 'lodash';

import * as cf from '../../utils/common-flags';
import { CommandHelp } from '../../utils/oclif-utils';

interface FlagsDef {
	discontinued: boolean;
	help: void;
	json?: boolean;
	verbose?: boolean;
}

interface DeviceTypeWithAliases extends SDK.DeviceType {
	aliases?: string[];
}

export default class DevicesSupportedCmd extends Command {
	public static description = stripIndent`
		List the supported device types (like 'raspberrypi3' or 'intel-nuc').

		List the supported device types (like 'raspberrypi3' or 'intel-nuc').

		The --verbose option adds extra columns/fields to the output, including the
		"STATE" column whose values are one of 'beta', 'released' or 'discontinued'.
		However, 'discontinued' device types are only listed if the '--discontinued'
		option is used.

		The --json option is recommended when scripting the output of this command,
		because the JSON format is less likely to change and it better represents data
		types like lists and empty strings (for example, the ALIASES column contains a
		list of zero or more values). The 'jq' utility may be helpful in shell scripts
		(https://stedolan.github.io/jq/manual/).
`;
	public static examples = [
		'$ balena devices supported',
		'$ balena devices supported --verbose',
		'$ balena devices supported -vj',
	];

	public static usage = (
		'devices supported ' +
		new CommandHelp({ args: DevicesSupportedCmd.args }).defaultUsage()
	).trim();

	public static flags: flags.Input<FlagsDef> = {
		discontinued: flags.boolean({
			description: 'include "discontinued" device types',
		}),
		help: cf.help,
		json: flags.boolean({
			char: 'j',
			description: 'produce JSON output instead of tabular output',
		}),
		verbose: flags.boolean({
			char: 'v',
			description:
				'add extra columns in the tabular output (ALIASES, ARCH, STATE)',
		}),
	};

	public async run() {
		const { flags: options } = this.parse<FlagsDef, {}>(DevicesSupportedCmd);
		const sdk = SDK.fromSharedOptions();
		let deviceTypes: Array<
			Partial<DeviceTypeWithAliases>
		> = await sdk.models.config.getDeviceTypes();
		if (!options.discontinued) {
			deviceTypes = deviceTypes.filter(dt => dt.state !== 'DISCONTINUED');
		}
		const fields = ['slug', 'name'];
		if (options.verbose) {
			fields.splice(1, 0, 'aliases', 'arch', 'state');
			deviceTypes = deviceTypes.map(d => {
				if (d.aliases && d.aliases.length) {
					d.aliases = d.aliases.filter((alias: string) => alias !== d.slug);
					if (!options.json) {
						// stringify the aliases array with commas and spaces
						d.aliases = [d.aliases.join(', ')];
					}
				} else {
					d.aliases = [];
				}
				return d;
			});
		}
		deviceTypes = _.sortBy(
			deviceTypes.map(d => _.pick(d, fields) as Partial<DeviceTypeWithAliases>),
			fields,
		);
		if (options.json) {
			console.log(JSON.stringify(deviceTypes, null, 4));
		} else {
			const visuals = await import('resin-cli-visuals');
			const output = await visuals.table.horizontal(deviceTypes, fields);
			console.log(output);
		}
	}
}
