var express = require('express');
var router = express.Router();
const appModel = require('../models/Apps');
const dataSourceModel = require('../models/DataSource');
const viewsModel = require('../models/View');
const { google } = require("googleapis");
const fs = require('fs');

const auth = new google.auth.GoogleAuth({
	// keyFile: "./keys.json",
	keyFile: "keys.json",
	scopes: "https://www.googleapis.com/auth/spreadsheets"
});

// add data sources to application that was created, need id of application (created by mongo when app is created), url to sheet, 
// sheet index (which sheet is being looked at), and keys
router.post('/add', async (req, res) => {
	const { appId, url, sheetIndex, keys } = req.body;

	const authClientObject = await auth.getClient();
	const googleSheetsInstance = google.sheets({ version: "v4", auth: authClientObject });

	try {
		// get spreadsheet Id of dataSource
		const regex = /\/d\/(.*?)\/edit/;
		const match = url.match(regex);
		const spreadsheetId = match[1]; // this will give you the characters between /d/ and /edit/
		const response = await googleSheetsInstance.spreadsheets.get({
			spreadsheetId,
			auth,
		});

		//Get the name of the spreadsheet --> we're also going to be using this to serve as the name of the data source 
		const spreadSheetName = response.data.properties.title;

		for(let i = 0; i < response.data.sheets.length; i++){
			// parse through sheets, find spreadsheet that is the same index and get the name of that sheet
			if(response.data.sheets[i].properties.index == sheetIndex){
				let columns = [];
				// Name of the sheet within a spreadsheet 
				let sheetName = response.data.sheets[i].properties.title;
				
				// get column names in sheet
				const readColumns = await googleSheetsInstance.spreadsheets.values.get({
					auth, //auth object
					spreadsheetId, // spreadsheet id
					range: `${sheetName}!1:1`, //range of cells to read from.
				})

				// get type for each column
				const readData = await googleSheetsInstance.spreadsheets.values.get({
					auth, //auth object
					spreadsheetId, // spreadsheet id
					range: `${sheetName}!2:2`, //range of cells to read from.
					valueRenderOption: 'UNFORMATTED_VALUE',
    				dateTimeRenderOption: 'SERIAL_NUMBER'
				})
				// create dataSource, need to add columns next
				const newDataSource = await dataSourceModel.create({
					// Name of the sheet
					sheetName: sheetName, 
					// Name of the spredsheet
					spreadSheetName: spreadSheetName,
					// Name of the data source --> default to the name of the data source
					dataSourceName: spreadSheetName, 
					// URL to the Spreadsheet
					url: url,
					// Index of the sheet 
					sheetIndex: sheetIndex,
					// Key column which will be specified by the user 
					keys: keys,
					// columns: columns
				});

				// get column names, and look at first value in order to get the type of the values in the column
				let columnNames = readColumns.data.values[0];
				let columnFirstValues = readData.data.values[0];

				let referenceId = newDataSource.id;
				for(let j = 0; j < columnNames.length; j++){
					columns.push({
						name: columnNames[j],
						label: false,
						reference: referenceId,
						type: typeof columnFirstValues[j]
					})
				}
			
				// update the columns of datasource
				const updatedDataSource = await dataSourceModel.findOneAndUpdate(
					{ _id: referenceId },
					{"columns": columns},
				);
				console.log(updatedDataSource);

				// add dataSource to the respective application
				const currentApp = await appModel.findById( { _id: appId } );
				let currentDataSources = currentApp.dataSources;
				currentDataSources.push(updatedDataSource);
				const updatedApp = await appModel.findOneAndUpdate(
					{ _id: appId },
					{dataSources: currentDataSources},
				);

				console.log(currentApp);
				
				await logFile(appId, url + " " + sheetIndex + " data source added to app " + updatedApp.name);
				// Send the updated applicationg back to the user!
				res.send(await appModel.findById({ _id: appId }))
			}
		}
		console.log(response.data.sheets);
		
	}
	catch (error){
		console.error('Error: ', error);
		await logFile(appId, "Error in adding data source: " + url);
		res.status(400).json({ message: `Error in adding data source for app ${appId}` });
	}
});

router.post('/getColumns', async (req, res) => {
	const { url, name } = req.body;
	// const name = "Sheet1";

	const authClientObject = await auth.getClient();
	const googleSheetsInstance = google.sheets({ version: "v4", auth: authClientObject });

	try {
		// get spreadsheet Id of dataSource
		const regex = /\/d\/(.*?)\/edit/;
		const match = url.match(regex);
		const spreadsheetId = match[1]; // this will give you the characters between /d/ and /edit/

		const response = await googleSheetsInstance.spreadsheets.get({
			spreadsheetId,
			auth,
		});

		const readData = await googleSheetsInstance.spreadsheets.values.get({
			auth, //auth object
			spreadsheetId, // spreadsheet id
			range: `${name}`, //range of cells to read from.
		})

		// get each column and put into array
		let finalList = [];
		for(let i = 0; i < readData.data.values[0].length; i++){
			let tempList = [];
			for(let j = 0; j < readData.data.values.length; j++){
				tempList.push(readData.data.values[j][i]);
			}
			finalList.push(tempList);
		}

		// console.log(readData.data.values);
		console.log(finalList);
		res.send(finalList);
	}
	catch (error){
		console.error('Error: ', error);
		res.status(400).json({ message: `Error in getting column for data source ${url}` });
	}
});

