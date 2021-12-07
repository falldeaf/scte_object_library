const port = 3000;

var path = require('path');
var fs = require('fs');
const readline = require('readline');
var express = require('express');
var app = express();

const { promisify } = require('util');
const stat = promisify(fs.stat);

app.use(express.static('public'))

app.use('/models/', async (req, res)=>{
	var directory_path = path.join(__dirname, 'public');

	const models = [];

	const files = await fs.promises.readdir(directory_path);

	for(const file in files) {
		if(path.extname(files[file]) === '.glb') {
			const model = {};
			model.filename = files[file];

			const metadata = await getFirstLine(directory_path + "/" + files[file]);
			const stats = await stat(directory_path + "/" + files[file]);

			//console.log(metadata);

			model.title = metadata.extras.title;
			model.description = metadata.extras.description;
			model.author = metadata.extras.author;
			model.size = stats.size;
			model.date = stats.mtime;
			models.push(model);
		}
	}
	res.json(models);
})

app.listen(port);
console.log("Listening at http://localhost:" + port);

async function getFirstLine(pathToFile) {
	const readable = fs.createReadStream(pathToFile);
	const reader = readline.createInterface({ input: readable });
	//let count = 0;
	//let metadata = "";
	const line = await new Promise((resolve) => {
		reader.on('line', (line) => {
			reader.close();
			resolve(line);
			/*count++;
			metadata += line;
			if(count >= 2) {
				resolve(metadata);
				reader.close();
			}*/
		});
	});
	readable.close();

	const regex = /JSON((.|\n)*)]}/gm;
	const json = regex.exec(line);
	const nodes = JSON.parse(json[1] + "]}").nodes;
	for(let index in nodes) {
		if(nodes[index].name === "dataobject") {
			return nodes[index];
		}
	}
}