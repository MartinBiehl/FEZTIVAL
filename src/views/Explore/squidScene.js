import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/*
 * Lula 3D do hero do /explorar, modelada por codigo (sem arquivo .glb) e
 * renderizada como no Blender: material com verniz (clearcoat), reflexo de
 * estudio (RoomEnvironment) e luz de recorte roxa. Carregada sob demanda por
 * InkSquid.jsx, so em desktop com mouse.
 */
const PINK = '#FF3CAC';
const PURPLE = '#9B4DFF';
const YELLOW = '#FFD600';
const MASK = '#2B0B3F';

const glossy = { roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 };

function smoothProfile(points, divisions) {
  return new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(divisions);
}

/* Tubo afinando na ponta, com degrade rosa -> roxo e ponta arredondada. */
function tentacleMesh(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const tubular = 48;
  const radial = 14;
  const geometry = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  const position = geometry.attributes.position;
  const colors = [];
  const vertex = new THREE.Vector3();
  const from = new THREE.Color(PINK);
  const to = new THREE.Color(PURPLE);
  const color = new THREE.Color();

  for (let index = 0; index < position.count; index += 1) {
    const t = Math.floor(index / (radial + 1)) / tubular;
    const center = curve.getPointAt(t);
    vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(1 - 0.35 * t).add(center);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    color.lerpColors(from, to, t);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material));
  const tip = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.65, 16, 12), material);
  tip.position.copy(curve.getPointAt(1));
  tip.geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(new Array(tip.geometry.attributes.position.count).fill([to.r, to.g, to.b]).flat(), 3),
  );
  group.add(tip);
  return { group, curve };
}

function buildSquid() {
  const skin = new THREE.MeshPhysicalMaterial({
    ...glossy,
    color: PINK,
    sheen: 0.2,
    sheenColor: '#FFB8E2',
  });
  const tentacleSkin = new THREE.MeshPhysicalMaterial({ ...glossy, color: '#FFFFFF', vertexColors: true });
  const fringe = new THREE.MeshPhysicalMaterial({ ...glossy, color: '#C2188A' });
  const mask = new THREE.MeshPhysicalMaterial({ ...glossy, color: MASK, roughness: 0.4 });
  const eyeWhite = new THREE.MeshPhysicalMaterial({ ...glossy, color: '#FFFFFF', roughness: 0.15 });
  const pupil = new THREE.MeshPhysicalMaterial({ ...glossy, color: '#120A1F', roughness: 0.05 });
  const sparkle = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const spot = new THREE.MeshPhysicalMaterial({ ...glossy, color: '#FFC2EA' });
  const gold = new THREE.MeshPhysicalMaterial({ ...glossy, color: YELLOW, metalness: 0.15, roughness: 0.25 });

  const squid = new THREE.Group();

  // Manto em ponta, como um capuz.
  const mantle = new THREE.Mesh(
    new THREE.LatheGeometry(
      smoothProfile(
        [[0.001, -0.36], [0.55, -0.33], [0.92, -0.2], [1.1, 0.05], [1.08, 0.3], [0.92, 0.6], [0.66, 0.95], [0.38, 1.28], [0.14, 1.52], [0.001, 1.6]],
        48,
      ),
      56,
    ),
    skin,
  );
  mantle.scale.set(1.08, 1, 0.8);
  squid.add(mantle);

  // Franja de "dentes" na base do manto.
  const fringeTooth = new THREE.ConeGeometry(0.15, 0.34, 14);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(fringeTooth, fringe);
    tooth.position.set(Math.sin(angle) * 0.74, -0.42, Math.cos(angle) * 0.58);
    tooth.rotation.set(Math.PI, 0, 0);
    squid.add(tooth);
  }

  // Olhos: mascara escura, globo, pupila e brilho. Cada olho pisca sozinho.
  const eyes = [-1, 1].map((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.4, 0.22, 0.74);
    eye.rotation.y = side * 0.32;

    const socket = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mask);
    socket.scale.set(0.37, 0.42, 0.2);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), eyeWhite);
    ball.scale.set(0.28, 0.32, 0.17);
    ball.position.z = 0.05;
    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), pupil);
    iris.scale.set(0.14, 0.16, 0.07);
    iris.position.set(-side * 0.04, -0.04, 0.19);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), sparkle);
    shine.position.set(-side * 0.08, 0.04, 0.25);

    eye.add(socket, ball, iris, shine);
    squid.add(eye);
    return eye;
  });

  // Sobrancelhas decididas.
  const browGeometry = new THREE.CapsuleGeometry(0.055, 0.34, 6, 12);
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(browGeometry, mask);
    brow.position.set(side * 0.38, 0.64, 0.66);
    brow.rotation.set(0, side * 0.35, Math.PI / 2 + side * 0.38);
    squid.add(brow);
  }

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 8, 20, Math.PI), mask);
  mouth.position.set(0, -0.12, 0.8);
  mouth.rotation.z = Math.PI;
  squid.add(mouth);

  // Fone amarelo: arco por cima da ponta e conchas nas laterais.
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.065, 14, 64, Math.PI), gold);
  band.position.y = 0.25;
  band.scale.y = 1.25;
  band.rotation.x = -0.12;
  squid.add(band);
  for (const side of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.22, 36), gold);
    cup.position.set(side * 1.2, 0.25, 0);
    cup.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.04, 10, 36), mask);
    rim.position.set(side * 1.09, 0.25, 0);
    rim.rotation.y = Math.PI / 2;
    squid.add(cup, rim);
  }

  // Tentaculos: dois longos em gancho na frente e quatro curtos.
  const tentacles = [];
  const longPath = [[0, 0, 0], [-0.03, -0.45, 0.05], [-0.16, -0.95, 0.1], [-0.4, -1.3, 0.12], [-0.33, -1.62, 0.1], [-0.12, -1.72, 0.08]];
  for (const side of [-1, 1]) {
    const { group, curve } = tentacleMesh(longPath.map(([x, y, z]) => [-side * x, y, z]), 0.17, tentacleSkin);
    for (const [t, offset] of [[0.62, 0.05], [0.76, -0.04], [0.9, 0.03]]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), spot);
      dot.position.copy(curve.getPointAt(t)).add(new THREE.Vector3(offset, 0, 0.13));
      dot.scale.z = 0.45;
      group.add(dot);
    }
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.4, -0.35, 0.18);
    pivot.add(group);
    squid.add(pivot);
    tentacles.push({ pivot, phase: side > 0 ? Math.PI : 0, amplitude: 0.16 });
  }
  const shortPath = [[0, 0, 0], [0, -0.35, 0.02], [0.05, -0.65, 0.05], [0.12, -0.8, 0.04]];
  [[-0.15, 0.32, 1], [0.15, 0.32, -1], [-0.55, -0.25, -1], [0.55, -0.25, 1]].forEach(([x, z, flip], index) => {
    const { group } = tentacleMesh(shortPath.map(([px, py, pz]) => [px * flip, py, pz]), 0.1, tentacleSkin);
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.33, z);
    pivot.add(group);
    squid.add(pivot);
    tentacles.push({ pivot, phase: index * 1.3, amplitude: 0.22 });
  });

  return { squid, eyes, tentacles };
}

