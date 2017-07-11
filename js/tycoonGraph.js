function TycoonGraph(config) {
	var me = this;
	me.loadConfig(config);
}

TycoonGraph.prototype.loadConfig = function(config) {
	/* load config */
	var me = this;
	if (config.configFile) {
		d3.json(config.configFile,
				function(error, configContents) {
					if (error) return console.warn("Failed load graph config file at " + 
						config.configFile + ':\n' + error);
					me.initConfig(Utils.mergeObjs(config, configContents));
				})
	}
	else
		me.initConfig(config);
}

TycoonGraph.prototype.initConfig = function(config) {
	/* ---init unloadable config--- */
	this.hierarchyOrder = ["curVertice", "path", "edge", "vertice", "pathLabel"];
	this.hierarchyOrderIds = {
		curVertice:0, paths: 1, edges: 2, vertices: 3, pathLabel: 4
	};

	this.verticesTypes = ["DEADEND", "SWITCH", "PLATFORM", "GATEWAY"];
	this.verticesTypesColors = ["darkslategray", "cyan", "brown", "lightseagreen"]
	this.verticesTypesIds = {DEADEND: 1, SWITCH: 2, PLATFORM: 3, GATEWAY: 4};

	this.pathObj = {
		raw: config.path,
		edges: [],
		vertices: [],
		maxX: -Infinity,
		maxY: -Infinity,
		minX: Infinity,
		minY: Infinity
	};

	this.store = config.store;
	if (!this.store) console.warn('Tycoon graph: no data store provided');

	/* ---init loadable config--- */

	//defaults
	this.width                = '100%';
	this.height               = '100%';
	this.edgeWidth            = 1;
	this.pathWidth            = 3;
	this.verticeRadius        = 2;
	this.verticeBorder        = 1;
	this.platformWidthFactor  = 3;
	this.platformHeightFactor = 2;
	this.labelXFactor         = 1.9;
	this.labelYFactor         = 0.2;
	this.labelFontSize        = '5px';
	this.pathLabelFontSize    = '7px';
	this.zoomDuration         = 1000;
	this.margin               = {top: 50, right: 50, bottom: 50, left: 50};

	Utils.mergeObjs(this, config);

	/* mandatory config params: */
	// ["parentId", "width", "height", "edgesFile", "verticesFile", "calibrateScale"]
	this.parentNode = d3.select('#' + config.parentId);
	this.legendId   = config.legendId;

	var sz = Utils.getSizesFromConfig(config);
	this.svgWidth      = sz.width;
	this.svgHeight     = sz.height;
	
	this.calibrateScale = config.calibrateScale;

	this.viewWidth  = this.svgWidth  - this.margin.right - this.margin.left;
	this.viewHeight = this.svgHeight - this.margin.top   - this.margin.bottom;

	this.initVisuals();
}

TycoonGraph.prototype.initVisuals = function() {
	var me = this;

	// Create svg canvas for legend
	me.drawLegend();

	// Define the zoom function for the zoomable tree
	function zoom() {
		var duration = 0;
		if (!d3.event.sourceEvent) duration = me.zoomDuration;
		me.vis.transition().duration(duration).attr("transform", d3.event.transform);
	}
	// Define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
	me.zoomListener = d3.zoom().scaleExtent([0.001, 1000]).on("zoom", zoom);

	// Create svg canvas to draw in
	me.svg = me.parentNode.insert("svg:svg",":first-child")
		.attr("width",  me.svgWidth)
		.attr("height", me.svgHeight)
		.call(me.zoomListener);
	Utils.addEvent(window, "resize", function(){
		var sz = Utils.getSizesFromConfig(me);
		me.svgWidth  = sz.width;
		me.svgHeight = sz.height;
		me.viewWidth  = me.svgWidth  - me.margin.right - me.margin.left;
		me.viewHeight = me.svgHeight - me.margin.top   - me.margin.bottom;
		me.svg.attr("width",  me.svgWidth)
			  .attr("height", me.svgHeight);
	});

	// Append graph vertices markers into 'defs' section of svg
	me.svg.append("svg:defs").selectAll("marker")
		.data(me.verticesTypes)
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

	me.vis = me.svg.append("svg:g");
	me.loadData();
}

TycoonGraph.prototype.loadData = function() {
	var me = this;

	me.edges    = me.store.getEdges();
	me.vertices = me.store.getVertices();
	me.prepareData();
	me.draw();
	me.drawRoute(me.pathObj.raw);
}

