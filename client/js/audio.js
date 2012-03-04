var BufferLoader = (function () {

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

}());

var Audio = (function () {
	var me = {},
	
		context = null,
		bufferList,
		bufferLoader,
		sampleBuffer = null;

	function _finishedLoading(bufferList) {
	  bufferList = bufferList;
	}

	playSample() = function () {
		var source - context.createBufferSource();
		source.buffer = bufferList[0]
		source.connect(context.destination);
		source.noteOn(0);
	}

	function init() {
	  try {
	    context = new webkitAudioContext();
		bufferLoader = new BufferLoader(
	    context,
	    [
	      '../samples/banjo_b1.wav',
	      '../samples/banjo_d1.wav',
	    //  '../server/samples/banjo_d2.wav',
	    //  '../server/samples/banjo_g1.wav',
	    //  '../server/samples/banjo_g2.wav',
	    ],
	    _finishedLoading
	    );

	  	bufferLoader.load();

	  }
	  catch(e) {
	    alert('Web Audio API is not supported in this browser.');
	  }
	}

}());

Audio.init();