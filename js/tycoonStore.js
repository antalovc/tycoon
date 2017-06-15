function TycoonStore(config) {
	var me = this;

	//config members
	me.edgesFile    = null;
	me.verticesFile = null;
	me.onDataReady  = null;

	//inner members
	me._edges    = null;
	me._vertices = null;
	me._schedule = null;
	me._verticesSize = null;

	me.initConfig(config);
}

TycoonStore.prototype.initConfig = function(config) {
	/* load config */
	var me = this;
	me.edgesFile    = config.edgesFile;
	me.verticesFile = config.verticesFile;
	me.scheduleFile = config.scheduleFile;
	me.onDataReady  = config.onDataReady;

	me.loadData();
}

TycoonStore.prototype.loadData = function() {
	var me = this;

	var cb = function(error, edges, vertices, schedule) {
		if (!error) {
			me._edges = edges;
			me._vertices = vertices;
			if (me.scheduleFile) me._schedule = schedule;
			if (me.onDataReady) me.onDataReady();
			me.prepareData();
		} else console.warn("Failed load data file:\n' + error");
	}

	if (me.scheduleFile)
		d3.queue()
		.defer(d3.json, me.edgesFile)
		.defer(d3.json, me.verticesFile)
		.defer(d3.json, me.scheduleFile)
		.await(cb);
	else
		d3.queue()
		.defer(d3.json, me.edgesFile)
		.defer(d3.json, me.verticesFile)
		.await(cb);
}

TycoonStore.prototype.prepareData = function() {
	var me = this;
	var verticesSize = me._verticesSize = {
		maxX: -Infinity, maxY: -Infinity,
		minX: Infinity,  minY: Infinity
	}

	this._vertices.forEach(function (vt) {
		if (verticesSize.maxX < vt.x) verticesSize.maxX = vt.x;
		if (verticesSize.maxY < vt.y) verticesSize.maxY = vt.y;
		if (verticesSize.minX > vt.x) verticesSize.minX = vt.x;
		if (verticesSize.minY > vt.y) verticesSize.minY = vt.y;
	});
}
/*
TycoonStore.prototype.createAdjacencyList = function() {
	var me = this;
	me.adjacencyList = new Array(me.vertices.length);
	for (var i = 0; i < me.adjacencyList.length; i++)
		me.adjacencyList[i] = {};
	me.edges.forEach(function(edge) {
		me.adjacencyList[edge.source-1][edge.target-1] = edge;
		me.adjacencyList[edge.target-1][edge.source-1] = edge;
	});
}*/

TycoonStore.prototype.getEdges = function() { 
	return this._edges;
}

TycoonStore.prototype.getVertices = function() { 
	return this._vertices;
}

TycoonStore.prototype.getSchedule = function() { 
	return this._schedule;
}

TycoonStore.prototype.getVerticesSize = function() { 
	return this._verticesSize;
}