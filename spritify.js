/**
* Spritesheet generating JavaScript library
*
* Version 2.1 - August 2013
*
* Author: Sam Stonehouse
* Date Created: Dec 2012
*
*/

if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis
                                 ? this
                                 : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

var Spritify = (function(GrowingPacker, JSZip, undefined) {
	"use strict";

	var defaults = {
		spacing: 0,
		doRenames: true,
		debug: false,
		renames: [
			["-hover", ":hover"]
		]
	};

	var ImagePacker = function() {
		this.images = [];
		this.png = undefined;
		this.loadedImages = 0;

		this.cssString = "";
		this.referenceString = "";
	};

	ImagePacker.prototype.loadFiles = function(files, opts, callback) {
		if (arguments.length === 0) {
			throw new Exception("No files provided");
		}

		if (arguments.length === 1) {
			opts = {};
			callback = function() {};
		}

		if (typeof(opts) === 'function') {
			callback = opts;
			opts = {};
		}

		this.numImages = files.length;
		this.onComplete = callback || function() {};

		//Set options as merge of defaults and any supplied options
		this.options = opts ? mergeOptions(defaults, opts) : defaults;

		if (this.options.debug) { console.log("Loading images"); }

		for (var i = 0; i < this.numImages; i++) {
			this.images[i] = new ImageFile();
			this.images[i].load(files[i], this.options, this._loadedImage.bind(this));
		}

		this._loadedImage();
	};

	ImagePacker.prototype._loadedImage = function() {

		if (this.options.debug) { console.log("Loading images"); }
		this.loadedImages++;

		//If all images are loaded move onto next step
		if (this.loadedImages === this.numImages) {
			this._pack();
		}

	};

	ImagePacker.prototype._pack = function() {
		if (this.options.debug) { console.log("Packing images"); }

		//Sort images so larges ones get packed first
		this.images.sort(function(a, b) {
			return (b.w > b.h ? b.w : b.h) - (a.w > a.h ? a.w : a.h);
		});

		//Run bin packer
		this.imgPacker = new GrowingPacker();
		this.imgPacker.fit(this.images);

		this._drawImages();
	};

	ImagePacker.prototype._drawImages = function() {
		if (this.options.debug) { console.log("Drawing images"); }

		//Create canvas
		this.canvas = document.createElement("canvas");
		var	context = this.canvas.getContext('2d');

		//Set canvas dimensions for drawing
		this.canvas.height = this.imgPacker.root.h;
		this.canvas.width = this.imgPacker.root.w;

		for (var i = 0; i < this.images.length; i++) {
			context.drawImage(this.images[i].img, this.images[i].fit.x, this.images[i].fit.y );
		}

		this._complete();
	};

	ImagePacker.prototype._complete = function() {
		this.png = this.canvas.toDataURL("image/png");

		this.cssString = "";
		this.referenceString = "";

		this.onComplete();
	};

	ImagePacker.prototype.getPng = function() {
		return this.png;
	};

	ImagePacker.prototype.getCSS = function() {
		if (this.cssString !== "") {
			return this.cssString;
		}

		var newCSSString = "/* Spritesheet generated by http://spritifycss.co.uk */\n\n";
		newCSSString += "[class^=\"sprite-\"], [class*=\" sprite-\"] {\n";
		newCSSString += "    background-image: url('spritesheet.png');\n";
		newCSSString += "    display: inline-block;\n";
		newCSSString += "}\n\n";

		for (var i = 0; i < this.images.length; i++) {
			newCSSString += images[i].getCSS();
		}

		this.cssString = newCSSString;

		return this.cssString;
	};

	ImagePacker.prototype.getReference = function() {
		if (this.referenceString !== "") {
			return this.referenceString;
		}

		var newReferenceString = "";

		for (var i = 0; i < this.images.length; i++) {
			newReferenceString += images[i].getReference();
		}

		this.referenceString = newReferenceString;

		return this.referenceString;
	};

	ImagePacker.prototype.getZip = function() {
		//Create ZIP
		var zip = new JSZip();
		zip.file("sprites.css", this.getCSS());
		zip.file("spritesheet.png", this.getPng().split(",")[1], {base64: true});

		return zip.generate();
	};

	var ImageFile = function() { 
		this.img = document.createElement("img");

		this.w = 0;
		this.h = 0;

		console.log(this);
	};

	ImageFile.prototype.load = function(file, options, callback) {
		this.file = file;
		this.options = options;

		var imgFile = this;
		var reader = new FileReader();

		console.log(this);

		reader.onloadend = function() {
			imgFile.img.src = reader.result;

			imgFile.img.onload = function() {
				imgFile.w = imgFile.img.width + options.spacing;
				imgFile.h = imgFile.img.height + options.spacing;

				callback();
			};
		};

		reader.readAsDataURL(file);
	};

	ImageFile.prototype.getCSS = function() {
		var name = this.getFormattedName();

		var returnString = name + " {\n";
		returnString += "&#09;background-position: -" + (this.fit.x) + "px -" + (this.fit.y) + "px;\n";
		returnString += "&#09;height: " + this.img.height + "px;\n";
		returnString += "&#09;width: " + this.img.width + "px;\n";
		returnString += "}\n\n";

		return returnString;
	};

	ImageFile.prototype.getReference = function() {
		var returnString = this.file.name + "\n";
		returnString += "&#09;x: " + (this.fit.x) + "\n";
		returnString += "&#09;y: " + (this.fit.y) + "\n";
		returnString += "&#09;h: " + this.image.height + "\n";
		returnString += "&#09;w: " + this.image.width + "\n\n";
		return returnString;
	};

	ImageFile.prototype.getFormattedName = function() {
		//Remove the file extension
		var res = this.file.name.split(".");
		
		if (res.length > 1) {
			res.pop();
		}

		//Replace whitespace with '-' and make everything lowercase
		res = '.sprite-' + res.toLowerCase()
		.replace(/^\s+|\s+$/g, '')
		.replace(/[\s.-]+/g, '-');

		if (this.options.doRenames) {
			for (var i = 0; i < this.options.renames.length; i++) {
				res = res.replace(this.options.renames[i][0], this.options.renames[i][1]);
			}
		}

		return res;
	};

	//Merge two options objects, defaults and then add the options provided
	var mergeOptions = function(defaults, settings){
		var results = {};
		var attrname;

		for (attrname in defaults) {
			if (defaults.hasOwnProperty(attrname)) {
				results[attrname] = defaults[attrname];
			}
		}

		for (attrname in settings) {
			if (settings.hasOwnProperty(attrname)) {
				results[attrname] = settings[attrname];
			}
		}
		return results;
	};

	return ImagePacker;

})(GrowingPacker, JSZip);
