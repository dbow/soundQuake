/**
 * BufferLoader
 * Constructor function to handle loading of audio files into an AudioContext
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
 * returned buffer into the BufferLoader's AudioContext
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
            context.decodeAudioData(request.response, function (buffer) {
                reverb.buffer = buffer;
            });
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

        var dryGainNode = context.createGain(),
            wetGainNode = context.createGain(),
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

        filter.type = 'lowpass';
        filter.frequency.value = (mag * 1000) + 50;

        panner.positionX.value = x;
        panner.positionY.value = y;
        panner.positionZ.value = 0;

        source.start(0);

    };

    /**
     * Audio.init
     *
     * Creates AudioContext, loads in sound files as buffers, and sets up reverb.
     *
     */
    me.init = function () {

        // Create AudioContext, if possible.
        try {
            context = new AudioContext();
        } catch (e) {
            alert('Web Audio API is not supported in this browser.');
        }

        // Resume AudioContext on first user interaction (required by autoplay policy).
        document.addEventListener('click', function () {
            if (context && context.state === 'suspended') {
                context.resume();
            }
        });

        // Load in audio files from provided array via a BufferLoader
        try {
            bufferLoader = new BufferLoader(
                context,
                [
                    'samples/banjo_b1.wav',
                    'samples/banjo_d1.wav',
                    'samples/banjo_d2.wav',
                    'samples/banjo_g1.wav',
                    'samples/banjo_g2.wav'
                ],
                finishedLoading
            );
            bufferLoader.load();
        } catch (e) {
            alert('Buffer Loader Error.  Try refreshing the page.');
        }

        // Set up reverb.
        reverb = context.createConvolver();
        setReverbImpulseResponse('samples/reverb.wav');

        compressor = context.createDynamicsCompressor();

        reverb.connect(compressor);
        compressor.connect(context.destination);

    };

    return me;

}());

Audio.init();
