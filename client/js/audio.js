var context = null;

var bufferLoader;

function finishedLoading(bufferList) {
  var source1 = context.createBufferSource();

  source1.buffer = bufferList[0];

  source1.connect(context.destination);
  source1.noteOn(0);
}
var sampleBuffer = null;

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

function init() {
  try {
    context = new webkitAudioContext();
	bufferLoader = new BufferLoader(
    context,
    [
      '../server/samples/reyongmid1.wav',
    ],
    finishedLoading
    );

  	bufferLoader.load();

  }
  catch(e) {
    alert('Web Audio API is not supported in this browser.');
  }
}

$(document).ready(function(){
	init();
});