        // Note: Lottie animation initialization is handled in index.html inline script
        // This ensures the library is loaded before initialization

        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
        import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

        // Scene setup
        const scene = new THREE.Scene();
        // Background will be set by environment map

        // Camera
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Camera will be set by isometric preset view (setPresetView('iso')) on load

        // Renderer - optimized for fast loading
        const renderer = new THREE.WebGLRenderer({ 
            antialias: false, // Disable initially for faster load
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = false; // Disable shadows initially
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById('canvas-container').appendChild(renderer.domElement);
        
        // Enable antialiasing and shadows after initial load
        setTimeout(() => {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
        }, 100);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        // Disable all manual user interactions - only allow programmatic camera movement during animations
        controls.enableZoom = false; // Disable zoom (mouse wheel/pinch gestures)
        controls.enableRotate = false; // Disable rotation (mouse drag)
        controls.enablePan = false; // Disable panning (right-click drag or middle mouse)
        // Remove min/max distance constraints - allow unlimited camera movement
        controls.minDistance = 0;
        controls.maxDistance = Infinity;
        // Allow camera to look in all directions (including straight down)
        controls.maxPolarAngle = Math.PI; // Allow full 180 degrees (straight down)
        controls.minPolarAngle = 0; // Allow looking straight up
        
        // Set default isometric view on load
        const defaultCameraPosition = new THREE.Vector3(1.1, 1.7, 1.1);
        const defaultControlsTarget = new THREE.Vector3(0.1, 1.2, -0.1);
        
        camera.position.copy(defaultCameraPosition);
        controls.target.copy(defaultControlsTarget);
        controls.update();
        

        // Ground - create immediately for fast initial render
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        // Ground grid
        const gridHelper = new THREE.GridHelper(100, 50, 0x333333, 0x333333);
        gridHelper.material.opacity = 0.5;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);

        // Load GLB model
        const gltfLoader = new GLTFLoader();
        let roomModel = null;
        
        // Store original rotation for reset
        let originalRoomModelRotation = new THREE.Euler(0, 0, 0);
        
        // Set room rotation using Euler angles (in radians)
        // Parameters: x, y, z (rotation around each axis in radians)
        window.setRoomRotation = function(x, y, z) {
            if (roomModel) {
                roomModel.rotation.set(x, y, z);
            }
        };
        
        window.setRoomRotationDegrees = function(x, y, z) {
            if (roomModel) {
                const xRad = THREE.MathUtils.degToRad(x);
                const yRad = THREE.MathUtils.degToRad(y);
                const zRad = THREE.MathUtils.degToRad(z);
                roomModel.rotation.set(xRad, yRad, zRad);
            }
        };
        
        window.setRoomRotationRadians = function(x, y, z) {
            window.setRoomRotation(x, y, z);
        };
        
        window.resetRoomRotation = function() {
            if (roomModel) {
                roomModel.rotation.copy(originalRoomModelRotation);
            }
        };
        
        window.getRoomRotation = function() {
            if (roomModel) {
                return {
                    x: roomModel.rotation.x,
                    y: roomModel.rotation.y,
                    z: roomModel.rotation.z,
                    xDegrees: THREE.MathUtils.radToDeg(roomModel.rotation.x),
                    yDegrees: THREE.MathUtils.radToDeg(roomModel.rotation.y),
                    zDegrees: THREE.MathUtils.radToDeg(roomModel.rotation.z)
                };
            }
            return null;
        };
        
        window.rotateRoomBy = function(x, y, z) {
            if (roomModel) {
                const current = window.getRoomRotation();
                if (current) {
                    window.setRoomRotationDegrees(
                        current.xDegrees + x,
                        current.yDegrees + y,
                        current.zDegrees + z
                    );
                }
            }
        };
        
        window.animateRoomRotation = function(targetX, targetY, targetZ, duration = 1000) {
            if (!roomModel) return;
            
            const startRotation = roomModel.rotation.clone();
            const targetRotation = new THREE.Euler(
                THREE.MathUtils.degToRad(targetX),
                THREE.MathUtils.degToRad(targetY),
                THREE.MathUtils.degToRad(targetZ)
            );
            
            const startTime = Date.now();
            
            function updateRotation() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease in-out
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                roomModel.rotation.x = THREE.MathUtils.lerp(startRotation.x, targetRotation.x, eased);
                roomModel.rotation.y = THREE.MathUtils.lerp(startRotation.y, targetRotation.y, eased);
                roomModel.rotation.z = THREE.MathUtils.lerp(startRotation.z, targetRotation.z, eased);
                
                if (progress < 1) {
                    requestAnimationFrame(updateRotation);
                } else {
                    roomModel.rotation.copy(targetRotation);
                }
            }
            
            updateRotation();
        };
        
        // Global object to store separated child objects
        window.modelObjects = {
            meshes: [],
            groups: [],
            all: [],
            byName: {}
        };
        
        // Function to split a mesh into smaller objects based on geometry groups
        function splitMeshIntoSmallerObjects(mesh, originalObjInfo, parent) {
            if (!mesh.geometry || !mesh.geometry.groups || mesh.geometry.groups.length <= 1) {
                return; // No need to split if only one group
            }
            
            const geometry = mesh.geometry;
            const material = mesh.material;
            const groups = geometry.groups;
            
            // Hide original mesh
            mesh.visible = false;
            originalObjInfo.visible = false;
            
            // Create a group to hold split meshes
            const splitGroup = new THREE.Group();
            splitGroup.name = `${mesh.name || 'Mesh'}_Split`;
            splitGroup.position.copy(mesh.position);
            splitGroup.rotation.copy(mesh.rotation);
            splitGroup.scale.copy(mesh.scale);
            
            // Split each group into a separate mesh
            groups.forEach((group, groupIndex) => {
                try {
                    // Create new geometry for this group using toNonIndexed and then extracting the group
                    const groupGeometry = geometry.clone();
                    
                    // Create a new geometry with only this group's faces
                    const positionAttribute = geometry.attributes.position;
                    const indexAttribute = geometry.index;
                    
                    if (!indexAttribute) {
                        // If no index, we can't easily split - skip
                        return;
                    }
                    
                    // Get indices for this group
                    const start = group.start;
                    const count = group.count;
                    const indices = indexAttribute.array;
                    
                    // Collect unique vertices used by this group
                    const vertexMap = new Map();
                    const newPositions = [];
                    const newIndices = [];
                    let newVertexIndex = 0;
                    
                    // Process each face in this group
                    for (let i = start; i < start + count; i++) {
                        const oldIndex = indices[i];
                        
                        if (!vertexMap.has(oldIndex)) {
                            // Add new vertex
                            const x = positionAttribute.array[oldIndex * 3];
                            const y = positionAttribute.array[oldIndex * 3 + 1];
                            const z = positionAttribute.array[oldIndex * 3 + 2];
                            newPositions.push(x, y, z);
                            vertexMap.set(oldIndex, newVertexIndex);
                            newVertexIndex++;
                        }
                        
                        newIndices.push(vertexMap.get(oldIndex));
                    }
                    
                    // Create new geometry
                    const newGeometry = new THREE.BufferGeometry();
                    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
                    newGeometry.setIndex(newIndices);
                    
                    // Copy other attributes if they exist
                    if (geometry.attributes.normal) {
                        const normalMap = new Map();
                        const newNormals = [];
                        let normalIndex = 0;
                        
                        for (let i = start; i < start + count; i++) {
                            const oldIndex = indices[i];
                            if (!normalMap.has(oldIndex)) {
                                const nx = geometry.attributes.normal.array[oldIndex * 3];
                                const ny = geometry.attributes.normal.array[oldIndex * 3 + 1];
                                const nz = geometry.attributes.normal.array[oldIndex * 3 + 2];
                                newNormals.push(nx, ny, nz);
                                normalMap.set(oldIndex, normalIndex);
                                normalIndex++;
                            }
                        }
                        newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
                    }
                    
                    // Copy UVs if they exist
                    if (geometry.attributes.uv) {
                        const uvMap = new Map();
                        const newUVs = [];
                        let uvIndex = 0;
                        
                        for (let i = start; i < start + count; i++) {
                            const oldIndex = indices[i];
                            if (!uvMap.has(oldIndex)) {
                                const u = geometry.attributes.uv.array[oldIndex * 2];
                                const v = geometry.attributes.uv.array[oldIndex * 2 + 1];
                                newUVs.push(u, v);
                                uvMap.set(oldIndex, uvIndex);
                                uvIndex++;
                            }
                        }
                        newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2));
                    }
                    
                    // Compute bounding box and normals
                    newGeometry.computeBoundingBox();
                    newGeometry.computeBoundingSphere();
                    if (!newGeometry.attributes.normal) {
                        newGeometry.computeVertexNormals();
                    }
                    
                    // Get material for this group
                    let groupMaterial = material;
                    if (Array.isArray(material)) {
                        groupMaterial = material[group.materialIndex] || material[0];
                    }
                    
                    // Create new mesh
                    const splitMesh = new THREE.Mesh(newGeometry, groupMaterial);
                    splitMesh.name = `${mesh.name || 'Mesh'}_Part_${groupIndex + 1}`;
                    splitMesh.castShadow = mesh.castShadow;
                    splitMesh.receiveShadow = mesh.receiveShadow;
                    
                    // Add to split group
                    splitGroup.add(splitMesh);
                    
                    // Create object info for split mesh
                    const splitObjInfo = {
                        name: splitMesh.name,
                        object: splitMesh,
                        type: 'Mesh',
                        index: window.modelObjects.meshes.length,
                        visible: true,
                        position: splitMesh.position.clone(),
                        rotation: splitMesh.rotation.clone(),
                        scale: splitMesh.scale.clone(),
                        isSplitPart: true,
                        originalMesh: mesh.name
                    };
                    
                    // Add to collections
                    window.modelObjects.meshes.push(splitObjInfo);
                    window.modelObjects.all.push(splitObjInfo);
                    window.modelObjects.byName[splitMesh.name] = splitObjInfo;
                    
                    // Store reference
                    splitMesh.userData.isSeparated = true;
                    splitMesh.userData.objectInfo = splitObjInfo;
                    splitMesh.userData.isSplitPart = true;
                } catch (error) {
                    console.warn(`Failed to split group ${groupIndex} of mesh "${mesh.name}":`, error);
                }
            });
            
            // Only add split group if it has children
            if (splitGroup.children.length > 0) {
                // Add split group to parent (only if not already added)
                if (!splitGroup.parent) {
                    parent.add(splitGroup);
                }
                
                // Update original object info to reference the split group
                originalObjInfo.object = splitGroup;
                originalObjInfo.isSplit = true;
                originalObjInfo.splitParts = splitGroup.children.length;
                
            } else {
                mesh.visible = true;
                originalObjInfo.visible = true;
            }
        }
        
        // Prevent multiple loads
        let isModelLoading = false;
        let isModelLoaded = false;
        let isModelInScene = false; // Track if model is already in scene
        
        gltfLoader.load('https://res.cloudinary.com/dedvqh5jb/raw/upload/v1775804242/NEW_room.glb', function(gltf) {
            if (isModelLoaded || isModelLoading) {
                return;
            }
            
            isModelLoading = true;
            roomModel = gltf.scene;
            
            // Find screen object and apply video texture
            let screenObject = null;
            
            // Try to find screen by name first
            screenObject = roomModel.getObjectByName('Screen');
            if (!screenObject) {
                // Try common screen names
                const screenNames = ['Screen', 'screen', 'Monitor', 'monitor', 'Display', 'display', 'TV', 'tv', 'Computer'];
                for (let name of screenNames) {
                    screenObject = roomModel.getObjectByName(name);
                    if (screenObject) break;
                }
            }
            
            // If not found by name, traverse to find screen object
            if (!screenObject) {
                roomModel.traverse(function(child) {
                    if (isScreenObject(child) && !screenObject) {
                        screenObject = child;
                    }
                });
            }
            
            if (screenObject) {
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.src = 'https://res.cloudinary.com/dedvqh5jb/video/upload/v1775804291/intro_video.mp4';
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.autoplay = true;
                video.preload = 'auto';
                
                video.addEventListener('error', function(e) {
                    console.error('Video error:', video.error);
                });
                
                video.load();
                video.play().catch(() => {});
                
                const videoTexture = new THREE.VideoTexture(video);
                videoTexture.colorSpace = THREE.SRGBColorSpace;
                videoTexture.flipY = false;
                videoTexture.minFilter = THREE.LinearFilter;
                videoTexture.magFilter = THREE.LinearFilter;
                videoTexture.needsUpdate = true;
                
                let meshCount = 0;
                screenObject.traverse(function(child) {
                    if (child.isMesh) {
                        child.material = new THREE.MeshBasicMaterial({
                            map: videoTexture,
                            toneMapped: false,
                            side: THREE.DoubleSide
                        });
                        child.material.needsUpdate = true;
                        meshCount++;
                    }
                });
                
                if (screenObject.isMesh && meshCount === 0) {
                    screenObject.material = new THREE.MeshBasicMaterial({
                        map: videoTexture,
                        toneMapped: false,
                        side: THREE.DoubleSide
                    });
                    screenObject.material.needsUpdate = true;
                    meshCount++;
                }
                
                window.screenVideo = video;
                window.screenVideoTexture = videoTexture;
            }
            
            // Center and scale the model if needed
            const box = new THREE.Box3().setFromObject(roomModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Center the model at origin
            roomModel.position.set(0, 0, 0);
            
            // Store original rotation
            originalRoomModelRotation = roomModel.rotation.clone();
            
            // Split objects into separate child objects
            window.modelObjects.meshes = [];
            window.modelObjects.groups = [];
            window.modelObjects.all = [];
            window.modelObjects.byName = {};
            
            let meshIndex = 0;
            let groupIndex = 0;
            const processedMeshes = new Set(); // Track processed meshes to avoid duplicates
            const collectedGroups = new Set(); // Track collected groups
            
            // First pass: Collect groups and mark their child meshes
            roomModel.traverse(function(child) {
                // Skip the root scene
                if (child === roomModel) return;
                
                // Collect groups first
                if (child.isGroup || (child.isObject3D && child.children.length > 0 && !child.isMesh)) {
                    // Check if group contains meshes
                    let hasMeshes = false;
                    child.traverse(function(descendant) {
                        if (descendant.isMesh) {
                            hasMeshes = true;
                        }
                    });
                    
                    if (child.name || hasMeshes) {
                        groupIndex++;
                        const objName = child.name || `Group_${groupIndex}`;
                        
                        // Create object info
                        const objInfo = {
                            name: objName,
                            object: child,
                            type: 'Group',
                            index: groupIndex - 1,
                            visible: child.visible,
                            position: child.position.clone(),
                            rotation: child.rotation.clone(),
                            scale: child.scale.clone(),
                            children: [],
                            childMeshes: [] // Store child meshes separately
                        };
                        
                        // Collect child meshes in this group and mark them as processed
                        child.traverse(function(descendant) {
                            if (descendant.isMesh && descendant !== child) {
                                objInfo.children.push(descendant);
                                objInfo.childMeshes.push(descendant);
                                processedMeshes.add(descendant); // Mark to prevent duplicate collection
                                
                                // Enable shadows for child meshes
                                descendant.castShadow = true;
                                descendant.receiveShadow = true;
                                
                                // Store reference in mesh's userData
                                descendant.userData.parentGroup = objInfo;
                                descendant.userData.isSeparated = true;
                            }
                        });
                        
                        window.modelObjects.groups.push(objInfo);
                        window.modelObjects.all.push(objInfo);
                        window.modelObjects.byName[objName] = objInfo;
                        collectedGroups.add(child);
                        
                        // Make object easily accessible
                        child.userData.isSeparated = true;
                        child.userData.objectInfo = objInfo;
                    }
                }
            });
            
            // Second pass: Collect only standalone meshes (not children of groups)
            roomModel.traverse(function(child) {
                // Skip the root scene
                if (child === roomModel) return;
                
                // Skip if already processed (part of a group)
                if (processedMeshes.has(child)) return;
                
                // Check if this mesh is a child of any collected group
                let isChildOfGroup = false;
                let parent = child.parent;
                while (parent && parent !== roomModel) {
                    if (collectedGroups.has(parent)) {
                        isChildOfGroup = true;
                        break;
                    }
                    parent = parent.parent;
                }
                
                // Only collect standalone meshes (not children of groups)
                if (child.isMesh && !isChildOfGroup) {
                    meshIndex++;
                    const objName = child.name || `Mesh_${meshIndex}`;
                    
                    // Create object info
                    const objInfo = {
                        name: objName,
                        object: child,
                        type: 'Mesh',
                        index: meshIndex - 1,
                        visible: child.visible,
                        position: child.position.clone(),
                        rotation: child.rotation.clone(),
                        scale: child.scale.clone()
                    };
                    
                    window.modelObjects.meshes.push(objInfo);
                    window.modelObjects.all.push(objInfo);
                    window.modelObjects.byName[objName] = objInfo;
                    processedMeshes.add(child);
                    
                    // Enable shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Make object easily accessible
                    child.userData.isSeparated = true;
                    child.userData.objectInfo = objInfo;
                    
                    // Split mesh into smaller objects if it has multiple geometry groups
                    if (child.geometry && child.geometry.groups && child.geometry.groups.length > 1) {
                        splitMeshIntoSmallerObjects(child, objInfo, roomModel);
                        // Note: Split meshes are automatically added to collections in splitMeshIntoSmallerObjects
                    }
                }
            });
            
            // Create logical group for screen and desktop objects (don't move objects, just reference them)
            if (!screenDesktopGroup) {
                // Find all screen and desktop objects
                const screenObjects = getScreenObjects();
                
                if (screenObjects.length > 0) {
                    // Create a group but don't move objects - just use it for hover detection
                    screenDesktopGroup = new THREE.Group();
                    screenDesktopGroup.name = 'ScreenDesktopGroup';
                    
                    // Store references to objects (don't move them)
                    screenDesktopGroup.userData.screenObjects = screenObjects;
                    
                    // Add group to roomModel to maintain hierarchy
                    roomModel.add(screenDesktopGroup);
                    
                }
            }
            
            // Apply environment map if already loaded
            if (currentEnvMap) {
                applyEnvMapToRoom(currentEnvMap);
            }
            
            // Clear scene children to prevent duplicates (keep ground and grid)
            const childrenToRemove = [];
            scene.children.forEach(child => {
                // Keep ground and grid helper, remove everything else
                if (child !== ground && child !== gridHelper) {
                    childrenToRemove.push(child);
                }
            });
            
            // Remove duplicates
            childrenToRemove.forEach(child => {
                scene.remove(child);
                // Dispose of geometry and materials if it's a mesh
                if (child.isMesh || child.isGroup) {
                    child.traverse(function(obj) {
                        if (obj.isMesh) {
                            if (obj.geometry) obj.geometry.dispose();
                            if (obj.material) {
                                if (Array.isArray(obj.material)) {
                                    obj.material.forEach(mat => mat.dispose());
                                } else {
                                    obj.material.dispose();
                                }
                            }
                        }
                    });
                }
            });
            
            if (childrenToRemove.length > 0) {
            }
            
            // Only add model to scene if not already added
            if (roomModel && !isModelInScene) {
                if (!roomModel.parent) {
                    scene.add(roomModel);
                    isModelInScene = true;
                } else {
                    if (roomModel.parent === scene) {
                        isModelInScene = true;
                    } else {
                        roomModel.parent.remove(roomModel);
                        scene.add(roomModel);
                        isModelInScene = true;
                    }
                }
            } else if (roomModel && isModelInScene) {
                // Check if model is still in scene
                if (!scene.children.includes(roomModel) && roomModel.parent !== scene) {
                    // Model was removed, re-add it
                    if (roomModel.parent) {
                        roomModel.parent.remove(roomModel);
                    }
                    scene.add(roomModel);
                }
            }
            
            // Merge duplicate objects with similar names (e.g., book008 and book008_white_0)
            mergeDuplicateObjects();
            
            // Change color of Window_Wood1_0_8 object
            function changeWindowWoodColor() {
                const targetColor = new THREE.Color(0xc47653); // #c47653
                const objectName = 'Window_Wood1_0_8';
                
                // Try to find the object
                let targetObject = null;
                
                // Method 1: Try exact name match
                if (window.modelObjects && window.modelObjects.byName && window.modelObjects.byName[objectName]) {
                    targetObject = window.modelObjects.byName[objectName].object;
                }
                
                // Method 2: Search in scene directly
                if (!targetObject && roomModel) {
                    roomModel.traverse(function(child) {
                        if (child.isMesh || child.isGroup) {
                            if (child.name === objectName) {
                                targetObject = child;
                            }
                        }
                    });
                }
                
                if (targetObject) {
                    // Handle both single material and material arrays
                    if (targetObject.isMesh && targetObject.material) {
                        if (Array.isArray(targetObject.material)) {
                            targetObject.material.forEach(mat => {
                                if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshLambertMaterial) {
                                    mat.color.copy(targetColor);
                                    mat.needsUpdate = true;
                                }
                            });
                        } else {
                            if (targetObject.material.isMeshStandardMaterial || 
                                targetObject.material.isMeshPhysicalMaterial || 
                                targetObject.material.isMeshLambertMaterial) {
                                targetObject.material.color.copy(targetColor);
                                targetObject.material.needsUpdate = true;
                            }
                        }
                    } else if (targetObject.isGroup) {
                        // If it's a group, change color of all child meshes
                        targetObject.traverse(function(child) {
                            if (child.isMesh && child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => {
                                        if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshLambertMaterial) {
                                            mat.color.copy(targetColor);
                                            mat.needsUpdate = true;
                                        }
                                    });
                                } else {
                                    if (child.material.isMeshStandardMaterial || 
                                        child.material.isMeshPhysicalMaterial || 
                                        child.material.isMeshLambertMaterial) {
                                        child.material.color.copy(targetColor);
                                        child.material.needsUpdate = true;
                                    }
                                }
                            }
                        });
                    }
                } else {
                    console.warn(`Object "${objectName}" not found. Available objects:`, 
                        window.modelObjects ? Object.keys(window.modelObjects.byName || {}).slice(0, 10) : 'N/A');
                }
            }
            
            // Change Window_Wood1_0_8 color after model loads
            setTimeout(() => {
                changeWindowWoodColor();
            }, 200);
            
            // Display objects in panel (show only groups)
            displayObjectsList('', true);
            updateObjectsStats();
            
            // Initialize pen path animation system
            initializePenPathAnimation();
            
            // Mark model as loaded
            window.assetsLoaded.model = true;
            // Check if we can hide loading screen
            window.hideLoadingScreen();
            
            // Keep isometric preset view - don't adjust camera when model loads
            // Camera stays at isometric preset view position
        }, function(progress) {
            // Progress callback
            if (progress.lengthComputable) {
                const percent = (progress.loaded / progress.total * 100).toFixed(0);
                const loadingText = document.querySelector('#loading div:last-child');
                if (loadingText) {
                    loadingText.textContent = `Loading... ${percent}%`;
                }
            }
        }, function(error) {
            console.error('Error loading GLB file:', error);
            isModelLoading = false;
            isModelLoaded = false;
            // Even on error, mark as loaded and check if we can hide
            window.assetsLoaded.model = true;
            window.hideLoadingScreen();
        });
        
        // Function to normalize object names (remove suffixes like _white_0, _0, etc.)
        function normalizeObjectName(name) {
            if (!name) return name;
            
            // Remove common suffixes: _white_0, _0, _1, _white, etc.
            // Pattern: name_suffix_number or name_suffix
            const patterns = [
                /^(.+?)_white_\d+$/i,  // book008_white_0 -> book008
                /^(.+?)_\d+$/i,        // book008_0 -> book008
                /^(.+?)_white$/i,      // book008_white -> book008
                /^(.+?)_[a-z]+_\d+$/i, // book008_color_0 -> book008
            ];
            
            for (const pattern of patterns) {
                const match = name.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            return name;
        }
        
        // Function to merge duplicate objects with similar names
        function mergeDuplicateObjects() {
            if (!window.modelObjects || !window.modelObjects.groups) return;
            
            const normalizedMap = new Map(); // Map normalized name -> array of objects
            const duplicatesToRemove = [];
            
            // Group objects by normalized name
            window.modelObjects.groups.forEach((group, index) => {
                const normalizedName = normalizeObjectName(group.name);
                
                if (!normalizedMap.has(normalizedName)) {
                    normalizedMap.set(normalizedName, []);
                }
                normalizedMap.get(normalizedName).push({ group, index });
            });
            
            // Merge duplicates
            normalizedMap.forEach((objects, normalizedName) => {
                if (objects.length > 1) {
                    // Check if we have both the exact base name and a variant with suffix
                    // If so, don't merge them - keep them separate
                    const hasExactBaseName = objects.some(o => o.group.name === normalizedName);
                    const hasVariantWithSuffix = objects.some(o => o.group.name !== normalizedName);
                    
                    // Skip merging if we have both the base name and variants (e.g., "book008" and "book008_white_0")
                    if (hasExactBaseName && hasVariantWithSuffix) {
                        return;
                    }
                    
                    // Prefer the object with the shortest name (usually the base name like "book008")
                    // Sort by name length, shortest first
                    objects.sort((a, b) => a.group.name.length - b.group.name.length);
                    
                    // Keep the one with shortest name, mark others as duplicates
                    const primary = objects[0].group;
                    const duplicates = objects.slice(1);
                    
                    // Merge child meshes from duplicates into primary
                    duplicates.forEach(dup => {
                        const dupGroup = dup.group;
                        if (dupGroup.childMeshes && dupGroup.childMeshes.length > 0) {
                            dupGroup.childMeshes.forEach(mesh => {
                                if (!primary.childMeshes.find(m => m === mesh)) {
                                    primary.childMeshes.push(mesh);
                                    primary.children.push(mesh);
                                }
                            });
                        }
                        
                        // Hide duplicate group
                        dupGroup.object.visible = false;
                        dupGroup.visible = false;
                        
                        // Mark for removal
                        duplicatesToRemove.push(dup.index);
                    });
                    
                    // Update primary name if needed (use the shorter/normalized name)
                    if (primary.name !== normalizedName) {
                        // Update name in byName map
                        delete window.modelObjects.byName[primary.name];
                        primary.name = normalizedName;
                        window.modelObjects.byName[normalizedName] = primary;
                        // Update Three.js object name too
                        if (primary.object) {
                            primary.object.name = normalizedName;
                        }
                    }
                }
            });
            
            // Remove duplicates from arrays (in reverse order to maintain indices)
            duplicatesToRemove.sort((a, b) => b - a).forEach(index => {
                const removed = window.modelObjects.groups.splice(index, 1)[0];
                // Remove from all array
                const allIndex = window.modelObjects.all.indexOf(removed);
                if (allIndex !== -1) {
                    window.modelObjects.all.splice(allIndex, 1);
                }
                // Remove from byName (remove all entries pointing to this object)
                Object.keys(window.modelObjects.byName).forEach(key => {
                    if (window.modelObjects.byName[key] === removed) {
                        delete window.modelObjects.byName[key];
                    }
                });
            });
            
        }
        
        // Function to extract base name (first part before underscore)
        function getBaseName(name) {
            if (!name) return name;
            const underscoreIndex = name.indexOf('_');
            if (underscoreIndex === -1) {
                return name; // No underscore, return full name
            }
            return name.substring(0, underscoreIndex);
        }
        
        // Function to group objects by base name
        function groupObjectsByBaseName(objects) {
            const groups = new Map();
            
            objects.forEach(obj => {
                const baseName = getBaseName(obj.name);
                
                if (!groups.has(baseName)) {
                    groups.set(baseName, []);
                }
                groups.get(baseName).push(obj);
            });
            
            return groups;
        }
        
        // Function to create a grouped object item
        function createGroupedObjectItem(objInfo, index, isInGroup = false, updateGroupCheckbox = null) {
            const item = document.createElement('div');
            item.className = isInGroup ? 'object-item object-group-item' : 'object-item';
            item.dataset.objectName = objInfo.name;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `obj-${index}`;
            checkbox.checked = objInfo.visible;
            checkbox.addEventListener('change', function() {
                objInfo.object.visible = this.checked;
                objInfo.visible = this.checked;
                if (updateGroupCheckbox) {
                    updateGroupCheckbox();
                }
                updateObjectsStats();
            });
            
            const label = document.createElement('label');
            label.htmlFor = `obj-${index}`;
            label.appendChild(checkbox);
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'object-item-name';
            let displayName = objInfo.name;
            nameSpan.textContent = displayName;
            label.appendChild(nameSpan);
            
            const typeSpan = document.createElement('span');
            typeSpan.className = 'object-item-type';
            const childCount = objInfo.childMeshes ? objInfo.childMeshes.length : 0;
            typeSpan.textContent = `(${objInfo.type} - ${childCount} meshes)`;
            label.appendChild(typeSpan);
            
            item.appendChild(label);
            return item;
        }
        
        // Function to collect all individual meshes (from groups and standalone)
        function getAllMeshes() {
            const allMeshes = [];
            
            // Add standalone meshes
            if (window.modelObjects.meshes) {
                window.modelObjects.meshes.forEach(meshInfo => {
                    if (meshInfo.object && meshInfo.object.isMesh) {
                        allMeshes.push({
                            name: meshInfo.name,
                            mesh: meshInfo.object,
                            visible: meshInfo.visible,
                            type: 'Mesh',
                            parentGroup: null
                        });
                    }
                });
            }
            
            // Add meshes from groups (childMeshes)
            if (window.modelObjects.groups) {
                window.modelObjects.groups.forEach(groupInfo => {
                    if (groupInfo.childMeshes) {
                        groupInfo.childMeshes.forEach(mesh => {
                            allMeshes.push({
                                name: mesh.name || groupInfo.name,
                                mesh: mesh,
                                visible: mesh.visible,
                                type: 'Mesh',
                                parentGroup: groupInfo.name
                            });
                        });
                    }
                });
            }
            
            return allMeshes;
        }
        
        // Function to display objects list in panel (show individual meshes)
        function displayObjectsList(filterText = '', showOnlyGroups = true) {
            const objectsList = document.getElementById('objects-list');
            if (!objectsList) return;
            
            objectsList.innerHTML = '';
            
            if (!window.modelObjects || window.modelObjects.all.length === 0) {
                objectsList.innerHTML = '<p style="color: #999; font-size: 11px; text-align: center; padding: 20px;">No objects found</p>';
                return;
            }
            
            // Get all individual meshes (not parent containers)
            const allMeshes = getAllMeshes();
            
            if (allMeshes.length === 0) {
                objectsList.innerHTML = '<p style="color: #999; font-size: 11px; text-align: center; padding: 20px;">No meshes found</p>';
                return;
            }
            
            // Filter meshes by search text
            const filteredMeshes = allMeshes.filter(meshInfo => {
                if (!filterText) return true;
                const searchLower = filterText.toLowerCase();
                return meshInfo.name.toLowerCase().includes(searchLower);
            });
            
            if (filteredMeshes.length === 0) {
                objectsList.innerHTML = '<p style="color: #999; font-size: 11px; text-align: center; padding: 20px;">No meshes match search</p>';
                return;
            }
            
            // Sort meshes by name
            filteredMeshes.sort((a, b) => a.name.localeCompare(b.name));
            
            // Group meshes by base name
            const groupedMeshes = groupObjectsByBaseName(filteredMeshes);
            
            // Convert to array and sort by base name
            const sortedGroups = Array.from(groupedMeshes.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            
            let globalIndex = 0;
            
            // Display grouped meshes
            sortedGroups.forEach(([baseName, meshes]) => {
                if (meshes.length === 1) {
                    // Single mesh, no grouping needed
                    const meshInfo = meshes[0];
                    const item = document.createElement('div');
                    item.className = 'object-item';
                    item.dataset.meshName = meshInfo.name;
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `mesh-${globalIndex++}`;
                    checkbox.checked = meshInfo.visible;
                    checkbox.addEventListener('change', function() {
                        meshInfo.mesh.visible = this.checked;
                        meshInfo.visible = this.checked;
                        updateObjectsStats();
                    });
                    
                    const label = document.createElement('label');
                    label.htmlFor = checkbox.id;
                    label.appendChild(checkbox);
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'object-item-name';
                    nameSpan.textContent = meshInfo.name;
                    label.appendChild(nameSpan);
                    
                    const typeSpan = document.createElement('span');
                    typeSpan.className = 'object-item-type';
                    typeSpan.textContent = '(Mesh)';
                    label.appendChild(typeSpan);
                    
                    item.appendChild(label);
                    objectsList.appendChild(item);
                } else {
                    // Multiple meshes with same base name - create group
                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'object-group';
                    groupDiv.dataset.baseName = baseName;
                    
                    // Group header
                    const header = document.createElement('div');
                    header.className = 'object-group-header';
                    
                    const toggle = document.createElement('span');
                    toggle.className = 'object-group-toggle';
                    toggle.textContent = '▼';
                    
                    const groupName = document.createElement('span');
                    groupName.className = 'object-group-name';
                    groupName.textContent = baseName;
                    
                    const groupCount = document.createElement('span');
                    groupCount.className = 'object-group-count';
                    groupCount.textContent = `(${meshes.length})`;
                    
                    header.appendChild(toggle);
                    header.appendChild(groupName);
                    header.appendChild(groupCount);
                    
                    // Group items container
                    const itemsContainer = document.createElement('div');
                    itemsContainer.className = 'object-group-items';
                    
                    // Group checkbox to toggle all meshes in group
                    const groupCheckbox = document.createElement('input');
                    groupCheckbox.type = 'checkbox';
                    groupCheckbox.className = 'group-checkbox';
                    
                    // Function to update group checkbox state
                    const updateGroupCheckboxState = function() {
                        const allVisible = meshes.every(m => m.visible);
                        const anyVisible = meshes.some(m => m.visible);
                        groupCheckbox.checked = allVisible;
                        groupCheckbox.indeterminate = anyVisible && !allVisible;
                    };
                    
                    // Initialize group checkbox state
                    updateGroupCheckboxState();
                    
                    // Add all meshes in the group
                    meshes.forEach(meshInfo => {
                        const item = document.createElement('div');
                        item.className = 'object-item object-group-item';
                        item.dataset.meshName = meshInfo.name;
                        
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `mesh-${globalIndex++}`;
                        checkbox.checked = meshInfo.visible;
                        checkbox.addEventListener('change', function() {
                            meshInfo.mesh.visible = this.checked;
                            meshInfo.visible = this.checked;
                            updateGroupCheckboxState();
                            updateObjectsStats();
                        });
                        
                        const label = document.createElement('label');
                        label.htmlFor = checkbox.id;
                        label.appendChild(checkbox);
                        
                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'object-item-name';
                        nameSpan.textContent = meshInfo.name;
                        label.appendChild(nameSpan);
                        
                        const typeSpan = document.createElement('span');
                        typeSpan.className = 'object-item-type';
                        typeSpan.textContent = '(Mesh)';
                        label.appendChild(typeSpan);
                        
                        item.appendChild(label);
                        itemsContainer.appendChild(item);
                    });
                    
                    // Toggle collapse/expand
                    header.addEventListener('click', function(e) {
                        // Don't toggle if clicking on checkbox
                        if (e.target.type === 'checkbox') return;
                        
                        const isCollapsed = itemsContainer.classList.contains('collapsed');
                        if (isCollapsed) {
                            itemsContainer.classList.remove('collapsed');
                            toggle.classList.remove('collapsed');
                        } else {
                            itemsContainer.classList.add('collapsed');
                            toggle.classList.add('collapsed');
                        }
                    });
                    
                    groupCheckbox.addEventListener('change', function() {
                        const checked = this.checked;
                        meshes.forEach(meshInfo => {
                            meshInfo.mesh.visible = checked;
                            meshInfo.visible = checked;
                        });
                        // Update individual checkboxes
                        itemsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                            if (cb !== groupCheckbox) {
                                cb.checked = checked;
                            }
                        });
                        updateGroupCheckboxState();
                        updateObjectsStats();
                    });
                    
                    header.insertBefore(groupCheckbox, toggle);
                    
                    groupDiv.appendChild(header);
                    groupDiv.appendChild(itemsContainer);
                    objectsList.appendChild(groupDiv);
                }
            });
        }
        
        // Function to update objects statistics
        function updateObjectsStats() {
            const statsEl = document.getElementById('objects-stats');
            if (!statsEl || !window.modelObjects) return;
            
            // Count all meshes (individual meshes, not parent containers)
            const allMeshes = getAllMeshes();
            const total = allMeshes.length;
            const visible = allMeshes.filter(m => m.visible).length;
            const hidden = total - visible;
            
            statsEl.textContent = `Total Meshes: ${total} | Visible: ${visible} | Hidden: ${hidden}`;
        }
        
        // Helper functions to manipulate separated objects
        window.modelObjectHelpers = {
            // Get object by name
            getByName: function(name) {
                return window.modelObjects.byName[name] || null;
            },
            
            // Show/hide object by name
            setVisible: function(name, visible) {
                const obj = window.modelObjects.byName[name];
                if (obj) {
                    obj.object.visible = visible;
                    obj.visible = visible;
                    return true;
                }
                return false;
            },
            
            // Set position of object by name
            setPosition: function(name, x, y, z) {
                const obj = window.modelObjects.byName[name];
                if (obj) {
                    obj.object.position.set(x, y, z);
                    obj.position.set(x, y, z);
                    return true;
                }
                return false;
            },
            
            // Set rotation of object by name (in radians)
            setRotation: function(name, x, y, z) {
                const obj = window.modelObjects.byName[name];
                if (obj) {
                    obj.object.rotation.set(x, y, z);
                    obj.rotation.set(x, y, z);
                    return true;
                }
                return false;
            },
            
            // Get all object names
            getAllNames: function() {
                return window.modelObjects.all.map(obj => obj.name);
            },
            
            // Hide all groups
            hideAll: function() {
                window.modelObjects.groups.forEach(group => {
                    group.object.visible = false;
                    group.visible = false;
                });
                displayObjectsList('', true); // Refresh display
                updateObjectsStats();
            },
            
            // Show all groups
            showAll: function() {
                window.modelObjects.groups.forEach(group => {
                    group.object.visible = true;
                    group.visible = true;
                });
                displayObjectsList('', true); // Refresh display
                updateObjectsStats();
            },
            
            // Get child meshes of a group
            getGroupChildren: function(groupName) {
                const group = window.modelObjects.byName[groupName];
                if (group && group.type === 'Group') {
                    return group.childMeshes || [];
                }
                return [];
            },
            
            // Get all meshes (including those in groups)
            getAllMeshes: function() {
                const allMeshes = [...window.modelObjects.meshes];
                window.modelObjects.groups.forEach(group => {
                    if (group.childMeshes) {
                        allMeshes.push(...group.childMeshes.map(mesh => ({
                            name: mesh.name || 'Unnamed',
                            object: mesh,
                            type: 'Mesh',
                            visible: mesh.visible,
                            parentGroup: group.name
                        })));
                    }
                });
                return allMeshes;
            },
            
            // Manipulate child mesh within a group
            setChildMeshVisible: function(groupName, meshIndex, visible) {
                const group = window.modelObjects.byName[groupName];
                if (group && group.type === 'Group' && group.childMeshes && group.childMeshes[meshIndex]) {
                    group.childMeshes[meshIndex].visible = visible;
                    return true;
                }
                return false;
            },
            
            // Get object by Three.js object reference
            getByObject: function(threeObject) {
                return window.modelObjects.all.find(obj => obj.object === threeObject);
            }
        };
        
        // Event listeners for panel controls
        function setupObjectsPanelControls() {
            const showAllBtn = document.getElementById('show-all-btn');
            const hideAllBtn = document.getElementById('hide-all-btn');
            const searchInput = document.getElementById('objects-search');
            
            if (showAllBtn) {
                showAllBtn.addEventListener('click', function() {
                    window.modelObjectHelpers.showAll();
                });
            }
            
            if (hideAllBtn) {
                hideAllBtn.addEventListener('click', function() {
                    window.modelObjectHelpers.hideAll();
                });
            }
            
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    displayObjectsList(e.target.value, true); // Show only groups
                });
            }
        }
        
        // Set up controls when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupObjectsPanelControls);
        } else {
            setupObjectsPanelControls();
        }

        // Raycaster for click detection
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let isAnimating = false;
        
        // Hover state for screen and desktop objects
        let isHoveringScreen = false;
        let hoveredScreenObject = null;
        let screenOriginalScale = new Map(); // Store original scales for multiple meshes (used for both screen and desktop)
        
        // Hover state for poster objects
        let isHoveringPoster = false;
        let hoveredPosterObject = null;
        let posterOriginalScale = new Map(); // Store original scales for poster meshes
        
        // Group for screen and desktop objects
        let screenDesktopGroup = null;
        
        // Portfolio data
        const portfolioData = [
            {
                title: "Onboarding Game: Gamifying Financial Onboarding",
                description: "Designed a gamified onboarding experience for DNSE stock exchange that increased user engagement and conversion rates by transforming traditional financial processes into engaging interactions.",
                thumbnail: "assets/images/Resource Image Game/Image Onboarding Game.avif",
                badges: ["Case Study", "Product Design"],
                filters: ["product", "design"],
                fullContent: true
            },
            {
                title: "Stock Price Board for Gen Z",
                description: "Redesigned DNSE's stock price board for Gen Z users, making complex market data simple and approachable through a friendlier, more intuitive interface.",
                thumbnail: "assets/images/bang-gia/herro-banner.webp",
                badges: ["Case Study", "Product Design"],
                filters: ["product", "design"],
                fullContent: true
            },
            {
                title: "Yody Internal Mobile App",
                description: "Built an all-in-one mobile app for Yody employees to manage inventory, operations, reporting, and customer engagement through barcode scanning and automated task workflows.",
                thumbnail: "assets/images/Yody/Herobanner yody.webp",
                badges: ["Case Study", "Product Design"],
                filters: ["product", "design"],
                fullContent: true
            },
            {
                title: "JoyStop: Food Ordering App",
                description: "Redesigned JoyStop's food ordering app to reduce drive-through friction and improve order accuracy, enhancing the overall customer experience.",
                thumbnail: "assets/images/Joystop app/Joystop hero banner.png",
                badges: ["Case Study", "App Design"],
                filters: ["product", "design"],
                fullContent: true
            },
            {
                title: "JoyStop Management System",
                description: "Built a comprehensive management system for JoyStop's food operations, handling booking, product management, marketing, and configuration for large-scale deployments.",
                thumbnail: "assets/images/Joystop management/Herobanner joystop Management System.avif",
                badges: ["Case Study", "Management System"],
                filters: ["product", "design"],
                fullContent: true
            },
            {
                title: "AutoVal: Car Valuation Platform",
                description: "Designed AutoVal, a mobile platform for used-car valuation, trade-in workflows, and auction management tailored to dealership operations and customer needs.",
                thumbnail: "assets/images/Autoval/AutoVal app hero banner.webp",
                badges: ["Case Study", "Web/App"],
                filters: ["product", "design"],
                fullContent: true
            },
            {
                title: "Plainsight Design System",
                description: "Created a comprehensive design system ensuring consistency between brand guidelines and front-end implementation, streamlining the design-to-development workflow.",
                thumbnail: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
                badges: ["Design System"],
                filters: ["enterprise"]
            },
            {
                title: "Perfect Home Closings",
                description: "Optimized product and design strategy to reduce notary signing errors and enhance document quality throughout the home closing process.",
                thumbnail: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
                badges: ["Real Estate"],
                filters: ["startup"]
            },
            {
                title: "Notary Automation Platform",
                description: "Optimized notary assignment workflows, reducing assignment times by 27% on the market's largest notary platform serving 1.8M+ annual signings.",
                thumbnail: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
                badges: ["Automation"],
                filters: ["enterprise"]
            }
        ];
        
        // Function to check if object name contains "screen"
        function isScreenObject(object) {
            if (!object) return false;
            const name = object.name ? object.name.toLowerCase() : '';
            return name.includes('screen') || name.includes('monitor') || name.includes('display');
        }
        
        // Function to check if object name contains "poster"
        function isPosterObject(object) {
            if (!object) return false;
            const name = object.name ? object.name.toLowerCase() : '';
            return name.includes('poster') || name.includes('picture') || name.includes('frame') || name.includes('art');
        }
        
        // Shared function to find poster object (same logic as clicking on 3D object)
        function findPosterObject(startObject = null) {
            if (startObject) {
                // If we have a starting object (from click), check it and its parents
                if (isPosterObject(startObject)) {
                    return startObject;
                } else if (startObject.parent && isPosterObject(startObject.parent)) {
                    return startObject.parent;
                } else {
                    // Check up the hierarchy for poster
                    let parent = startObject.parent;
                    while (parent && parent !== scene) {
                        if (isPosterObject(parent)) {
                            return parent;
                        }
                        parent = parent.parent;
                    }
                }
            } else {
                // If no starting object (from nav), find first poster in scene
                let foundPoster = null;
                if (roomModel) {
                    roomModel.traverse(function(child) {
                        if (!foundPoster && isPosterObject(child)) {
                            foundPoster = child;
                        }
                    });
                }
                return foundPoster;
            }
            return null;
        }
        
        // Function to check if object name contains "desktop"
        function isDesktopObject(object) {
            if (!object) return false;
            const name = object.name ? object.name.toLowerCase() : '';
            return name.includes('desktop') || name.includes('computer') || name.includes('pc');
        }
        
        // Function to get all screen and desktop objects in the scene
        function getScreenObjects() {
            const screenObjects = [];
            if (roomModel) {
                roomModel.traverse(function(child) {
                    if (isScreenObject(child) || isDesktopObject(child)) {
                        screenObjects.push(child);
                    }
                });
            }
            return screenObjects;
        }
        
        // Function to get all poster objects in the scene
        function getPosterObjects() {
            const posterObjects = [];
            if (roomModel) {
                roomModel.traverse(function(child) {
                    if (isPosterObject(child)) {
                        posterObjects.push(child);
                    }
                });
            }
            return posterObjects;
        }
        
        // Function to get bounding box center of an object
        function getObjectCenter(object) {
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            return center;
        }
        
        // ============================================
        // CAMERA ANIMATION CONFIGURATION
        // ============================================
        // Customize the camera animation by modifying these values:
        //
        // duration: How long the animation takes (in milliseconds)
        //   - Default: 2000 (2 seconds)
        //   - Faster: 1000, Slower: 3000
        //
        // distanceMultiplier: How far the camera stays from the object
        //   - Default: 1.5 (150% of object's largest dimension)
        //   - Closer: 1.0, Farther: 2.5
        //
        // heightOffset: Vertical offset of camera position
        //   - Default: 0.15 (15% of object height above center)
        //   - Lower: 0.0, Higher: 0.3
        //
        // delayBeforePortfolio: Delay before showing portfolio overlay
        //   - Default: 300 (0.3 seconds)
        //   - No delay: 0, Longer delay: 500
        //
        // easingType: Animation easing curve
        //   - 'easeInOutCubic': Smooth start and end (default)
        //   - 'easeInOut': Standard ease in/out
        //   - 'easeOut': Fast start, slow end
        //   - 'easeIn': Slow start, fast end
        //   - 'linear': Constant speed
        //   - 'easeInOutQuart': More pronounced easing
        //
        // Example: To make animation faster and closer:
        //   duration: 1500,
        //   distanceMultiplier: 1.2
        // ============================================
        const cameraAnimationConfig = {
            duration: 2500,              // Animation duration in milliseconds
            distanceMultiplier: 0.5,     // Distance multiplier (2.5 = 250% of object size - half of 5.0, closer zoom)
            heightOffset: 0.15,          // Height offset (0.15 = 15% of object height above center)
            delayBeforePortfolio: 300,   // Delay before showing portfolio (ms)
            easingType: 'easeInOutCubic', // Easing type: 'easeInOutCubic' for smooth start and end (smoother animation)
            rotateRoomModel: true,        // Rotate entire room model to face screen
            roomRotationStartProgress: 0.3, // When to start rotating room (0.3 = 30% through animation)
            roomRotationDuration: 0.5     // Room rotation duration as fraction of total animation (0.5 = 50%)
        };
        
        // Easing functions
        const easingFunctions = {
            linear: (t) => t,
            easeIn: (t) => t * t,
            easeOut: (t) => t * (2 - t),
            easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInOutCubic: (t) => t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2,
            easeInOutQuart: (t) => t < 0.5 
                ? 8 * t * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 4) / 2
        };
        
        // Function to animate camera zoom in to screen object
        function animateCameraToObject(targetObject, customConfig = {}) {
            if (isAnimating) return;
            isAnimating = true;
            
            // Merge custom config with default config
            const config = { ...cameraAnimationConfig, ...customConfig };
            const duration = config.duration;
            
            // Disable controls during animation
            controls.enabled = false;
            
            // Store current camera position and target as starting point for animation
            // This ensures smooth animation from current position to screen object
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            
            // Store original room model rotation
            let originalRoomRotation = null;
            if (roomModel && config.rotateRoomModel) {
                originalRoomRotation = roomModel.rotation.clone();
            }
            
            // Get object center and bounding box
            const bbox = new THREE.Box3().setFromObject(targetObject);
            const objectCenter = new THREE.Vector3();
            bbox.getCenter(objectCenter);
            
            const size = new THREE.Vector3();
            bbox.getSize(size);
            
            // Calculate bounding box size (length of diagonal)
            const boundingBoxSize = size.length();
            
            // Camera distance calculation with minDistance (standard Three.js + GLTFViewer way)
            const minDistance = 1.2; // Minimum distance to prevent camera from getting too close
            const distance = Math.max(
                boundingBoxSize * config.distanceMultiplier,
                minDistance
            );
            
            
            // Get stable forward direction (not dependent on current distance)
            // Use camera's current world direction as base
            const direction = camera.getWorldDirection(new THREE.Vector3()).negate();
            
            // Compute new camera position
            const targetPosition = objectCenter.clone().add(direction.multiplyScalar(distance));
            
            // Offset target slightly to prevent clipping
            const targetOffset = direction.clone().multiplyScalar(-boundingBoxSize * 0.1);
            const newTarget = objectCenter.clone().add(targetOffset);
            
            // Set camera height to match screen center height (look directly at screen, not down)
            targetPosition.y = objectCenter.y;
            newTarget.y = objectCenter.y;
            
            // Debug: Log the calculated positions
            
            // Calculate target room rotation to rotate exactly 15 degrees from right to left
            let targetRoomRotation = null;
            if (roomModel && config.rotateRoomModel && originalRoomRotation) {
                // Rotate room model exactly 15 degrees from right to left (positive Y rotation)
                const rotationAngle = THREE.MathUtils.degToRad(15); // 15 degrees
                
                // Apply the rotation to the room model (rotate right to left, 15 degrees)
                targetRoomRotation = new THREE.Euler(
                    originalRoomRotation.x,
                    originalRoomRotation.y + rotationAngle,
                    originalRoomRotation.z
                );
            }
            
            // Animation start - camera will focus on the center of the 3D screen object
            const endTarget = newTarget; // Focus point with offset to prevent clipping
            const startTime = performance.now(); // Use performance.now() for smoother animation
            
            function updateAnimation() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Apply easing function (use easeInOutCubic for smoother animation)
                const easingFunc = easingFunctions.easeInOutCubic;
                const eased = easingFunc(progress);
                
                // Calculate current camera position (smooth interpolation)
                const currentPosition = startPosition.clone().lerp(targetPosition, eased);
                
                // Calculate current target (screen object center - the focus point)
                const currentTarget = startTarget.clone().lerp(endTarget, eased);
                
                // Set camera position
                camera.position.copy(currentPosition);
                
                // Set controls target
                controls.target.copy(currentTarget);
                
                // Animate room rotation to face screen object toward camera (right to left)
                if (roomModel && config.rotateRoomModel && targetRoomRotation && originalRoomRotation) {
                    // Calculate room rotation progress
                    const roomRotationStart = config.roomRotationStartProgress;
                    const roomRotationEnd = roomRotationStart + config.roomRotationDuration;
                    
                    if (progress >= roomRotationStart) {
                        // Calculate room rotation progress (0 to 1)
                        const roomProgress = Math.min((progress - roomRotationStart) / (roomRotationEnd - roomRotationStart), 1);
                        const roomEased = easingFunc(roomProgress);
                        
                        // Interpolate room rotation (rotate right to left)
                        roomModel.rotation.x = THREE.MathUtils.lerp(originalRoomRotation.x, targetRoomRotation.x, roomEased);
                        roomModel.rotation.y = THREE.MathUtils.lerp(originalRoomRotation.y, targetRoomRotation.y, roomEased);
                        roomModel.rotation.z = THREE.MathUtils.lerp(originalRoomRotation.z, targetRoomRotation.z, roomEased);
                    }
                }
                
                // Ensure camera looks at the center of the screen object
                camera.lookAt(currentTarget);
                
                // Update controls (only once per frame)
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(updateAnimation);
                } else {
                    // Final positioning - ensure camera is exactly where we want it
                    camera.position.copy(targetPosition);
                    controls.target.copy(endTarget); // Focus on the center of the screen object
                    
                    // Final room rotation to face screen object toward camera
                    if (roomModel && config.rotateRoomModel && targetRoomRotation) {
                        roomModel.rotation.copy(targetRoomRotation);
                    }
                    
                    // Force camera to look directly at the center of the screen object
                    camera.lookAt(endTarget);
                    
                    // Update controls
                    controls.update();
                    
                    // Animation complete, show overlay (callback will determine which one)
                    setTimeout(() => {
                        if (config.onAnimationComplete) {
                            config.onAnimationComplete();
                        } else {
                            showPortfolio();
                        }
                        isAnimating = false;
                    }, config.delayBeforePortfolio);
                }
            }
            
            updateAnimation();
        }
        
        // Function to show backdrop overlay
        function showBackdrop() {
            const backdrop = document.getElementById('popup-backdrop');
            if (backdrop) {
                backdrop.classList.add('active');
            }
        }
        
        // Function to hide backdrop overlay
        function hideBackdrop() {
            const backdrop = document.getElementById('popup-backdrop');
            if (backdrop) {
                backdrop.classList.remove('active');
            }
        }
        
        // Function to show About Me overlay
        function showAboutMe() {
            // Immediately close all overlays to prevent overlap when switching tabs
            closeAllOverlaysImmediately();
            
            const overlay = document.getElementById('about-me-overlay');
            if (!overlay) {
                console.error('About Me overlay not found');
                return;
            }
            
            // Show backdrop
            showBackdrop();
            
            // Prevent body scroll when About Me is open
            document.body.style.overflow = 'hidden';
            
            // Remove active class first
            overlay.classList.remove('active');
            
            // Show overlay and set initial state
            overlay.style.display = 'block';
            overlay.style.opacity = '0';
            overlay.style.transform = 'translateY(100%)';
            
            // Force reflow to ensure initial state is applied
            void overlay.offsetHeight;
            
            // Trigger slide-up animation after a small delay
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.add('active');
                });
            });
            
            // Generate About Me content
            const content = document.getElementById('about-me-content');
            if (content) {
                content.innerHTML = `
                    <div class="about-page">
                        <section class="about-hero">
                            <span class="about-status">Available</span>
                            <h1 class="about-title">Hey, I&apos;m Mạnh Nguyễn!</h1>
                            <p class="about-intro">
                                I&apos;m a UX Designer with over four years of experience designing digital products across finance, technology, and fashion-tech industries. I specialize in creating user-centric solutions that not only elevate user experience but also enhance internal operational efficiency.
                            </p>
                            <p class="about-intro">
                                With a strong foundation in UX/UI design, I&apos;ve helped businesses achieve measurable results by driving user growth, increasing revenue, and expanding market presence.
                            </p>
                        </section>

                        <section class="about-section">
                            <h2 class="about-section-title">About Me</h2>
                            <div class="about-timeline">
                                <article class="about-card">
                                    <h3 class="about-card-title">Arena Multimedia</h3>
                                    <p class="about-card-role">Graphic Design, UX/UI Design</p>
                                    <p class="about-card-time">2019 - 2020</p>
                                </article>
                                <article class="about-card">
                                    <h3 class="about-card-title">University of Economics Ho Chi Minh City</h3>
                                    <p class="about-card-role">Business Administration</p>
                                    <p class="about-card-time">2017 - 2021</p>
                                </article>
                            </div>
                        </section>

                        <section class="about-section">
                            <h2 class="about-section-title">Experience</h2>

                            <article class="about-exp">
                                <div class="about-exp-head">
                                    <h3 class="about-exp-company">DNSE securities joint stock</h3>
                                    <p class="about-exp-role">Senior UX Designer</p>
                                    <p class="about-exp-time">October 2023 - Present</p>
                                </div>
                                <ul class="about-list">
                                    <li>Designed and optimized user interfaces for core financial products, including loan packages and stock trading workflows.</li>
                                    <li>Developed collaborative investment features, enabling users to invest jointly with friends.</li>
                                    <li>Designed a streamlined Gen-Z price board focused on simplicity and ease of use.</li>
                                    <li>Created products for company data and market insights, contributing to strong active/new user growth.</li>
                                    <li>Led development of the first integrated e-wallet within a stock trading application.</li>
                                </ul>
                            </article>

                            <article class="about-exp">
                                <div class="about-exp-head">
                                    <h3 class="about-exp-company">YODY Fashion Tech</h3>
                                    <p class="about-exp-role">UX/UI Designer</p>
                                    <p class="about-exp-time">September 2022 - September 2023</p>
                                </div>
                                <ul class="about-list">
                                    <li>Led development of an Internal App serving 5000 employees.</li>
                                    <li>Collaborated closely with development teams to bridge design and implementation.</li>
                                    <li>Conducted UX research and applied UI design best practices to improve usability and satisfaction.</li>
                                </ul>
                            </article>

                            <article class="about-exp">
                                <div class="about-exp-head">
                                    <h3 class="about-exp-company">Silicon Stack</h3>
                                    <p class="about-exp-role">UX/UI Designer</p>
                                    <p class="about-exp-time">February 2021 - September 2022</p>
                                </div>
                                <ul class="about-list">
                                    <li>Designed an online service booking system for an Australian automotive company.</li>
                                    <li>Built design systems for CRM/SaaS products to improve consistency and speed.</li>
                                    <li>Designed a mobile app for an Australian fast-food chain and redesigned 10+ internal apps.</li>
                                </ul>
                            </article>
                        </section>

                        <section class="about-section">
                            <h2 class="about-section-title">Stack</h2>
                            <div class="about-stack">
                                <span class="about-stack-item">Framer</span>
                                <span class="about-stack-item">Figma</span>
                                <span class="about-stack-item">HTML5</span>
                                <span class="about-stack-item">CSS3</span>
                                <span class="about-stack-item">Notion</span>
                                <span class="about-stack-item">Hotjar</span>
                            </div>
                        </section>
                    </div>
                `;
            }
        }
        
        // Function to return to default 3D scene view
        function returnToDefaultView(onComplete, duration = 2000) {
            if (isAnimating) return;
            isAnimating = true;
            
            // Close any open overlays (without animation to avoid conflicts)
            const portfolioOverlay = document.getElementById('portfolio-overlay');
            const aboutMeOverlay = document.getElementById('about-me-overlay');
            
            if (portfolioOverlay) {
                portfolioOverlay.classList.remove('active');
                document.body.style.overflow = '';
                setTimeout(() => {
                    portfolioOverlay.style.display = 'block';
                    portfolioOverlay.style.opacity = '0';
                    portfolioOverlay.style.transform = 'translateY(100%)';
                }, 300);
            }
            
            if (aboutMeOverlay) {
                aboutMeOverlay.classList.remove('active');
                document.body.style.overflow = '';
                setTimeout(() => {
                    aboutMeOverlay.style.display = 'none';
                    aboutMeOverlay.style.opacity = '0';
                    aboutMeOverlay.style.transform = 'translateY(100%)';
                }, 300);
            }
            
            // Store current camera position and target for animation
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            
            // Store current room rotation if it exists
            let startRoomRotation = null;
            if (roomModel && originalRoomModelRotation) {
                startRoomRotation = roomModel.rotation.clone();
            }
            
            // Animation config
            const startTime = performance.now();
            
            function updateReturnAnimation() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const easingFunc = easingFunctions.easeInOutCubic;
                const eased = easingFunc(progress);
                
                // Animate camera position back to default
                camera.position.lerpVectors(startPosition, defaultCameraPosition, eased);
                
                // Animate controls target back to default
                controls.target.lerpVectors(startTarget, defaultControlsTarget, eased);
                
                // Animate room rotation back to original
                if (roomModel && originalRoomModelRotation && startRoomRotation) {
                    roomModel.rotation.x = THREE.MathUtils.lerp(startRoomRotation.x, originalRoomModelRotation.x, eased);
                    roomModel.rotation.y = THREE.MathUtils.lerp(startRoomRotation.y, originalRoomModelRotation.y, eased);
                    roomModel.rotation.z = THREE.MathUtils.lerp(startRoomRotation.z, originalRoomModelRotation.z, eased);
                }
                
                camera.lookAt(controls.target);
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(updateReturnAnimation);
                } else {
                    camera.position.copy(defaultCameraPosition);
                    controls.target.copy(defaultControlsTarget);
                    camera.lookAt(controls.target);
                    
                    if (roomModel && originalRoomModelRotation) {
                        roomModel.rotation.copy(originalRoomModelRotation);
                    }
                    
                    controls.update();
                    controls.enabled = true;
                    isAnimating = false;
                    
                    // Call completion callback if provided
                    if (onComplete && typeof onComplete === 'function') {
                        onComplete();
                    }
                }
            }
            
            updateReturnAnimation();
        }
        
        // Function to hide About Me and return to scene
        function hideAboutMe() {
            if (isAnimating) return;
            isAnimating = true;
            
            // Hide backdrop
            hideBackdrop();
            
            const overlay = document.getElementById('about-me-overlay');
            overlay.classList.remove('active');
            // Re-enable body scroll when About Me is closed
            document.body.style.overflow = '';
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.opacity = '0';
                overlay.style.transform = 'translateY(100%)';
            }, 600);
            
            // Store current camera position and target for animation
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            
            // Store current room rotation if it exists
            let startRoomRotation = null;
            if (roomModel && originalRoomModelRotation) {
                startRoomRotation = roomModel.rotation.clone();
            }
            
            // Animation config (reverse of zoom-in)
            const duration = 2500; // Same duration as zoom-in
            const startTime = performance.now();
            
            function updateReturnAnimation() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Apply easing function (same as zoom-in for consistency)
                const easingFunc = easingFunctions.easeInOutCubic;
                const eased = easingFunc(progress);
                
                // Animate camera position back to default (zoom out - opposite of zoom in)
                camera.position.lerpVectors(startPosition, defaultCameraPosition, eased);
                
                // Animate controls target back to default
                controls.target.lerpVectors(startTarget, defaultControlsTarget, eased);
                
                // Animate room rotation back to original
                if (roomModel && originalRoomModelRotation && startRoomRotation) {
                    roomModel.rotation.x = THREE.MathUtils.lerp(startRoomRotation.x, originalRoomModelRotation.x, eased);
                    roomModel.rotation.y = THREE.MathUtils.lerp(startRoomRotation.y, originalRoomModelRotation.y, eased);
                    roomModel.rotation.z = THREE.MathUtils.lerp(startRoomRotation.z, originalRoomModelRotation.z, eased);
                }
                
                // Ensure camera looks at target
                camera.lookAt(controls.target);
                
                // Update controls
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(updateReturnAnimation);
                } else {
                    // Final positioning
                    camera.position.copy(defaultCameraPosition);
                    controls.target.copy(defaultControlsTarget);
                    camera.lookAt(controls.target);
                    
                    // Final room rotation
                    if (roomModel && originalRoomModelRotation) {
                        roomModel.rotation.copy(originalRoomModelRotation);
                    }
                    
                    controls.update();
                    
                    // Re-enable controls
                    controls.enabled = true;
                    isAnimating = false;
                    
                    // Set Home nav item as active
                    const navItems = document.querySelectorAll('.nav-item');
                    navItems.forEach(nav => nav.classList.remove('active'));
                    const homeNav = document.getElementById('nav-home');
                    if (homeNav) {
                        homeNav.classList.add('active');
                    }
                }
            }
            
            updateReturnAnimation();
        }
        
        // Function to immediately close all overlays (for tab switching)
        function closeAllOverlaysImmediately() {
            // Hide backdrop
            hideBackdrop();

            const portfolioOverlay = document.getElementById('portfolio-overlay');
            const aboutMeOverlay = document.getElementById('about-me-overlay');
            const contactOverlay = document.getElementById('contact-overlay');

            if (portfolioOverlay) {
                portfolioOverlay.classList.remove('active');
                portfolioOverlay.style.display = 'none';
                portfolioOverlay.style.opacity = '0';
                portfolioOverlay.style.transform = 'translateY(100%)';
            }

            if (aboutMeOverlay) {
                aboutMeOverlay.classList.remove('active');
                aboutMeOverlay.style.display = 'none';
                aboutMeOverlay.style.opacity = '0';
                aboutMeOverlay.style.transform = 'translateY(100%)';
            }

            if (contactOverlay) {
                contactOverlay.classList.remove('active');
                contactOverlay.style.display = 'none';
                contactOverlay.style.opacity = '0';
                contactOverlay.style.transform = 'translateY(100%)';
            }

            // Re-enable body scroll
            document.body.style.overflow = '';
        }

        // Function to show Contact overlay
        function showContact() {
            // Immediately close all overlays to prevent overlap when switching tabs
            closeAllOverlaysImmediately();

            const overlay = document.getElementById('contact-overlay');
            if (!overlay) {
                console.error('Contact overlay not found');
                return;
            }

            // Show backdrop
            showBackdrop();

            // Prevent body scroll when contact is open
            document.body.style.overflow = 'hidden';

            // Remove active class first
            overlay.classList.remove('active');

            // Show overlay and set initial state
            overlay.style.display = 'block';
            overlay.style.opacity = '0';
            overlay.style.transform = 'translateY(100%)';

            // Force reflow to ensure initial state is applied
            void overlay.offsetHeight;

            // Trigger slide-up animation after a small delay
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.add('active');
                });
            });
        }

        // Function to show portfolio overlay
        function showPortfolio() {
            // Immediately close all overlays to prevent overlap when switching tabs
            closeAllOverlaysImmediately();
            const overlay = document.getElementById('portfolio-overlay');
            if (!overlay) {
                console.error('Portfolio overlay not found');
                return;
            }
            
            // Show backdrop
            showBackdrop();
            
            // Prevent body scroll when portfolio is open
            document.body.style.overflow = 'hidden';
            
            // Remove active class first
            overlay.classList.remove('active');
            
            // Show overlay and set initial state
            overlay.style.display = 'block';
            overlay.style.opacity = '0';
            overlay.style.transform = 'translateY(100%)';
            
            // Force reflow to ensure initial state is applied
            void overlay.offsetHeight;
            
            // Trigger slide-up animation after a small delay
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.add('active');
                });
            });
            
            // Generate portfolio cards
            const grid = document.getElementById('portfolio-grid');
            const detailView = document.getElementById('project-detail');
            const portfolioContent = document.querySelector('.portfolio-content');
            
            // Reset scroll position when opening portfolio
            if (portfolioContent) {
                portfolioContent.scrollTop = 0;
            }
            
            // Ensure grid is visible and detail is hidden
            if (grid) {
                grid.style.display = 'grid';
                grid.innerHTML = '';
            }
            if (detailView) {
                detailView.style.display = 'none';
            }
            
            // Limit to 2 rows (6 projects for 3-column grid)
            const projectsToShow = portfolioData.slice(0, 6);
            
            projectsToShow.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'project-card';
                if (item.title.includes('JoyStop')) {
                    card.classList.add('project-card--joystop');
                }
                
                // Determine if it has a lock icon (Microsoft projects)
                const hasLock = item.badges && item.badges.includes('🔒');
                const lockSvg = hasLock ? `
                    <svg class="project-lock" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                ` : '';
                
                // Get image text based on title
                let imageText = item.title;
                if (item.title.includes('Teams')) {
                    imageText = 'Teams Event Interface';
                } else if (item.title.includes('meeting')) {
                    imageText = 'Meeting Setup Interface';
                } else if (item.title.includes('JoyStop')) {
                    imageText = 'Food Ordering App';
                } else if (item.title.includes('AI') || item.title.includes('Holis')) {
                    imageText = 'AI Analytics Platform';
                } else if (item.title.includes('ONBOARDING GAME')) {
                    imageText = 'ONBOARDING GAME';
                }
                
                // Check if thumbnail is an image path or gradient
                const isImage = item.thumbnail && (item.thumbnail.includes('.avif') || item.thumbnail.includes('.jpg') || item.thumbnail.includes('.png') || item.thumbnail.includes('.gif') || item.thumbnail.includes('.webp'));
                const encodedThumb = isImage ? item.thumbnail.split('/').map(s => encodeURIComponent(s)).join('/') : item.thumbnail;
                const imageHTML = isImage
                    ? `<img src="${encodedThumb}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;" />`
                    : `<div style="width: 100%; height: 100%; background: ${item.thumbnail}; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.125rem;">${imageText}</div>`;
                
                card.innerHTML = `
                    <div class="project-image">
                        ${imageHTML}
                    </div>
                    <div class="project-info">
                        <div class="project-card-title">
                            ${item.title}
                            ${lockSvg}
                        </div>
                        <div class="project-description">
                            ${item.description}
                        </div>
                    </div>
                `;
                
                // Add click handler to show project detail
                card.addEventListener('click', function(e) {
                    e.preventDefault();
                    showProjectDetail(item);
                });
                
                grid.appendChild(card);
            });
        }
        
        // Function to get full project content HTML
        function getProjectFullContent(project) {
            if (project.title.includes('Onboarding Game')) {
                return `
                    <div class="project-page">
                        <div class="project-hero">
                            <div class="project-hero__meta">
                                <span class="project-badge">Case Study</span>
                                <span class="project-category">Product Design</span>
                            </div>
                            <h1 class="project-hero-title">Onboarding Game: Gamifying Financial Onboarding</h1>
                        </div>
                        <div class="project-hero-banner">
                            <div class="project-hero-banner__image">
                                <img src="assets/images/Resource Image Game/Image Onboarding Game.avif" alt="ONBOARDING GAME - Hero Banner" class="project-hero-banner__img" />
                            </div>
                        </div>
                        <div class="project-overview">
                            <h2>📱 Project Overview</h2>
                            <div class="project-overview__grid">
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Role:</span>
                                    <span class="project-overview__value">UI/UX Designer</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Time:</span>
                                    <span class="project-overview__value">2025</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Tools:</span>
                                    <span class="project-overview__value">Figma, Blender 3D, After Effects, Lottie</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Client:</span>
                                    <span class="project-overview__value">DNSE - Stock Exchange</span>
                                </div>
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>🎯 Problem & Opportunities</h2>
                            <p class="project-lead">DNSE faces challenges:</p>
                            <ul class="project-stats">
                                <li><strong>266,835</strong> customers open accounts, but only <strong>24.2%</strong> deposit money</li>
                                <li>Only <strong>17.8%</strong> make their first transaction</li>
                                <li>Low customer diversity (<strong>27.6%</strong>)</li>
                            </ul>
                            <p class="project-lead"><strong>→ Need a solution to turn dry onboarding into an engaging experience</strong></p>
                            <div class="project-section__image">
                                <img src="assets/images/Resource Image Game/Target.avif" alt="Problem & Opportunities - Target Metrics" class="project-section__img" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h3>Key User Insights</h3>
                            <ul class="project-list">
                                <li><strong>88.4K users aged 18-20</strong> - predominantly Gen Z</li>
                                <li><strong>Gen Z shows strong interest in sports, gamification, and rewards</strong></li>
                                <li><strong>DNSE is perceived as a young, dynamic financial company</strong></li>
                                <li><strong>Brand mascots (Bull, Bear, Ensa) have high recognition</strong></li>
                            </ul>
                        </div>
                        <div class="project-section">
                            <h3>Competitive Analysis</h3>
                            <p>Analysis of existing financial apps reveals that traditional onboarding lacks interactivity and emotional appeal</p>
                        </div>
                        <div class="project-section">
                            <h2>🧩 The Discovery: Understanding Gen Z</h2>
                            <h3>Opportunity Areas</h3>
                            <div class="project-opportunities">
                                <div class="opportunity-item">
                                    <h4>1. Emotional Connection</h4>
                                    <p>Creating positive emotions around investing</p>
                                </div>
                                <div class="opportunity-item">
                                    <h4>2. Progressive Learning</h4>
                                    <p>Step-by-step learning without overwhelm</p>
                                </div>
                                <div class="opportunity-item">
                                    <h4>3. Instant Gratification</h4>
                                    <p>Immediate rewards system</p>
                                </div>
                                <div class="opportunity-item">
                                    <h4>4. Personalization</h4>
                                    <p>Customized user experience</p>
                                </div>
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>🎮 The Solution: Game Onboarding "Warm-up Investment Athlete"</h2>
                            <h3>Core Concept: Transforming Users into Athletes</h3>
                            <p class="project-lead">We built the narrative: <em>"You're a new athlete member who needs a personal trainer to guide you through each exercise before entering professional competitions."</em></p>
                        </div>
                        <div class="project-section">
                            <h3>🎯 Key Game Elements</h3>
                            <blockquote class="project-quote">
                                <strong>We use DNSE mascot icons to increase brand recognition in the app.</strong>
                            </blockquote>
                            <div class="game-elements">
                                <div class="game-element">
                                    <h4>1. Choose Your Personal Trainer</h4>
                                    <div class="game-element__image">
                                        <img src="assets/images/Resource Image Game/Chose character.gif" alt="Choose Your Personal Trainer - Character Selection" class="game-element__gif" />
                                    </div>
                                    <ul class="project-list">
                                        <li><strong>Bull (Green)</strong> - Stable investment strategies</li>
                                        <li><strong>Bear (Red)</strong> - High-risk, high-speed approach</li>
                                        <li><strong>Ensa (Neutral)</strong> - Balanced, diversified portfolio</li>
                                    </ul>
                                    <p><em>Each trainer has a unique personality and visual identity, creating a sense of personal connection.</em></p>
                                </div>
                                <div class="game-element">
                                    <h4>2. Missions = Investment Workouts</h4>
                                    <p>Users complete investment-related missions that teach them the fundamentals while feeling like a game.</p>
                                </div>
                                <div class="game-element">
                                    <h4>3. Reward System</h4>
                                    <ul class="project-list">
                                        <li>⭐ <strong>Stars</strong> - In-game currency → Redeem for vouchers & discounts</li>
                                        <li>🏅 <strong>Badges</strong> - Collectible achievements</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="project-section">
                            <h3>🎯 Optimized User Flow</h3>
                            <div class="user-flow">
                                <span class="flow-step">[Select PT]</span>
                                <span class="flow-arrow">→</span>
                                <span class="flow-step">[Receive Mission]</span>
                                <span class="flow-arrow">→</span>
                                <span class="flow-step">[Complete Action]</span>
                                <span class="flow-arrow">→</span>
                                <span class="flow-step">[Earn Reward]</span>
                                <span class="flow-arrow">→</span>
                                <span class="flow-step">[Level Up]</span>
                                <span class="flow-arrow">→</span>
                                <span class="flow-step">[Join Professional Competition]</span>
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>🎨 Visual & Interaction Design</h2>
                            <h3>Key Visual Features</h3>
                            <ul class="project-list">
                                <li><strong>🏅 PT Characters:</strong> Bull (Green), Bear (Red), Ensa (Neutral) - each with unique personality</li>
                                <li><strong>🎮 Game UI:</strong> Sports-themed progress bars, badge system, star tracking</li>
                                <li><strong>👁️ Visual Hierarchy:</strong> Prominent reward preview, clear CTAs</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/Resource Image Game/UI Game.gif" alt="UI Game Interface" class="project-section__gif" />
                            </div>
                            <h3>Interaction Excellence</h3>
                            <ul class="project-list">
                                <li><strong>🎬 PT Animations:</strong> Step-by-step guidance like a real personal trainer</li>
                                <li><strong>✨ Micro-interactions:</strong> Completion ticks, badge shine effects, celebratory confetti</li>
                                <li><strong>📊 Progress Visualization:</strong> Fitness-style progress bars - delivering a strong sense of achievement</li>
                            </ul>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Resource Image Game/Open Box.gif" alt="Open Box Interaction" class="project-section__gif" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Resource Image Game/Get badge.gif" alt="Get Badge Interaction" class="project-section__gif" />
                                </div>
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>📊 Measuring Success</h2>
                            <h3>Business Metrics</h3>
                            <div class="project-table-wrapper">
                                <table class="project-table">
                                    <thead>
                                        <tr>
                                            <th>KPI</th>
                                            <th>Target</th>
                                            <th>Actual</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Number of new account openings</td>
                                            <td>356,138</td>
                                            <td>In measurement phase</td>
                                        </tr>
                                        <tr>
                                            <td>Number of customers with at least 1 transaction</td>
                                            <td>35,000</td>
                                            <td>In measurement phase</td>
                                        </tr>
                                        <tr>
                                            <td>Rate of customers using ≥2 products</td>
                                            <td>35%</td>
                                            <td>In measurement phase</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>💡 Important details to expect when this feature launches</h2>
                            <ul class="project-list">
                                <li><strong>"Choose Your PT" = Instant Connection</strong> - Users feel they have a companion on their journey</li>
                                <li><strong>Effective Game Metaphor</strong> - Transforms complexity into simplicity, boredom into enjoyment</li>
                                <li><strong>Visual Consistency</strong> - Brand mascots increase recognition by 3x</li>
                                <li><strong>Progressive Disclosure</strong> - Prevents overwhelming new users</li>
                            </ul>
                            <blockquote class="project-quote project-quote--highlight">
                                <strong>"Gen Z isn't afraid of investing - they just need to be guided in their own language."</strong>
                            </blockquote>
                        </div>
                    </div>
                `;
            } else if (project.title.includes('Stock Price Board for Gen Z')) {
                return `
                    <div class="project-page">
                        <div class="project-hero">
                            <div class="project-hero__meta">
                                <span class="project-badge">Case Study</span>
                                <span class="project-category">Product Design · UX Strategy</span>
                            </div>
                            <h1 class="project-hero-title">Stock Price Board for Gen Z</h1>
                            <p class="project-hero-subtitle">Redesigning DNSE's stock price board into a simpler, friendlier experience so young investors can understand the market with confidence.</p>
                        </div>
                        <div class="project-hero-banner">
                            <div class="project-hero-banner__image">
                                <img src="assets/images/bang-gia/herro-banner.webp" alt="GenZ Stock Price Board - Hero Banner" class="project-hero-banner__img" />
                            </div>
                        </div>
                        <div class="project-overview">
                            <h2>📱 Project Overview</h2>
                            <div class="project-overview__grid">
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Role:</span>
                                    <span class="project-overview__value">UX / UI Designer</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Client:</span>
                                    <span class="project-overview__value">DNSE – Stock Exchange</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Platform:</span>
                                    <span class="project-overview__value">Web & Mobile</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Target users:</span>
                                    <span class="project-overview__value">Gen Z & young investors (18–34, urban, mobile-first)</span>
                                </div>
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>1. Project Context & Objective</h2>
                            <p class="project-lead">For many young investors, traditional stock price boards feel intimidating, overloaded with jargon and complex data tables.</p>
                            <p>The goal of this project was to redesign DNSE's stock price board into a <strong>beginner-friendly, Gen Z–focused experience</strong> that:</p>
                            <ul class="project-list">
                                <li>Makes market data simpler and more visual</li>
                                <li>Reduces cognitive load for first-time investors</li>
                                <li>Builds user confidence and supports long-term investment habits</li>
                            </ul>
                        </div>
                        <div class="project-section">
                            <h2>2. Target Users</h2>
                            <p>Based on analytics and early research, the main user group:</p>
                            <ul class="project-list">
                                <li><strong>Age:</strong> 18–34, primarily Gen Z and young millennials</li>
                                <li><strong>Location:</strong> Urban areas like Hà Nội and Hồ Chí Minh City</li>
                                <li><strong>Devices:</strong> Mobile-first, multi-screen users</li>
                                <li><strong>Behavior:</strong> Tech-savvy but quick to drop tools that feel outdated or complex</li>
                            </ul>
                            <p class="project-lead">This generation expects <strong>fast, clear, and visually intuitive digital experiences</strong>.</p>
                            <div class="project-section__image">
                                <img src="assets/images/bang-gia/target-users.webp" alt="GenZ Target Users" class="project-section__img" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>3. User Survey Insights</h2>
                            <p>A survey with <strong>245 participants</strong> revealed how young users actually use price boards and where they struggle.</p>
                            <h3>Top 3 use cases</h3>
                            <ul class="project-list">
                                <li>Tracking stock price movements</li>
                                <li>Monitoring market indexes</li>
                                <li>Managing personal watchlists and portfolios</li>
                            </ul>
                            <p><strong>Average satisfaction score:</strong> 3.4 / 5 – functional, but not delightful.</p>
                            <h3>Main pain points</h3>
                            <ul class="project-list">
                                <li>Overly complicated interface and terminology</li>
                                <li>Limited watchlist customization</li>
                                <li>No simplified mode for beginners</li>
                                <li>Poor mobile optimization</li>
                            </ul>
                            <p class="project-lead"><strong>→ Users don&apos;t need more data; they need clearer, more guided data.</strong></p>
                        </div>
                        <div class="project-section">
                            <h2>4. Product Opportunity & Direction</h2>
                            <blockquote class="project-quote">
                                The core issue isn&apos;t the market data itself, but <strong>how the product communicates with new investors</strong>.
                            </blockquote>
                            <p>This insight led to a new product direction: a <strong>&quot;Beginner-Friendly Price Board&quot;</strong> that turns intimidating data into <strong>approachable, meaningful stories</strong>.</p>
                            <h3>Key design directions</h3>
                            <ul class="project-list">
                                <li>Introduce two modes: <strong>Beginner</strong> and <strong>Pro</strong></li>
                                <li>Adopt a <strong>card-based, mobile-first layout</strong></li>
                                <li>Add <strong>tooltips, explanations, and visual cues</strong> for financial terms</li>
                                <li>Enable flexible, <strong>customizable watchlists</strong></li>
                                <li>Use <strong>modern, high-contrast visuals</strong> tailored to Gen Z</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/bang-gia/ideate-brainstorming.webp" alt="Brainstorming Solutions for GenZ Price Board" class="project-section__img" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>5. Ideation Workshops</h2>
                            <p>Two cross-functional workshops aligned UX, product, and business on the direction:</p>
                            <ul class="project-list">
                                <li><strong>Session 1 – Personas & Opportunities:</strong> Defined primary personas, mapped end-to-end journeys, and surfaced key pain points.</li>
                                <li><strong>Session 2 – Priorities & Roadmap:</strong> Prioritized ideas by impact vs. feasibility and shaped the MVP scope.</li>
                            </ul>
                            <p>Outcomes included two complete <strong>User Journey Maps</strong> and over <strong>30 improvement ideas</strong>, later distilled into A/B test concepts.</p>
                        </div>
                        <div class="project-section">
                            <h2>6. A/B Testing Concepts</h2>
                            <p>Two prototypes were tested with Gen Z investors:</p>
                            <ul class="project-list">
                                <li><strong>Version 1 – Basic Layout:</strong> Straightforward, table-first approach optimized for clarity.</li>
                                <li><strong>Version 2 – Youthful Layout:</strong> More visual, personalized, and interactive card-based design.</li>
                            </ul>
                            <p><strong>80% of participants</strong> preferred Version 2 for its modern look, emotional connection, and easier scanning.</p>
                            <div class="project-section__image">
                                <img src="assets/images/bang-gia/ab-testing.webp" alt="A/B Testing Concepts for GenZ Price Board" class="project-section__img" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>7. Dual View: Card & List</h2>
                            <p>The final design offers two synchronized viewing modes:</p>
                            <div class="project-two-column">
                                <div>
                                    <h3>Card View</h3>
                                    <ul class="project-list">
                                        <li>Each stock as a <strong>visual card</strong> with key metrics (price, % change, mini trend chart)</li>
                                        <li>Great for quick scanning and visual comparison</li>
                                        <li>Designed to feel modern, interactive, and Gen Z–friendly</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3>List View</h3>
                                    <ul class="project-list">
                                        <li>Dense, <strong>table-based layout</strong> for advanced users</li>
                                        <li>Easy sorting, filtering, and side-by-side comparison</li>
                                        <li>Optimized for speed and efficiency</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="project-section__image">
                                <img src="assets/images/bang-gia/card-list.webp" alt="Card and List View of GenZ Stock Board" class="project-section__img" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>8. Mobile-first Experience</h2>
                            <p>Because most users come from mobile, the interface was rebuilt with a <strong>mobile-first layout</strong>:</p>
                            <ul class="project-list">
                                <li>Reorganized vertically to fit small screens</li>
                                <li>Reduced text density and increased tap targets</li>
                                <li>Kept mini trend charts for fast visual scanning</li>
                                <li>Optimized performance for slower mobile networks</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/bang-gia/mobile.webp" alt="Optimized Mobile Interface" class="project-section__img" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>9. Stock Details & Quick Market Overview</h2>
                            <p>To match Gen Z behaviour, the product supports a <strong>&quot;tap-and-see&quot; detail layer</strong> without leaving the main board.</p>
                            <ul class="project-list">
                                <li><strong>Inline Stock Detail:</strong> One tap reveals price, % change, volume, and a mini chart.</li>
                                <li><strong>Top Gainers/Losers:</strong> Surface fast-moving stocks to speed up trend detection.</li>
                                <li><strong>Consistent across views:</strong> Works in both Card and List layouts.</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/bang-gia/stock-details.gif" alt="Stock Details & Quick Market Overview" class="project-section__gif" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>10. Industry Heatmap & Performance View</h2>
                            <p>To shift from plain data to <strong>market storytelling</strong>, the Industry section was redesigned with two visual modes:</p>
                            <ul class="project-list">
                                <li><strong>Heatmap View:</strong> Color and size highlight sector performance and trading volume.</li>
                                <li><strong>Performance View:</strong> Trends over multiple time ranges, with drilldowns into sectors.</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/bang-gia/industry-heatmap.gif" alt="Industry Heatmap & Performance View" class="project-section__gif" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>11. Market Tracking & Storytelling with Data</h2>
                            <p>A new <strong>Market Overview</strong> section summarizes key movements so young users can understand the market in seconds.</p>
                            <ul class="project-list">
                                <li>High-level view of indexes and stock groups</li>
                                <li>AI-powered summaries that explain &quot;what&apos;s happening today&quot;</li>
                                <li>Designed around a &quot;<strong>10-second market insight</strong>&quot; experience</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/bang-gia/market-tracking.webp" alt="Market Tracking Overview" class="project-section__img" />
                            </div>
                        </div>
                        <div class="project-section">
                            <h2>12. Results After Launch</h2>
                            <p>Six months after launch, the GenZ Stock Price Board delivered strong signals across growth and engagement:</p>
                            <ul class="project-list">
                                <li><strong>366K active users</strong> and <strong>~457K new users</strong></li>
                                <li><strong>4m 28s</strong> average engagement time per user</li>
                                <li><strong>High retention:</strong> DAU/MAU 12.7%, WAU/MAU 23.1%</li>
                                <li>Significant shift to mobile usage and repeated visits to Market and Industry views</li>
                            </ul>
                            <blockquote class="project-quote project-quote--highlight">
                                Bảng giá GenZ turned a traditionally intimidating interface into a <strong>daily habit</strong> for young investors – proving that clearer communication and better design can unlock both <strong>user trust</strong> and <strong>business growth</strong>.
                            </blockquote>
                        </div>
                    </div>
                `;
            } else if (project.title.includes('JoyStop')) {
                return `
                    <div class="project-page project-page--light">
                        <div class="project-hero">
                            <div class="project-hero__meta">
                                <span class="project-badge">Case Study</span>
                                <span class="project-category">App Design</span>
                            </div>
                            <h1 class="project-hero-title">JoyStop: Food Ordering App</h1>
                        </div>
                        <div class="project-hero-banner">
                            <div class="project-hero-banner__image">
                                <img src="assets/images/Joystop app/Joystop hero banner.png" alt="JoyStop hero banner" class="project-hero-banner__img" />
                            </div>
                        </div>

                        <div class="project-overview">
                            <h2>Preview</h2>
                            <div class="project-overview__grid">
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Category:</span>
                                    <span class="project-overview__value">App Design</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Client:</span>
                                    <span class="project-overview__value">Roll&apos;D</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Preview:</span>
                                    <span class="project-overview__value">JoyStop : Food ordering app</span>
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>What is Joystop?</h2>
                            <p class="project-lead">Joystop is an upgraded business from Roll&apos;D Brand, which has 125+ store openings across Australia.</p>
                            <p>Joystop app users are people who are open to food consumption through digital platforms and want better service, more convenience, and rewards through technology.</p>
                            <p>This innovative multi-brand project contributes to solving existing process bottlenecks while generating new customers and opportunities for cooperating brands.</p>
                        </div>

                        <div class="project-section">
                            <h2>Project Timeline</h2>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/Project timeline.avif" alt="Project timeline" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Problems Statement</h2>
                            <h3>About the business model</h3>
                            <ul class="project-list">
                                <li>Poor customer experience when ordering through speaker systems often causes mistakes and makes users feel rushed.</li>
                                <li>Stores are often overcrowded, leading to an inability to serve customers quickly.</li>
                            </ul>
                            <h3>About product and user behavior</h3>
                            <ul class="project-list">
                                <li>Home screen real estate on mobile is precious and must be used efficiently.</li>
                                <li>Users do not want to provide too many personal details or receive too many communications.</li>
                                <li>Users want real-time tracking and clear order progress.</li>
                                <li>Many apps in the market are too complex with too many steps to place an order.</li>
                            </ul>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Joystop app/Problems Statement .png" alt="Problems statement" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Joystop app/Problems Statement 2.avif" alt="Problems statement details" class="project-section__img" />
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Research</h2>
                            <p>Research found that the drive-thru process consumed too much time and reduced overall customer satisfaction.</p>
                            <ul class="project-list">
                                <li>Poor ordering quality through speaker systems.</li>
                                <li>No or limited preorder capability causing congestion on site.</li>
                                <li>No variety for customers and only one cuisine option.</li>
                                <li>Customization slows drive-thru speed and increases wait times.</li>
                            </ul>
                        </div>

                        <div class="project-section">
                            <h2>Sitemap</h2>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/site map.png" alt="Sitemap" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>User flow</h2>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/User flow.png" alt="User flow" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Location</h2>
                            <ul class="project-list">
                                <li>Suggest nearest location and smart store choice based on past orders.</li>
                                <li>Nearby features help users find and favorite preferred stores.</li>
                                <li>Notification and warning systems show out-of-stock, closed stores, and holiday surcharges.</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/Location .avif" alt="Location feature" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Home Page</h2>
                            <p>More than five home screen options were explored to find the best match between client goals and user needs.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/Homepage.avif" alt="Home page options" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Product Details</h2>
                            <p>The design goes beyond high-level information architecture and improves details such as kJ and food tags (gluten-free, vegan), improving accessibility for health-conscious users.</p>
                            <p>Information hierarchy is optimized so returning users can order quickly without reading extra details each time.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/Product Details .avif" alt="Product details" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Re-order</h2>
                            <p>Favorite items preserve latest customization, helping users reorder in a few taps. Order history also allows one-click recovery when an order fails.</p>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Joystop app/Re-order .png" alt="Re-order screen 1" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Joystop app/Re-order 2.png" alt="Re-order screen 2" class="project-section__img" />
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Order Tracking</h2>
                            <p>Animation and illustrations make the waiting experience less boring. For pickup, users can show a QR code, especially useful in drive-thru.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/Order Tracking .avif" alt="Order tracking" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Gift Card</h2>
                            <p>Gift cards are connected with wallet payments to reduce effort and support user acquisition through sharing.</p>
                            <ul class="project-list">
                                <li>Schedule gift cards for birthdays, weddings, anniversaries, and New Year.</li>
                                <li>Future phase: custom gift card design.</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/Gift card.avif" alt="Gift card" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Illustrations</h2>
                            <p>Brand-led illustration and animation kits improve identity consistency and user mood, especially when users face errors or delays.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/Illustrations .avif" alt="Illustrations" class="project-section__img" />
                            </div>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop app/Record the test.png" alt="Record the test" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Client Feedback</h2>
                            <p>The client felt delighted with the proposed solution. The design team plans to test each feature in future phases to improve outcomes further.</p>
                        </div>

                        <div class="project-section">
                            <h2>Conclusion/Reflection</h2>
                            <p>The project is not live yet, but the current phase delivered a strong solution and positive client response.</p>
                            <ul class="project-list">
                                <li>What we learned: internal A/B testing helped validate direction and strengthen design decisions.</li>
                                <li>What to improve: validate with real-case testing and complete admin portal flows before full booking rollout.</li>
                            </ul>

                        </div>
                    </div>
                `;
            } else if (project.title.includes('Joystop Management System')) {
                return `
                    <div class="project-page">
                        <div class="project-hero">
                            <div class="project-hero__meta">
                                <span class="project-badge">Case Study</span>
                                <span class="project-category">Management System</span>
                            </div>
                            <h1 class="project-hero-title">Joystop Management System</h1>
                            <p class="project-hero-subtitle">A management platform for Roll&apos;D that controls bookings, product settings, marketing campaigns, and system configuration for customer-facing touchpoints.</p>
                        </div>
                        <div class="project-hero-banner">
                            <div class="project-hero-banner__image">
                                <img src="assets/images/Joystop management/Herobanner joystop Management System.avif" alt="Joystop Management System hero" class="project-hero-banner__img" />
                            </div>
                        </div>

                        <div class="project-overview">
                            <h2>Preview</h2>
                            <div class="project-overview__grid">
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Category:</span>
                                    <span class="project-overview__value">Management System</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Client:</span>
                                    <span class="project-overview__value">Roll&apos;D - 1st Seller Vietnamese Food in Australia</span>
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>About Client</h2>
                            <p class="project-lead">Joystop is an upgraded business from Roll&apos;D, with 125+ stores across Australia.</p>
                            <p>The Joystop Management System handles booking operations while controlling products, services, and settings that directly impact customer-facing experiences.</p>
                            <p>This admin system maintains all key configurations for the booking app used by end users in the drive-thru model.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/About Client.avif" alt="About client" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Core Modules</h2>
                            <h3>Booking management</h3>
                            <p>Admins need to manage all bookings and process them through order management workflows and POS integration.</p>
                            <h3>Product management</h3>
                            <p>This is the most critical module because it controls how products are displayed to customers and influences search and menu discovery behavior.</p>
                            <h3>Marketing</h3>
                            <p>Campaign settings are used to encourage ordering and directly influence conversion and revenue.</p>
                            <h3>Configuration</h3>
                            <p>Includes Store Management, User Management, Role/Permission Management, and Integration Management.</p>
                        </div>

                        <div class="project-section">
                            <blockquote class="project-quote project-quote--highlight">
                                We weren&apos;t only creating a new management system but making it become more valuable from the user experience standpoint.
                            </blockquote>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Login.avif" alt="Joystop Management Login" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Sitemap</h2>
                            <p>Based on business needs and dependency on the customer-facing app, we sorted and prioritized MVP admin features before defining the sitemap.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Sitemap.avif" alt="Sitemap" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>How we designed JoyStop</h2>
                            <p>Each module was designed by feature priority and by how settings impact the mobile booking app in real time.</p>
                        </div>

                        <div class="project-section">
                            <h2>Product Management</h2>
                            <p>This section is complex because data allocation and display between Admin Portal and Booking App must stay synchronized. Errors in categories/customization can cause wrong data interpretation on the customer side.</p>

                            <h3>Menu</h3>
                            <p>Menus can be active, scheduled, or draft. To avoid repetitive setup across many stores, we introduced a master menu model with per-store overrides.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Menu.jpg" alt="Menu management" class="project-section__img" />
                            </div>

                            <h3>Categories Management</h3>
                            <p>Because Vietnamese food has unique flavor/sauce customization patterns, we designed a decentralized category setting model for better flexibility.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Categories Management .avif" alt="Categories Management" class="project-section__img" />
                            </div>

                            <h3>Customised Items</h3>
                            <p>Custom items are created individually and grouped for easier operational management and consistent booking behavior.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Customised Items .avif" alt="Customised items" class="project-section__img" />
                            </div>

                            <h3>Brands Management</h3>
                            <p>Phase 1 keeps brand settings simple (3 brands), while preserving scalability for future expansion without redesigning core tables.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Brands Management .avif" alt="Brands management" class="project-section__img" />
                            </div>

                            <h3>Product</h3>
                            <p>Product is the core data object. We designed step-by-step variant setup flows (attributes, price, KJ, prep time) to reduce configuration errors.</p>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Joystop management/Product.avif" alt="Product settings 1" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Joystop management/Product 2.avif" alt="Product settings 2" class="project-section__img" />
                                </div>
                            </div>

                            <h3>Meal Group</h3>
                            <p><strong>Roll into a Meal:</strong> Upsell logic similar to combos, with controls by food type and quantity limits.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Meal Group.avif" alt="Meal group" class="project-section__img" />
                            </div>

                            <h3>Meal Bundle</h3>
                            <p>Uses a similar setup pattern for consistency while targeting different customer groups.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Meal Bundle .avif" alt="Meal bundle" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Order Management</h2>
                            <p>For MVP phase 1, we implemented foundational order management states aligned with admin workflows while preserving consistency with the mobile booking app.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Order Management .avif" alt="Order management" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Marketing</h2>
                            <p>Early-stage marketing is split into two modules: Campaign and Voucher.</p>

                            <h3>Campaign</h3>
                            <p>Campaign setup considers duration, location, and priority when multiple campaigns run concurrently. Campaigns include News and Promotion types, with synchronization to voucher launches.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Campaign.avif" alt="Campaign" class="project-section__img" />
                            </div>

                            <h3>Voucher</h3>
                            <p>Voucher settings include recurrence, conditions, discount model (e.g. BOGO or invoice-based), and customer eligibility by region/store in phase 1.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Joystop management/Voucher.avif" alt="Voucher" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Conclusion</h2>
                            <p>The project is not live yet, but the first phase successfully delivered strong value and client confidence.</p>
                            <ul class="project-list">
                                <li>What we learned: internal A/B testing and structured discussions improved solution quality and alignment.</li>
                                <li>What to improve: increase real-case testing and complete admin portal features before full booking launch.</li>
                                <li>To keep this case study focused, only core features are shown.</li>
                            </ul>
                        </div>
                    </div>
                `;
            } else if (project.title.includes('AutoVal: Car Valuation')) {
                return `
                    <div class="project-page">
                        <div class="project-hero">
                            <div class="project-hero__meta">
                                <span class="project-badge">Case Study</span>
                                <span class="project-category">WEB/APP</span>
                            </div>
                            <h1 class="project-hero-title">AutoVal: Car Valuation Platform</h1>
                            <p class="project-hero-subtitle">A platform for Australian dealerships to appraise, acquire, and auction used cars with a clear role-based workflow.</p>
                        </div>
                        <div class="project-hero-banner">
                            <div class="project-hero-banner__image">
                                <img src="assets/images/Autoval/AutoVal app hero banner.webp" alt="AutoVal App Hero Banner" class="project-hero-banner__img" />
                            </div>
                        </div>

                        <div class="project-overview">
                            <h2>Preview</h2>
                            <div class="project-overview__grid">
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Category:</span>
                                    <span class="project-overview__value">WEB/APP</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Client:</span>
                                    <span class="project-overview__value"><a href="https://autovol.com/" target="_blank" rel="noopener noreferrer">Autoval</a></span>
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>About Project</h2>
                            <p class="project-lead">Autoval is an innovative Australian app tailored for car dealerships, enabling them to appraise and purchase used cars directly from individual sellers.</p>
                            <p>The platform streamlines the entire process from valuation to acquisition, offering dealers easy access to a broader inventory of quality used vehicles. At the same time, it provides customers with a fast, hassle-free way to sell their cars. Autoval also features a built-in auction system, giving dealers the opportunity to resell vehicles at competitive prices and allowing buyers to access great deals through dynamic bidding.</p>
                        </div>

                        <div class="project-section">
                            <h2>Reasech</h2>
                            <p>The used car market is a major and steadily growing industry worldwide. According to Zion Market Research, the global used car market was valued at approximately USD 1,350 billion in 2021 and is projected to reach USD 2,220 billion by 2028, growing at a compound annual growth rate (CAGR) of around 6.7% between 2022 and 2028. In Australia specifically, the 2021 Car Dealer Report by IBISWorld estimated the used car market to be worth around AUD 20.5 billion, with a forecast CAGR of 3.3% over the next five years.</p>
                            <p>To better understand this market and support our client's business model, we conducted deeper research into the typical transaction process in the used car industry. Here is a streamlined overview of how it usually works:</p>
                            <ul class="project-list">
                                <li>A customer decides to sell their used car and visits a dealership to receive an appraisal and a purchase offer.</li>
                                <li>The dealership evaluates the vehicle and provides an offer. If accepted, the dealership finalizes the transaction and takes care of the ownership transfer paperwork.</li>
                                <li>Once the dealership owns the vehicle, it may choose to resell it via an auction platform to maximize profitability.</li>
                                <li>The car is listed through various auction channels, and once sold, the dealership receives payment based on factors such as vehicle condition, demand, and competitive bidding.</li>
                                <li>Ownership is transferred to the new buyer, and the dealership completes all required documentation.</li>
                            </ul>
                            <p>This process benefits both parties: customers receive a quick and convenient way to sell their vehicles, while dealerships gain access to quality inventory and the opportunity to increase margins through auctions. However, transparency and fair valuation remain critical for ensuring mutual satisfaction.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Autoval/Key Finndings & Insights.webp" alt="Research insights" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>The Problem Major</h2>
                            <p>Once we've built in the basic features, we've found that valuing used cars goes through many steps and roles.</p>
                            <ul class="project-list">
                                <li>How to decentralize roles effectively?</li>
                                <li>How to ensure no valuation steps are skipped?</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/Autoval/Risk Cases.webp" alt="Risk cases" class="project-section__img" />
                            </div>
                            <div class="project-section__image">
                                <img src="assets/images/Autoval/Happy case.webp" alt="Happy case" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>The Solution</h2>
                            <ul class="project-list">
                                <li>Identify the different valuation steps: The first step is to identify all the steps involved in valuing used cars. This can be done by analyzing the process and breaking it down into smaller steps.</li>
                                <li>Determine the roles needed for each step: Once we have identified the different steps, determine the roles needed for each step. For example, we may need an appraiser to inspect the car, a data analyst to analyze market trends, and a salesperson to negotiate the final price.</li>
                                <li>Assign roles to different individuals or teams: Once you have identified the roles needed for each step, assign them to different individuals or teams. Make sure that each individual or team is responsible for their specific role and has the necessary skills and resources to perform it effectively.</li>
                                <li>Establish clear communication channels: To ensure that all the roles are working together effectively, establish clear communication channels between the different individuals or teams. This can include regular meetings, progress updates, and feedback sessions.</li>
                                <li>Monitor performance and adjust as needed: Finally, monitor the performance of each role and adjust as needed. If we notice that certain roles are not being performed effectively, consider reassigning them or providing additional training or resources.</li>
                                <li>Develop role-based notifications.</li>
                            </ul>
                            <p>By implementing decentralization for roles, we can ensure that all the necessary valuation steps are covered and improve the overall efficiency of the valuation process.</p>
                        </div>

                        <div class="project-section">
                            <h2>Something about the feature in the app</h2>
                            <h3>Add the vehicle and verify with the dealership</h3>
                            <p>To prevent fraud and improve trust before auction listing, vehicle verification is structured in four steps:</p>
                            <ul class="project-list">
                                <li>Step 1: Add Vehicle</li>
                                <li>Step 2: Upload photos from required angles</li>
                                <li>Step 3: Vehicle Details</li>
                                <li>Step 4: Contact Information</li>
                            </ul>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Autoval/Add the vehicle.png" alt="Add vehicle flow" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Autoval/Add the vehicle web.webp" alt="Add vehicle web" class="project-section__img" />
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Valuation Flow</h2>
                            <p>The Autoval app is a comprehensive car valuation tool designed to streamline the trade-in, buying, and selling process for dealerships and customers alike. With four distinct roles - customer, salesperson, manager, and valuer - the app enables seamless communication and collaboration throughout the valuation process.</p>
                            <ol class="project-list">
                                <li>Begins with the salesperson sending an Autoval link to the customer, who can then fill out a detailed online request form.</li>
                                <li>Once the manager has reviewed the request, they can assign the owner as a salesperson or themself for further review.</li>
                                <li>After the assigned owner is a salesperson or Manager, they have reviewed the request and determined that an onsite inspection is necessary.</li>
                                <li>The valuation process moves to the Pending Approval stage.</li>
                                <li>Once the customer approves the onsite inspection, the valuer will verify and check the vehicle's condition and then enter the initial value in the app. This process can be performed many times.</li>
                                <li>The next step is for the manager to review and confirm the final valued price, ensuring that it meets the dealership's standards. Once the final valued price has been confirmed, the salesperson can submit the car for trade-in or sell.</li>
                            </ol>
                            <p>Overall, the Autoval app offers a simple and efficient way for dealerships to manage car valuations and trade-ins, and for customers to get fair and accurate valuations for their vehicles.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Autoval/Valuation Flow.png" alt="Valuation flow" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Auction Feature for Customers</h2>
                            <ul class="project-list">
                                <li>Empowering Buyers: With the ability to select from a variety of auctions and tenders, buyers have more control over their purchasing decisions.</li>
                                <li>Efficient Bidding Process: The auction feature simplifies bidding for buyers and bid handling for sellers.</li>
                                <li>Facilitating Negotiations: By allowing sellers to select a bidder to sell to, the app supports healthy negotiation flow.</li>
                                <li>Providing Access to High-Quality Vehicles: Sellers can showcase quality vehicles to a broad pool of interested buyers.</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/Autoval/Auction Feature for Customers.png" alt="Auction feature" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>The Results</h2>
                            <p>After completing the application we had a good sign, more than 100 transactions/month (trade-in and sale) in the Autoval application at dealers and more than 150 auctions in the Auction app of Customer, good beginning.</p>
                            <ul class="project-list">
                                <li>100+ transactions/month (trade-in and sale) via Autoval at dealers.</li>
                                <li>150+ auctions in the customer auction app.</li>
                            </ul>
                            <blockquote class="project-quote">
                                To keep this case study concise, only core features are shown. If you want more details about the project, please contact me.
                            </blockquote>
                        </div>
                    </div>
                `;
            } else if (project.title.includes('Yody Internal Mobile App')) {
                return `
                    <div class="project-page">
                        <div class="project-hero">
                            <div class="project-hero__meta">
                                <span class="project-badge">Case Study</span>
                                <span class="project-category">Product Design · Internal Tools</span>
                            </div>
                            <h1 class="project-hero-title">Yody Internal Mobile App</h1>
                            <p class="project-hero-subtitle">A mobile app for Yody employees to streamline inventory management and day-to-day operations—barcode scanning, reporting, payroll, and customer conversion in one place.</p>
                        </div>
                        <div class="project-hero-banner">
                            <div class="project-hero-banner__image">
                                <img src="assets/images/Yody/Herobanner yody.webp" alt="Internal Mobile App - Hero Banner" class="project-hero-banner__img" />
                            </div>
                        </div>

                        <div class="project-overview">
                            <h2>📱 Project Overview</h2>
                            <div class="project-overview__grid">
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Role:</span>
                                    <span class="project-overview__value">UI/UX Designer</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Client:</span>
                                    <span class="project-overview__value">Yody</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Users:</span>
                                    <span class="project-overview__value">~6,000 store employees (consultants, cashiers, store managers)</span>
                                </div>
                                <div class="project-overview__item">
                                    <span class="project-overview__label">Platforms:</span>
                                    <span class="project-overview__value">Mobile</span>
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Introduction project</h2>
                            <p class="project-lead">This internal mobile app helps employees streamline inventory management and optimize operations. With barcode scanning, employees can quickly check inventory levels by location and keep products in stock. The app also supports personnel management, task management, and communication in one platform.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Yody/Introduction project.webp" alt="Introduction - Internal Mobile App" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>Project objectives</h2>
                            <p>App Unicorn is a mobile application for Yody internal employees built around an <strong>All-in-one</strong> criterion: applying technology across the company to streamline processes and regulations, create a synchronous dataset, and enable faster decision-making to support rapid growth.</p>
                        </div>

                        <div class="project-section">
                            <h2>Business process overview</h2>
                            <p>Understanding the business model and operational flow is essential to designing the right solution for store teams.</p>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Bussiness flow 1.png" alt="Business process overview - Flow 1" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Bussiness flow 2.png" alt="Business process overview - Flow 2" class="project-section__img" />
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>User research</h2>
                            <p>Yody has about <strong>6,000</strong> store employees (consultants, cashiers, store managers). Most are <strong>18–28</strong>, many are high-school graduates, and are comfortable adopting mobile tools quickly. In Vietnam, about <strong>51%</strong> of users aged 15–34 use smartphones.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Yody/user target.png" alt="User research target group" class="project-section__img" />
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>About app</h2>

                            <h3>Login Screen</h3>
                            <ul class="project-list">
                                <li>Verify employee code exists in the system</li>
                                <li>Mask passwords for privacy</li>
                                <li>Support reset/retrieve flows to reduce login friction</li>
                            </ul>
                            <div class="project-section__image">
                                <img src="assets/images/Yody/Login Screen .webp" alt="Login screen" class="project-section__img" />
                            </div>

                            <h3>Scan Screen</h3>
                            <p>Barcode scanning enables employees to quickly check inventory by location and access product information. It reduces manual entry and improves accuracy in updating inventory levels in real time.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Yody/Scan Screen .webp" alt="Scan screen" class="project-section__img" />
                            </div>

                            <h3>Report Screen</h3>
                            <p>A reporting workspace to analyze revenue and employee data using filtering, sorting, and visualization options—helping managers spot trends and identify opportunities.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Yody/Report Screen .webp" alt="Report screen" class="project-section__img" />
                            </div>

                            <h3>Payroll screen</h3>
                            <p>Payroll details for cashiers and salespeople (hours, overtime, bonuses, commissions) with transparent breakdowns and reporting to help optimize labor costs.</p>
                            <div class="project-section__image">
                                <img src="assets/images/Yody/Payroll screen .webp" alt="Payroll screen" class="project-section__img" />
                            </div>

                            <h3>Product screen</h3>
                            <p>Inventory visibility, stock status, and promotion tracking—helping employees answer customer questions quickly and manage product availability.</p>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Product screen 1.webp" alt="Product screen - inventory" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Product screen 2.webp" alt="Product screen - promotions" class="project-section__img" />
                                </div>
                            </div>

                            <h3>Home & convert customers</h3>
                            <p>An integrated customer conversion flow that tracks customer interactions (entering → consulted → bought) and calculates conversion rates. Includes a “Not buy” outcome to capture reasons and trends.</p>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Home & convert customers  .webp" alt="Home and customer conversion" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Home & convert customers  flow.png" alt="Home and customer conversion flow" class="project-section__img" />
                                </div>
                            </div>

                            <h3>Scan Go Feature</h3>
                            <p>Scan-and-go enables employees to create customer orders by scanning products and building a cart on mobile—reducing checkout delays and improving accuracy with real-time inventory and promotion info.</p>
                            <div class="project-section__images-grid">
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Scan Go Feature .png" alt="Scan and go overview" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Scan Go Feature screen 1.webp" alt="Scan and go screen 1" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Scan Go Feature screen 2.webp" alt="Scan and go screen 2" class="project-section__img" />
                                </div>
                                <div class="project-section__image">
                                    <img src="assets/images/Yody/Scan Go Feature screen 3.webp" alt="Scan and go screen 3" class="project-section__img" />
                                </div>
                            </div>
                        </div>

                        <div class="project-section">
                            <h2>The results</h2>
                            <ul class="project-list">
                                <li>Company size: <strong>6,000 employees</strong> (including <strong>5,000</strong> store employees)</li>
                                <li>After &gt;1 month: <strong>3.5k</strong> new users and <strong>4.8k</strong> returning users</li>
                            </ul>
                        </div>

                        <div class="project-section">
                            <h2>Conclusion</h2>
                            <p class="project-lead">An internal app can become a key operational lever when it is designed for real store workflows. By bringing inventory, reporting, payroll, and conversion tracking into one mobile experience, the app helps teams work faster with fewer errors—while giving leadership clearer data for decisions.</p>
                        </div>
                    </div>
                `;
            }
            return '';
        }
        
        // Function to show project detail view
        function showProjectDetail(project) {
            const grid = document.getElementById('portfolio-grid');
            const detailView = document.getElementById('project-detail');
            const detailContent = document.getElementById('project-detail-content');
            const portfolioContent = document.querySelector('.portfolio-content');
            const portfolioHeader = document.querySelector('.portfolio-header');
            
            if (!grid || !detailView || !detailContent) {
                console.error('Project detail elements not found');
                return;
            }
            
            // Reset scroll position of portfolio content container
            if (portfolioContent) {
                portfolioContent.scrollTop = 0;
            }
            
            // Hide portfolio header
            if (portfolioHeader) {
                portfolioHeader.style.display = 'none';
            }
            
            // Hide grid, show detail
            grid.style.display = 'none';
            detailView.style.display = 'block';
            
            // Get image text
            let imageText = project.title;
            if (project.title.includes('Teams')) {
                imageText = 'Teams Event Interface';
            } else if (project.title.includes('meeting')) {
                imageText = 'Meeting Setup Interface';
            } else if (project.title.includes('JoyStop')) {
                imageText = 'Food Ordering App';
            } else if (project.title.includes('AI') || project.title.includes('Holis')) {
                imageText = 'AI Analytics Platform';
            } else if (project.title.includes('ONBOARDING GAME')) {
                imageText = 'ONBOARDING GAME';
            }
            
            // Generate badges HTML
            let badgesHTML = '';
            if (project.badges && project.badges.length > 0) {
                badgesHTML = '<div class="project-detail-badges">';
                project.badges.forEach(badge => {
                    badgesHTML += `<span class="project-detail-badge">${badge}</span>`;
                });
                badgesHTML += '</div>';
            }
            
            // Check if project has full content
            if (project.fullContent) {
                // Render full project page content
                detailContent.innerHTML = getProjectFullContent(project);
            } else {
                // Render simple project detail
                detailContent.innerHTML = `
                    <div class="project-detail-header">
                        <h2 class="project-detail-title">${project.title}</h2>
                        ${badgesHTML}
                    </div>
                    <div class="project-detail-image" style="background: ${project.thumbnail}; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;">
                        ${imageText}
                    </div>
                    <div class="project-detail-description">
                        ${project.description}
                    </div>
                `;
            }
        }
        
        // Function to hide project detail and show grid
        function hideProjectDetail() {
            const grid = document.getElementById('portfolio-grid');
            const detailView = document.getElementById('project-detail');
            const portfolioContent = document.querySelector('.portfolio-content');
            const portfolioHeader = document.querySelector('.portfolio-header');
            
            if (!grid || !detailView) {
                console.error('Project detail elements not found');
                return;
            }
            
            // Reset scroll position of portfolio content container
            if (portfolioContent) {
                portfolioContent.scrollTop = 0;
            }
            
            // Show portfolio header again
            if (portfolioHeader) {
                portfolioHeader.style.display = '';
            }
            
            // Hide detail, show grid
            detailView.style.display = 'none';
            grid.style.display = 'grid';
        }

        // Function to hide contact and return to scene
        function hideContact() {
            // Hide backdrop
            hideBackdrop();

            const overlay = document.getElementById('contact-overlay');
            overlay.classList.remove('active');
            // Re-enable body scroll when contact is closed
            document.body.style.overflow = '';
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.opacity = '0';
                overlay.style.transform = 'translateY(100%)';
            }, 600);
        }

        // Function to hide portfolio and return to scene
        function hidePortfolio() {
            if (isAnimating) return;
            isAnimating = true;
            
            // Hide backdrop
            hideBackdrop();
            
            const overlay = document.getElementById('portfolio-overlay');
            overlay.classList.remove('active');
            // Re-enable body scroll when portfolio is closed
            document.body.style.overflow = '';
            setTimeout(() => {
                overlay.style.display = 'block';
                overlay.style.opacity = '0';
                overlay.style.transform = 'translateY(100%)';
            }, 600);
            
            // Store current camera position and target for animation
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            
            // Store current room rotation if it exists
            let startRoomRotation = null;
            if (roomModel && originalRoomModelRotation) {
                startRoomRotation = roomModel.rotation.clone();
            }
            
            // Animation config (reverse of zoom-in)
            const duration = 2500; // Same duration as zoom-in
            const startTime = performance.now();
            
            function updateReturnAnimation() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Apply easing function (same as zoom-in for consistency)
                const easingFunc = easingFunctions.easeInOutCubic;
                const eased = easingFunc(progress);
                
                // Animate camera position back to default (zoom out - opposite of zoom in)
                // startPosition is the zoomed-in position (near screen), defaultCameraPosition is the default view
                camera.position.lerpVectors(startPosition, defaultCameraPosition, eased);
                
                // Animate controls target back to default
                controls.target.lerpVectors(startTarget, defaultControlsTarget, eased);
                
                // Animate room rotation back to original
                if (roomModel && originalRoomModelRotation && startRoomRotation) {
                    roomModel.rotation.x = THREE.MathUtils.lerp(startRoomRotation.x, originalRoomModelRotation.x, eased);
                    roomModel.rotation.y = THREE.MathUtils.lerp(startRoomRotation.y, originalRoomModelRotation.y, eased);
                    roomModel.rotation.z = THREE.MathUtils.lerp(startRoomRotation.z, originalRoomModelRotation.z, eased);
                }
                
                // Ensure camera looks at target
                camera.lookAt(controls.target);
                
                // Update controls
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(updateReturnAnimation);
                } else {
                    // Final positioning
                    camera.position.copy(defaultCameraPosition);
                    controls.target.copy(defaultControlsTarget);
                    camera.lookAt(controls.target);
                    
                    // Final room rotation
                    if (roomModel && originalRoomModelRotation) {
                        roomModel.rotation.copy(originalRoomModelRotation);
                    }
                    
                    controls.update();
                    
                    // Re-enable controls
                    controls.enabled = true;
                    isAnimating = false;
                    
                    // Set Home nav item as active
                    const navItems = document.querySelectorAll('.nav-item');
                    navItems.forEach(nav => nav.classList.remove('active'));
                    const homeNav = document.getElementById('nav-home');
                    if (homeNav) {
                        homeNav.classList.add('active');
                    }
                }
            }
            
            updateReturnAnimation();
        }
        
        // Mouse move handler for cursor feedback
        function onMouseMove(event) {
            if (isAnimating) return;
            
            // Calculate mouse position in normalized device coordinates
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Update raycaster
            raycaster.setFromCamera(mouse, camera);
            
            // Get all meshes in the scene
            const meshes = [];
            scene.traverse(function(object) {
                if (object.isMesh) {
                    meshes.push(object);
                }
            });
            
            // Find intersections
            const intersects = raycaster.intersectObjects(meshes, true);
            
            if (intersects.length > 0) {
                const hoveredObject = intersects[0].object;
                
                // Check if it's a screen or poster object
                let isScreen = false;
                let isPoster = false;
                
                if (isScreenObject(hoveredObject)) {
                    isScreen = true;
                } else if (hoveredObject.parent && isScreenObject(hoveredObject.parent)) {
                    isScreen = true;
                } else {
                    // Check up the hierarchy for screen
                    let parent = hoveredObject.parent;
                    while (parent && parent !== scene) {
                        if (isScreenObject(parent)) {
                            isScreen = true;
                            break;
                        }
                        parent = parent.parent;
                    }
                }
                
                if (isPosterObject(hoveredObject)) {
                    isPoster = true;
                } else if (hoveredObject.parent && isPosterObject(hoveredObject.parent)) {
                    isPoster = true;
                } else {
                    // Check up the hierarchy for poster
                    let parent = hoveredObject.parent;
                    while (parent && parent !== scene) {
                        if (isPosterObject(parent)) {
                            isPoster = true;
                            break;
                        }
                        parent = parent.parent;
                    }
                }
                
                // Update cursor
                if (isScreen || isPoster) {
                    renderer.domElement.style.cursor = 'pointer';
                } else {
                    renderer.domElement.style.cursor = 'default';
                }
            } else {
                renderer.domElement.style.cursor = 'default';
            }
        }
        
        // Mouse click handler
        function onMouseClick(event) {
            if (isAnimating) return;
            
            // Calculate mouse position in normalized device coordinates
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Update raycaster
            raycaster.setFromCamera(mouse, camera);
            
            // Get all meshes in the scene
            const meshes = [];
            scene.traverse(function(object) {
                if (object.isMesh) {
                    meshes.push(object);
                }
            });
            
            // Find intersections
            const intersects = raycaster.intersectObjects(meshes, true);
            
            if (intersects.length > 0) {
                const clickedObject = intersects[0].object;
                
                // Check if it's a screen or poster object (check the mesh or its parent)
                let screenObject = null;
                let posterObject = null;
                
                if (isScreenObject(clickedObject)) {
                    screenObject = clickedObject;
                } else if (clickedObject.parent && isScreenObject(clickedObject.parent)) {
                    screenObject = clickedObject.parent;
                } else {
                    // Check up the hierarchy for screen
                    let parent = clickedObject.parent;
                    while (parent && parent !== scene) {
                        if (isScreenObject(parent)) {
                            screenObject = parent;
                            break;
                        }
                        parent = parent.parent;
                    }
                }
                
                // Use shared function to find poster object (same logic as nav item)
                posterObject = findPosterObject(clickedObject);
                
                if (screenObject) {
                    // Animate camera to screen object and show portfolio
                    // Set "My Projects" nav item as active
                    const navItems = document.querySelectorAll('.nav-item');
                    navItems.forEach(nav => nav.classList.remove('active'));
                    const worksNav = document.getElementById('nav-works');
                    if (worksNav) {
                        worksNav.classList.add('active');
                    }
                    animateCameraToObject(screenObject, { onAnimationComplete: showPortfolio });
                } else if (posterObject) {
                    // Animate camera to poster object and show about me (same animation as nav item)
                    // Set "About me" nav item as active
                    const navItems = document.querySelectorAll('.nav-item');
                    navItems.forEach(nav => nav.classList.remove('active'));
                    const aboutNav = document.getElementById('nav-about');
                    if (aboutNav) {
                        aboutNav.classList.add('active');
                    }
                    animateCameraToObject(posterObject, { onAnimationComplete: showAboutMe });
                }
            }
        }
        
        // Add event listeners
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('click', onMouseClick);
        
        // Close portfolio button
        document.getElementById('portfolio-close-btn').addEventListener('click', hidePortfolio);
        
        // Back button for project detail
        const projectBackBtn = document.getElementById('project-back-btn');
        if (projectBackBtn) {
            projectBackBtn.addEventListener('click', hideProjectDetail);
        }
        
        // Close About Me button
        document.getElementById('about-me-close-btn').addEventListener('click', hideAboutMe);

        // Close Contact button
        document.getElementById('contact-close-btn').addEventListener('click', hideContact);

        // Navigation bar active state management with smooth animations
        const navItems = document.querySelectorAll('.nav-item');
        let currentActiveItem = document.querySelector('.nav-item.active');
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Don't do anything if clicking an already active item
                if (this.classList.contains('active') || this === currentActiveItem) {
                    return;
                }
                
                // Add switching class for ripple effect
                this.classList.add('switching');
                
                // Remove switching class after animation
                setTimeout(() => {
                    this.classList.remove('switching');
                }, 400);
                
                // Animate old active item out
                if (currentActiveItem) {
                    currentActiveItem.classList.remove('active');
                    currentActiveItem.style.animation = 'navItemDeactivate 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                }
                
                // Small delay before activating new item for smoother transition
                setTimeout(() => {
                    // Remove active class from all items
                    navItems.forEach(nav => {
                        nav.classList.remove('active');
                        nav.style.animation = '';
                    });
                    
                    // Add active class to clicked item with animation
                    this.classList.add('active');
                    this.style.animation = 'navItemActive 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                    
                    // Update current active item
                    currentActiveItem = this;
                    
                    // Remove animation style after animation completes
                    setTimeout(() => {
                        this.style.animation = '';
                    }, 500);
                }, 50);
                
                // Close all overlays immediately when switching tabs to prevent overlap
                closeAllOverlaysImmediately();
                
                // Handle navigation actions
                const navId = this.id;
                if (navId === 'nav-home') {
                    // Home action - return to default 3D scene view
                    returnToDefaultView();
                } else if (navId === 'nav-about') {
                    // About me action - first return to default, then animate to poster object
                    // Use faster animation for tab switching (1000ms instead of 2000ms)
                    returnToDefaultView(() => {
                        const posterObject = findPosterObject();
                        if (posterObject) {
                            // Use faster animation for tab switching (1500ms instead of 2500ms)
                            animateCameraToObject(posterObject, { 
                                duration: 1500,
                                onAnimationComplete: showAboutMe 
                            });
                        }
                    }, 1000);
                } else if (navId === 'nav-works') {
                    // My works action - first return to default, then animate to screen object
                    // Use faster animation for tab switching (1000ms instead of 2000ms)
                    returnToDefaultView(() => {
                        if (roomModel) {
                            roomModel.traverse(function(child) {
                                if (isScreenObject(child)) {
                                    // Use faster animation for tab switching (1500ms instead of 2500ms)
                                    animateCameraToObject(child, { 
                                        duration: 1500,
                                        onAnimationComplete: showPortfolio 
                                    });
                                    return;
                                }
                            });
                        }
                    }, 1000);
                } else if (navId === 'nav-settings') {
                    // Contact action - show contact overlay directly
                    showContact();
                }
            });
        });
        
        // ============================================
        // PEN PATH ANIMATION SYSTEM
        // ============================================
        let pen001 = null;
        let penGroup = null;
        let tablet = null;
        let penCurve = null;
        let penPathT = 10;
        let penPathSpeed = 0.0004; // base speed
        let penPathScale = 0.5; // Scale factor for path size (1.0 = normal, 2.0 = double size, 0.5 = half size)
        const penTipOffset = -0.3; // vertical offset from surface so tip doesn't intersect
        const penForwardTilt = 10.4; // radians tilt forward
        const penOffset = new THREE.Vector3(0, 0, 0); // additional per-point offset
        const downRay = new THREE.Raycaster();
        downRay.ray.direction.set(0, -1, 0);
        downRay.far = 1.0;
        let isPenAnimating = true;
        const penGroupPosition = new THREE.Vector3(0, 0.1, 0); // offset for entire pen animation
        // Tilt based on speed variables
        let penCurrentTilt = 0.4; // current tilt value (smoothly interpolated)
        const tiltMin = 0.25;         // nghiêng ít khi chậm (rad)
        const tiltMax = 0.15;        // nghiêng nhiều khi nhanh (rad)
        const rollAmount = 0.01;     // xoay nhẹ theo tangent
        const tiltSmooth = 0.1;     // làm mượt nghiêng
        // Speed range for tilt calculation (based on current speed system)
        const minSpeed = 0.0009;     // minimum speed (0.5 * 0.0018)
        const maxSpeed = 0.00225;    // maximum speed (1.25 * 0.0018)
        // Deceleration with speed variables
        let penCurrentSpeed = 0.0018; // current speed (for deceleration calculation)
        const decelerationRate = 0.08; // deceleration factor (higher = more deceleration)
        const speedSmooth = 1.2;      // smoothing for speed changes
        
        // Store original pen001 position and rotation for reset
        let originalPen001Position = null;
        let originalPen001Rotation = null;
        
        // Function to find Pen001 and tablet in the model
        function initializePenPathAnimation() {
            if (!roomModel) {
                console.warn('Room model not loaded yet');
                return;
            }
            
            // Find Pen001
            let foundPen = null;
            roomModel.traverse(function(child) {
                const name = child.name ? child.name.toLowerCase() : '';
                if (name.includes('pen001') || name.includes('pen_001') || (name.includes('pen') && name.includes('001'))) {
                    foundPen = child;
                }
            });
            
            // Also check in modelObjects
            if (!foundPen && window.modelObjects) {
                const penObj = window.modelObjects.byName['pen001'] || 
                              window.modelObjects.byName['Pen001'] ||
                              window.modelObjects.byName['PEN001'];
                if (penObj) {
                    foundPen = penObj.object;
                }
            }
            
            if (foundPen) {
                pen001 = foundPen;
                
                // Create group if needed
                if (!penGroup) {
                    penGroup = new THREE.Group();
                    penGroup.position.copy(penGroupPosition);
                    scene.add(penGroup);
                }
                
                // Move pen into group so we can offset animation easily
                if (pen001.parent) {
                    pen001.parent.remove(pen001);
                }
                penGroup.add(pen001);
                
                // Store original position and rotation (local to group)
                originalPen001Position = pen001.position.clone();
                originalPen001Rotation = pen001.rotation.clone();
                
                // Update UI status
                const statusEl = document.getElementById('pen001-status');
                const toggleBtn = document.getElementById('pen001-toggle-animation-btn');
                if (statusEl) {
                    statusEl.textContent = isPenAnimating ? 'Status: Animation active' : 'Status: Animation paused';
                }
                if (toggleBtn) {
                    toggleBtn.textContent = isPenAnimating ? 'Pause Animation' : 'Resume Animation';
                }
            } else {
                const statusEl = document.getElementById('pen001-status');
                if (statusEl) {
                    statusEl.textContent = 'Status: Pen001 not found';
                }
                return;
            }
            
            let foundTablet = null;
            roomModel.traverse(function(child) {
                if (child.isMesh) {
                    const name = child.name ? child.name.toLowerCase() : '';
                    if (name.includes('tablet') || name.includes('table') || name.includes('surface') || name.includes('desk')) {
                        foundTablet = child;
                    }
                }
            });
            
            if (foundTablet) {
                tablet = foundTablet;
            } else {
                roomModel.traverse(function(child) {
                    if (child.isMesh && !foundTablet) {
                        const box = new THREE.Box3().setFromObject(child);
                        const size = box.getSize(new THREE.Vector3());
                        if (size.y < size.x * 0.2 && size.y < size.z * 0.2 && size.x > 0.5 && size.z > 0.5) {
                            foundTablet = child;
                        }
                    }
                });
                if (foundTablet) {
                    tablet = foundTablet;
                }
            }
            
            // Create path points on the tablet surface
            if (tablet) {
                const box = new THREE.Box3().setFromObject(tablet);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const fixedX = center.x; // Keep X constant
                const tabletY = center.y + size.y * 0.5 + 0.001; // Tablet top
                
                // Mixed path: straight segments + curved segments
                // Points far apart → straight segment
                // Points that form a "curved plane" → curved segment
                // Base path points (will be scaled)
                const basePts = [
    // đoạn thẳng 1
    new THREE.Vector3(0, 0, -0.3),
    new THREE.Vector3(0, 0, -0.15),
    new THREE.Vector3(0, 0, 0),

    // đoạn cong 1 (đã giảm cong)
    new THREE.Vector3(0,     0, 0.10),
    new THREE.Vector3(0.10,  0, 0.18),
    new THREE.Vector3(0.14,  0, 0.27),
    new THREE.Vector3(0.10,  0, 0.36),
    new THREE.Vector3(0,     0, 0.42),

    // đoạn thẳng 2
    new THREE.Vector3(0, 0, 0.30),
    new THREE.Vector3(0, 0, 0.15),
    new THREE.Vector3(0, 0, 0),

    // đoạn cong 2 (đã giảm cong)
    new THREE.Vector3(-0.08, 0, -0.04),
    new THREE.Vector3(-0.12, 0, -0.12),
    new THREE.Vector3(-0.08, 0, -0.20),
    new THREE.Vector3(0,     0, -0.28) // return
];

                
                // Apply scale and translate to tablet position
                const pts = basePts.map(pt => {
                    const scaledPt = pt.clone().multiplyScalar(penPathScale);
                    return new THREE.Vector3(
                        fixedX + scaledPt.x,
                        tabletY + scaledPt.y,
                        center.z + scaledPt.z
                    );
                });
                
                // Create curve with mixed straight + curved segments
                penCurve = new THREE.CatmullRomCurve3(pts, false); // false = không loop
                penCurve.curveType = 'catmullrom';
                penCurve.tension = 0.5; // mềm tự nhiên hơn
                isPenAnimating = true;
            }
        }
        
        // Function to update pen position along path (based on complete example)
        function updatePenPathAnimation() {
            if (!pen001 || !penCurve || !tablet || !isPenAnimating) return;
            
            // Update t
            // Oscillate speed over time for variation
            const speedFactor = 0.1 + 0.25 * Math.sin(performance.now() * 0.101);
            let targetSpeed = penPathSpeed * (0.5 + speedFactor);
            
            // -------------------------------
            //    DECELERATION WITH SPEED
            // -------------------------------
            
            // Apply deceleration: the faster the pen moves, the more it decelerates
            // Deceleration is proportional to current speed
            const deceleration = penCurrentSpeed * decelerationRate;
            targetSpeed = Math.max(minSpeed, targetSpeed - deceleration);
            
            // Smooth speed changes for realistic acceleration/deceleration
            penCurrentSpeed = THREE.MathUtils.lerp(penCurrentSpeed, targetSpeed, speedSmooth);
            
            // Use the smoothed speed for animation
            const currentSpeed = penCurrentSpeed;
            
            penPathT += currentSpeed;
            penPathT %= 1;
            
            // Apply ease-in/out to parameter for smoother motion
            const easedT = penPathT < 0.5
                ? 2 * penPathT * penPathT
                : 1 - Math.pow(-2 * penPathT + 2, 2) / 2;
            
            // Get point and tangent on curve using eased parameter, then apply optional offset
            const basePos = penCurve.getPointAt(easedT);
            const pos = basePos.clone().add(penOffset);
            const tangent = penCurve.getTangentAt(easedT).clone();
            
            // Cast ray downwards from a little above pen to find real surface normal and distance
            const origin = new THREE.Vector3(pos.x, pos.y + 0.35, pos.z);
            downRay.set(origin, new THREE.Vector3(0, -1, 0));
            const intersects = downRay.intersectObjects([tablet], true);
            
            let surfaceY = pos.y; // fallback
            let surfaceNormal = new THREE.Vector3(0, 1, 0);
            
            if (intersects.length > 0) {
                surfaceY = intersects[0].point.y;
                if (intersects[0].face) {
                    surfaceNormal.copy(intersects[0].face.normal).transformDirection(intersects[0].object.matrixWorld);
                }
            }
            
            // Compute pen orientation based on offset position/tangent
            const lookTarget = new THREE.Vector3().addVectors(pos, tangent);
            lookTarget.y = pos.y;
            pen001.lookAt(lookTarget);
            
            // -------------------------------
            //    TILT BASED ON SPEED
            // -------------------------------
            
            // Tốc độ đã được tính ở bước trước (currentSpeed)
            // Map tốc độ hiện tại sang độ nghiêng
            const clampedSpeed = THREE.MathUtils.clamp(currentSpeed, minSpeed, maxSpeed);
            const speedRatio = (clampedSpeed - minSpeed) / (maxSpeed - minSpeed);
            let tiltFactor = tiltMin + (tiltMax - tiltMin) * speedRatio;
            
            // Làm mượt nghiêng
            penCurrentTilt = THREE.MathUtils.lerp(penCurrentTilt, tiltFactor, tiltSmooth);
            
            // Lấy tangent để biết hướng bút
            const tVec = tangent.clone().normalize();
            
            // 1. Xoay bút theo hướng tangent (roll)
            pen001.rotateOnAxis(tVec, rollAmount);
            
            // 2. Nghiêng bút về phía sau theo tốc độ (pitch)
            pen001.rotateX(-penCurrentTilt);
            
            // Tilt forward (original tilt)
            pen001.rotateX(penForwardTilt);
            
            // Compute tip position
            // Assume tip is along local -Z axis at distance tipLocalDist
            const tipLocalDist = 0.25; // distance from pen pivot to tip along -Z in world units (adjust)
            const localTipVec = new THREE.Vector3(0, 0, -tipLocalDist).applyQuaternion(pen001.quaternion);
            
            // Compute desired pivot.y so that tip.y = surfaceY + penTipOffset
            const desiredPivotY = (surfaceY + penTipOffset) - localTipVec.y;
            
            // Set pen position
            pen001.position.x = pos.x;
            pen001.position.y = desiredPivotY;
            pen001.position.z = pos.z;
        }
        
        // Function to toggle pen animation
        window.togglePenAnimation = function() {
            isPenAnimating = !isPenAnimating;
            return isPenAnimating;
        };
        
        // Function to set pen animation speed
        window.setPenAnimationSpeed = function(speed) {
            penPathSpeed = Math.max(0.0001, Math.min(0.01, speed));
        };
        
        // Function to set pen path scale
        window.setPenPathScale = function(scale) {
            penPathScale = Math.max(0.1, Math.min(5.0, scale));
            // Reinitialize path with new scale
            if (tablet && roomModel) {
                initializePenPathAnimation();
            }
        };
        
        // Set entire pen group (parent) position to move whole animation
        window.setPenGroupPosition = function(x, y, z) {
            penGroupPosition.set(x, y, z);
            if (penGroup) {
                penGroup.position.set(x, y, z);
            }
        };
        
        // Set additional per-point offset (applied inside updatePenPathAnimation)
        window.setPenOffset = function(x, y, z) {
            penOffset.set(x, y, z);
        };
        
        // ============================================
        // MANUAL PEN001 POSITION & ROTATION HELPERS
        // ============================================
        // Set pen001 position
        window.setPen001Position = function(x, y, z) {
            if (!pen001) {
                console.warn('Pen001 not found - cannot set position');
                return false;
            }
            if (x === undefined || y === undefined || z === undefined) {
                console.warn('Invalid position values:', { x, y, z });
                return false;
            }
            pen001.position.set(x, y, z);
            return true;
        };
        
        // Set pen001 rotation using Euler angles (in radians)
        window.setPen001Rotation = function(x, y, z) {
            if (!pen001) {
                console.warn('Pen001 not found - cannot set rotation');
                return false;
            }
            if (x === undefined || y === undefined || z === undefined) {
                console.warn('Invalid rotation values:', { x, y, z });
                return false;
            }
            pen001.rotation.set(x, y, z);
            return true;
        };
        
        // Set pen001 rotation using degrees (converts to radians automatically)
        window.setPen001RotationDegrees = function(x, y, z) {
            if (!pen001) {
                console.warn('Pen001 not found - cannot set rotation');
                return false;
            }
            if (x === undefined || y === undefined || z === undefined) {
                console.warn('Invalid rotation values:', { x, y, z });
                return false;
            }
            const xRad = THREE.MathUtils.degToRad(x);
            const yRad = THREE.MathUtils.degToRad(y);
            const zRad = THREE.MathUtils.degToRad(z);
            pen001.rotation.set(xRad, yRad, zRad);
            return true;
        };
        
        // Set pen001 rotation using radians (alias for setPen001Rotation)
        window.setPen001RotationRadians = function(x, y, z) {
            window.setPen001Rotation(x, y, z);
        };
        
        // Reset pen001 to original position and rotation
        window.resetPen001 = function() {
            if (pen001 && originalPen001Position && originalPen001Rotation) {
                pen001.position.copy(originalPen001Position);
                pen001.rotation.copy(originalPen001Rotation);
            } else {
                console.warn('Pen001 not found or original values not stored');
            }
        };
        
        // Get current pen001 position and rotation
        window.getPen001Transform = function() {
            if (pen001) {
                return {
                    position: {
                        x: pen001.position.x,
                        y: pen001.position.y,
                        z: pen001.position.z
                    },
                    rotation: {
                        x: pen001.rotation.x,
                        y: pen001.rotation.y,
                        z: pen001.rotation.z,
                        xDegrees: THREE.MathUtils.radToDeg(pen001.rotation.x),
                        yDegrees: THREE.MathUtils.radToDeg(pen001.rotation.y),
                        zDegrees: THREE.MathUtils.radToDeg(pen001.rotation.z)
                    }
                };
            } else {
                console.warn('Pen001 not found');
                return null;
            }
        };
        
        // Set pen001 transform (position and rotation) at once
        window.setPen001Transform = function(position, rotation) {
            if (!pen001) {
                console.warn('Pen001 not found');
                return;
            }
            
            if (position) {
                pen001.position.set(position.x, position.y, position.z);
            }
            
            if (rotation) {
                if (rotation.x !== undefined) {
                    // Assume radians if rotationDegrees not provided
                    pen001.rotation.set(rotation.x, rotation.y, rotation.z);
                }
            }
            
        };
        
        // Set pen001 transform using degrees for rotation
        window.setPen001TransformDegrees = function(position, rotationDegrees) {
            if (!pen001) {
                console.warn('Pen001 not found');
                return;
            }
            
            if (position) {
                pen001.position.set(position.x, position.y, position.z);
            }
            
            if (rotationDegrees) {
                const xRad = THREE.MathUtils.degToRad(rotationDegrees.x);
                const yRad = THREE.MathUtils.degToRad(rotationDegrees.y);
                const zRad = THREE.MathUtils.degToRad(rotationDegrees.z);
                pen001.rotation.set(xRad, yRad, zRad);
            }
            
        };
        
        // Start animation immediately - don't wait for HDRI
        // Function to update camera information display
        function updateCameraInfo() {
            // Get camera position
            const posX = document.getElementById('cam-pos-x');
            const posY = document.getElementById('cam-pos-y');
            const posZ = document.getElementById('cam-pos-z');
            
            // Get camera rotation (convert to degrees)
            const rotX = document.getElementById('cam-rot-x');
            const rotY = document.getElementById('cam-rot-y');
            const rotZ = document.getElementById('cam-rot-z');
            
            // Get camera target (controls.target)
            const targetX = document.getElementById('cam-target-x');
            const targetY = document.getElementById('cam-target-y');
            const targetZ = document.getElementById('cam-target-z');
            
            if (posX && posY && posZ) {
                posX.textContent = camera.position.x.toFixed(2);
                posY.textContent = camera.position.y.toFixed(2);
                posZ.textContent = camera.position.z.toFixed(2);
            }
            
            if (rotX && rotY && rotZ) {
                // Get camera rotation from quaternion or euler
                const euler = new THREE.Euler().setFromQuaternion(camera.quaternion);
                rotX.textContent = THREE.MathUtils.radToDeg(euler.x).toFixed(2) + '°';
                rotY.textContent = THREE.MathUtils.radToDeg(euler.y).toFixed(2) + '°';
                rotZ.textContent = THREE.MathUtils.radToDeg(euler.z).toFixed(2) + '°';
            }
            
            if (targetX && targetY && targetZ) {
                targetX.textContent = controls.target.x.toFixed(2);
                targetY.textContent = controls.target.y.toFixed(2);
                targetZ.textContent = controls.target.z.toFixed(2);
            }
        }
        
        function animate() {
            requestAnimationFrame(animate);
            
            // Update video texture if it exists
            if (window.screenVideo && window.screenVideoTexture) {
                if (window.screenVideo.readyState >= window.screenVideo.HAVE_CURRENT_DATA) {
                    window.screenVideoTexture.needsUpdate = true;
                }
            }
            
            // Update camera information display
            updateCameraInfo();
            
            // Update pen path animation
            updatePenPathAnimation();
            
            // Prevent duplicate model additions in render loop
            if (roomModel && !isModelInScene) {
                // Check if model is not in scene
                if (!scene.children.includes(roomModel) && roomModel.parent !== scene) {
                    // Only add if not already in scene
                    if (roomModel.parent) {
                        roomModel.parent.remove(roomModel);
                    }
                    scene.add(roomModel);
                    isModelInScene = true;
                } else if (roomModel.parent === scene) {
                    isModelInScene = true;
                }
            }
            
            // Hover state for screen and desktop objects (grouped)
            if (roomModel && !isAnimating) {
                raycaster.setFromCamera(mouse, camera);
                
                let foundScreen = false;
                let hoveredObject = null;
                
                // Check if hovering over any screen/desktop object in the group
                if (screenDesktopGroup && screenDesktopGroup.userData && screenDesktopGroup.userData.screenObjects) {
                    const screenObjects = screenDesktopGroup.userData.screenObjects;
                    for (let screen of screenObjects) {
                        const intersects = raycaster.intersectObject(screen, true);
                        if (intersects.length > 0) {
                            foundScreen = true;
                            hoveredObject = screenDesktopGroup; // Use group as hovered object for unified effect
                            break;
                        }
                    }
                }
                
                // Fallback: Check individual screen/desktop objects if group not found
                if (!foundScreen) {
                    const screenObjects = getScreenObjects();
                    for (let screen of screenObjects) {
                        const intersects = raycaster.intersectObject(screen, true);
                        if (intersects.length > 0) {
                            foundScreen = true;
                            hoveredObject = screen;
                            break;
                        }
                    }
                }
                
                if (foundScreen && hoveredObject) {
                    if (!isHoveringScreen || hoveredScreenObject !== hoveredObject) {
                        // Just started hovering or switched to different object
                        isHoveringScreen = true;
                        hoveredScreenObject = hoveredObject;
                        
                        // Get objects to apply hover effect to
                        let objectsToScale = [];
                        
                        if (hoveredObject === screenDesktopGroup && hoveredObject.userData && hoveredObject.userData.screenObjects) {
                            // If hovering over group, apply to all objects in group
                            objectsToScale = hoveredObject.userData.screenObjects;
                        } else {
                            // If hovering over individual object, just that object
                            objectsToScale = [hoveredObject];
                        }
                        
                        // Apply scale to all objects and their child meshes
                        objectsToScale.forEach(function(obj) {
                            obj.traverse(function(child) {
                                if (child.isMesh) {
                                    // Save original scale if not already saved
                                    if (!screenOriginalScale.has(child)) {
                                        screenOriginalScale.set(child, child.scale.clone());
                                    }
                                    
                                    // Scale up - same hover effect for both screen and desktop/display objects
                                    const scaleFactor = 1.03; // 3% increase - same for screen and display objects
                                    const originalScale = screenOriginalScale.get(child);
                                    child.scale.set(
                                        originalScale.x * scaleFactor,
                                        originalScale.y * scaleFactor,
                                        originalScale.z * scaleFactor
                                    );
                                }
                            });
                        });
                    }
                } else {
                    if (isHoveringScreen && hoveredScreenObject) {
                        // No longer hovering
                        isHoveringScreen = false;
                        
                        // Get objects to restore
                        let objectsToRestore = [];
                        
                        if (hoveredScreenObject === screenDesktopGroup && hoveredScreenObject.userData && hoveredScreenObject.userData.screenObjects) {
                            // If was hovering over group, restore all objects in group
                            objectsToRestore = hoveredScreenObject.userData.screenObjects;
                        } else {
                            // If was hovering over individual object, just that object
                            objectsToRestore = [hoveredScreenObject];
                        }
                        
                        // Restore original scale
                        objectsToRestore.forEach(function(obj) {
                            obj.traverse(function(child) {
                                if (child.isMesh && screenOriginalScale.has(child)) {
                                    const originalScale = screenOriginalScale.get(child);
                                    child.scale.copy(originalScale);
                                }
                            });
                        });
                        
                        hoveredScreenObject = null;
                    }
                }
                
                // Hover state for poster objects
                let foundPoster = false;
                let hoveredPoster = null;
                
                // Check if hovering over any poster object
                const posterObjects = getPosterObjects();
                for (let poster of posterObjects) {
                    const intersects = raycaster.intersectObject(poster, true);
                    if (intersects.length > 0) {
                        foundPoster = true;
                        hoveredPoster = poster;
                        break;
                    }
                }
                
                if (foundPoster && hoveredPoster) {
                    if (!isHoveringPoster || hoveredPosterObject !== hoveredPoster) {
                        isHoveringPoster = true;
                        hoveredPosterObject = hoveredPoster;
                        
                        // Apply scale to poster object and its child meshes
                        hoveredPoster.traverse(function(child) {
                            if (child.isMesh) {
                                // Save original scale if not already saved
                                if (!posterOriginalScale.has(child)) {
                                    posterOriginalScale.set(child, child.scale.clone());
                                }
                                
                                // Scale up - same hover effect as screen/desktop objects
                                const scaleFactor = 1.03; // 3% increase - consistent with screen/desktop
                                const originalScale = posterOriginalScale.get(child);
                                child.scale.set(
                                    originalScale.x * scaleFactor,
                                    originalScale.y * scaleFactor,
                                    originalScale.z * scaleFactor
                                );
                            }
                        });
                    }
                } else {
                    if (isHoveringPoster && hoveredPosterObject) {
                        // No longer hovering
                        isHoveringPoster = false;
                        
                        // Restore original scale
                        hoveredPosterObject.traverse(function(child) {
                            if (child.isMesh && posterOriginalScale.has(child)) {
                                const originalScale = posterOriginalScale.get(child);
                                child.scale.copy(originalScale);
                            }
                        });
                        
                        hoveredPosterObject = null;
                    }
                }
            }
            
            if (!isAnimating) {
                controls.update();
            }
            renderer.render(scene, camera);
        }
        animate();

        // Load HDRI asynchronously after initial render
        let currentEnvMap = null;
        let currentTexture = null;
        let envMapRotation = 0;
        let envMapStrength = 0.4;
        let worldOpacity = 1.4;
        
        // Function to apply environment map to room model
        function applyEnvMapToRoom(envMap) {
            if (roomModel) {
                roomModel.traverse(function(child) {
                    if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                                    mat.envMap = envMap;
                                    mat.envMapIntensity = envMapStrength;
                                    mat.needsUpdate = true;
                                }
                            });
                        } else {
                            if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                                child.material.envMap = envMap;
                                child.material.envMapIntensity = envMapStrength;
                                child.material.needsUpdate = true;
                            }
                        }
                    }
                });
            }
        }
        
        // Set temporary background while HDRI loads
        scene.background = new THREE.Color(0x1a1a2e);
        
        // Function to downsample texture for faster processing
        function downsampleTexture(texture, maxSize = 2048) {
            const image = texture.image;
            if (image.width <= maxSize && image.height <= maxSize) {
                return texture;
            }
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const ratio = Math.min(maxSize / image.width, maxSize / image.height);
            canvas.width = Math.floor(image.width * ratio);
            canvas.height = Math.floor(image.height * ratio);
            
            // For EXR, we need to handle HDR data differently
            // Create a new texture with downsampled size
            const newTexture = texture.clone();
            // Note: This is a simplified approach - full EXR downsampling would need more complex handling
            return texture; // Return original for now, but we'll optimize PMREM instead
        }
        
        // Load HDRI after a short delay to allow scene to render first
        setTimeout(() => {
            const loadingEl = document.getElementById('loading');
            
            // Optimize PMREM generator with lower resolution for faster processing
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            // Use lower resolution for faster generation (256 instead of default 1024)
            pmremGenerator.compileEquirectangularShader();
            
            const exrLoader = new EXRLoader();
            const rgbeLoader = new RGBELoader();

            // Always set RoomEnvironment as base so scene is never dark
            renderer.toneMapping = THREE.NeutralToneMapping;
            renderer.toneMappingExposure = 0.5;
            const roomEnv = new RoomEnvironment(0.8); // neutral lighting
            const roomEnvMap = pmremGenerator.fromScene(roomEnv).texture;
            scene.environment = roomEnvMap;
            scene.background = new THREE.Color(0x1a1f2e);
            roomEnv.dispose();

            // Function to update environment map
            function updateEnvironmentMap(texture) {
                if (currentTexture) {
                    currentTexture.dispose();
                }
                
                currentTexture = texture;
                
                // Apply rotation
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeRotationY(envMapRotation);
                texture.matrixAutoUpdate = false;
                texture.matrix.copy(rotationMatrix);
                
                // Use requestIdleCallback or setTimeout to avoid blocking
                const processEnvMap = () => {
                    // Downsample texture if too large (4K is very large)
                    let processedTexture = texture;
                    if (texture.image && (texture.image.width > 2048 || texture.image.height > 2048)) {
                        // Create a smaller canvas for faster processing
                        const maxSize = 2048;
                        const ratio = Math.min(maxSize / texture.image.width, maxSize / texture.image.height);
                        if (ratio < 1) {
                            // For EXR, we'll process at full size but use lower PMREM resolution
                            // The actual downsampling would require more complex EXR handling
                            processedTexture = texture;
                        }
                    }
                    
                    // Convert to PMREM - this is the slowest part
                    // PMREMGenerator will handle the conversion efficiently
                    const envMap = pmremGenerator.fromEquirectangular(processedTexture).texture;
                    currentEnvMap = envMap;
                    
                    // Set environment map for scene
                    scene.environment = envMap;
                    
                    // Set background with opacity
                    if (worldOpacity > 0) {
                        scene.background = envMap;
                        scene.backgroundIntensity = worldOpacity;
                    } else {
                        scene.background = new THREE.Color(0x000000);
                    }
                    
                    // Update all materials
                    scene.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                                        mat.envMap = envMap;
                                        mat.envMapIntensity = envMapStrength;
                                        mat.needsUpdate = true;
                                    }
                                });
                            } else {
                                if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                                    child.material.envMap = envMap;
                                    child.material.envMapIntensity = envMapStrength;
                                    child.material.needsUpdate = true;
                                }
                            }
                        }
                    });
                    
                    // Also apply to room model specifically
                    applyEnvMapToRoom(envMap);
                    
                    // Mark environment as loaded
                    window.assetsLoaded.environment = true;
                    // Check if we can hide loading screen
                    window.hideLoadingScreen();
                    
                    // Clean up
                    pmremGenerator.dispose();
                };
                
                // Process in next frame to avoid blocking
                if (window.requestIdleCallback) {
                    requestIdleCallback(processEnvMap, { timeout: 1000 });
                } else {
                    setTimeout(processEnvMap, 0);
                }
            }
            
            // Warm sunset HDR disabled — using neutral RoomEnvironment only
            if (false) {
            const startTime = performance.now();
            rgbeLoader.load('https://res.cloudinary.com/dedvqh5jb/raw/upload/v1775811442/warm_sunset.hdr', function(texture) {
                const loadTime = performance.now() - startTime;
                console.log(`HDRI loaded in ${loadTime.toFixed(0)}ms`);
                updateEnvironmentMap(texture);
            }, function(progress) {
                // Progress callback if available
                if (progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    const loadingText = document.querySelector('#loading div:last-child');
                    if (loadingText) {
                        loadingText.textContent = `Loading... ${percent}%`;
                    }
                }
            }, function(error) {
                // Fallback lighting when EXR fails to load
                console.warn('EXR failed, using fallback lighting');
                // Switch to simpler tone mapping so lights appear bright
                renderer.toneMapping = THREE.LinearToneMapping;
                renderer.toneMappingExposure = 1.8;
                // Strong ambient light to fill the whole scene
                const ambientLight = new THREE.AmbientLight(0xffffff, 3.0);
                scene.add(ambientLight);
                // Key light
                const dirLight = new THREE.DirectionalLight(0xffffff, 4.0);
                dirLight.position.set(5, 10, 7);
                scene.add(dirLight);
                // Fill light
                const dirLight2 = new THREE.DirectionalLight(0xffd5a8, 2.5);
                dirLight2.position.set(-5, 5, -5);
                scene.add(dirLight2);
                // Back light
                const dirLight3 = new THREE.DirectionalLight(0xa8d5ff, 1.5);
                dirLight3.position.set(0, -5, -10);
                scene.add(dirLight3);
                // Hemisphere light for natural sky/ground color
                const hemiLight = new THREE.HemisphereLight(0xffeebb, 0x444422, 2.0);
                scene.add(hemiLight);
                window.assetsLoaded.environment = true;
                window.hideLoadingScreen();
            });
            } // end if(false) — warm HDR disabled
            window.assetsLoaded.environment = true;
            window.hideLoadingScreen();
        }, 50); // Small delay to allow initial render

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