router.post('/getRows', async (req, res) => {
	const { url, name } = req.body;
	// const name = "Sheet1";

	const authClientObject = await auth.getClient();
	const googleSheetsInstance = google.sheets({ version: "v4", auth: authClientObject });

	try {
		// get spreadsheet Id of dataSource
		const regex = /\/d\/(.*?)\/edit/;
		const match = url.match(regex);
		const spreadsheetId = match[1]; // this will give you the characters between /d/ and /edit/

		const response = await googleSheetsInstance.spreadsheets.get({
			spreadsheetId,
			auth,
		});

		const readData = await googleSheetsInstance.spreadsheets.values.get({
			auth, //auth object
			spreadsheetId, // spreadsheet id
			range: `${name}`, //range of cells to read from.
		})

		res.send(readData.data.values);
	}
	catch (error){
		console.error('Error: ', error);
		res.status(400).json({ message: `Error in getting column for data source ${url}` });
	}
});

router.get('/getByAppId/:id', async(req, res) => {
	// get application
	// console.log();
	try {
		const currentApp = await appModel.findById(req.params.id);
		// console.log(currentApp.dataSources);
		let finalList = [];
		for(let i = 0; i < currentApp.dataSources.length; i++){
			finalList.push(await dataSourceModel.findById({ _id: currentApp.dataSources[i] }));
		}
		console.log(finalList);
		res.send(finalList);
	}
	catch (err) {
		console.error('Error: ', err);
		res.status(400).json({message: `Error in getting app data sources`});
	}
});

router.get('/get/:id', async(req, res) => {
	// get application
	// console.log();
	try {
		const datasource = await dataSourceModel.findById(req.params.id);
		console.log(datasource);
		res.send(datasource);
	}
	catch (err) {
		console.error('Error: ', err);
		res.status(400).json({message: `Error in getting data source`});
	}
});

router.post("/rename", async(req, res) => {
	// update the name of an application
	const {appId, name, dataSourceID} = req.body;
	try {
		// Change the name of the data source! 
		const updatedDataSource = await dataSourceModel.findOneAndUpdate(
			{ _id: dataSourceID },
			{ dataSourceName: name },
		);
		
		const list = await appModel.find({ });
		let newAppId = '';
		for(let i = 0; i < list.length; i++){
			if(list[i].dataSources.includes(dataSourceID)){
				newAppId = list[i].id;
			}
		}

		await logFile(newAppId, name + " data source renamed");
		res.send(updatedDataSource);
	}
	catch (err) {
		console.error('Error: ', err);
		await logFile(appId, "Error in renaming the data source " + dataSourceID);
		res.status(400).json({ message: `Error in renaming the data source!`});
	}
})

router.post("/setKeys", async(req, res) => {
	// update the name of an application
	const {appID, keyName, dataSourceID} = req.body;
	try {
		// Change the name of the data source! 
		const updatedDataSource = await dataSourceModel.findOneAndUpdate(
			{ _id: dataSourceID },
			{ keys: keyName },
		);
		res.send(updatedDataSource);
	}
	catch (err) {
		console.error('Error: ', err);
		res.status(400).json({ message: `Error in renaming the data source!`});
	}
})

router.post("/delete", async(req, res) => {
	const { appId, dataSourceID } = req.body;
	try {

		// DELETE FROM THE DATA SOURCES COLLECTION
		const response = await dataSourceModel.deleteOne({ _id: dataSourceID });
		console.log(response);
        if (response.deletedCount != 1) {
            throw new Error("Deletion unsuccessful or incorrect amount")
        }

		// DELETE VIEWS USING DATA SOURCE
		const views = await viewsModel.find({ table: dataSourceID });
		console.log(views);
		views.forEach(element => {
			console.log(element._id);
		});
		const resp = await viewsModel.deleteMany({ table: dataSourceID });
		console.log(resp);
		if (res.acknowledged === false) {
			throw new Error("Deletion unsuccessful or incorrect amount")
		}

		// DELETE FROM LIST OF DATA SOURCES IN APP
		const app = await appModel.findOne({ _id: appId });
		console.log(app.dataSources);
		console.log(app.dataSources.indexOf(dataSourceID));
		let index = app.dataSources.indexOf(dataSourceID);
		if (index === -1) {
            throw new Error("Data source not found in app");
        }
		app.dataSources.splice(index, 1);
		console.log(app.dataSources);

		// DELETE REMOVED VIEWS FROM LIST OF VIEWS IN APP
		console.log(app.views);
		views.forEach(v => {
			let index = app.views.indexOf(v._id);
			console.log(index)
			app.views.splice(index, 1);
		})
		console.log(app.views);

		let update = await appModel.findOneAndUpdate(
			{ _id: appId },
			{ dataSources: app.dataSources },
			{ new: true},
		);
		update = await appModel.findOneAndUpdate(
			{ _id: appId },
			{ views: app.views },
			{ new: true},
		);
		await logFile(appId, dataSourceID + " data source removed");
		res.send(update);
	}
	catch (err) {
		console.log('Error: ', err);
		await logFile(appId, "Error in removing data source " + dataSourceID);
		res.status(400).json({ message: `Error in data source deletion for ${dataSourceID}` });
	}
})

async function logFile(appId, content){
	let filePath = './log-files/' + appId + '.txt';
	content = new Date() + ": " + content + '\n';
	await fs.appendFile(filePath, content, (err) => {
		if (err) throw err;
		console.log('New file created');
	});
}

module.exports = router;