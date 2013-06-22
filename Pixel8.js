var Pixel8 = (function () {
    'use strict';

    var Pixel8 = function Pixel8(element, options) {
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
        if (getType(options) === '[object Object]') {
            Pixel8.renderPass(canvas, options);
        } else if (getType(options) === '[object Array]') {
            for (var i = 0; i < options.length; i++) {
                Pixel8.renderPass(canvas, options[i]);
            }
        } else {
            throw new Error('Pixel8.render:  unsupported options type');
        }
    };

    Pixel8.renderPass = function renderPass (canvas, opts) {
        var w = canvas.width;
        var h = canvas.height;
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, w, h);
        var pixelData = imgData.data;

        // option defaults
        var res = opts.resolution || 16;
        var size = opts.size || res;
        var shape = opts.shape || 'square';
        var alpha = opts.alpha || 1;
        var offset = opts.offset || 0;
        var offsetX = 0;
        var offsetY = 0;
        var cols = w / res + 1;
        var rows = h / res + 1;
        var diamondSize = size / Math.SQRT2;
        var halfSize = shape === 'diamond' ? diamondSize : size / 2;

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

        var row, col, x, y, pixelY, pixelX, pixelIndex, r, g, b, a;

        for (row = 0; row < rows; row++) {
            y = (row - 0.5) * res + offsetY
            // normalize y so shapes around edges get color
            pixelY = Math.max(Math.min(y, h - 1), 0)

            for (col = 0; col < cols; col++) {
                x = (col - 0.5) * res + offsetX
                
                /** Normalize so pixels around the edge get color */
                pixelX = Math.max(Math.min(x, w - 1), 0);

                pixelIndex = (pixelX + pixelY * w) * 4
                r = pixelData[pixelIndex + 0]
                g = pixelData[pixelIndex + 1]
                b = pixelData[pixelIndex + 2]
                a = alpha * (pixelData[pixelIndex + 3] / 255)

                ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';

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
                        size = size / Math.SQRT2;
                        ctx.fillRect(-halfSize, -halfSize, size, size);
                        ctx.restore();
                        break;
                    case 'square':
                        ctx.fillRect(x - halfSize, y - halfSize, size, size);
                } 
            }
        }

    }

    Pixel8.prototype.render = function (canvas, options) {
        Pixel8.render(canvas, options)
    }

    Pixel8.prototype.renderPass = function (opt) {
        Pixel8.renderPass(this.canvas, options)
    }

    return Pixel8;

})();
