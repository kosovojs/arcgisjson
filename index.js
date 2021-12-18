#! /usr/bin/env node
'use strict';

const { program } = require('commander');
const arcgisHandler = require('@terraformer/arcgis');
const fs = require('fs');

program.version('0.0.1');

const processFile = (mode, source, destination) => {
	fs.readFile(source, 'utf8', (err, data) => {
		if (err) {
			console.error('could not open source file');
			process.exit(1);
		}
		const parsed = JSON.parse(data);

		let method;

		if (mode === 'to_arcgis') {
			method = arcgisHandler.geojsonToArcGIS;
		}
		if (mode === 'to_geojson') {
			method = arcgisHandler.arcgisToGeoJSON;
		}

		const converted = method(parsed);
		const convertedAsString = JSON.stringify(converted);
		if (!destination) {
			console.log(convertedAsString);
			return;
		}
		if (fs.existsSync(destination)) {
			console.log('destination path exists');
			process.exit(1);
		}
		fs.writeFile(destination, convertedAsString, function (err) {
			if (err) return console.log(err);
		});
	});
};

program
	.command('to_arcgis <source> [destination]')
	.description('convert file to ArcGIS json')
	.action((source, destination) => processFile('to_arcgis', source, destination));

program
	.command('to_geojson <source> [destination]')
	.description('convert file to GeoJSON')
	.action((source, destination) => processFile('to_geojson', source, destination));

program.parse();
