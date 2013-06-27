var Pixel8 = (function () {
    'use strict';

    var Pixel8 = function Pixel8(element, options, globalOptions) {
        if (!isCanvasSupported()) {
            throw new Error('Pixel8:  requires HTML5 canvas support');
        }
        Pixel8.options = {
            clearColor: null
        };
        setOptions(globalOptions);

        if (getType(element) === '[object HTMLCanvasElement]')
            Pixel8.render(element, options)

        else if (getType(element) === '[object HTMLImageElement]')
            Pixel8.processImage(element, options);

        else if (getType(options) === '[object HTMLVideoElement]')
            Pixel8.processVideo(element, options);

        else
            throw new Error('Pixel8:  unsupported element type');
    };

    /** Set global options which are the same for each rendering pass */
    var setOptions = function setOptions(options) {
        if (options) {
            if (options.clearColor)
                Pixel8.options.clearColor = options.clearColor;
        }
    };

    var Pixel = function Pixel(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    };

    var getPixel = function getPixel(imgData, x, y) {
        var pixelIndex = (y * imgData.width + x) * 4;

        var r = imgData.data[pixelIndex];
        var g = imgData.data[pixelIndex + 1];
        var b = imgData.data[pixelIndex + 2];
        var a = imgData.data[pixelIndex + 3];

        return new Pixel(r, g, b, a);
    };

    var getRGB = function getRGB(pxl) {
        return 'rgba(' + pxl.r + ',' + pxl.g + ',' + pxl.b + ',' + pxl.a + ')';
    };

    var getType = function getType(object) {
        return Object.prototype.toString.call(object);
    };

    var isCanvasSupported = function isCanvasSupported() {
        var element = document.createElement('canvas');
        return !!(element.getContext && element.getContext('2d'));
    };

    var getCanvasFromElement = function getImageCanvasFromElement(element) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.className = element.className;
        canvas.id = element.id;
        canvas.width = element.width;
        canvas.height = element.height;
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        return canvas;
    };

    var getImageFromCanvas = function getImageFromCanvas(canvas, image) {
        if (!image) image = new Image();

        /** Store the old onload handler in a new onload handler. When the new
            onload is triggered by the change to image.src below, the new
            onload will simply restore the old onload. Without this, if Pixel8
            is called within the original onload it will cause an infinite
            callback loop when the source is replaced below. */
        image.onload = (function (previousOnLoad) {
            return function () {
                this.onload = previousOnLoad;
            };
        })(image.onload);

        image.src = canvas.toDataURL('image/png');

        return image;
    };

    Pixel8.clear = function clear(canvas) {
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        if (Pixel8.options.clearColor) {
            var prevFillStyle = context.fillStyle;
            context.fillStyle = Pixel8.options.clearColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = prevFillStyle;
        }
    };

    /** Process an image element, getting a canvas, edits image src */
    Pixel8.processImage = function processImage(image, options) {
        var canvas = getCanvasFromElement(image);
        Pixel8.render(canvas, options);
        getImageFromCanvas(canvas, image);
    };

    /** Process a video element, replaces the video with a canvas element */
    Pixel8.processVideo = function processVideo(video, options) {
        var canvas = getCanvasFromElement(video);
        Pixel8.render(canvas, options);
        video.parentElement.replaceChild(canvas, video);
    };

    /** Render either single or multiple passes on a canvas source element */
    Pixel8.render = function render(canvas, options) {
        var context = canvas.getContext('2d');
        var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        Pixel8.clear(canvas);

        if (getType(options) === '[object Object]') {
            Pixel8.renderPass(context, imgData, options);
        } else if (getType(options) === '[object Array]') {
            for (var i = 0; i < options.length; i++) {
                Pixel8.renderPass(context, imgData, options[i]);
            }
        } else {
            throw new Error('Pixel8.render:  unsupported options type');
        }
    };

    /** Render a single pass, this is where the actual processing happens */
    Pixel8.renderPass = function renderPass(ctx, imgData, options) {
        var width = imgData.width;
        var height = imgData.height;

        /** Option defaults */
        var resolution = options.resolution || 16;
        var size = options.size || resolution;
        var shape = options.shape || 'square';
        var alpha = options.alpha || 1;
        var columns = width / resolution + 1;
        var rows = height / resolution + 1;

        /** Set offset values, check for multiple formats */
        var offset = options.offset || 0;
        var offsetX = 0;
        var offsetY = 0;
        var offsetType = getType(offset);
        if (offsetType === '[object Object]') {
            offsetX = offset.x || 0;
            offsetY = offset.y || 0;
        } else if (offsetType === '[object Array]') {
            offsetX = offset[0] || 0;
            offsetY = offset[1] || 0;
        } else {
            offsetX = offsetY = offset;
        }

        /** Calculate num of rows and columns to be used based on resolution */
        var rows = height / resolution + 1;
        var columns = width / resolution + 1;

        for (var row = 0; row < rows; row++) {

            /** Determine y position, normalize so edges get color */
            var y = (row - 0.5) * resolution + offsetY;
            var pixelY = Math.max(Math.min(y, height - 1), 0);

            for (var col = 0; col < columns; col++) {

                /** Determine x position, normalize so edges get color */
                var x = (col - 0.5) * resolution + offsetX;
                var pixelX = Math.max(Math.min(x, width - 1), 0);

                /** Get the pixel data at this x,y coordinate */
                var pixel = getPixel(imgData, pixelX, pixelY);

                /** Update pixel alpha value */
                pixel.a = alpha / (pixel.a / 255);

                /** Set fill style for drawing based on pixel data */
                ctx.fillStyle = getRGB(pixel);

                /** Lookup the draw function based on shape and execute it */
                Pixel8.draw[shape](ctx, x, y, size);
            }
        }
    }

    /** Lookup-table of draw functions mapped by shape */
    Pixel8.draw = {
        square: function drawSquare(ctx, x, y, size) {
            var halfSize = size / 2;
            ctx.fillRect(x - halfSize, y - halfSize, size, size);
        },
        circle: function drawCircle(ctx, x, y, size) {
            ctx.beginPath();
            ctx.arc(x, y, (size / 2), 0, 2 * Math.PI, true);
            ctx.fill();
            ctx.closePath();
        },
        diamond: function drawDiamond(ctx, x, y, size) {
            size /= Math.SQRT2;
            var halfSize = size / 2;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-halfSize, -halfSize, size, size);
            ctx.restore();
        },
        star: function drawStar(ctx, x, y, size) {
            size /= Math.SQRT2;
            ctx.save();
            ctx.beginPath();
            ctx.translate(x, y);
            ctx.moveTo(0, 0 - size);
            for (var i = 0; i < 5; i++) {
                ctx.rotate(Math.PI / 5);
                ctx.lineTo(0, 0 - (size / 2));
                ctx.rotate(Math.PI / 5);
                ctx.lineTo(0, 0 - size);
            }
            ctx.fill();
            ctx.restore();
        }
    };

    /** Expose main Pixel8 function to global namespace */
    return Pixel8;
})();
