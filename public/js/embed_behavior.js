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
} from '/js/three.module.js'
import { OrbitControls } from '/js/OrbitControls.js'
import { GLTFLoader } from '/js/GLTFLoader.js'

let viewport, scene, camera, renderer, object, controls, behavior, overlay, image_width, image_height, metadata;

async function init() {
	const url_vars = getUrlVars();
	const filename = url_vars["filename"];
	const color = url_vars["color"];
	behavior = url_vars["behavior"];
	overlay = url_vars["overlay"];
	image_width = parseInt(url_vars["width"]) || 800;
	image_height = parseInt(url_vars["height"]) || 600;

	console.log(`filename: ${filename}, color: ${color}, behavior: ${behavior}, image wh: ${image_width}, ${image_height}`);

	scene = new Scene();

	//Lights
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

	//Camera
	camera = new PerspectiveCamera(40,image_width/image_height,1,5000);
	camera.rotation.y = 45/180*Math.PI;
	camera.position.x = 8;
	camera.position.y = 1;
	camera.position.z = 10;
	camera.fov = 20;
	camera.aspect = image_width/image_height;
	camera.updateProjectionMatrix();

	//Action
	renderer = new WebGLRenderer({antialias:true, alpha: true, preserveDrawingBuffer: true});
	renderer.setSize(image_width, image_height);
	viewport = document.getElementById('viewport');
	viewport.appendChild(renderer.domElement);
	controls = new OrbitControls(camera, renderer.domElement);
	if(behavior == 1) controls.autoRotate = true;
	controls.addEventListener('start', ()=> { controls.autoRotate = false; } );
	renderer.setClearColor( color.slice(0, 7) , parseInt(color.slice(7, 9), 16)/255);
	loadModel(filename);
}
init();

function loadModel(filename) {
	let loader = new GLTFLoader();
	loader.load("art/" + filename, async function(gltf){
		object = gltf.scene;
		object.children.forEach(function(child){
			if(child.name === 'dataobject') {
				console.log(child.userData);
				metadata = child.userData;
				if(overlay == "true") createOverlay(metadata.title);
			}
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
	controls.update();
	renderer.render(scene,camera);
	requestAnimationFrame(animate);
}

function createOverlay(innerhtml) {
	let overlay = document.createElement('div');
	overlay.id = 'overlay';
	overlay.innerHTML = innerhtml;
	document.querySelector('#viewport').appendChild(overlay);
}

function resetSize() {
	let viewport_width = Number(image_width);
	let viewport_height = Number(image_height);
	document.getElementById("viewport").style.width = viewport_width + "px";
	document.getElementById("viewport").style.height = viewport_height + "px";

	renderer.setSize( image_width, image_height);
	camera.aspect = image_width/image_height;
	camera.updateProjectionMatrix();
}

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

function resetViewport() {
	clearScene(scene)
	if(document.getElementById("svg-object")) delete document.getElementById("svg-object");
	document.getElementById("viewport").innerHTML = "";
}

function hexToRgba(hex) {
	console.log(hex);
	var r = parseInt(hex.slice(1, 3), 16),
		g = parseInt(hex.slice(3, 5), 16),
		b = parseInt(hex.slice(5, 7), 16),
		a = parseInt(hex.slice(7, 9), 16);
	let rgba = `rgba(${r},${g},${b},${(a/255).toFixed(1)})`;
	console.log(rgba);
	return rgba;
}

function getUrlVars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
	});
	return vars;
}