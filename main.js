import * as THREE from './lib/three.module.js'; 
import { GLTFLoader } from './lib/GLTFLoader.js'; 

window.addEventListener('DOMContentLoaded', DOMContentLoaded => {

    // INIT
    const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas') }); 
    renderer.shadowMap.enabled = true; 
    renderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight); 
    const camera = new THREE.PerspectiveCamera(75, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.1, 1000); 
    const scene = new THREE.Scene(); 
    scene.background = new THREE.Color(0x88CCFF); 
    scene.fog = new THREE.FogExp2(scene.background, 0.05); 

    // LIGHT
    const dir_light = new THREE.DirectionalLight(0xFFFFFF, 1); 
    dir_light.position.set(3, 4, 5); 
    dir_light.castShadow = true; 
    scene.add(dir_light); 
    const hemi_light = new THREE.HemisphereLight(0xFFFFFF, 0.5); 
    scene.add(hemi_light); 

    // LOAD MODEL
    let player, head; 
    const loader = new GLTFLoader(); 
    loader.load('./assets/test_scene.glb', gltf => {
        scene.add(gltf.scene); 
        scene.traverse(node => {
            if(node instanceof THREE.Mesh) {
                node.castShadow = true; 
                node.receiveShadow = true; 
            }
        }); 
        player = scene.getObjectByName('player'); 
        head = scene.getObjectByName('gun'); 
        head.add(camera); 
        camera.position.y = 0.5; 
        camera.position.z = -1; 
        window.requestAnimationFrame(animation); 
    }); 

    // KEYBOARD
    const keyboard = {
        w: false, 
        a: false, 
        s: false, 
        d: false, 
        f: false, 
        ' ': false, 
    }; 
    document.addEventListener('keydown', keydown => {
        if(keyboard.hasOwnProperty(keydown.key)) {
            keyboard[keydown.key] = true; 
        }
    }); 
    document.addEventListener('keyup', keyup => {
        if(keyboard.hasOwnProperty(keyup.key)) {
            keyboard[keyup.key] = false; 
        }
    }); 
    
    // POINTER
    renderer.domElement.addEventListener('click', click => {
        renderer.domElement.requestPointerLock(); 
    }); 
    renderer.domElement.addEventListener('mousemove', mousemove => {
        if(document.pointerLockElement === renderer.domElement) {
            const HEAD_ROTATION_SPEED = 1 / 256; 
            head.rotation.x -= mousemove.movementY * HEAD_ROTATION_SPEED; 
            player.rotation.y -= mousemove.movementX * HEAD_ROTATION_SPEED; 
        }
    }); 

    // ANIMATE
    const animation = timestamp => {

        // MOVEMENT
        const movement = new THREE.Vector3(keyboard.d - keyboard.a, 0, keyboard.s - keyboard.w); 
        movement.normalize(); 
        movement.multiplyScalar(1 / 8); 
        movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y); 
        player.position.add(movement); 

        // RENDER
        renderer.render(scene, camera); 
        window.requestAnimationFrame(animation); 
    }; 
}); 