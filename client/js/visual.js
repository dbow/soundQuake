/**
 * Visual
 * Module handling the 3d visual functionality for the application.
 */
var Visual = (function () {

    var me = {},

        WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight,
        HALF_WIDTH = WIDTH / 2,
        HALF_HEIGHT = HEIGHT / 2,
        PLANE_WIDTH = 30,
        PLANE_HEIGHT = 30,

        CUBE_HEIGHT = 50,
        CUBE_WIDTH = 20,

        _plane = [],
        _quakes = [],
        _group,
        _scene,
        _renderer,
        _camera,

        _tick = 0,
        _mouseX = 0, _mouseY = 0,
        _cameraX = 0, _cameraY = 0,
        _cameraDistance = HEIGHT,

        _cameraMove = false,
        _cameraZoom = false,
        _running = false,

        _colorSchemes = [
            [0x003AEC, 0x001440, 0x000074],
            [0xA3FFDC, 0xD9EF30, 0xB7D264],
            [0xE3E3E3, 0xCACACA, 0xB5B5B5],
            [0xFF5713, 0xC97DBF, 0xEB9A8B],
            [0xCED06C, 0xFFAA00, 0xE28D00]
        ];

    // create the cube's material
    var _cubeMaterial1 =
            new THREE.MeshPhongMaterial(
                {
                    //color: pixel[2] | (pixel[1] << 8) | (pixel[0] << 16)
                    //color: 0xCC0000
                    //color: 247 | 164 << 8
                    color: 0x003AEC
                }),
        _cubeMaterial2 = new THREE.MeshPhongMaterial({
            //color: 48 | 136 << 8 | 42 << 16
            color: 0x001440
        }),
        _cubeMaterial3 = new THREE.MeshPhongMaterial({
            //color: 120 | 102 << 8 | 0 << 16
            color: 0x000074
        }),
        _cubeMaterial4 = new THREE.MeshPhongMaterial({
            color: 0xffffff
        });

    function _setCubeHeight (cube, scale) {

        /*
         cube.geometry.dynamic = true;
         cube.geometry.__dirtyVertices = true;
         cube.geometry.vertices[0].y = 100 * scale;
         cube.geometry.vertices[1].y = 100 * scale;
         cube.geometry.vertices[4].y = 100 * scale;
         cube.geometry.vertices[5].y = 100 * scale;
         */
        cube.position.y = CUBE_HEIGHT * scale / 2 + CUBE_HEIGHT / 2;
        cube.scale.y = scale + 1;
        //cube.translateY(CUBE_HEIGHT * scale / 2 + CUBE_HEIGHT / 2);
    }

    function _addMag (x, y, quake, epi) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (x >= 0 && x < PLANE_WIDTH && y >= 0 && y < PLANE_HEIGHT) {

            var cube = _plane[x][y],
                magDiff;

            /*
             if (epi) {
             cube.mesh.material.color.setRGB(255,255,255);
             console.log(cube);
             }
             */

            if (!quake.cells[x + ' ' + y]) {
                if (cube.mag < 1) {
                    magDiff = 1 - cube.mag;
                    cube.mag += quake.mag * magDiff;
                }
                quake.cells[x + ' ' + y] = 1;
            }

        }
    }

    function _drawQuake (quake) {

        var radius = quake.radius,
            f = radius - 1,
            ddF_x = 1,
            ddF_y = -2 * radius,
            x = 0,
            y = radius,
            x0 = quake.x,
            y0 = quake.y;

        if (quake.radius === 0) {
            _addMag(x0, y0, quake, true);
        }
        else {
            _addMag(x0, y0 + radius, quake);
            _addMag(x0, y0 - radius, quake);
            _addMag(x0 + radius, y0, quake);
            _addMag(x0 - radius, y0, quake);
        }

        //_plane[x0 - radius][y0].mag += quake;

        while (x < y) {

            if (f >= 0) {
                y--;
                ddF_y += 2;
                f += ddF_y;
            }

            x++;
            ddF_x += 2;
            f += ddF_x;

            _addMag(x0 + x, y0 + y, quake);
            _addMag(x0 - x, y0 + y, quake);
            _addMag(x0 + x, y0 - y, quake);
            _addMag(x0 - x, y0 - y, quake);
            _addMag(x0 + y, y0 + x, quake);
            _addMag(x0 - y, y0 + x, quake);
            _addMag(x0 + y, y0 - x, quake);
            _addMag(x0 - y, y0 - x, quake);
        }

        quake.mag -= 0.010;
        quake.radius += 0.25;

    }

    function _mousemove (event) {

        _mouseX = event.clientX - HALF_WIDTH;
        _mouseY = event.clientY - HALF_HEIGHT;

    }

    function _setCamera () {

        _camera.position.z = _cameraDistance * Math.sin(_cameraY * 0.004);
        _camera.rotation.x = _cameraY * (Math.PI / HEIGHT) - Math.PI / 2;

        _camera.position.y = _cameraDistance * Math.cos(_cameraY * 0.004);

        _camera.position.x = _cameraDistance * Math.sin(_cameraX * 0.003);
        _camera.rotation.y = _cameraX * Math.PI / WIDTH / 2;

    }

    me.getBounds = function () {

        return {
            x: PLANE_WIDTH,
            y: PLANE_HEIGHT
        };

    };

    me.selectColorScheme = function (colorSchemeId) {

        var scheme = _colorSchemes[colorSchemeId - 1];
        _cubeMaterial1.color.setHex(scheme[0]);
        _cubeMaterial2.color.setHex(scheme[1]);
        _cubeMaterial3.color.setHex(scheme[2]);

    };

    me.init = function () {

        // set some camera attributes
        var VIEW_ANGLE = 45,
            ASPECT = WIDTH / HEIGHT,
            NEAR = 0.1,
            FAR = 10000;

        // get the DOM element to attach to
        // - assume we've got jQuery to hand
        var $container = $('#visual');

        $container.on('mousemove', _mousemove);

        // create a WebGL renderer, camera
        // and a scene
        _renderer = new THREE.WebGLRenderer();
        _camera =
            new THREE.PerspectiveCamera(
                VIEW_ANGLE,
                ASPECT,
                NEAR,
                FAR);

        _scene = new THREE.Scene();
        _group = new THREE.Object3D();

        // the camera starts at 0,0,0
        // so pull it back
        /*
         _camera.position.z = 300;
         _camera.position.y = 100;
         _camera.position.x = 300;

         _camera.rotation.x = -0.1;
         _camera.rotation.y = 0.8;
         */

        _camera.position.z = 0;
        _camera.position.y = HEIGHT;
        _camera.position.x = 0;

        _camera.rotation.x = -Math.PI / 2;

        // start the renderer
        _renderer.setSize(WIDTH, HEIGHT);

        // attach the render-supplied DOM element
        $container.append(_renderer.domElement);


        // set up cube size
        var height = 50,
            width = 19,
            depth = 19,
            cube,
            func,
            pixel;

        // create the plane
        for (var i = 0; i < PLANE_WIDTH; i++) {

            _plane[i] = [];

            for (var j = 0; j < PLANE_HEIGHT; j++) {

                pixel = pixels[j * (PLANE_WIDTH + 10) + i];

                if (pixel[1] === 164) {
                    func = _cubeMaterial1;
                }
                else if (pixel[1] === 136) {
                    func = _cubeMaterial2;
                }
                else {
                    func = _cubeMaterial3;
                }

                // create a new mesh with cube geometry
                cube = new THREE.Mesh(

                    new THREE.CubeGeometry(
                        width,
                        height,
                        depth),

                    func);

                cube.position.x = (i - parseInt(PLANE_WIDTH / 2, 10)) * (CUBE_WIDTH);
                cube.position.z = (j - parseInt(PLANE_HEIGHT / 2, 10)) * (CUBE_WIDTH);
                cube.position.y = CUBE_HEIGHT / 2;

                //cube.dynamic = true;
                //cube.translateY(CUBE_HEIGHT / 2);
                //_setCubeHeight(cube, 1 - (i + j) / (PLANE_WIDTH + PLANE_HEIGHT));

                _group.add(cube);
                _plane[i][j] = {
                    mag: 0,
                    time: 0,
                    mesh: cube,
                    quakes: {},
                    oldMaterial: func
                };

            }
        }

        // add the cube to the scene

        // create a point light
        var pointLight = new THREE.PointLight(0xFFFFFF);

        // set its position
        pointLight.position.x = 10;
        pointLight.position.y = 300;
        pointLight.position.z = 130;

        // add to the scene
        _group.add(pointLight);

        _scene.add(_group);

        me.start();
        me.tick();

    };

    me.tick = function () {

        var quakes = [],
            quake,
            cube,
            i,
            l,
            j;

        if (true || _running) {
            requestAnimationFrame(me.tick);
        }

        if (_running) {
            if (_tick % 3 === 0) {

                for (i = 0, l = _quakes.length; i < l; i++) {

                    quake = _quakes[i];

                    if (quake.mag > 0 && quake.radius < PLANE_WIDTH) {
                        quakes.push(quake);
                    }

                    _drawQuake(quake);
                }
                _quakes = quakes;

            }

            for (i = 0; i < PLANE_WIDTH; i++) {

                for (j = 0; j < PLANE_WIDTH; j++) {
                    cube = _plane[i][j];

                    if (cube.mag > 0) {
                        _setCubeHeight(cube.mesh, Math.sin(cube.time / 20) * cube.mag);
                        cube.mag -= 0.002;
                        cube.time++;
                    }
                    else {
                        cube.time = 0;
                    }

                    if (cube.epi >= 0 && cube.time - cube.epi > 50) {
                        cube.mesh.material = cube.oldMaterial;
                        cube.epi = 0;
                    }
                }

            }

            _tick++;
        }

        me.render();

    };

    me.addQuake = function (mag, x, y) {

        var index = _plane[Math.floor(x)],
            cube,
            posX,
            posY,
            randomNumber;

        if (index) {
            cube = index[Math.floor(y)];
        }

        if (cube) {

            cube.mesh.material = _cubeMaterial4;
            cube.epi = cube.time;

            _quakes.push({
                mag: mag,
                radius: 0,
                x: x,
                y: y,
                cells: {}
            });

            posX = ((x / me.getBounds().x) * 2) - 1;
            posY = ((y / me.getBounds().y) * 2) - 1;
            randomNumber = Math.floor( Math.random() * 5 );

            Audio.playSample(randomNumber, posX, posY, mag);

        }

    };

    me.render = function () {

        //linear
        if (_cameraMove) {
            /*
             _cameraX = _mouseX;
             _cameraY = _mouseY;
             _setCamera();
             */

            _group.rotation.x = Math.PI * (_mouseY / HEIGHT);
            _group.rotation.z = Math.PI * (_mouseX / WIDTH);

        } else if (_cameraZoom) {
            _cameraDistance = (_mouseY + HALF_HEIGHT) * 2;
            _setCamera();
        }

        //_camera.position.y += 600 * Math.cos(_mouseY * 0.008 - (_camera.position.y / 600));
        //_camera.position.z += Math.sin(_mouseY * 0.008);
        //_camera.rotation.x = _mouseY * (Math.PI / HALF_HEIGHT) - Math.PI / 2;
        //mycamera = _camera;
        //_camera.lookAt(_scene.position);

        _renderer.render(_scene, _camera);

    };

    me.start = function () {

        var cube,
            i,
            j;

        if (_running !== true) {

            _quakes = [];

            for (i = 0; i < PLANE_WIDTH; i++) {
                for (j = 0; j < PLANE_WIDTH; j++) {
                    cube = _plane[i][j];
                    _setCubeHeight(cube.mesh, 0);
                    cube.mag = 0
                    cube.time = 0;
                    cube.mesh.material = cube.oldMaterial;
                    cube.epi = 0;
                }
            }

            _running = true;
            //me.tick();
        }
    };

    me.play = function () {
        _running = true;
    };

    me.stop = function () {
        _running = false;
    };

    me.resetBoth = function () {
        _cameraZoom = false;
        _cameraMove = false;
    };

    me.toggleCameraMove = function () {
        _cameraZoom = false;
        return _cameraMove = !_cameraMove;
    };

    me.startCameraMove = function () {
        _cameraMove = true;
    };
    me.stopCameraMove = function () {
        _cameraMove = false;
    };

    me.toggleCameraZoom = function () {
        _cameraMove = false;
        return _cameraZoom = !_cameraZoom;
    };

    return me;

}());

Visual.init();
