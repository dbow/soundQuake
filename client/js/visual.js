var Visual = (function () {
  var me = {},
  
      WIDTH = window.innerWidth,
      HEIGHT = window.innerHeight,
      PLANE_WIDTH = 20,
      PLANE_HEIGHT = 20,
      
      CUBE_HEIGHT = 50,
      CUBE_WIDTH = 20,
  
      _plane = [],
      _quakes = [],
      _scene,
      _renderer,
      _camera,
      
      _tick = 0;
      
  function _setCubeHeight(cube, scale) {
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
  }
  
  function _addMag(x, y, quake) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x > 0 && x < PLANE_WIDTH && y > 0 && y < PLANE_HEIGHT) {
      var cube = _plane[x][y];
      if (!quake.cells[x + ' ' + y]) {
        cube.mag += quake.mag;
        quake.cells[x + ' ' + y] = 1;
      }
    }
  }
  
  function _drawQuake(quake) {
    var radius = quake.radius,
        f = radius - 1,
        ddF_x = 1,
        ddF_y = -2 * radius,
        x = 0,
        y = radius,
        x0 = quake.x,
        y0 = quake.y;
        
    if (quake.radius === 0) {
      _addMag(x0, y0, quake);
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
    
    quake.mag -= 0.015;
    quake.radius += 0.5;
  }
  
  me.init = function () {
    // set some camera attributes
    var VIEW_ANGLE = 45,
        ASPECT = WIDTH / HEIGHT,
        NEAR = 0.1,
        FAR = 10000;
    
    // get the DOM element to attach to
    // - assume we've got jQuery to hand
    var $container = $('#visual');
    
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
    
    // the camera starts at 0,0,0
    // so pull it back
    _camera.position.z = 300;
    _camera.position.y = 100;
    _camera.position.x = 300;
    
    _camera.rotation.x = -0.1;
    _camera.rotation.y = 0.8;
    mycamera = _camera;
    
    // start the renderer
    _renderer.setSize(WIDTH, HEIGHT);
    
    // attach the render-supplied DOM element
    $container.append(_renderer.domElement);
    
    
    // set up cube size
    var height = 50,
        width = 20,
        depth = 20,
        cube;
        
    // create the cube's material
    var cubeMaterial =
      new THREE.MeshPhongMaterial(
        {
          color: 0xCC0000
        });
    
    // create the plane
    for (var i = 0; i < PLANE_WIDTH; i++) {
      _plane[i] = [];
      for (var j = 0; j < PLANE_HEIGHT; j++) {
      
        // create a new mesh with cube geometry
        cube = new THREE.Mesh(
        
          new THREE.CubeGeometry(
            width,
            height,
            depth),
        
          cubeMaterial);
          
        cube.position.x = (i - parseInt(PLANE_WIDTH / 2, 10)) * (width);
        cube.position.z = (j - parseInt(PLANE_HEIGHT / 2, 10)) * (depth);
        cube.position.y = CUBE_HEIGHT / 2;
        
        //_setCubeHeight(cube, 1 - (i + j) / (PLANE_WIDTH + PLANE_HEIGHT));
          
        _scene.add(cube);
        _plane[i][j] = {mag: 0, time: 0, mesh: cube, quakes: {}}
      }
    }
      
    mycube = cube;
    
    // add the cube to the scene
    
    // create a point light
    var pointLight = new THREE.PointLight(0xFFFFFF);
    
    // set its position
    pointLight.position.x = 10;
    pointLight.position.y = 300;
    pointLight.position.z = 130;
    
    // add to the scene
    _scene.add(pointLight);
    
    //hardcode    
    me.addQuake(1, 20, 0);
    me.addQuake(1, 0, 20);
    
    me.play = true;
    me.tick();
  };
  
  me.tick = function () {
    var quakes = [],
        quake,
        cube,
        i, j;
  
    if (me.play) {
      requestAnimationFrame(me.tick);
    }
    
    if (_tick % 10 === 0) {
      for (var i = 0, l = _quakes.length; i < l; i++) {
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
        _setCubeHeight(cube.mesh, Math.sin(cube.time / 20) * cube.mag);
        if (cube.mag > 0) {
          cube.mag -= 0.001;
          cube.time++;
        }
        else {
          cube.time = 0;
        }
      }
    }
    
    _tick++;
    
    me.render();
  };
  
  me.addQuake = function (mag, x, y) {
    _quakes.push({
      mag: mag,
      radius: 0,
      x: x,
      y: y,
      cells: {}
    });
  };
  
  me.render = function () {
    _renderer.render(_scene, _camera);
  };

  return me;
}());

Visual.init();