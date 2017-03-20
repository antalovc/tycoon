function TycoonGraph(config) {
	var me = this;

	this.parentNode = d3.select('#' + config.parentId);
	this.legendId   = config.legendId;

	this.edges      = config.edges;
	this.vertices   = config.vertices;
	this.path = {
		raw: config.path,
		edges: [],
		vertices: [],
		maxX: -Infinity,
		maxY: -Infinity,
		minX: Infinity,
		minY: Infinity
	};

	var sz = me.getSizes(config);
	this.width      = sz.width;
	this.height     = sz.height;
	this.zoom       = (typeof config.zoom != 'undefined') ? config.zoom : true;

	this.edgesFile  = config.edgesFile;
	this.verticesFile = config.verticesFile;

	this.margin     = (config.margin) ? config.margin : {top: 50, right: 50, bottom: 50, left: 50};
	this.viewWidth  = this.width  - this.margin.right - this.margin.left;
	this.viewHeight = this.height - this.margin.top   - this.margin.bottom;

	this.calibrateScale = config.calibrateScale;
	/* set default svg visuals, can be changed by addition of '' parameter to config*/
	this.edgeWidth = 1;
	this.pathWidth = 3;
	this.verticeRadius = 2;
	this.verticeBorder = 1;
	this.platformWidthFactor  = 3;
	this.platformHeightFactor = 2;
	this.labelXFactor = 1.9;
	this.labelYFactor = 0.2;
	this.zoomDuration  = 1000;

	this.hierarchyOrder = ["path", "edge", "vertice", "pathLabel"];
	this.hierarchyOrderIds = {
		paths: 0, edges: 1, vertices: 2, pathLabel: 3
	};

	this.verticesTypes = ["DEADEND", "SWITCH", "PLATFORM", "GATEWAY"];
	this.verticesTypesColors = ["darkslategray", "cyan", "brown", "lightseagreen"]
	this.verticesTypesIds = {DEADEND: 1, SWITCH: 2, PLATFORM: 3, GATEWAY: 4};

	// Create svg canvas for legend
	this.drawLegend();

	// Define the zoom function for the zoomable tree
	function zoom() {
		var duration = 0;
		if (!d3.event.sourceEvent) duration = me.zoomDuration;
		me.vis.transition().duration(duration).attr("transform", d3.event.transform);
	}
	// Define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
	this.zoomListener = d3.zoom().scaleExtent([0.001, 1000]).on("zoom", zoom);

	// Create svg canvas to draw in
	this.svg = this.parentNode.insert("svg:svg",":first-child")
		.attr("width",  this.width)
		.attr("height", this.height)
		.call(this.zoomListener);

	// Append graph vertices markers into 'defs' section of svg
	this.svg.append("svg:defs").selectAll("marker")
		.data(this.verticesTypes)
		.enter().append("svg:marker")
			.attr("id", String)
			.attr("viewBox", "0 -5 10 10")
			.attr("markerWidth", 6)
			.attr("markerHeight", 6)
			.attr("orient", "auto")
		.append("svg:path")
			.attr("d", function(d) {
				switch (d) {
					case ("GATEWAY"):
						return "M0,-3L10,0L0,3";
					/*case ("PLATFORM"):
						return "M-40,-3L40,-3L40,3L-40,3";*/
					case ("DEADEND"):
						return "M0,-3L3,-3L3,3L0,3";
					}
			})
			.attr("fill", function(d, i) {return me.verticesTypesColors[i];});

	this.vis = this.svg.append("svg:g");
	this.loadData();
}

TycoonGraph.prototype.loadData = function() {
	var me = this;
	d3.json(me.edgesFile,
		function(error, edges) {
			if (error) return console.warn("Failed load edges file at " + 
				me.edgesFile + ':\n' + error);
			me.edges = edges;
			d3.json(me.verticesFile,
				function(error, vertices) {
					if (error) return console.warn("Failed load vertices file at " + 
						me.verticesFile + ':\n' + error);
					me.vertices = vertices;
					me.prepareData();
					me.draw();
					me.setPath(me.path.raw);
				})
		})
}

TycoonGraph.prototype.prepareData = function() {
	var me = this;
	var verticesSize = me.verticesSize = {
		maxX: -Infinity, maxY: -Infinity,
		minX: Infinity,  minY: Infinity
	}

	this.vertices.forEach(function (vt) {
		if (verticesSize.maxX < vt.x) verticesSize.maxX = vt.x;
		if (verticesSize.maxY < vt.y) verticesSize.maxY = vt.y;
		if (verticesSize.minX > vt.x) verticesSize.minX = vt.x;
		if (verticesSize.minY > vt.y) verticesSize.minY = vt.y;
	});

	me.createAdjacencyList();
}

