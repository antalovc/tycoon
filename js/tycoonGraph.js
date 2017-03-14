function TycoonGraph(data) {
	var me = this;

	this.edges      = data.edges;
	this.vertices   = data.vertices;
	this.path       = (data.path) ? data.path : [];
	me.createAdjacencyList();

	this.parentNode = d3.select('#' + data.parentId);
	this.width      = data.width;
	this.height     = data.height;
	this.margin     = {top: 20, right: 20, bottom: 20, left: 20};
	this.viewWidth  = this.width  - this.margin.right - this.margin.left;
	this.viewHeight = this.height - this.margin.top   - this.margin.bottom;

	this.calibrateScale = 3.3;
	this.edgeWidth = 1;
	this.pathWidth = 2;
	this.verticeRadius = 2;
	this.verticeBorder = 1;

	this.verticesTypes = ["DEADEND", "SWITCH", "PLATFORM", "GATEWAY"];
	this.verticesTypesColors = ["darkslategray", "cyan", "brown", "lightseagreen"]
	this.verticesTypesIds = {DEADEND: 1, SWITCH: 2, PLATFORM: 3, GATEWAY: 4};

	var verticesSizes = this.verticesSizes = {
		maxX: -Infinity, maxY: -Infinity,
		minX: Infinity,  minY: Infinity
	}
	this.vertices.forEach(function (vt) {
		if (verticesSizes.maxX < vt.x) verticesSizes.maxX = vt.x;
		if (verticesSizes.maxY < vt.y) verticesSizes.maxY = vt.y;
		if (verticesSizes.minX > vt.x) verticesSizes.minX = vt.x;
		if (verticesSizes.minY > vt.y) verticesSizes.minY = vt.y;
	});

	// Define the zoom function for the zoomable tree
	function zoom() {
		me.vis.attr("transform", d3.event.transform);
	}
	
	// define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
	this.zoomListener = d3.zoom().scaleExtent([0.01, 3]).on("zoom", zoom);

	this.svg = this.parentNode.append("svg:svg")
		.attr("width",  this.width)
		.attr("height", this.height)
		.call(this.zoomListener);

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
	//me.zoomListener.translateBy(this.vis, this.margin.left + this.width/2, this.margin.top+this.height/2);
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

TycoonGraph.prototype.draw = function() {
	var me = this,
		edges = me.edges,
		vertices = me.vertices;

	/* get graph scale */
	var verticesSizes = me.verticesSizes;
	var scaleX = me.viewWidth/(verticesSizes.maxX - verticesSizes.minX),
		scaleY = me.viewHeight/(verticesSizes.maxY - verticesSizes.minY);
	var scale = me.scale = ((scaleX > scaleY) ? scaleY : scaleX) * me.calibrateScale;

	/* set inital zoom and positions */
	me.zoomListener.translateBy(me.svg, 
		-me.width*(me.calibrateScale-1)/2 + me.margin.left*me.calibrateScale, 
		-me.height*(me.calibrateScale-1)/2 + me.margin.top*me.calibrateScale);
	me.zoomListener.scaleTo(me.svg, 1/me.calibrateScale);

	me.setPath([]);
	me.drawEdges(me.edges, 'edge', me.edgeWidth);
	me.drawVertices();
}

TycoonGraph.prototype.drawEdges = function(edges, className, strokeWidth, drawMarkers) {
	if (typeof drawMarkers === 'undefined') drawMarkers = true;

	var me = this,
		vertices = me.vertices,
		scale = me.scale,
		verticesSizes = me.verticesSizes;

	/* function to draw curve edges by given coordinates */
	var edgeLine = d3.line()
		.curve(d3.curveBasis)
		//worse: .curve(d3.curveCatmullRom)
		//much worse: .curve(d3.curveMonotoneX)
		//much much worse:: .curve(d3.curveCardinal)
		.x(function(d) { return d.x*scale; })
		.y(function(d) { return (verticesSizes.maxY - d.y)*scale; });

	/* prepare to draw edges */
	var graphEdges = me.vis.selectAll('.' + className)
		.data(edges);
	var graphEdgesEnter = graphEdges.enter()/*,
		graphEdgesUpdate = graphEdges.update();

	/* update straight edges */
	graphEdges
		.filter(function(d) { return typeof d.coords === 'undefined'; })
			.attr('x1', function(d) { return vertices[d.source-1].x*scale })
			.attr('y1', function(d) { return (verticesSizes.maxY - vertices[d.source-1].y)*scale })
			.attr('x2', function(d) { return vertices[d.target-1].x*scale })
			.attr('y2', function(d) { return (verticesSizes.maxY - vertices[d.target-1].y)*scale });
	/* update coordinates edges */
	graphEdges
		.filter(function(d) { return typeof d.coords != 'undefined'; })
			.attr('stroke-width', strokeWidth);
	/* draw new straight edges */
	graphEdgesEnter
		.filter(function(d) { return typeof d.coords === 'undefined'; })
		.append('line')
			.attr('class', className)
			.attr('stroke-width', strokeWidth)
			.attr('x1', function(d) { return vertices[d.source-1].x*scale })
			.attr('y1', function(d) { return (verticesSizes.maxY - vertices[d.source-1].y)*scale })
			.attr('x2', function(d) { return vertices[d.target-1].x*scale })
			.attr('y2', function(d) { return (verticesSizes.maxY - vertices[d.target-1].y)*scale })
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
		verticesSizes = me.verticesSizes;

	/* prepare to draw vertices */
	var graphVertices = me.vis.selectAll('.vertice')
		.data(vertices)
		.enter().append("svg:g")
			.attr('class', 'vertice')
			.attr('transform', function(d) {return 'translate(' + d.x*scale + ',' + (verticesSizes.maxY - d.y)*scale + ')'; });

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
	graphVertices
		.filter(function(d) { return d.marker === me.verticesTypesIds.PLATFORM; })
		.append('rect')
			.attr('class', 'platformMark')
			.attr('x', -me.verticeRadius*1.5)
			.attr('y', -me.verticeRadius*1)
			.attr('width', me.verticeRadius*3)
			.attr('height', me.verticeRadius*2)
			.attr('stroke-width',  me.verticeBorder)
			.attr('r', me.verticeRadius);

	/* draw text labels */
	graphVertices.append("svg:text")
			.attr('class', 'verticeLabel')
			.attr('x', function(d) {return me.verticeRadius*1.7;})
			.attr('y', function(d) {return -me.verticeRadius*0.2;})
			.text(function(d) { return d.label;})
			.style('fill-opacity', 1);
}

TycoonGraph.prototype.convertVerticesArrayToEdgeArray = function(verticesArray) {
	var me = this, edge,
		edgeArray = [];
	for (var i = 0; i < verticesArray.length-1; i++) {
		if (edge = me.adjacencyList[verticesArray[i]-1][verticesArray[i+1]-1])
			edgeArray.push(edge);
		else
			edgeArray.push({source: verticesArray[i], target: verticesArray[i+1]});
	}
	return edgeArray;
}

TycoonGraph.prototype.setPath = function(verticesArray) {
	this.path = this.convertVerticesArrayToEdgeArray(verticesArray);
	this.drawPath();
}

TycoonGraph.prototype.drawPath = function() {
	var me = this;
	me.drawEdges(me.path, 'path', me.pathWidth, false);
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