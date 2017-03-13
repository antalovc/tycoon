function TycoonGraph(data) {
	var me = this;

	this.edges      = data.edges;
	this.vertices   = data.vertices;
	this.parentNode = d3.select('#' + data.parentId);
	this.width      = data.width;
	this.height     = data.height;
	this.margin     = {top: 20, right: 20, bottom: 20, left: 20};
	this.viewWidth  = this.width  - this.margin.right - this.margin.left;
	this.viewHeight = this.height - this.margin.top   - this.margin.bottom;

	this.calibrateScale = 2;
	this.edgeWidth = 1;
	this.verticeRadius = 2;
	this.verticeBorder = 1;

	this.verticesTypes = {
		DEADEND: 1,
		SWITCH: 2,
		PLATFORM: 3,
		GATEWAY: 4
	};

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
	this.svg.append("svg:defs")
		.text('<defs>\
			<marker id="SWITCH" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">\
				<path d="M0,0 L0,6 L9,3 z" fill="#f00" />\
			</marker>\
		</defs>');
	this.vis = this.svg.append("svg:g");
	//me.zoomListener.translateBy(this.vis, this.margin.left + this.width/2, this.margin.top+this.height/2);
}

TycoonGraph.prototype.draw = function(svg) {
	var me = this,
		edges = me.edges,
		vertices = me.vertices;

	/* get graph scale */
	var verticesSizes = me.verticesSizes;
	var scaleX = me.width/(verticesSizes.maxX - verticesSizes.minX),
		scaleY = me.height/(verticesSizes.maxY - verticesSizes.minY),
		scale = (scaleX > scaleY) ? scaleY : scaleX;
	scale *= me.calibrateScale;

	/* draw edges */
	var graphEdges = me.vis.selectAll('.edge')
		.data(edges)
		.enter();

	var graphEdgesStraight = graphEdges
		.filter(function(d) { return typeof d.coords === "undefined"; })
		.append('line')
			.attr('class', 'edge')
			.attr('stroke-width', me.edgeWidth)
			.attr("x1", function(d) { return vertices[d.source-1].x*scale })
			.attr("y1", function(d) { return (verticesSizes.maxY - vertices[d.source-1].y)*scale })
			.attr("x2", function(d) { return vertices[d.target-1].x*scale })
			.attr("y2", function(d) { return (verticesSizes.maxY - vertices[d.target-1].y)*scale });

	var edgeLine = d3.line()
		.curve(d3.curveBasis)
		//worse: .curve(d3.curveCatmullRom)
		//much worse: .curve(d3.curveMonotoneX)
		//much much worse:: .curve(d3.curveCardinal)
		.x(function(d) { return d.x*scale; })
		.y(function(d) { return (verticesSizes.maxY - d.y)*scale; });
	var graphEdgesByCoords = graphEdges
		.filter(function(d) { return typeof d.coords != "undefined"; })
		.append('path')
			.attr('class', 'edge')
			.attr('stroke-width', me.edgeWidth)
			.datum(function(d) {return d.coords;})
			.attr("d", edgeLine);

	/* draw vertices */
	var graphVertices = me.vis.selectAll(".vertice")
		.data(vertices)
		.enter().append("svg:g")
			.attr("class", "vertice")
			.attr("transform", function(d) {return "translate(" + d.x*scale + "," + (verticesSizes.maxY - d.y)*scale + ")"; });

	graphVertices
		.filter(function(d) { return d.coords != "undefined"; })
		.append("circle")
			.attr('class', 'verticeMark')
			.attr("cx", 0)
			.attr("cy", 0)
			.attr('stroke-width',  me.verticeBorder)
			.attr("r", me.verticeRadius);
	graphVertices.append("svg:text")
			.attr("class", "verticeLabel")
			.attr("x", function(d) {return me.verticeRadius*1.2;})
			.attr("y", function(d) {return -me.verticeRadius;})
			.text(function(d) { return d.label;})
			.style("fill-opacity", 1);
}

//Graph with adjacent list http://blog.benoitvallon.com/data-structures-in-javascript/the-graph-data-structure/
//Force graph from adjacent list https://bl.ocks.org/mbostock/1199811
//Lots of Examples http://christopheviau.com/d3list/gallery.html
//Subdata http://bl.ocks.org/stepheneb/1183998