TycoonGraph.prototype.getSizes = function(config) {
	var resHeight = config.height, 
		resWidth  = config.width,
		isWidthPc  = (typeof resWidth === 'string' && resWidth.slice(-1) === '%'),
		isHeightPc = (typeof resHeight === 'string' && resHeight.slice(-1) === '%');

	if (isWidthPc || isHeightPc) {
		var node = document.getElementById(config.parentId),
			style = getComputedStyle(node, null),
			sz = node.getBoundingClientRect();
			resHeight = (sz.height - parseInt(style.getPropertyValue('border-top-width')) 
				- parseInt(style.getPropertyValue('border-bottom-width')))
				* parseInt(resHeight) / 100;
			resWidth = (sz.width - parseInt(style.getPropertyValue('border-left-width')) 
				- parseInt(style.getPropertyValue('border-right-width')))
				* parseInt(resWidth) / 100;
	}

	return {width: resWidth, height: resHeight};
}

TycoonGraph.prototype.createAdjacencyList = function() {
	var me = this;
	me.adjacencyList = new Array(me.vertices.length);
	for (var i = 0; i < me.adjacencyList.length; i++)
		me.adjacencyList[i] = {};
	me.edges.forEach(function(edge) {
		me.adjacencyList[edge.source-1][edge.target-1] = edge;
		me.adjacencyList[edge.target-1][edge.source-1] = edge;
	});
}

TycoonGraph.prototype.getSvgGroupByClass = function(className) {
	return this.vis.select('#' + className + 's');
}

TycoonGraph.prototype.drawLegend = function() {
	var me = this;
	if (!me.legendId) return;
	var legendGraph = new TycoonGraph({
		parentId: me.legendId,
		width: '100%',
		height: '100%',
		calibrateScale: 0.2,
		edgesFile:     './data/legendEdges.json',
		verticesFile:  './data/legendVertices.json',
		zoom: false,
		margin: {top: 50, right: 130, bottom: 40, left: 5}
	});
	
}

TycoonGraph.prototype.draw = function() {
	var me = this,
		edges = me.edges,
		vertices = me.vertices;

	/*prepare hierarchy (order of drawing)*/
	me.hierarchyOrder.forEach(function(id) {
		me.vis.append("g").attr("id", id + "s");
	});

	/* set inital zoom and positions */
	/* get scale */	
	var verticesSize = me.verticesSize;
	var scaleX = me.viewWidth/(verticesSize.maxX - verticesSize.minX),
		scaleY = me.viewHeight/(verticesSize.maxY - verticesSize.minY);
	me.scale = ((scaleX > scaleY) ? scaleY : scaleX) * me.calibrateScale;
	if (me.scale === Infinity) me.scale = 1;
	me.zoomTo(me.verticesSize);

	me.drawEdges(me.edges, me.hierarchyOrder[me.hierarchyOrderIds.edges], me.edgeWidth);
	me.drawVertices();
}

