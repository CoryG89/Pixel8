var Pixel8 = (function () {
    'use strict';

    var Pixel8 = function Pixel8(element, options) {
        if (!isCanvasSupported()) {
            throw new Error('Pixel8:  requires HTML5 canvas support');
            return undefined;
        }

        if (getType(element) === '[object HTMLImageElement]') {
            Pixel8.processImage(element, options);
        } else if (getType(element) === '[object HTMLCanvasElement]') {
            Pixel8.render(element, options)
        } else {
            throw new Error('Pixel8:  unsupported element type');
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

    var getCanvasFromImage = function getImageCanvasFromImage(image) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.className = image.className;
        canvas.id = image.id;
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    };

    var getImageFromCanvas = function getImageFromCanvas(canvas, image) {
        var context = canvas.getContext('2d');
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
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

    Pixel8.processImage = function processImage(image, options) {
        var canvas = getCanvasFromImage(image);
        Pixel8.render(canvas, options);
        getImageFromCanvas(canvas, image);
    };

    Pixel8.render = function render(canvas, options) {
        var context = canvas.getContext('2d');
        var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        context.clearRect(0, 0, canvas.width, canvas.height);

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

    Pixel8.renderPass = function renderPass(ctx, imgData, options) {
        var w = imgData.width;
        var h = imgData.height;

        /** Option defaults */
        var res = options.resolution || 16;
        var size = options.size || res;
        var shape = options.shape || 'square';
        var alpha = options.alpha || 1;
        var cols = w / res + 1;
        var rows = h / res + 1;

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

        /** Calculate num of rows and cols to be used based on resolution */
        var rows = h / res + 1;
        var cols = w / res + 1;

        for (var row = 0; row < rows; row++) {

            /** Determine y position and normalize so edges get color */
            var y = (row - 0.5) * res + offsetY;
            var pixelY = Math.max(Math.min(y, h - 1), 0);

            for (var col = 0; col < cols; col++) {

                /** Determine x position and normalize so edges get color */
                var x = (col - 0.5) * res + offsetX;
                var pixelX = Math.max(Math.min(x, w - 1), 0);

                /** Get the pixel data at this x,y coordinate */
                var pixel = getPixel(imgData, pixelX, pixelY);

                /** Set fill style for drawing based on pixel data */
                ctx.fillStyle = getRGB(pixel);

                Pixel8.draw[shape](ctx, x, y, size);
            }
        }
    }

    Pixel8.drawPixel = function drawPixel(ctx, x, y, size, shape) {
        /** Draw a pixel depending on the selected shape option */
        var halfSize = size / 2;
        switch (shape) {
            case 'circle':
                Pixel8.drawCircle(ctx, x, y, size);
                break;
            case 'diamond':
                size /= Math.SQRT2;
                halfSize = size / 2;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-halfSize, -halfSize, size, size);
                ctx.restore();
                break;
            case 'star':
                size /= Math.SQRT2;
                halfSize = size / 2;
                ctx.save();
                ctx.beginPath();
                ctx.translate(x, y);
                ctx.moveTo(0, 0 - size);
                for (var i = 0; i < 5; i++) {
                    ctx.rotate(Math.PI / 5);
                    ctx.lineTo(0, 0 - halfSize);
                    ctx.rotate(Math.PI / 5);
                    ctx.lineTo(0, 0 - size);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                break;
            case 'square':
                ctx.fillRect(x - (size / 2), y - halfSize, size, size);
                break;
            default:
                throw new Error('Pixel8:  unsupported shape type');
                break;
        }
    };

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
