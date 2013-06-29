var Pixel8 = (function () {
    'use strict';

    /** Main globally exported function, accepts canvas, image, and video
        elements, options may be either a single object specifying options
        for a single rendering layer or an array for multiple layers, global
        options may be specified for all layers 
    */
    var Pixel8 = function Pixel8(element, options, globalOptions) {
        if (!isCanvasSupported()) {
            throw new Error('Pixel8:  requires HTML5 canvas support');
        }
        
        /** Set default global options */
        Pixel8.options = {
            clearColor: null
        };
        setOptions(globalOptions);

        if (getType(element) === '[object HTMLCanvasElement]')
            Pixel8.render(element, options);

        else if (getType(element) === '[object HTMLImageElement]')
            Pixel8.processImage(element, options);

        else if (getType(options) === '[object HTMLVideoElement]')
            Pixel8.processVideo(element, options);

        else
            throw new Error('Pixel8:  unsupported element type');
    };

    /** Set global options which are the same for each rendering layer */
    var setOptions = function setOptions(options) {
        if (options) {
            if (options.clearColor)
                Pixel8.options.clearColor = options.clearColor;
        }
    };

    /** Store RGBA values given image data and an x,y pixel coordinate */
    var Pixel = function Pixel(imageData, x, y) {

        /** Get new pixel data given image data and x,y pixel coordinate */
        this.getData = function (imageData, x, y) {
            this.index = (y * imageData.width + x) * 4;

            this.r = imageData.data[this.index];
            this.g = imageData.data[this.index + 1];
            this.b = imageData.data[this.index + 2];
            this.a = imageData.data[this.index + 3];
        };

        /** Return pixel data as an RGBA formatted string */
        this.toString = function () {
            return 'rgba(' + this.r + ',' + this.g + ',' +
                             this.b + ',' + this.a + ')';
        };

        /** Get initial data from constructor if arguments present */
        if (imageData && x && y)  this.getData(imageData, x, y);
    };

    /** Get a differentiable type string between input elements and objects */
    var getType = function getType(object) {
        return Object.prototype.toString.call(object);
    };

    /** Determine whether or not HTML5 canvas is supported */
    var isCanvasSupported = function isCanvasSupported() {
        var element = document.createElement('canvas');
        return !!(element.getContext && element.getContext('2d'));
    };

    /** Get a canvas from either an image or video element */
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

    /** Update's an image src with a canvas data url, keeping the onload
        handler from being fired without destroying it */
    var updateImageSrc = function updateImageSrc(canvas, image) {
        image.onload = (function (previousOnLoad) {
            return function () {
                this.onload = previousOnLoad;
            };
        })(image.onload);

        image.src = canvas.toDataURL('image/png');

        return image;
    };

    /** Clears the canvas, implements a 'clear color' if it is set in the
        global options by repainting the entire canvas afterwards */
    var clearCanvas = function clearCanvas(canvas) {
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        if (Pixel8.options.clearColor) {
            var prevFillStyle = context.fillStyle;
            context.fillStyle = Pixel8.options.clearColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = prevFillStyle;
        }
    };

    /** Processes an image after getting a canvas, afterwards either replacing
        it with the canvas, or updating the image source (default) */
    Pixel8.processImage = function processImage(image, options, globalOptions) {
        var canvas = getCanvasFromElement(image);
        Pixel8.render(canvas, options);
        if (globalOptions && globalOptions.replaceImage)
            image.parentElement.replaceChild(canvas, video);
        else
            updateImageSrc(canvas, image);
    };

    /** Process a video element, replaces the video with a canvas element */
    Pixel8.processVideo = function processVideo(video, options) {
        var canvas = getCanvasFromElement(video);
        Pixel8.render(canvas, options);
        video.parentElement.replaceChild(canvas, video);
    };

    /** Render either a single or multiple layers on a canvas source element */
    Pixel8.render = function render(canvas, options) {
        var context = canvas.getContext('2d');
        var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        clearCanvas(canvas);

        if (getType(options) === '[object Object]') {
            Pixel8.renderLayer(context, imgData, options);
        } else if (getType(options) === '[object Array]') {
            for (var i = 0; i < options.length; i++) {
                Pixel8.renderLayer(context, imgData, options[i]);
            }
        } else {
            throw new Error('Pixel8.render:  unsupported options type');
        }
    };

    /** Render a single layer, this is where the actual processing happens */
    Pixel8.renderLayer = function renderLayer(ctx, imgData, options) {
        var width = imgData.width;
        var height = imgData.height;

        /** Option defaults */
        var resolution = options.resolution || 16;
        var size = options.size || resolution;
        var shape = options.shape || 'square';
        var alpha = options.alpha || 1;

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

        /** Single object to store each pixel's data as it's processed */
        var pixel = new Pixel();

        for (var row = 0; row < rows; row++) {

            /** Determine y position, normalize so edges get color */
            var y = (row - 0.5) * resolution + offsetY;
            var pixelY = Math.max(Math.min(y, height - 1), 0);

            for (var col = 0; col < columns; col++) {

                /** Determine x position, normalize so edges get color */
                var x = (col - 0.5) * resolution + offsetX;
                var pixelX = Math.max(Math.min(x, width - 1), 0);

                /** Get the pixel data at this x,y coordinate, update alpha */
                pixel.getData(imgData, pixelX, pixelY);
                pixel.a = alpha / (pixel.a / 255);

                /** Set fill style for drawing based on pixel data */
                ctx.fillStyle = pixel.toString();

                /** Lookup the draw function based on shape and execute it */
                Pixel8.draw[shape](ctx, x, y, size);
            }
        }
    };

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
