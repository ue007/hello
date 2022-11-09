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
/* global console */
/* eslint-disable no-console, complexity, max-statements */
import { XVIZFormatWriter } from '@xviz/io';
import { FileSource, FileSink } from '@xviz/io/node';
import { XVIZProviderFactory } from '@xviz/io';

import { StartEndOptions } from '@xviz/ros';

import process from 'process';
import fs from 'fs';
import path from 'path';

import { Rosbag2, ROS2_TO_DEFINITIONS, ROS2_DEFINITIONS_ARRAY, MessageIterator } from '@foxglove/rosbag2';
import { openNodejsFile, openNodejsDirectory } from '@foxglove/rosbag2-node';
import { MessageReader } from '@foxglove/rosmsg2-serialization';
import { CdrReader, CdrSizeCalculator, CdrWriter } from '@foxglove/cdr';

export function convertDB3Args(inArgs) {
	const cmd = 'convert [-d output] <bag>';

	return inArgs.command(
		cmd,
		'Convert a rosbag db3 to xviz',
		{
			...StartEndOptions,
			directory: {
				alias: 'd',
				describe: 'Directory to save XVIZ data',
				type: 'string',
				required: true,
			},
			format: {
				describe: 'Output data format',
				default: 'BINARY_GLB',
				choices: ['JSON_STRING', 'BINARY_GLB'],
				nargs: 1,
			},
		},
		convertDB3Cmd
	);
}

async function createXVIZProvider(ProviderClass, args) {
	let provider = null;
	provider = new ProviderClass(args);
	await provider.init();

	// if (provider.valid()) {
	// 	return provider;
	// }

	return null;
}

export async function convertDB3Cmd(args) {
	const { bag, directory, start, end, format } = args;

	console.log(args);
	// Setup output directory
	try {
		deleteDirRecursive(directory);
	} catch (err) {
		// ignore
	}
	createDir(directory);

	/**
	 * XVIZProviderFactoryClass
	 * {className: XVIZJSONProvider},
	 * {className: XVIZBinaryProvider},
	 * {className: XVIZProtobufProvider}
	 */
	const source = new FileSource(bag);
	console.log(XVIZProviderFactory);
	const openArgs = {
		options: { ...args },
		source,
		root: bag,
	};
	for (const providerEntry of XVIZProviderFactory.providerClasses) {
		const options = { ...openArgs.options, ...providerEntry.args };
		const loader = await createXVIZProvider(providerEntry.className, { ...openArgs, options });
		console.log(loader);
		if (loader) {
			return loader;
		}
	}
	// const provider = await XVIZProviderFactory.open({
	// 	options: { ...args },
	// 	source,
	// 	root: bag,
	// });
	// console.log(provider);
	// for (const providerEntry of this.providerClasses) {
	// 	const options = { ...args.options, ...providerEntry.args };
	// 	const loader = await createXVIZProvider(providerEntry.className, { ...args, options });

	// 	if (loader) {
	// 		return loader;
	// 	}
	// }
	return;
	if (!provider) {
		throw new Error('Failed to create ROSBagProvider');
	}
	// open db3

	// This abstracts the details of the filenames expected by our server
	const sink = new FileSink(directory);

	return;

	// if (!provider) {
	// 	throw new Error('Failed to create ROSBagProvider');
	// }

	// This abstracts the details of the filenames expected by our server
	// const sink = new FileSink(directory);

	const iterator = provider.getMessageIterator({ startTime: start, endTime: end });
	if (!iterator.valid()) {
		throw new Error('Error creating and iterator');
	}

	const writer = new XVIZFormatWriter(sink, { format });

	const md = provider.xvizMetadata();

	// Augment metadata with timing information
	// if provided
	setMetadataTimes(md.message().data, start, end);
	writer.writeMetadata(md);

	// If we get interrupted make sure the index is written out
	signalWriteIndexOnInterrupt(writer);

	// Process data
	let frameSequence = 0;
	while (iterator.valid()) {
		const data = await provider.xvizMessage(iterator);
		if (data) {
			process.stdout.write(`Writing frame ${frameSequence}\r`);
			writer.writeMessage(frameSequence, data);
			frameSequence += 1;
		} else {
			console.log(`No data for frame ${frameSequence}`);
		}
	}

	writer.close();
}

/* eslint-disable camelcase */
function setMetadataTimes(metadata, start, end) {
	if (start || end) {
		if (start) {
			const logInfo = metadata.log_info || {};
			logInfo.start_time = start;
		}

		if (end) {
			const logInfo = metadata.log_info || {};
			logInfo.end_time = end;
		}
	}
}
/* eslint-enable camelcase */

function signalWriteIndexOnInterrupt(writer) {
	process.on('SIGINT', () => {
		console.log('Aborting, writing index file.');
		writer.close();
		process.exit(0); // eslint-disable-line no-process-exit
	});
}

function createDir(dirPath) {
	if (!fs.existsSync(dirPath)) {
		// make sure parent exists
		const parent = path.dirname(dirPath);
		createDir(parent);

		fs.mkdirSync(dirPath);
	}
}

function deleteDirRecursive(parentDir) {
	const files = fs.readdirSync(parentDir);
	files.forEach((file) => {
		const currPath = path.join(parentDir, file);
		if (fs.lstatSync(currPath).isDirectory()) {
			// recurse
			deleteDirRecursive(currPath);
		} else {
			// delete file
			fs.unlinkSync(currPath);
		}
	});

	fs.rmdirSync(parentDir);
}

