import * as THREE from "three";

// --- Basic Setup ---
let scene, camera, renderer, clock;
let car, ground;
const obstacles = [];
const worldSize = 100; // How large the ground plane is (width/depth)
const boundary = worldSize / 2 - 2; // Keep car slightly inside the edge

// --- Car Controls ---
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
};
const carSpeed = 10; // Units per second
const turnSpeed = Math.PI; // Radians per second

// +++ Gamepad State +++
let gamepadIndex = null;
const gamepadState = {
  axes: [0, 0, 0, 0], // Assuming standard layout [leftStickX, leftStickY, rightStickX, rightStickY]
  buttons: [], // We might use buttons later
};
const deadZone = 0.15; // Ignore small stick movements

// --- Initialization ---
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Sky blue background
  scene.fog = new THREE.Fog(0x87ceeb, 50, 150); // Add some fog for depth

  // Clock (for delta time)
  clock = new THREE.Clock();

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // Initial camera position will be set relative to the car later

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // Enable shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
  document.getElementById("game-container").appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(30, 50, 20);
  directionalLight.castShadow = true;
  // Configure shadow properties for better quality/performance
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -worldSize;
  directionalLight.shadow.camera.right = worldSize;
  directionalLight.shadow.camera.top = worldSize;
  directionalLight.shadow.camera.bottom = -worldSize;
  scene.add(directionalLight);
  // scene.add(new THREE.CameraHelper(directionalLight.shadow.camera)); // Uncomment to visualize shadow camera

  // Ground
  const groundGeometry = new THREE.PlaneGeometry(worldSize, worldSize);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x556b2f,
    side: THREE.DoubleSide,
  }); // Forest green
  ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be flat
  ground.receiveShadow = true; // Allow shadows on the ground
  scene.add(ground);

  // Car
  const carGeometry = new THREE.BoxGeometry(2, 1, 4); // width, height, depth
  const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red car
  car = new THREE.Mesh(carGeometry, carMaterial);
  car.position.y = 0.5; // Place it slightly above the ground
  car.castShadow = true;
  scene.add(car);

  // Random Obstacles
  createObstacles(30); // Add 30 random obstacles

  // --- Event Listeners ---
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("gamepadconnected", handleGamepadConnected);
  window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

  // Start the animation loop
  animate();
}

// --- Create Random Obstacles ---
function createObstacles(count) {
  const obstacleGeometry = new THREE.BoxGeometry(); // Default 1x1x1 cube
  const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 }); // Grey

  for (let i = 0; i < count; i++) {
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial.clone()); // Clone material for potential color variation later

    // Random position within boundaries, avoiding the center start area
    let placed = false;
    while (!placed) {
      const x = THREE.MathUtils.randFloatSpread(worldSize * 0.9); // Spread within 90% of world size
      const z = THREE.MathUtils.randFloatSpread(worldSize * 0.9);
      if (Math.abs(x) > 5 || Math.abs(z) > 5) {
        // Avoid spawning too close to 0,0
        obstacle.position.set(x, 0.5, z); // Place on ground
        placed = true;
      }
    }

    // Random size
    const scale = THREE.MathUtils.randFloat(1, 4);
    obstacle.scale.set(scale, scale, scale);
    obstacle.position.y = scale / 2; // Adjust Y based on scale

    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    scene.add(obstacle);
    obstacles.push(obstacle);
  }
}

// --- Event Handlers ---
function handleKeyDown(event) {
  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      keys.w = true;
      break;
    case "a":
    case "arrowleft":
      keys.a = true;
      break;
    case "s":
    case "arrowdown":
      keys.s = true;
      break;
    case "d":
    case "arrowright":
      keys.d = true;
      break;
  }
}

function handleKeyUp(event) {
  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      keys.w = false;
      break;
    case "a":
    case "arrowleft":
      keys.a = false;
      break;
    case "s":
    case "arrowdown":
      keys.s = false;
      break;
    case "d":
    case "arrowright":
      keys.d = false;
      break;
  }
}

// +++ Gamepad Event Handlers +++
function handleGamepadConnected(event) {
  console.log("Gamepad connected:", event.gamepad.id);
  // Use the first connected gamepad
  if (gamepadIndex === null) {
    gamepadIndex = event.gamepad.index;
    // Initialize button state array if needed
    gamepadState.buttons = Array(event.gamepad.buttons.length).fill(false);
  }
}

