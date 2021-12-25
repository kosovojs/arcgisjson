#! /usr/bin/env node
'use strict';

const { program } = require('commander');
const arcgisHandler = require('@terraformer/arcgis');
const fs = require('fs');

program.version('0.0.2');

const wkt = {
	3059: 'PROJCS["LKS92_Latvia_TM",GEOGCS["GCS_LKS92",DATUM["D_Latvia_1992",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",24],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",-6000000],UNIT["Meter",1]]',
	3857: 'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.017453292519943295]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]',
	4326: 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]',
	25884: 'PROJCS["ETRS89_TM_Baltic93",GEOGCS["GCS_ETRS_1989",DATUM["D_ETRS_1989",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",24],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["Meter",1]]',
};

const getType = (value) => {
	if (Number.isSafeInteger(value)) {
		return 'esriFieldTypeInteger';
	}
	if (Number(value) === value && value % 1 !== 0) {
		return 'esriFieldTypeDouble';
	}

	return 'esriFieldTypeString';
};

const formatArcgisJson = (data) => {
	let geomType;
	let srid;
	const fields = {};
	for (let entry of data) {
		const { attributes, geometry } = entry;
		if (!geomType) {
			geomType = 'x' in geometry ? 'esriGeometryPoint' : 'UNKNOWN';
			srid = geometry.spatialReference.wkid;
		}

		for (const [field, val] of Object.entries(attributes)) {
			if (field === 'id' || field === 'OBJECTID') {
				fields[field] = 'esriFieldTypeOID';
			} else {
				fields[field] = val !== null ? getType(val) : null;
			}
		}
	}

	const fieldSection = Object.entries(fields).map((field) => ({
		name: field[0],
		type: field[1],
		alias: field[0],
	}));
	const fieldAliases = Object.keys(fields).reduce((previousValue, currentValue) => {
		return {
			...previousValue,
			[currentValue]: currentValue,
		};
	}, {});

	return {
		displayFieldName: '',
		fieldAliases: fieldAliases,
		geometryType: geomType,
		fields: fieldSection,
		spatialReference: {
			wkt: wkt[srid] ?? '',
		},
		features: data,
	};
};

const formatGeoJson = (data) => {
	return data;
};

const getSource = (sourceFile) => {
	if (!fs.existsSync(sourceFile)) {
		console.error("source file doesn't exist");
		process.exit(1);
	}
	const data = fs.readFileSync(sourceFile, 'utf8');
	if (!data) {
		console.error("couldn't read source file");
		process.exit(1);
	}

	return data;
};

const processFile = (mode, source, destination, options) => {
	const data = getSource(source);

	const parsed = JSON.parse(data);

	let method;
	let formatter;

	if (mode === 'to_arcgis') {
		method = arcgisHandler.geojsonToArcGIS;
		formatter = formatArcgisJson;
	}
	if (mode === 'to_geojson') {
		method = arcgisHandler.arcgisToGeoJSON;
		formatter = formatGeoJson;
	}

	const converted = formatter(method(parsed));
	const convertedAsString = JSON.stringify(converted);
	if (!destination) {
		console.log(convertedAsString);
		return;
	}
	if (fs.existsSync(destination) && !options.overwrite) {
		console.log('destination path exists. use `-o` option to overwrite');
		process.exit(1);
	}
	fs.writeFile(destination, convertedAsString, function (err) {
		if (err) return console.log(err);
	});
};

program
	.command('to_arcgis <source> [destination]')
	.option('-o, --overwrite', 'overwrite destination file, if exists')
	.description('convert file to ArcGIS json')
	.action((source, destination, options) => processFile('to_arcgis', source, destination, options));

program
	.command('to_geojson <source> [destination]')
	.option('-o, --overwrite', 'overwrite destination file, if exists')
	.description('convert file to GeoJSON')
	.action((source, destination, options) => processFile('to_geojson', source, destination, options));

program.parse();
