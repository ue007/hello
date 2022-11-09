// Copyright (c) 2019 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/* eslint-disable camelcase */
import { serverArgs } from '@xviz/server';
import { registerROSBagProvider } from '@xviz/ros';
import { convertDB3Args } from './convertDB3';
import { alias } from 'yargs';

// Setup ROS Provider
function setupROSProvider(args) {
	if (args.rosConfig) {
		registerROSBagProvider(args.rosConfig);
	}
}

function main() {
	let args = alias('h', 'help');

	// args = bagdumpArgs(args);
	// args = configArgs(args);
	// args = convertArgs(args);
	args = convertDB3Args(args);

	args.middleware(setupROSProvider).parse();
}

main();