TycoonGraph.prototype.prepareData = function() {
	var me = this;
	me.verticesSize = me.store.getVerticesSize();

	me.createAdjacencyList();
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

	var legendStore = new TycoonStore({
		edgesFile:    './data/legendEdges.json',
		verticesFile: './data/legendVertices.json',
		onDataReady: function () {
			tycoonGraph = new TycoonGraph({
				parentId:   me.legendId,
				configFile: me.configLegendFile,
				store: legendStore
			});
		}
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

TycoonGraph.prototype.drawEdges = function(edges, className, strokeWidth, drawMarkers, edgesColor) {
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
			.attr('d', function(d) { return 'M ' +  vertices[d.source-1].x*scale + ' ' +  (verticesSize.maxY - vertices[d.source-1].y)*scale  + 
				' L ' + vertices[d.target-1].x*scale + ' ' + (verticesSize.maxY - vertices[d.target-1].y)*scale} );
	/* update coordinates edges */
	graphEdges
		.filter(function(d) { return typeof d.coords != 'undefined'; })
		.datum(function(d) {return d.coords;})
			.attr('d', edgeLine)
	/* draw new straight edges */
	graphEdgesEnter
		.filter(function(d) { return typeof d.coords === 'undefined'; })
		.append('path')
			.attr('class', className)
			.attr('stroke-width', strokeWidth)
			.attr('stroke', function() {return (edgesColor ? edgesColor : me.defaultRouteColor);})
			.attr('marker-end', function() {return drawMarkers ? me.getMarkerDst.apply(me, arguments) : null;})
			.attr('marker-start', function() {return drawMarkers ? me.getMarkerSrc.apply(me, arguments) : null;})
			.attr('d', function(d) { return 'M ' +  vertices[d.source-1].x*scale + ' ' +  (verticesSize.maxY - vertices[d.source-1].y)*scale + 
				' L ' + vertices[d.target-1].x*scale + ' ' + (verticesSize.maxY - vertices[d.target-1].y)*scale} );
	/* draw new coordinates edges */
	graphEdgesEnter
		.filter(function(d) { return typeof d.coords != 'undefined'; })
		.append('path')
			.attr('class', className)
			.attr('stroke-width', strokeWidth)
			.attr('stroke', function() {return (edgesColor ? edgesColor : me.defaultRouteColor);})
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
	var graphVertices = me.graphVertices = svgG.selectAll('.' + className)
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
	var pathVertices = me.pathObj.vertices;
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
			.style("font-size", me.labelFontSize)
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
			.style("font-size", me.pathLabelFontSize)
			.attr('x', x)
			.attr('y', y)
			.text(function(d) { return d.label;})
			.style('fill-opacity', 1);
	pathLabelVertices.exit().remove();/* remove */
}

TycoonGraph.prototype.drawVertice = function(verticeId) {
	var me = this,
		vertices = me.vertices,
		scale = me.scale,
		verticesSize = me.verticesSize;

	//get the needed vertice
	var curVertice = me.vertices.filter(function(vertice) {
		return vertice.id === verticeId;
	});

	var className = me.hierarchyOrder[me.hierarchyOrderIds.curVertice];
	var svgG = me.getSvgGroupByClass(className);

	/* prepare to draw vertices */
	var vertice = svgG.selectAll('.' + className)
		.data(curVertice);
		//.filter(function(d) { return (d.id === verticeId) ? d : null; });

	vertice.enter()
		.append("svg:g")
			.attr('class', className)
			.attr('transform', function(d) {return 'translate(' + d.x*scale + ',' + (verticesSize.maxY - d.y)*scale + ')'; })
		.append("circle")
			.attr('cx', 0)
			.attr('cy', 0)
			.attr('stroke-width',  me.verticeBorder + 3)
			.attr('r', me.verticeRadius + 5);

	vertice.exit().remove()
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

TycoonGraph.prototype.drawRoute = function(verticesRaw, zoomTo, color) {
	if (typeof zoomTo === 'undefined') zoomTo = true;
	var me = this;

	if (verticesRaw){
		var verticesArray = Array.isArray(verticesRaw) ? verticesRaw : verticesRaw.split(',');
		var preparedData = me.parepareVerticesRawData(verticesArray);

		me.pathObj.raw   = verticesRaw;
		me.pathObj.edges = preparedData.edges;
		me.pathObj.vertices = preparedData.vertices;
		me.pathObj.minX  = preparedData.minX; me.pathObj.maxX = preparedData.maxX;
		me.pathObj.minY  = preparedData.minY; me.pathObj.maxY = preparedData.maxY;
	} else
		me.pathObj = {
			raw: "",
			edges: [],
			vertices: [],
			maxX: -Infinity,
			maxY: -Infinity,
			minX: Infinity,
			minY: Infinity
		}
	me.drawEdges(me.pathObj.edges, me.hierarchyOrder[me.hierarchyOrderIds.paths], me.pathWidth, false, color);
	me.drawLabels();

	if (zoomTo && verticesRaw) me.zoomTo(me.pathObj);
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