/**
 * Analyzes an image file and abstracts the colors to a pixel array.
 */

// TODO - dbow - We don't currently use this, but might be nice in the future to make it more dynamic.
$(document).ready(function () {

    var canvas = document.getElementById('image_loader'),
        context,
        w,
        h,
        result = [],
        img,
        getPixelsFromMap;

    canvas.setAttribute('width', $(document).width());
    canvas.setAttribute('height', $(document).height());
    context = canvas.getContext('2d');

    img = new Image();

    img.onload = function () {

        context.drawImage(img, 0, 0);
        $("<img/>").attr("src", $(img)
                   .attr("src"))
                   .load(function () {
                        w = this.width;
                        h = this.height;
                        //TODO Abstract this out
                        log(getPixelsFromMap(30, 30));
                   });

    };

    img.src = 'img/map.png';

    /**
     * getPixelsFromMap
     *
     * Assess Canvas element for pixels, takes total image dimensions
     * an equally spaces out the sample spot based on rows and columns
     */
    getPixelsFromMap = function (nCol, nRow) {

        var its = nCol * nRow,
            xSpace = Math.floor(w / nCol),
            ySpace = Math.floor(h / nRow),
            i,
            x,
            y,
            r;

        for (i = 0; i < its; i++) {
            x = Math.round((i % nCol * xSpace) + (xSpace / 2));
            y = Math.round((Math.floor(i / nCol) * ySpace) + (ySpace / 2));
            r = context.getImageData(x, y, 1, 1);
            result.push(r);
        }

        return result;

    };

});