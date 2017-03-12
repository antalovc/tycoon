function TycoonGraph(edges, vertices) {
	var me = this;

	me.edges = edges;
	me.vertices = vertices;
	me.margin = {top: 20, right: 120, bottom: 20, left: 120};

	var verticesSizes = me.verticesSizes = {
		maxX: -Infinity, maxY: -Infinity,
		minX: Infinity,  minY: Infinity
	}
	me.vertices.forEach(function (vt) {
		if (verticesSizes.maxX < vt.x) verticesSizes.maxX = vt.x;
		if (verticesSizes.maxY < vt.y) verticesSizes.maxY = vt.y;
		if (verticesSizes.minX > vt.x) verticesSizes.minX = vt.x;
		if (verticesSizes.minY > vt.y) verticesSizes.minY = vt.y;
	});
}

TycoonGraph.prototype.draw = function(svg) {
	var me = this,
		edges = me.edges,
		vertices = me.vertices;

	/* create group to place graph */
	me.width = +svg.attr("width") - me.margin.right - me.margin.left;
	me.height = +svg.attr("height") - me.margin.top - me.margin.bottom;
	me.svg = svg
		.append("svg:g")
		.attr("transform", "translate(" + me.margin.left + "," + me.margin.top + ")");

	/* get graph scale */
	var verticesSizes = me.verticesSizes;
	var scaleX = me.width/(verticesSizes.maxX - verticesSizes.minX),
		scaleY = me.height/(verticesSizes.maxY - verticesSizes.minY),
		scale = (scaleX > scaleY) ? scaleY : scaleX;

	/* draw vertices */
	var graphVertices = me.svg.selectAll("circle")
		.data(vertices)
		.enter().append("circle")
			.attr('class', 'vertice')
			.attr("cx", function(d) { return d.x*scale; })
			.attr("cy", function(d) { return d.y*scale; })
			.attr("r", 4);

	/* draw edges */
	var graphEdges = me.svg.selectAll('.edge')
		.data(edges)
		.enter();
		/*or use .each(function(d){
			var toAppend = $(this);
			if (!!d.property){
			  toAppend.appendtoGroup1();
			} else {
			  toAppend.appendToGroup2();
			}
		} */

	var graphEdgesStraight = graphEdges
		.filter(function(d) { return typeof d.coords === "undefined"; })
		.append('line')
			.attr('class', 'edge')
			.attr("x1", function(d) { return vertices[d.source-1].x*scale })
			.attr("y1", function(d) { return vertices[d.source-1].y*scale })
			.attr("x2", function(d) { return vertices[d.target-1].x*scale })
			.attr("y2", function(d) { return vertices[d.target-1].y*scale });

	var edgeLine = d3.line()
		.curve(d3.curveMonotoneX)
		.x(function(d) { return d.x*scale; })
		.y(function(d) { return d.y*scale; });
	var graphEdgesByCoords = graphEdges
		.filter(function(d) { return typeof d.coords != "undefined"; })
		.append('path')
			.datum(function(d) {return d.coords;})
			.attr("d", edgeLine)
			.attr('class', 'edge');
}

//Graph with adjacent list http://blog.benoitvallon.com/data-structures-in-javascript/the-graph-data-structure/
//Force graph from adjacent list https://bl.ocks.org/mbostock/1199811
//Lots of Examples http://christopheviau.com/d3list/gallery.html
//Subdata http://bl.ocks.org/stepheneb/1183998