function damp(current, target, smoothing, elapsed) {
  return current + (target - current) * (1 - Math.exp(-smoothing * elapsed));
}

function clampUnit(value) {
  return Math.min(1, Math.max(-1, value));
}

export function createSquidScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral preserva o rosa da marca; AgX/ACES puxariam para o salmao.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.6;

  const key = new THREE.DirectionalLight('#FFFFFF', 2.4);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight('#B36AFF', 4);
  rim.position.set(-4, 2, -4);
  const kick = new THREE.DirectionalLight('#00D4FF', 1.6);
  kick.position.set(4, -1, -3);
  scene.add(key, rim, kick);

  const camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
  camera.position.set(0, 0.3, 8.6);
  camera.lookAt(0, -0.05, 0);

  const { squid, eyes, tentacles } = buildSquid();
  const root = new THREE.Group();
  root.position.y = 0.15;
  root.add(squid);
  scene.add(root);

  const pose = { yaw: 0, pitch: 0, roll: 0 };
  let lastTime = 0;
  let nextBlink = 2500;

  /* velocityX/Y em px/s: vira o corpo e inclina para onde esta nadando. */
  function render(now, velocityX, velocityY) {
    const elapsed = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
    lastTime = now;
    const seconds = now / 1000;

    pose.yaw = damp(pose.yaw, clampUnit(velocityX / 1200) * 0.75, 6, elapsed);
    pose.roll = damp(pose.roll, -clampUnit(velocityX / 1400) * 0.45, 5, elapsed);
    pose.pitch = damp(pose.pitch, clampUnit(velocityY / 1200) * 0.35, 5, elapsed);
    root.rotation.set(pose.pitch, pose.yaw + Math.sin(seconds * 0.9) * 0.12, pose.roll);

    // Respira: sobe, desce e estica um pouco.
    const breath = Math.sin(seconds * 2.4);
    squid.position.y = breath * 0.06;
    squid.scale.set(1 - breath * 0.015, 1 + breath * 0.025, 1 - breath * 0.015);

    for (const tentacle of tentacles) {
      const wave = seconds * 4.2 + tentacle.phase;
      tentacle.pivot.rotation.z = Math.sin(wave) * tentacle.amplitude - pose.roll * 0.5;
      tentacle.pivot.rotation.x = Math.cos(wave * 0.8) * tentacle.amplitude * 0.5 - pose.pitch * 0.6;
    }

    const blinkAge = now - nextBlink;
    const lid = blinkAge > 0 && blinkAge < 140 ? 0.12 : 1;
    if (blinkAge >= 140) nextBlink = now + 2500 + Math.random() * 3000;
    for (const eye of eyes) eye.scale.y = lid;

    renderer.render(scene, camera);
  }

  function dispose() {
    scene.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      object.material.dispose();
    });
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  return { render, dispose };
}
