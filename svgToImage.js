(function($) {
    if (!$ && !saveAs) {
        console.error("svgToImage requires jQuery and fileSaver.js");
    }

    function dataURItoBlob(dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], {
            type: mimeString
        });
    }

    function inlineStyle(cloned, original, root) {
        if (root == null) root = true;
        var originalChildren, clonedChildren;

        if (!root) {
            originalChildren = $(original).children();
            clonedChildren = $(cloned).children();
            if (originalChildren.length === 0) return;
        } else {
            originalChildren = $(original);
            clonedChildren = $(cloned);
            if (originalChildren == null) return;
        }

        var originalCssStyleDeclarationComputed = getComputedStyle(original);
        var itr, cLen, i, len, key, value, computedStyleStr, cssStyleDeclarationComputed, element, origElem;

        for (itr = 0, cLen = clonedChildren.length; itr < cLen; itr++) {
            element = clonedChildren.get(itr);
            origElem = originalChildren.get(itr);
            cssStyleDeclarationComputed = getComputedStyle(origElem);
            computedStyleStr = "";
            for (i = 0, len = cssStyleDeclarationComputed.length; i < len; i++) {
                key = cssStyleDeclarationComputed[i];
                value = cssStyleDeclarationComputed.getPropertyValue(key);
                if (key[0] !== "-" && (root || value !== originalCssStyleDeclarationComputed.getPropertyValue(key))) {
                    computedStyleStr += key + ":" + value + ";";
                }
            }
            element.setAttribute('style', computedStyleStr);
            inlineStyle(element, origElem, false);
        }
    }

    function getInlinedSVG(original, zoomRatio) {
        var xmlString, cloned = original.clone();

        inlineStyle(cloned.get(0), original.get(0));

        cloned.prepend("<rect width='" + original.width() + "' height='" + original.height() + "' style='fill:#ffffff'></rect>");
        cloned.removeAttr("width").removeAttr("height");
        // cloned.find("clipPath").remove();
        cloned.find("*").removeAttr("class");
        cloned.attr('xmlns', 'http://www.w3.org/2000/svg');

        if (zoomRatio) {
            var clonedChildren = cloned.children();
            var scale = $("<g transform='scale(" + zoomRatio + ")'>");
            cloned.css("width", original.width() * zoomRatio).css("height", original.height() * zoomRatio);
            cloned.empty();
            scale.append(clonedChildren);
            scale.appendTo(cloned);
        }

        xmlString = new XMLSerializer().serializeToString(cloned.get(0));
        xmlString = xmlString.replace(/\<(?!svg)([\ a-zA-Z0-9\.\/\:\=\;\'\"\#]+)(xmlns\=\"[a-z0-9\.\/\:]+\")/, "<$1 ");
        xmlString = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1 Basic//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11-basic.dtd">' + xmlString;
        return xmlString;
    }

    function getSvgDataURI(svg, zoomRatio) {
        return 'data:image/svg+xml;btoa,' + window.btoa(getInlinedSVG(svg, zoomRatio));
    }

    $.fn.svgToPNG = function(options) {
        return this.svgToImage($.extend({
            type: "image/png"
        }, options));
    }

    $.fn.svgToJPEG = $.fn.svgToJPG = function(options) {
        return this.svgToImage($.extend({
            type: "image/jpg"
        }, options));
    }

    $.fn.svgToImage = function(options) {
        if (this.length === 0)
            return;

        options.zoomRatio = options.zoomRatio || 1;
        options.type = options.type || "image/png";

        var svg = this.first();
        var canvas = $("<canvas width='" + defaultZoomWidth + "' height='" + (chart.height() * defaultZoomWidth / chart.width()) + "'>");
        var image = new Image;

        $(image).appendTo("body")
            .width(svg.width() * options.zoomRatio).height(svg.height() * options.zoomRatio)
            .css("position", "fixed").css("top", "-10000px");

        image.onload = function() {
            setTimeout(function() {
                var context = canvas.get(0).getContext("2d");
                context.drawImage(image, 0, 0);
                var blob = dataURItoBlob(canvas.get(0).toDataURL(options.type));
                saveAs(blob, chartName + ".png");
                $(image).remove();
            }, 1000);
        };

        image.src = 'data:image/svg+xml;utf8,' + getSvgDataURI(svg, options.zoomRatio);
    }
})(jQuery);
