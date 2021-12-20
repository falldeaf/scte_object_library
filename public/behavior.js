import {
	Camera,
	DirectionalLight,
	Color,
	Mesh,
	Material,
	PointLight,
	WebGLRenderer,
	Scene,
	PerspectiveCamera,
	TextureLoader,
	EquirectangularReflectionMapping,
	AmbientLight,
	sRGBEncoding,
	Box3,
	Vector3,
	MathUtils,
} from 'https://unpkg.com/three@0.120.1/build/three.module.js'
import { OrbitControls } from 'https://unpkg.com/three@0.120.1/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://unpkg.com/three@0.120.1/examples/jsm/loaders/GLTFLoader.js'
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.esm.js'

let viewport, scene, camera, renderer, models, fuse, object, controls, active_filename;
let lights = [];

let image_width = 800;
let image_height = 600;
let css_viewport_border_width = 8;

async function init() {

	scene = new Scene();
	//scene.background = new Color(0x333333);

	camera = new PerspectiveCamera(40,image_width/image_height,1,5000);
	camera.rotation.y = 45/180*Math.PI;
	camera.position.x = 8;
	camera.position.y = 1;
	camera.position.z = 10;
	camera.fov = 20;
	//camera.aspect = image_width/image_height;
	camera.updateProjectionMatrix();

	const hlight = new AmbientLight (0x404040,12);
	scene.add(hlight);

	const directionalLight = new DirectionalLight(0xffffff,1);
	directionalLight.position.set(0,1,0);
	directionalLight.castShadow = true;
	scene.add(directionalLight);
	const light = new PointLight(0xc4c4c4,1);
	light.position.set(0,300,500);
	scene.add(light);
	const light2 = new PointLight(0xc4c4c4,1);
	light2.position.set(500,100,0);
	scene.add(light2);
	const light3 = new PointLight(0xc4c4c4,1);
	light3.position.set(0,100,-500);
	scene.add(light3);
	const light4 = new PointLight(0xc4c4c4,1);
	light4.position.set(-500,300,500);
	scene.add(light4);

	lights.push(directionalLight);
	lights.push(light);
	lights.push(light2);
	lights.push(light3);
	lights.push(light4);

	renderer = new WebGLRenderer({antialias:true, alpha: true, preserveDrawingBuffer: true});
	renderer.setSize(800,600);
	viewport = document.getElementById('viewport');
	viewport.appendChild(renderer.domElement);

	controls = new OrbitControls(camera, renderer.domElement);

	//controls.addEventListener('change', renderer);
	//window.addEventListener( 'resize', onWindowResize );

	document.getElementById("search").value = "";
	const response = await fetch("models/");
	models = await response.json();
	fuse = new Fuse(models, {keys: ['author', 'title', 'description', 'filename']});
	active_filename = models[0].filename;
	console.log(models);
	renderList(models, false);
	loadModel(active_filename);
}

function loadModel(filename) {
	active_filename = filename;
	scene.remove(object);
	let loader = new GLTFLoader();
	loader.load(filename, async function(gltf){
		object = gltf.scene;
		object.children.forEach(function(child){
			if(child.name === 'dataobject') console.log(child.userData);
		});

		const textureLoader = new TextureLoader();
		let textureEquirec = textureLoader.load( 'environment.jpg' );
		textureEquirec.mapping = EquirectangularReflectionMapping;
		textureEquirec.encoding = sRGBEncoding;
		//scene.background = textureEquirec;

		object.traverse( function ( child ) {
			if ( child instanceof Mesh ) {
				child.material.envMap = textureEquirec;
				// add any other properties you want here. check the docs.
			}
		});

		//object.rotateX(0.3);
		scene.add(object);

		// compute the box that contains all the stuff
		const box = new Box3().setFromObject(object);
		const boxSize = box.getSize(new Vector3()).length();
		const boxCenter = box.getCenter(new Vector3());
		frameArea(boxSize * 0.5, boxSize, boxCenter, camera);

		// update the Trackball controls to handle the new size
		controls.maxDistance = boxSize * 10;
		controls.target.copy(boxCenter);
		controls.update();
		camera.updateProjectionMatrix();

		animate();
	});
}

