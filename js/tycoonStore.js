var TycoonStore = (function () {

	//private members
	var _edges = null,
		_vertices = null,
		_schedule = null,
		_verticesSize = null;

	// Constructor
	function TycoonStore(config) {
		var me = this;

		//config members
		me.edgesFile = null;
		me.verticesFile = null;
		me.onDataReady = null;


		me.initConfig(config);
	}

	TycoonStore.prototype.initConfig = function (config) {
		/* load config */
		var me = this;
		me.edgesFile = config.edgesFile;
		me.verticesFile = config.verticesFile;
		me.scheduleFile = config.scheduleFile;
		me.onDataReady = config.onDataReady;

		me.sortByX = config.sortByX;

		me.loadData();
	}

	TycoonStore.prototype.loadData = function () {
		var me = this;

		var cb = function (error, edges, vertices, schedule) {
			if (!error) {
				_edges = edges;
				_vertices = vertices;
				if (me.scheduleFile) _schedule = schedule;
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

	TycoonStore.prototype.prepareData = function () {
		var me = this;
		var verticesSize = _verticesSize = {
			maxX: -Infinity,
			maxY: -Infinity,
			minX: Infinity,
			minY: Infinity
		}

		_vertices.forEach(function (vt) {
			if (verticesSize.maxX < vt.x) verticesSize.maxX = vt.x;
			if (verticesSize.maxY < vt.y) verticesSize.maxY = vt.y;
			if (verticesSize.minX > vt.x) verticesSize.minX = vt.x;
			if (verticesSize.minY > vt.y) verticesSize.minY = vt.y;
		});

		if (me.sortByX) sortVertices();
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

	TycoonStore.prototype.getEdges = function () {
		return _edges;
	}

	TycoonStore.prototype.getVertices = function () {
		return _vertices;
	}

	TycoonStore.prototype.getSchedule = function () {
		return _schedule;
	}

	TycoonStore.prototype.getVerticesSize = function () {
		return _verticesSize;
	}

	function sortVertices() {
		var me = this;

		//sort vertices by X coordinate
		var sortIndexes = new Array(_vertices.length);
		var sortedVertices = _vertices.sort(function (a, b) {
			return (a.x > b.x) ? 1 : -1 ;
		});

		//create sort map and update vertices into new ids
		for (var i = 0; i < sortedVertices.length; i++) {
			sortIndexes[sortedVertices[i].id - 1] = i + 1;
			sortedVertices[i].id = i + 1;
		}
		_vertices = sortedVertices;

		//update edges into new ids
		for (var i = 0; i < _edges.length; i++) {
			_edges[i].source = sortIndexes[_edges[i].source-1];
			_edges[i].target = sortIndexes[_edges[i].target-1];
		}

		//update schedule into new ids
		for (var i = 0; i < _schedule.length; i++) {
			for (var j = 0; j <  _schedule[i].schedule.length; j++) 
				 _schedule[i].schedule[j].id = sortIndexes[ _schedule[i].schedule[j].id-1];
		}
	}

	return TycoonStore;
})();