function handleGamepadDisconnected(event) {
  console.log("Gamepad disconnected:", event.gamepad.id);
  if (event.gamepad.index === gamepadIndex) {
    gamepadIndex = null;
    // Reset gamepad state
    gamepadState.axes = [0, 0, 0, 0];
    gamepadState.buttons.fill(false);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate); // Request next frame

  const deltaTime = clock.getDelta(); // Time elapsed since last frame

  // +++ Read Gamepad Input +++
  updateGamepadInput();

  // Update car movement
  updateCar(deltaTime);

  // Update camera position
  updateCamera();

  // Render the scene
  renderer.render(scene, camera);
}

// +++ Gamepad Update Function +++
function updateGamepadInput() {
  if (gamepadIndex === null) return; // No gamepad connected

  const gamepads = navigator.getGamepads();
  const gp = gamepads[gamepadIndex];

  if (!gp) {
    console.warn("Gamepad lost? Index:", gamepadIndex);
    gamepadIndex = null; // Maybe it got disconnected without an event?
    return;
  }

  // Read axes (handle dead zone)
  for (let i = 0; i < Math.min(gp.axes.length, gamepadState.axes.length); i++) {
    let value = gp.axes[i];
    if (Math.abs(value) < deadZone) {
      value = 0;
    }
    // Optional: Apply scaling or curves if needed
    gamepadState.axes[i] = value;
  }

  // Read buttons (optional for now)
  // for (let i = 0; i < Math.min(gp.buttons.length, gamepadState.buttons.length); i++) {
  //     gamepadState.buttons[i] = gp.buttons[i].pressed;
  // }
}

// --- Update Car Logic ---
function updateCar(deltaTime) {
  const currentTurnSpeed = turnSpeed * deltaTime;
  const currentMoveSpeed = carSpeed * deltaTime;

  // --- Determine Input ---
  let forwardInput = 0;
  let turnInput = 0;

  // Keyboard Input
  if (keys.w) forwardInput -= 1; // Forward
  if (keys.s) forwardInput += 0.6; // Reverse (slower)
  if (keys.a) turnInput += 1; // Left
  if (keys.d) turnInput -= 1; // Right

  // Gamepad Input (Overrides Keyboard if active)
  // Assuming standard gamepad layout: Left stick X (axis 0) for turning, Left stick Y (axis 1) for throttle/brake
  // Note: Gamepad Y axis is often inverted (-1 is up/forward)
  const gpTurn = gamepadState.axes[0];
  const gpForward = -gamepadState.axes[1]; // Invert Y axis

  if (Math.abs(gpForward) > deadZone) {
    forwardInput = gpForward > 0 ? -gpForward : gpForward * 0.6; // Forward/Reverse (slower reverse)
  }
  if (Math.abs(gpTurn) > deadZone) {
    turnInput = -gpTurn; // Invert X axis for steering (left stick left = negative)
  }

  // --- Apply Input ---
  // Rotation (Turning)
  if (turnInput !== 0) {
    car.rotateY(currentTurnSpeed * turnInput);
  }

  // Movement (Forward/Backward)
  if (forwardInput !== 0) {
    car.translateZ(currentMoveSpeed * forwardInput);
  }

  // --- Boundary Checks ---
  car.position.x = THREE.MathUtils.clamp(car.position.x, -boundary, boundary);
  car.position.z = THREE.MathUtils.clamp(car.position.z, -boundary, boundary);

  // Keep car on the ground (simple way, no physics)
  car.position.y = 0.5;
}

// --- Update Camera Logic ---
function updateCamera() {
  // Calculate desired camera position: behind and slightly above the car
  const relativeCameraOffset = new THREE.Vector3(0, 5, 12); // x, y (height), z (distance behind)

  // Apply the car's rotation to the offset vector
  const cameraOffset = relativeCameraOffset.applyMatrix4(car.matrixWorld);

  // Smoothly interpolate camera position towards the target offset
  // camera.position.lerp(cameraOffset, 0.1); // Simple lerp - can feel a bit stiff

  // A slightly better follow: calculate target position and lookAt
  const targetPosition = new THREE.Vector3();
  car.getWorldPosition(targetPosition); // Get car's world position

  const desiredCameraPosition = targetPosition.clone().add(
    new THREE.Vector3(0, 5, 12) // Base offset
      .applyQuaternion(car.quaternion) // Rotate offset by car's orientation
  );

  // Smoothly move camera to the desired position
  camera.position.lerp(desiredCameraPosition, 0.05); // Adjust lerp factor (0.05 = slower, smoother)

  // Make the camera look at the car's position
  camera.lookAt(car.position);
}

// --- Start the App ---
init();
