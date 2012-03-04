function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
  }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
}
	
/////////////////////////

var Audio = (function () {	
	var me = {},
	
		context = null,
		bufferList = null,
		bufferLoader = null,
		sampleBuffer = null,
		panner = null;

	function finishedLoading(list) {
	  bufferList = list;
	}

 	me.playSample = function(ranNum, x, y, mag) {
		var gainNode = context.createGainNode();
		var filter = context.createBiquadFilter();
		var source = context.createBufferSource();

		source.buffer = bufferList[ranNum];
		
		// Create the audio graph.
		source.connect(gainNode);
		gainNode.connect(filter);
		filter.connect(panner);
		panner.connect(context.destination);
		
		gainNode.gain.value = (mag / 12) + 0.2;
		
		filter.type = 0; // Low-pass filter. See BiquadFilterNode docs
		filter.frequency.value = (mag * 1000) + 50;
		panner.setPosition(x, y, 0);
		
		source.noteOn(0);
	}

	me.init = function() {
  		try {
	    	context = new webkitAudioContext();
	  	}
	  	catch(e) {
	    	alert('Web Audio API is not supported in this browser.');
	  	}
	
		try {
			bufferLoader = new BufferLoader(
			    context,
			    [
			      '../samples/banjo_b1.wav',
			      '../samples/banjo_d1.wav',
			      '../samples/banjo_d2.wav',
				  '../samples/banjo_g1.wav',
				  '../samples/banjo_g2.wav',
			    ],
			    finishedLoading
		    );

		  	bufferLoader.load();
		}
		catch(e) {
			alert('Buffer Loader Error.');
		}
		
		panner = context.createPanner();
		
	}
	
	return me;
}());

Audio.init();