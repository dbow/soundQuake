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
      _camera;
      
  function _setCubeHeight(cube, scale) {
    /*
cube.geometry.dynamic = true;
    cube.geometry.__dirtyVertices = true;
    cube.geometry.vertices[0].y = 100 * scale;
    cube.geometry.vertices[1].y = 100 * scale;
    cube.geometry.vertices[4].y = 100 * scale;
    cube.geometry.vertices[5].y = 100 * scale;
*/
    
    cube.position.y = CUBE_HEIGHT * scale / 2;
    cube.scale.y = scale;
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
          
        cube.position.x = (i - parseInt(PLANE_WIDTH / 2, 10)) * (width + 2);
        cube.position.z = (j - parseInt(PLANE_HEIGHT / 2, 10)) * (depth + 2);
        
        //_setCubeHeight(cube, 1 - (i + j) / (PLANE_WIDTH + PLANE_HEIGHT));
          
        _scene.add(cube);
        _plane[i][j] = {magnitude: 1, mesh: cube}
      }
    }
      
    mycube = cube;
    //cube.rotation.y = 0.5;
    
    // add the cube to the scene
    
    // create a point light
    var pointLight =
      new THREE.PointLight(0xFFFFFF);
    
    // set its position
    pointLight.position.x = 10;
    pointLight.position.y = 50;
    pointLight.position.z = 130;
    
    // add to the scene
    _scene.add(pointLight);
    
    //hardcode
    _quakes.push({
      mag: 1,
      radius: 0,
      posX: 10,
      posY: 10
    });
    
    me.tick();
  };
  
  me.tick = function () {
    var quakes;
  
    if (me.play) {
      requestAnimationFrame(me.tick);
    }
    
    for (var i = 0, l = _quakes.length; i < l; i++) {
      quake = _quakes[i];
    }
    
    me.render();
  };
  
  me.render = function () {
    // draw!
    _renderer.render(_scene, _camera);
  };

  return me;
}());

Visual.init();