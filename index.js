const port = 3000;

var path = require('path');
var fs = require('fs');
const readline = require('readline');
var express = require('express');
var app = express();

const { promisify } = require('util');
const stat = promisify(fs.stat);

app.use(express.static('public'));

const filetypes = ['.glb', '.svg']

app.use('/models/', async (req, res)=>{
	var directory_path = path.join(__dirname, 'public/art');

	const models = [];

	const files = await fs.promises.readdir(directory_path);

	for(const file in files) {
		const model = {};
		switch(path.extname(files[file])) {
			case filetypes[0]: //.glb
				model.filename = files[file];
				model.type = 'glb';
				model.icon = "cube"; //font awesome icon
				metadata = glbMetadata(await getFileHeader(directory_path + "/" + files[file]));
				break;
			case filetypes[1]: //.svg
				model.filename = files[file];
				model.type = "svg";
				model.icon = "image";
				metadata = svgMetadata(await getFileHeader(directory_path + "/" + files[file]));
				break;
		}

		if(filetypes.indexOf(path.extname(files[file])) >= 0) {
			const stats = await stat(directory_path + "/" + files[file]);
			model.title = metadata.extras.title;
			model.description = metadata.extras.description;
			model.author = metadata.extras.author;
			model.size = stats.size;
			model.date = stats.birthtime;
			models.push(model);
		}
	}
	res.json(models);
})

app.listen(port);
console.log("Listening at http://localhost:" + port);

async function getFileHeader(pathToFile) {
	const readable = fs.createReadStream(pathToFile);
	const reader = readline.createInterface({ input: readable });
	let count = 0;
	let metadata = "";
	const line = await new Promise((resolve) => {
		reader.on('line', (line) => {
			//reader.close();
			//resolve(line);
			count++;
			metadata += line;
			if(count >= 2) {
				resolve(metadata);
				reader.close();
			}
		});
	});
	readable.close();
	return metadata;
}

function glbMetadata(metadata) {
	//Fish out the json metadata
	const regex = /JSON(.*),"buffers"/gm;
	const json = regex.exec(metadata);
	const nodes = JSON.parse(json[1] + "}").nodes;
	for(let index in nodes) {
		if(nodes[index].name === "dataobject") {
			return nodes[index];
		}
	}
}

function svgMetadata(metadata) {
	//Fish out the svg metadata
	const regex = /jsonmeta="(.*?)">/;
	const json = regex.exec(metadata);
	let nodes = JSON.parse(decodeURIComponent(json[1]));
	return {extras: nodes};
}