function animate() {
	renderer.render(scene,camera);
	requestAnimationFrame(animate);
}
init();

async function renderList(models, search) {

	let list = "";
	let model;

	for(let index in models) {
		if(search) {
			model = models[index].item;
		} else {
			model = models[index];
		}

		const active = (active_filename === model.filename) ? "active" : "";
		const date = new Date(model.date).toLocaleDateString("en-US", {year: "numeric", month:"short", day:"2-digit"});

		var elem = `
			<a href="#" class="list-group-item list-group-item-action ${active}" aria-current="true" filename="${model.filename}">
				<div class="d-flex w-100 justify-content-between">
					<h5 class="mb-1">${model.title}</h5>
					<small>${date}</small>
				</div>
				<p class="mb-1">${model.description}</p>
				<small>${model.author}</small>
			</a>
		`;

		list += elem;
	}

	document.getElementById('list-group').innerHTML = list;

	var model_links = document.querySelectorAll(".list-group-item");
	for(var i =0; i < model_links.length; i++) {
		model_links[i].onclick = function() {
			if(!this.classList.contains('active')) {
				console.log(this);
				if(document.querySelector(".active")) document.querySelector(".active").classList.remove("active");
				this.classList.add("active");
				loadModel(this.getAttribute("filename"));
			}
		}
	}
}

function performSearch() {
	const search_str = document.getElementById("search").value;
	if(search_str === "") {
		renderList(models, false);
	} else {
		const result = fuse.search(search_str);
		renderList(result, true);
	}
}

document.getElementById("search").oninput = performSearch;

document.getElementById("clear").onclick = function() {
	document.getElementById("search").value = "";
	performSearch();
}

document.getElementById("image-width").value = image_width;
document.getElementById("image-height").value = image_height;

document.getElementById("image-width").onchange = function() {
	image_width = document.getElementById("image-width").value;
	resetSize();
}

document.getElementById("image-height").onchange = function() {
	image_height = document.getElementById("image-height").value;
	resetSize();
}

function resetSize() {
	let viewport_width = Number(image_width) + css_viewport_border_width * 2;
	let viewport_height = Number(image_height) + css_viewport_border_width * 2;
	console.log(viewport_height + "px");
	document.getElementById("viewport").style.width = viewport_width + "px";
	document.getElementById("viewport").style.height = viewport_height + "px";
	renderer.setSize( image_width, image_height);
	camera.aspect = image_width/image_height;
	camera.updateProjectionMatrix();
}

document.getElementById("save").onclick = function() {
	saveImg(document.querySelector(".active").getAttribute("filename"));
}

document.getElementById("brightness").onchange = () => {
	console.log(document.getElementById("brightness").value);
	setBrightness(document.getElementById("brightness").value/10);
};

function setBrightness(brightness) {
	lights.forEach((light, index) => {
		light.intensity = brightness;
	});
}

function setColor() {
	const color_pick = document.getElementById('color-picker').value;
	renderer.setClearColor( color_pick.slice(0, 7) , parseInt(color_pick.slice(7, 9), 16)/255);
}
window.setColor = setColor;

function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
	const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.8;
	const halfFovY = MathUtils.degToRad(camera.fov * .5);
	const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);
	// compute a unit vector that points in the direction the camera is now
	// in the xz plane from the center of the box
	const direction = (new Vector3())
		.subVectors(camera.position, boxCenter)
		.multiply(new Vector3(1, 0, 1))
		.normalize();

	// move the camera to a position distance units way from the center
	// in whatever direction the camera was from the center already
	camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

	// pick some near and far values for the frustum that
	// will contain the box.
	camera.near = boxSize / 100;
	camera.far = boxSize * 100;

	camera.updateProjectionMatrix();

	// point the camera to look at the center of the box
	camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
}

function onWindowResize() {

	camera.aspect = viewport.innerWidth / viewport.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( viewport.innerWidth, viewport.innerHeight );
}


function saveImg(filename) {
	let imgData = renderer.domElement.toDataURL("image/png");

	var link = document.createElement("a");
	link.download = filename.split(".")[0] + ".png";
	link.href = imgData;
	link.click();
}