async function readMessage() {
	const bag = await openNodejsFile('./assets/bags/talker/talker.db3');

	// timerange
	const [startTime, endTime] = await bag.timeRange();
	console.log(startTime, endTime);

	console.log(`startTime:${startTime} endTime:${endTime}`);

	// topics
	const topicDefs = await bag.readTopics();
	console.log(`topicDefs:${topicDefs}`);

	// message counts: Map<string, number> {'/topic':10,'/rosout':10}
	const messageCounts = await bag.messageCounts();
	console.log(`messageCounts:${messageCounts}`);
	console.log(`messageCounts keys:${messageCounts.keys()}`);
	console.log(`messageCounts values:${messageCounts.values()}`);

	let hasAnyMessages = false;

	for (const item of messageCounts.values()) {
		if (item > 0) {
			hasAnyMessages = true;
			break;
		}
	}
	if (!hasAnyMessages) {
		throw new Error('Bag contains no messages');
	}

	let allMessageCount = 0;
	for (const item of messageCounts.values()) {
		allMessageCount += item;
	}
	console.log('\x1B[32m%s\x1B[0m', `Bag contains ${allMessageCount} messages!`);

	// message
	const messageIterator = bag.readMessages();
	console.log(messageIterator);
	for await (const msg of bag.readMessages()) {
		console.log(msg);
	}
}

async function readMessageFromRaw() {
	const bag = await openNodejsFile('./assets/bags/talker/talker.db3');

	// timerange
	const [startTime, endTime] = await bag.timeRange();
	console.log(startTime, endTime);

	console.log(`startTime:${startTime} endTime:${endTime}`);

	// topics
	const topicDefs = await bag.readTopics();
	console.log(`topicDefs:${topicDefs}`);

	// message counts: Map<string, number> {'/topic':10,'/rosout':10}
	const messageCounts = await bag.messageCounts();
	console.log(`messageCounts:${messageCounts}`);
	console.log(`messageCounts keys:${messageCounts.keys()}`);
	console.log(`messageCounts values:${messageCounts.values()}`);

	let hasAnyMessages = false;

	for (const item of messageCounts.values()) {
		if (item > 0) {
			hasAnyMessages = true;
			break;
		}
	}
	if (!hasAnyMessages) {
		throw new Error('Bag contains no messages');
	}

	let allMessageCount = 0;
	for (const item of messageCounts.values()) {
		allMessageCount += item;
	}
	console.log('\x1B[32m%s\x1B[0m', `Bag contains ${allMessageCount} messages!`);

	// parse raw message
	const problems = [];
	const topics = [];
	const topicStats = new Map();
	const datatypes = new Map();
	const messageDefinitionsByTopic = {};
	const parsedMessageDefinitionsByTopic = {};

	for (const topicDef of topicDefs) {
		const numMessages = messageCounts.get(topicDef.name);

		topics.push({ name: topicDef.name, schemaName: topicDef.type });
		if (numMessages != undefined) {
			topicStats.set(topicDef.name, { numMessages });
		}

		const parsedMsgdef = ROS2_TO_DEFINITIONS.get(topicDef.type);
		if (parsedMsgdef == undefined) {
			problems.push({
				severity: 'warn',
				message: `Topic "${topicDef.name}" has unsupported datatype "${topicDef.type}"`,
				tip: 'ROS 2 .db3 files do not contain message definitions, so only well-known ROS types are supported in Foxglove Studio. As a workaround, you can convert the db3 file to mcap using the mcap CLI. For more information, see: https://foxglove.dev/docs/studio/connection/local-file',
			});
			continue;
		}

		const fullParsedMessageDefinitions = [parsedMsgdef];
		const messageDefinition = JSON.stringify(fullParsedMessageDefinitions);
		datatypes.set(topicDef.type, { name: topicDef.type, definitions: parsedMsgdef.definitions });
		messageDefinitionsByTopic[topicDef.name] = messageDefinition;
		parsedMessageDefinitionsByTopic[topicDef.name] = fullParsedMessageDefinitions;
	}

	// console.log(`problems:${problems}`);
	// console.log(`topicStats:${topicStats}`);
	// console.log(`datatypes:${datatypes}`);
	// console.log(`messageDefinitionsByTopic:${messageDefinitionsByTopic}`);
	// console.log(`parsedMessageDefinitionsByTopic:${parsedMessageDefinitionsByTopic}`);
	// datatypes.forEach((v, k) => {
	// 	console.log(v, k);
	// });

	const rowIterators = bag.databases_.map((db) => db.readMessages());
	const messageIterator = new MessageIterator(rowIterators, (rawMessage) => {
		console.log('rawMessage:', rawMessage);
		// Find or create a message reader for this message
		let reader = bag.messageReaders_.get(rawMessage.topic.type);
		if (reader == undefined) {
			const msgdef = ROS2_TO_DEFINITIONS.get(rawMessage.topic.type);
			if (msgdef == undefined) {
				throw new Error(`Unknown message type: ${rawMessage.topic.type}`);
			}
			reader = new MessageReader([msgdef, ...ROS2_DEFINITIONS_ARRAY]);
			bag.messageReaders_.set(rawMessage.topic.type, reader);
		}
		// return reader.readMessage(rawMessage.data);
		const cdrReader = new CdrReader(rawMessage.data);
		const result = reader.readComplexType(reader.rootDefinition, cdrReader);
		result.author = 'Jeff';
		return result;
	});
	for await (const msg of messageIterator) {
		console.log(msg);
	}
}
// readMessage();
// readMessageFromRaw();
