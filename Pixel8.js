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
    }

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
        context.drawImage(image, 0, 0);
        return canvas;
    };

    var getImageFromCanvas = function getImageFromCanvas(canvas, img) {
        var context = canvas.getContext('2d');
        var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        if (!img) img = new Image();
        img.src = canvas.toDataURL('image/png');
        return img;
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

    Pixel8.renderPass = function renderPass(ctx, imgData, opts) {
        var w = imgData.width;
        var h = imgData.height;
        var pixelData = imgData.data;

        /** Option defaults */
        var res = opts.resolution || 16;
        var size = opts.size || res;
        if (shape === 'diamond') size /= Math.SQRT2;
        var halfSize = size / 2;
        var shape = opts.shape || 'square';
        var alpha = opts.alpha || 1;
        var cols = w / res + 1;
        var rows = h / res + 1;

        /** Set offset values, check for multiple formats */
        var offset = opts.offset || 0;
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

                /** Determine index of pixel in data array */
                var pixelIndex = (pixelY * w + pixelX) * 4;

                /** Extract color information from all channels */
                var r = pixelData[pixelIndex + 0];
                var g = pixelData[pixelIndex + 1];
                var b = pixelData[pixelIndex + 2];
                var a = alpha * (pixelData[pixelIndex + 3] / 255);

                /** Set fill style for drawing based on pixel data */
                ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';

                /** Draw a pixel depending on the selected shape option */
                switch (shape) {
                    case 'circle':
                        ctx.beginPath()
                        ctx.arc(x, y, halfSize, 0, 2 * Math.PI, true)
                        ctx.fill();
                        ctx.closePath();
                        break;
                    case 'diamond':
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(Math.PI / 4);
                        ctx.fillRect(-halfSize, -halfSize, size, size);
                        ctx.restore();
                        break;
                    case 'square':
                        ctx.fillRect(x - halfSize, y - halfSize, size, size);
                        break;
                    default:
                        throw new Error('Pixel8:  unsupported shape type');
                        break;
                }
            }
        }

    }

    /** Expose main Pixel8 function to global namespace */
    return Pixel8;
})();