TycoonGraph.prototype.drawEdges = function(edges, className, strokeWidth, drawMarkers) {
	if (typeof drawMarkers === 'undefined') drawMarkers = true;

	var me = this,
		vertices = me.vertices,
		scale = me.scale,
		verticesSize = me.verticesSize;

	var svgG = me.getSvgGroupByClass(className);

	/* function to draw curve edges by given coordinates */
	var edgeLine = d3.line()
		.curve(d3.curveBasis)
		//worse: .curve(d3.curveCatmullRom)
		//much worse: .curve(d3.curveMonotoneX)
		//much much worse:: .curve(d3.curveCardinal)
		.x(function(d) { return d.x*scale; })
		.y(function(d) { return (verticesSize.maxY - d.y)*scale; });

	/* prepare to draw edges */
	var graphEdges = svgG.selectAll('.' + className)
		.data(edges);
	var graphEdgesEnter = graphEdges.enter()/*,
		graphEdgesUpdate = graphEdges.update();

	/* update straight edges */
	graphEdges
		.filter(function(d) { return typeof d.coords === 'undefined'; })
			.attr('x1', function(d) { return vertices[d.source-1].x*scale })
			.attr('y1', function(d) { return (verticesSize.maxY - vertices[d.source-1].y)*scale })
			.attr('x2', function(d) { return vertices[d.target-1].x*scale })
			.attr('y2', function(d) { return (verticesSize.maxY - vertices[d.target-1].y)*scale });
	/* update coordinates edges */
	graphEdges
		.filter(function(d) { return typeof d.coords != 'undefined'; })
		.datum(function(d) {return d.coords;})
			.attr('d', edgeLine)
	/* draw new straight edges */
	graphEdgesEnter
		.filter(function(d) { return typeof d.coords === 'undefined'; })
		.append('line')
			.attr('class', className)
			.attr('stroke-width', strokeWidth)
			.attr('x1', function(d) { return vertices[d.source-1].x*scale })
			.attr('y1', function(d) { return (verticesSize.maxY - vertices[d.source-1].y)*scale })
			.attr('x2', function(d) { return vertices[d.target-1].x*scale })
			.attr('y2', function(d) { return (verticesSize.maxY - vertices[d.target-1].y)*scale })
			.attr('marker-end', function() {return drawMarkers ? me.getMarkerDst.apply(me, arguments) : null;})
			.attr('marker-start', function() {return drawMarkers ? me.getMarkerSrc.apply(me, arguments) : null;});
	/* draw new coordinates edges */
	graphEdgesEnter
		.filter(function(d) { return typeof d.coords != 'undefined'; })
		.append('path')
			.attr('class', className)
			.attr('stroke-width', strokeWidth)
			.attr('marker-end', function() {return drawMarkers ? me.getMarkerDst.apply(me, arguments) : null;})
			.attr('marker-start', function() {return drawMarkers ? me.getMarkerSrc.apply(me, arguments) : null;})
		.datum(function(d) {return d.coords;})
			.attr('d', edgeLine);


	graphEdges.exit().remove();
}

TycoonGraph.prototype.drawVertices = function () {
	var me = this,
		vertices = me.vertices,
		scale = me.scale,
		verticesSize = me.verticesSize;

	var className = me.hierarchyOrder[me.hierarchyOrderIds.vertices];
	var svgG = me.getSvgGroupByClass(className);

	/* prepare to draw vertices */
	var graphVertices = me.graphVertices = me.vis.selectAll('.' + className)
		.data(vertices)
		.enter().append("svg:g")
			.attr('class', className)
			.attr('transform', function(d) {return 'translate(' + d.x*scale + ',' + (verticesSize.maxY - d.y)*scale + ')'; });

	/* draw circles for ARROW vertices*/
	graphVertices
		.filter(function(d) { return d.marker === me.verticesTypesIds.SWITCH; })
		.append('circle')
			.attr('class', 'arrowMark')
			.attr('cx', 0)
			.attr('cy', 0)
			.attr('stroke-width',  me.verticeBorder)
			.attr('r', me.verticeRadius);

	/* draw squares for PLATFORM vertices*/
	var x = -me.verticeRadius*me.platformWidthFactor/2,
		y = -me.verticeRadius*me.platformHeightFactor/2,
		w = me.verticeRadius*me.platformWidthFactor,
		h = me.verticeRadius*me.platformHeightFactor;
	graphVertices
		.filter(function(d) { return d.marker === me.verticesTypesIds.PLATFORM; })
		.append('rect')
			.attr('class', 'platformMark')
			.attr('x', x)
			.attr('y', y)
			.attr('width', w)
			.attr('height', h)
			.attr('stroke-width',  me.verticeBorder)
			.attr('r', me.verticeRadius);

	/* draw text labels */
	me.drawLabels();
}

TycoonGraph.prototype.drawLabels = function() {
	var me = this,
		scale = me.scale,
		verticesSize = me.verticesSize,
		outerVertices = [];
	var pathVertices = me.path.vertices;
	if (pathVertices.length) {
		outerVertices.push(pathVertices[0]); 
		outerVertices.push(pathVertices[pathVertices.length-1]);
	}

	var isUsualLabel = function(d) {
		return !outerVertices.length || d.id != outerVertices[0].id && d.id != outerVertices[1].id;
	};
	
	// draw usual vertices
	var x = me.verticeRadius*me.labelXFactor,
		y = -me.verticeRadius*me.labelYFactor;
	var graphLabelVertices = me.graphVertices;
	graphLabelVertices.select("text").remove();
	graphLabelVertices
		.filter(function(d) {return isUsualLabel(d);})
		.append("svg:text")
			.attr('class', 'verticeLabel')
			.attr('x', x)
			.attr('y', y)
			.text(function(d) { return d.label;})
			.style('fill-opacity', 1);

	// draw path first and last vertices
	var className = me.hierarchyOrder[me.hierarchyOrderIds.pathLabel];
	var pathLabelVertices = me.vis.selectAll('.' + className)
		.data(outerVertices);
	pathLabelVertices/* update */
		.attr('transform', function(d) {return 'translate(' + d.x*scale + ',' + (verticesSize.maxY - d.y)*scale + ')'; })
		.select("text")
			.text(function(d) { return d.label;})
	pathLabelVertices/* enter */
		.enter().append("svg:g")
			.attr('class', className)
			.attr('transform', function(d) {return 'translate(' + d.x*scale + ',' + (verticesSize.maxY - d.y)*scale + ')'; })
		.append("svg:text")
			.attr('class', 'pathVerticeLabel')
			.attr('x', x)
			.attr('y', y)
			.text(function(d) { return d.label;})
			.style('fill-opacity', 1);
	pathLabelVertices.exit().remove();/* remove */
}

