var zoom = d3.zoom();
var svg = d3.select("svg");
svg.call(d3.zoom()
	.scaleExtent([1 / 2, 4]));

	
var tycoonGraph = new TycoonGraph(edges, vertices);
tycoonGraph.draw(svg);


