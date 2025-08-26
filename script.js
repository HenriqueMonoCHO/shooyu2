const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10,10,10);
    scene.add(directionalLight);

    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({color: 0x444444});
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);

    const cubeGeometry = new THREE.BoxGeometry(1,1,1);
    const cubeMaterial = new THREE.MeshStandardMaterial({color: 0x28a745});
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(0, 0.5, -5);
    scene.add(cube);

    camera.position.set(0, 1.6, 0);

    let yaw = 0;
    let pitch = 0;
    const sensitivity = 0.002;
    let isPointerLocked = false;

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    renderer.domElement.addEventListener('click', () => {
      if (!isPointerLocked && loginModal.style.display === 'none') {
        renderer.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      isPointerLocked = document.pointerLockElement === renderer.domElement;
    });

    document.addEventListener('mousemove', (event) => {
      if (!isPointerLocked) return;
      yaw -= event.movementX * sensitivity;
      pitch -= event.movementY * sensitivity;
      pitch = clamp(pitch, -Math.PI/2 + 0.1, Math.PI/2 - 0.1);
    });

    
    const loginModal = document.getElementById('loginModal');
    const closeModalBtn = document.getElementById('closeModal');
    const loginForm = document.getElementById('loginForm');
    const imageOverlay = document.getElementById('imageOverlay');
    const closeImageBtn = document.getElementById('closeImageBtn');

    function updateButtonPosition() {
      const vector = new THREE.Vector3();
      vector.setFromMatrixPosition(cube.matrixWorld);
      vector.project(camera);

      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      const toCube = new THREE.Vector3();
      toCube.subVectors(cube.position, camera.position);
      const dot = cameraDirection.dot(toCube);

     
    }

    const movement = { forward: false, backward: false, left: false, right: false, running: false };
    let velocityY = 0;
    let isGrounded = true;
    const gravity = -0.01;
    const jumpForce = 0.18;
    const baseSpeed = 0.1;
    const runMultiplier = 1.8;

    document.addEventListener('keydown', (e) => {
      if (!isPointerLocked) return;
      if (e.code === 'KeyW') movement.forward = true;
      if (e.code === 'KeyS') movement.backward = true;
      if (e.code === 'KeyA') movement.left = true;
      if (e.code === 'KeyD') movement.right = true;
      if (e.code === 'ShiftLeft') movement.running = true;
      if (e.code === 'Space' && isGrounded) {
        velocityY = jumpForce;
        isGrounded = false;
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') movement.forward = false;
      if (e.code === 'KeyS') movement.backward = false;
      if (e.code === 'KeyA') movement.left = false;
      if (e.code === 'KeyD') movement.right = false;
      if (e.code === 'ShiftLeft') movement.running = false;
    });

    function updateMovement() {
      const moveDirection = new THREE.Vector3();
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3();
      right.crossVectors(forward, camera.up).normalize();

      if (movement.forward) moveDirection.add(forward);
      if (movement.backward) moveDirection.sub(forward);
      if (movement.left) moveDirection.sub(right);
      if (movement.right) moveDirection.add(right);

      const speed = baseSpeed * (movement.running ? runMultiplier : 1);
      camera.position.add(moveDirection.normalize().multiplyScalar(speed));

      velocityY += gravity;
      camera.position.y += velocityY;

      if (camera.position.y <= 1.6) {
        camera.position.y = 1.6;
        velocityY = 0;
        isGrounded = true;
      }
    }

    // === TIRO ===
    const bullets = [];
    const bulletSpeed = 0.5;

    function shoot() {
      if (!isPointerLocked) return;
      const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const bulletMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
      bullet.position.copy(camera.position);
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      bullet.userData.direction = direction.clone();
      scene.add(bullet);
      bullets.push(bullet);
    }

    function updateBullets() {
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.addScaledVector(bullet.userData.direction, bulletSpeed);

        const dist = bullet.position.distanceTo(cube.position);
        const hitRadius = 0.7;
        if (dist < hitRadius) {
          imageOverlay.style.display = 'flex';
          scene.remove(bullet);
          bullets.splice(i, 1);
          isPointerLocked = false;
          document.exitPointerLock();
          continue;
        }

        if (bullet.position.distanceTo(camera.position) > 100) {
          scene.remove(bullet);
          bullets.splice(i, 1);
        }
      }
    }
    

    function animate() {
      requestAnimationFrame(animate);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
      updateMovement();
      updateButtonPosition();
      updateBullets();
      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    closeModalBtn.addEventListener('click', () => {
      loginModal.style.display = 'none';
      renderer.domElement.requestPointerLock();
    });

    window.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        loginModal.style.display = 'none';
        renderer.domElement.requestPointerLock();
      }
    });

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = loginForm.username.value.trim();
      const password = loginForm.password.value.trim();
      if (username && password) {
        alert(`Bem-vindo, ${username}! Login simulado com sucesso.`);
        loginModal.style.display = 'none';
        renderer.domElement.requestPointerLock();
      } else {
        alert('Preencha usuário e senha!');
      }
    });

    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 500;
    const positions = [];

    for (let i = 0; i < starsCount; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = Math.random() * 100 + 10;
      const z = (Math.random() - 0.5) * 200;
      positions.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    button3D.addEventListener('click', () => {
      if (!button3D.disabled) {
        imageOverlay.style.display = 'flex';
        isPointerLocked = false;
        document.exitPointerLock();
      }
    });

    closeImageBtn.addEventListener('click', () => {
      imageOverlay.style.display = 'none';
      if (loginModal.style.display === 'none') {
        renderer.domElement.requestPointerLock();
      }
    });

    window.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        shoot();
      }
    });

    function trocarPagina(){
        window.location.href = "PageneDoPorofessor.html"
    }

    function negacao(){
        window.location.href = "index.html"
    }