TycoonGraph.prototype.parepareVerticesRawData = function(verticesArray) {
	var me = this, edge,
		res = {
			edges: [],
			vertices: [],
			minX: Infinity,  minY: Infinity,
			maxX: -Infinity, maxY: -Infinity
		};
	for (var i = 0; i < verticesArray.length; i++) {
		var vertice = me.vertices[verticesArray[i]-1];
		res.vertices.push(vertice);
		if (res.maxX < vertice.x) res.maxX = vertice.x;
		if (res.maxY < vertice.y) res.maxY = vertice.y;
		if (res.minX > vertice.x) res.minX = vertice.x;
		if (res.minY > vertice.y) res.minY = vertice.y;
		
		if (i === verticesArray.length-1) break;
		if (edge = me.adjacencyList[verticesArray[i]-1][verticesArray[i+1]-1])
			res.edges.push(edge);
		else
			res.edges.push({source: verticesArray[i], target: verticesArray[i+1]});
	}
	return res;
}

TycoonGraph.prototype.setPath = function(verticesRaw) {
	if (!verticesRaw) return;
	var me = this;
	var verticesArray = Array.isArray(verticesRaw) ? verticesRaw : verticesRaw.split(',');
	var preparedData = me.parepareVerticesRawData(verticesArray);

	me.path.raw   = verticesRaw;
	me.path.edges = preparedData.edges;
	me.path.vertices = preparedData.vertices;
	me.path.minX  = preparedData.minX; me.path.maxX = preparedData.maxX;
	me.path.minY  = preparedData.minY; me.path.maxY = preparedData.maxY;
	me.drawEdges(me.path.edges, me.hierarchyOrder[me.hierarchyOrderIds.paths], me.pathWidth, false);
	me.drawLabels();

	me.zoomTo(me.path);
}

TycoonGraph.prototype.zoomTo = function(region) {
	var me = this;

	if (typeof duration === 'undefined') duration = 0;

	/*get scale*/
	var scaleX = me.viewWidth/(region.maxX - region.minX),
		scaleY = me.viewHeight/(region.maxY - region.minY);
	var zoomScale = ((scaleX > scaleY) ? scaleY : scaleX)/me.scale;
	if (zoomScale === Infinity) zoomScale = 1;

	me.svg.call(me.zoomListener.transform, 
		d3.zoomIdentity
			.translate( 
				me.margin.left - region.minX*me.scale*zoomScale  + (me.viewWidth - (region.maxX - region.minX)*me.scale*zoomScale)/2,
				me.margin.top  - (me.verticesSize.maxY - region.maxY)*me.scale*zoomScale + (me.viewHeight - (region.maxY - region.minY)*me.scale*zoomScale)/2
			)
			.scale(zoomScale)
	);
}

TycoonGraph.prototype.getMarkerDst = function(d) {
	var mkType = this.vertices[d.target-1].marker;
	return (mkType != this.verticesTypesIds.SWITCH) ? ('url(#' + this.verticesTypes[mkType-1] + ')') : null;
};

TycoonGraph.prototype.getMarkerSrc = function(d) {
	var mkType = this.vertices[d.source-1].marker;
	return (mkType != this.verticesTypesIds.SWITCH) ? ('url(#' + this.verticesTypes[mkType-1] + ')') : null;
};

//Graph with adjacent list http://blog.benoitvallon.com/data-structures-in-javascript/the-graph-data-structure/
//Force graph from adjacent list https://bl.ocks.org/mbostock/1199811
//Lots of Examples http://christopheviau.com/d3list/gallery.html
//Subdata http://bl.ocks.org/stepheneb/1183998