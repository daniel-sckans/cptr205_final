import * as THREE from './lib/three.module.js'; 
import { GLTFLoader } from './lib/GLTFLoader.js'; 

window.addEventListener('DOMContentLoaded', DOMContentLoaded => {

    // WEBSOCKET INIT
    const ws = new WebSocket('wss://southwestern.media/game_dev'); 
    ws.addEventListener('open', open => {
        console.log('WEBSOCKETS STARTED'); 
    }); 
    ws.addEventListener('close', close => {
        console.log('WEBSOCKETS CLOSED'); 
    }); 
    ws.addEventListener('error', error => {
        console.log('WEBSOCKETS ERROR'); 
    }); 
    
    // WEBSOCKET MESSAGES
    const GAME_NAME = 'evan_final'; 
    const PLAYER_NAME = Math.random().toString(); 
    let state = {}; 
    state[PLAYER_NAME] = {
        position: {
            x: Math.random() * 24 - 12, 
            y: 20, 
            z: Math.random() * 24 - 12, 
        }, 
        rotation: {
            x: 0, 
            y: Math.random() * Math.PI * 2, 
            z: 0, 
        },
    }; 
    const send_ws = () => {
        ws.send(JSON.stringify({
            Game: GAME_NAME, 
            Name: PLAYER_NAME, 
            Message: JSON.stringify(state), 
        })); 
    }; 
    ws.addEventListener('message', message => {
        const message_meta = JSON.parse(message.data); 
        if(message_meta.Game !== GAME_NAME || message_meta.Name === PLAYER_NAME) {
            return; 
        }
        const message_state = JSON.parse(message_meta.Message); 
        if(Object.keys(message_state).length === 1) {
            state[message_meta.Name] = message_state[message_meta.Name]; 
            send_ws(); 
            return; 
        }
        state = JSON.parse(message_meta.Message); 
    }); 
    
    // INIT
    const renderer = new THREE.WebGLRenderer({ 
        canvas: document.querySelector('canvas'), 
        antialias: true, 
    }); 
    renderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight); 
    renderer.setPixelRatio(window.devicePixelRatio); 
    renderer.shadowMap.enabled = true; 
    const camera = new THREE.PerspectiveCamera(75, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.1, 1000); 
    const scene = new THREE.Scene(); 
    scene.background = new THREE.Color(0x88CCFF); 
    scene.fog = new THREE.FogExp2(0X4488CC, 0.1); 

    // LIGHT
    const dir_light = new THREE.DirectionalLight(0xFFFFFF, 1); 
    dir_light.castShadow = true; 
    dir_light.position.set(3, 4, 5); 
    scene.add(dir_light); 

    // LOAD SCENE
    const loader = new GLTFLoader(); 
    let player, gun; 
    loader.load('./assets/test_scene.glb', gltf => {
        scene.add(gltf.scene); 
        scene.traverse(node => {
            if(node instanceof THREE.Mesh) {
                node.castShadow = true; 
                node.receiveShadow = true; 
                
            }
        }); 
        player = scene.getObjectByName('player'); 
        player.traverse(node => {
            if(node instanceof THREE.Mesh) {
                node.castShadow = false; 
                node.receiveShadow = false; 
            }
        }); 
        player.position.set(state[PLAYER_NAME].position.x, state[PLAYER_NAME].position.y, state[PLAYER_NAME].position.z); 
        player.rotation.y = state[PLAYER_NAME].rotation.y;
        gun = scene.getObjectByName('gun'); 
        gun.add(camera); 
        camera.position.set(0, 1, -0.5); 
        window.requestAnimationFrame(animate); 
    }, null, null); 

    // KEYBOARD
    const input = {
        w: false, 
        a: false, 
        s: false, 
        d: false, 
        f: false, 
        space: false, 
    }; 
    document.addEventListener('keydown', keydown => {
        if(input.hasOwnProperty(keydown.key)) {
            input[keydown.key] = true; 
        }
        if(keydown.key === ' ') {
            input.space = true; 
        }
    }); 
    document.addEventListener('keyup', keyup => {
        if(input.hasOwnProperty(keyup.key)) {
            input[keyup.key] = false; 
        }
        if(keyup.key === ' ') {
            input.space = false; 
        }
    }); 

    // POINTER
    renderer.domElement.addEventListener('click', focus => {
        renderer.domElement.requestPointerLock(); 
    }); 
    renderer.domElement.addEventListener('mousemove', mousemove => {
        if(document.pointerLockElement === renderer.domElement) {
            const ROT_SPEED = 1 / 256; 
            player.rotation.y -= mousemove.movementX * ROT_SPEED; 
            gun.rotation.x -= mousemove.movementY * ROT_SPEED; 
        }
    }); 


    // ANIMATE
    let vy = 0; 
    let framecount = 0; 
    const animate = timestamp => {

        // IMPORT STATE
        if(state[PLAYER_NAME].position.y === 50) {
            player.position.y = 50; 
        }
        
        // MOVEMENT
        const SPEED = 1 / 4; 
        const movement = new THREE.Vector3(input.d - input.a, 0, input.s - input.w); 
        movement.normalize(); 
        movement.multiplyScalar(SPEED); 
        movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y); 
        player.position.add(movement); 

        // COLLISION DETECTION
        const v = new THREE.Vector3(1, 0, 0); 
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y); 
        for(let i = 0; i < 8; i++) {
            v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4); 
            const origin = new THREE.Vector3(); 
            camera.getWorldPosition(origin); 
            const raycaster = new THREE.Raycaster(origin, v, 0, 0.5); 
            const collisions = raycaster.intersectObjects(scene.children, true); 
            collisions.forEach(obstacle => {
                if(obstacle.object.name.indexOf('platform') !== -1) {
                    player.position.sub(movement); 
                    i = 8; 
                    return true; 
                }
            }); 
        } 

        // JUMPING
        const platform_detector = new THREE.Raycaster(player.position, new THREE.Vector3(0, -1, 0)); 
        const platform_below = platform_detector.intersectObjects(scene.children, true); 
        const GRAVITY = 0.01, JUMP_STRENGTH = 0.3, HOVER = 0.01; 
        vy -= GRAVITY; 
        platform_below.forEach(platform => {
            if(platform.object.name.indexOf('platform') !== -1 && platform.distance <= -vy + 2 * HOVER) {
                vy = 0; 
                player.position.y = platform.point.y + HOVER; 
                if(input.space) {
                    input.space = false; 
                    vy = JUMP_STRENGTH; 
                } 
                return; 
            }
        }); 
        player.position.y += vy; 

        // ENEMIES
        Object.entries(state).forEach(character => {
            if(character[0] === PLAYER_NAME) {
                return; 
            }
            let enemy = scene.getObjectByName(character[0]); 
            if(enemy) {
                enemy.position.fromArray(Object.values(character[1].position)); 
                enemy.rotation.fromArray(Object.values(character[1].rotation)); 
                return; 
            } 
            enemy = new THREE.Object3D(); 
            enemy.copy(player, true); 
            enemy.name = character[0]; 
            scene.add(enemy); 
        }); 

        // FIRE
        if(input.f) {
            input.f = false; 
            const raycaster = new THREE.Raycaster(); 
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera); 
            const intersects = raycaster.intersectObjects(scene.children, true); 
            intersects.forEach(intersect => {
                if(intersect.object.name === 'gun') {
                    console.log('HIT', intersect); 
                    state[intersect.object.parent.name].position.y = 50; 
                    send_ws(); 
                }
            }); 
        }

        // SEND WS
        const player_state_position = new THREE.Vector3(), player_state_rotation = new THREE.Vector3(); 
        player_state_position.fromArray(Object.values(state[PLAYER_NAME].position)); 
        player_state_rotation.fromArray(Object.values(state[PLAYER_NAME].rotation)); 
        if(0.5 < player.position.distanceTo(player_state_position)) {
            state[PLAYER_NAME].position = {
                x: player.position.x, 
                y: player.position.y, 
                z: player.position.z, 
            }; 
            state[PLAYER_NAME].rotation = {
                x: 0, 
                y: player.rotation.y, 
                z: 0, 
            }; 
            console.log('SEND WS'); 
            if(ws.readyState === ws.OPEN) {
                 send_ws(); 
            }
        }
                
        // RENDER
        window.requestAnimationFrame(animate); 
        renderer.render(scene, camera); 
        ++framecount; 
    }; 
            
}); 