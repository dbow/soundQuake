/**
 * BufferLoader
 * Constructor function to handle loading of audio files into a webkitAudioContext
 *
 */
function BufferLoader (context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = [];
    this.loadCount = 0;
}

/**
 * BufferLoader.loadBuffer
 *
 * Makes an XMLHttpRequest to retrieve audio file at given url and add the
 * returned buffer into the BufferLoader's webkitAudioContext
 *
 */
BufferLoader.prototype.loadBuffer = function (url, index) {

    // Load buffer asynchronously
    var request = new XMLHttpRequest(),
        loader = this;

    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    request.onload = function () {

        // Asynchronously decode the audio file data in request.response
        loader.context.decodeAudioData(
            request.response,
            function (buffer) {

                if (!buffer) {
                    log('error decoding file data: ' + url);
                    return;
                }

                loader.bufferList[index] = buffer;

                if (++loader.loadCount === loader.urlList.length) {
                    loader.onload(loader.bufferList);
                }

            }
        );

    };

    request.onerror = function () {
        log('BufferLoader: XHR error');
    };

    request.send();

};

/**
 * BufferLoader.load
 *
 * Calls loadBuffer for each URL in the BufferLoader's urlList.
 *
 */
BufferLoader.prototype.load = function () {

    var i,
        len;

    for (i = 0, len = this.urlList.length; i < len; ++i) {
        this.loadBuffer(this.urlList[i], i);
    }

};



/**
 * Audio
 * Module handling the sound for the application.
 */
var Audio = (function () {

    var me = {},
        context,
        bufferList,
        bufferLoader,
        compressor,
        reverb;

    function finishedLoading (list) {
        bufferList = list;
    }

    function setReverbImpulseResponse (url) {

        // Load impulse response asynchronously
        var request = new XMLHttpRequest();

        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        request.onload = function () {
            reverb.buffer = context.createBuffer(request.response, false);
        };

        request.send();

    }

    /**
     * Audio.playSample
     *
     * Plays a randomly selected buffer, adjusting volume based on magnitude.
     *
     */
    me.playSample = function (ranNum, x, y, mag) {

        //var gainNode = context.createGainNode();

        var dryGainNode = context.createGainNode(),
            wetGainNode = context.createGainNode(),
            filter = context.createBiquadFilter(),
            source = context.createBufferSource(),
            panner = context.createPanner(),
            gain = ((mag * 0.2) < 0.98) ? (mag / 12) : 0.98;

        source.buffer = bufferList[ranNum];

        // Create the audio graph.
        source.connect(wetGainNode);
        source.connect(dryGainNode);

        wetGainNode.connect(filter);
        dryGainNode.connect(filter);

        filter.connect(panner);
        panner.connect(reverb);

        wetGainNode.gain.value = gain * 0.4;
        dryGainNode.gain.value = gain * 0.9;

        filter.type = 0; // Low-pass filter. See BiquadFilterNode docs
        filter.frequency.value = (mag * 1000) + 50;

        panner.setPosition(x, y, 0);

        source.noteOn(0);

    };

    /**
     * Audio.init
     *
     * Creates webkitAudioContext, loads in sound files as buffers, and sets up reverb.
     *
     */
    me.init = function () {

        // Create webkitAudioContext, if possible.
        try {
            context = new webkitAudioContext();
        } catch (e) {
            alert('Web Audio API is not supported in this browser.  Try Google Chrome.');
        }

        // Load in audio files from provided array via a BufferLoader
        try {
            bufferLoader = new BufferLoader(
                context,
                [
                    '../samples/banjo_b1.wav',
                    '../samples/banjo_d1.wav',
                    '../samples/banjo_d2.wav',
                    '../samples/banjo_g1.wav',
                    '../samples/banjo_g2.wav'
                ],
                finishedLoading
            );
            bufferLoader.load();
        } catch (e) {
            alert('Buffer Loader Error.  Try refreshing the page.');
        }

        // Set up reverb.
        reverb = context.createConvolver();
        setReverbImpulseResponse('../samples/reverb.wav');

        compressor = context.createDynamicsCompressor();

        reverb.connect(compressor);
        compressor.connect(context.destination);

    };

    return me;

}());

Audio.init();