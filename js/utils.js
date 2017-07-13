var Utils = (function () {
	return {


		getSizesFromConfig: function (config) {
			var resHeight = config.height,
				resWidth = config.width,
				isWidthPc = (typeof resWidth === 'string' && resWidth.slice(-1) === '%'),
				isHeightPc = (typeof resHeight === 'string' && resHeight.slice(-1) === '%');

			if (isWidthPc || isHeightPc) {
				var node = document.getElementById(config.parentId),
					style = getComputedStyle(node, null),
					sz = node.getBoundingClientRect();
				resHeight = (sz.height - parseInt(style.getPropertyValue('border-top-width')) -
						parseInt(style.getPropertyValue('border-bottom-width'))) *
					parseInt(resHeight) / 100;
				resWidth = (sz.width - parseInt(style.getPropertyValue('border-left-width')) -
						parseInt(style.getPropertyValue('border-right-width'))) *
					parseInt(resWidth) / 100;
			}

			return {
				width: resWidth,
				height: resHeight
			};
		},


		mergeObjs: function (dst, src) {
			for (var attrname in src) {
				if (src.hasOwnProperty(attrname)) dst[attrname] = src[attrname];
			}
			return dst;
		},


		generateNColors: function (nColors) {
			var i = 360 / (nColors - 1); // distribute the colors evenly on the hue range
			var r = []; // hold the generated colors
			for (var x = 0; x < nColors; x++)
				r.push(Utils.RgbToString(Utils.hsvToRgb(i * x, 100, 100))); // you can also alternate the saturation and value for even more contrast between the colors
			return r;
		},

		RgbToString: function (rgb_array) {
			return "rgb(" + rgb_array[0] + "," + rgb_array[1] + "," + rgb_array[2] + ")";
		},

		hsvToRgb: function (h, s, v) {
			var r, g, b;
			var i;
			var f, p, q, t;

			// Make sure our arguments stay in-range
			h = Math.max(0, Math.min(360, h));
			s = Math.max(0, Math.min(100, s));
			v = Math.max(0, Math.min(100, v));

			// We accept saturation and value arguments from 0 to 100 because that's
			// how Photoshop represents those values. Internally, however, the
			// saturation and value are calculated from a range of 0 to 1. We make
			// That conversion here.
			s /= 100;
			v /= 100;

			if (s == 0) {
				// Achromatic (grey)
				r = g = b = v;
				return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
			}

			h /= 60; // sector 0 to 5
			i = Math.floor(h);
			f = h - i; // factorial part of h
			p = v * (1 - s);
			q = v * (1 - s * f);
			t = v * (1 - s * (1 - f));

			switch (i) {
				case 0:
					r = v;
					g = t;
					b = p;
					break;

				case 1:
					r = q;
					g = v;
					b = p;
					break;

				case 2:
					r = p;
					g = v;
					b = t;
					break;

				case 3:
					r = p;
					g = q;
					b = v;
					break;

				case 4:
					r = t;
					g = p;
					b = v;
					break;

				default: // case 5:
					r = v;
					g = p;
					b = q;
			}

			return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
		},

		//sorts array and leaves only unique elements
		UniqueSort: function (arr) {
			// taken from here:
			//https://stackoverflow.com/questions/4833651/javascript-array-sort-and-unique
			if (arr.length === 0) return arr;
			arr = arr.sort(function (a, b) {
				return a * 1 - b * 1;
			});
			var ret = [arr[0]];
			for (var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can never be a duplicate
				if (arr[i - 1] !== arr[i]) {
					ret.push(arr[i]);
				}
			}
			return ret;
		},

		addEvent: function (object, type, callback) {
			if (object == null || typeof (object) == 'undefined') return;
			if (object.addEventListener) {
				object.addEventListener(type, callback, false);
			} else if (object.attachEvent) {
				object.attachEvent("on" + type, callback);
			} else {
				object["on" + type] = callback;
			}
		}
	};
}());