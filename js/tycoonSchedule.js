function TycoonSchedule(config) {
	var me = this;
	me.loadConfig(config);
}

TycoonSchedule.prototype.loadConfig = function(config) {
	/* load config */
	var me = this;
	if (config.configFile) {
		d3.json(config.configFile,
				function(error, configContents) {
					if (error) return console.warn("Failed load vertices file at " + 
						config.configFile + ":\n" + error);
					me.initConfig(Utils.mergeObjs(config, configContents));
				})
	}
	else
		me.initConfig(config);
}

TycoonSchedule.prototype.initConfig = function(config) {

	this.store = config.store;
	if (!this.store) console.warn("Tycoon schedule: no data store provided");

	//defaults
	this.width    = "100%";
	this.height   = "100%";
	this.margin   = {top: 50, right: 50, bottom: 50, left: 50};
	this.fromTime = "00:00";
	this.toTime   = "23:59";
	this.zoomMin  = 0.001;
	this.zoomMax  = 1000;
	this.colors   = {};

	Utils.mergeObjs(this, config);

	/* mandatory config params: */
	// ["parentId", "width", "height"]
	this.parentNode = d3.select("#" + config.parentId);

	var sz = Utils.getSizesFromConfig(config);
	this.svgWidth      = sz.width;
	this.svgHeight     = sz.height;

	this.viewWidth  = this.svgWidth  - this.margin.right - this.margin.left;
	this.viewHeight = this.svgHeight - this.margin.top   - this.margin.bottom;

	this.idPrefixer = "train_"; //d3.select doesn't like fully numerical ids 

	this.initVisuals();
}

TycoonSchedule.prototype.initVisuals = function() {
	var me = this;

	// Define the zoom function for the zoomable tree
	function zoom() {
		var duration = 0;
		me.vis.transition().duration(0).attr("transform", d3.event.transform);
	}
	// Define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
	me.zoomListener = d3.zoom()
		.scaleExtent([me.zoomMin, me.zoomMax])
		.on("zoom", zoom);

	// Create svg canvas to draw in
	me.svg = me.parentNode.insert("svg:svg", ":first-child")
		.attr("width",  me.svgWidth)
		.attr("height", me.svgHeight)
		.call(this.zoomListener);

	me.vis = me.svg.append("svg:g");

	me.loadData();
}

TycoonSchedule.prototype.loadData = function() {
	var me = this;

	me.edges    = me.store.getEdges();
	me.vertices = me.store.getVertices();
	me.trains   = me.store.getSchedule();
	me.prepareData();
	me.draw();
}

TycoonSchedule.prototype.prepareData = function() {
	var me = this;
	me.verticesSize = me.store.getVerticesSize();

	//get list of used vertices and their ids if needed
	me.handledVertices = [];      //array of handled vertices
	me.handledVerticesIds = [];   //array of their ids
	me.handledVerticesIdsMap = {};//object to map id to position in handledVertices
	me.operations = [];

	if (me.removeAbsentVertices) {
		//get ids of all the used vertices (non-unique)
		me.trains.forEach(function(d) {
			d.schedule.forEach(function(st) {
				me.handledVerticesIds.push(st.id);
			})
		});
		//sort vertices' ids and make remove non-unique
		me.handledVerticesIds = Utils.UniqueSort(me.handledVerticesIds);
		me.handledVerticesIds.forEach(function(id, index) {
			me.handledVertices.push(me.vertices[id-1]);
			me.handledVerticesIdsMap[id] = index;
		});
	}
	else {
		me.handledVertices = me.vertices;
		me.handledVertices.forEach(function(vertice, index) {
			me.handledVerticesIds.push(vertice.id);
			me.handledVerticesIdsMap[vertice.id] = index;
		});
	}
}

TycoonSchedule.prototype.draw = function() {
	var me = this;

	me.calculatedViewWidth = me.verticesInterval * me.handledVertices.length;
	me.vis.attr("width", me.calculatedViewWidth);

	//now that we can appreciate schedule's size - set zooms
	maxWidth = me.calculatedViewWidth > me.viewWidth ? me.calculatedViewWidth : me.viewWidth;
	me.zoomListener.translateExtent([
		[-me.margin.left, -me.margin.top], 
		[maxWidth + me.margin.right, me.svgHeight-me.margin.top]
	]);
	me.svg.call(me.zoomListener.transform, 
		d3.zoomIdentity.translate(me.margin.left, me.margin.top)
	);

	me.drawTimeAxis();
	me.drawStationsAxis();
	me.drawTrains();
	me.drawMenu()
}

TycoonSchedule.prototype.drawMenu = function() {
	this.menu = new TycoonScheduleMenu({
		parentId: this.parentId,
		schedule: this
	});
}

TycoonSchedule.prototype.drawTimeAxis = function() {
	var me = this;

	me.formatTime = d3.timeFormat(me.timeFormat);
	me.parseTime  = d3.timeParse(me.timeFormat);

	me.yScale = d3.scaleTime()//time.scale()
		.domain([me.parseTime(me.fromTime), me.parseTime(me.toTime)])
		.range([0, me.viewHeight]);

	var yAxisLeft = d3.axisLeft()
		.scale(me.yScale)
		.ticks(me.nTicks)
		.tickFormat(me.formatTime);

	me.vis.append("g")
		.call(yAxisLeft);
}

TycoonSchedule.prototype.drawStationsAxis = function() {
	var me = this;

	me.xScale = me.removeAbsentVertices ?
		d3.scaleBand()
			.domain(me.handledVerticesIds)
			.range([0, me.verticesInterval * me.handledVertices.length]) :
		d3.scaleLinear()
			.domain([0, me.handledVertices.length-1])
			.range([0, me.verticesInterval * me.handledVertices.length]);
	

	var station = me.vis.append("g")
		.attr("class", "schedule-stations")
		.selectAll("g")
		.data(me.handledVertices)
		.enter().append("g")
		.attr("transform", function(d, i) { return "translate(" + me.xScale(d.id) + ",0)"; });
	station.append("text")
		.attr("class", "topAxis")
		.attr("x", 6)
		.attr("y", -10)
		.attr("transform", "rotate(-70, 6, -10)")
		.text(function(d) { return d.label; });
	station.append("text")
		.attr("class", "bottomAxis")
		.attr("x", 6)
		.attr("y", me.viewHeight + 10)
		.attr("transform", "rotate(-70, 6, " + (me.viewHeight + 10) + ")")
		.text(function(d) { return d.label; });
	/*station.append("text")
		.attr("x", -6)
		.attr("dy", ".35em")
		.text(function(d) { return d.label; });*/
	station.append("line")
		.attr("y2", me.viewHeight);
}

TycoonSchedule.prototype.drawTrains = function() {
	var me = this;
	var line = d3.line()
		.defined(function (d) { return d !== null; })
		.x(function(d) { return me.xScale(d.id); })
		.y(function(d) { return me.yScale(me.parseTime(d.time)); })
		/*.interpolate("linear")*/;

	var colors = Utils.generateNColors(me.trains.length);
	for (var i = 0; i < me.trains.length; i++)
		me.colors[me.trains[i].id_train] = colors[i]; 

	var trains = me.vis.append("g")
		.attr("class", "schedule-trains")
		.selectAll("g")
		.data(me.trains)
		.enter();

	//create groups for each route
	var train = trains.append("g")
		.attr("class", "schedule-train")
		.attr("id", function(d) {return me.idPrefixer + d.id_train; })
		.attr("stroke", function(d, i) { return me.colors[d.id_train]; })
		.attr("stroke-width", me.lineWidth);

	//add route that connects all points to show on hover
	train.append("path")
		.attr("class", "schedule-backline")
		.attr("d", function(d) {return line(d.schedule); });

	//add route that connects only connected points
	train.append("path")
		.attr("class", "schedule-line")
		.attr("d", function(d) { return line(d.schedule); })

	//add stations markers
	var station = train.selectAll(".schedule-station")
		.data(function(d) { return d.schedule; })
		.enter().append("circle")
			.attr("class", "schedule-station")
			.style("display",     function(d) { return d == null ? "none" : null; })
			.attr("transform",    function(d) { return d !== null ? ("translate(" + me.xScale(d.id) + "," + me.yScale(me.parseTime(d.time)) + ")") : null; })
			.attr("fill",         function(d) { return d !== null ? "#fff" : null; })
			.attr("stroke-width", function(d) {return d !== null ? (d.status.stopped ? "3px" : "1px") : null; })
			.attr("r", 2);

	//add tooltip
	me.tooltip = d3.select("body").append("div")
		.attr("class", "schedule-tooltip")
		.style("opacity", 0);

	//add hover events to train lines
	train
		.on("mouseover", function(d) {
			if (me.graph && !this.classList.contains("schedule-train_hidden")) 
				me.graph.drawRoute(d.schedule.map(function(station) {
					return station.id;
				}), false, me.colors[d.id_train]);
		})
		.on("mouseout",  function() {
			if (me.graph && !this.classList.contains("schedule-train_hidden")) me.graph.drawRoute();
		});

	//add hover events to stations, closure is needed to get train data for tooltip
	train.each(function(dTrain) {                   // dTrain refers to the data bound to the train
	  d3.select(this).selectAll(".schedule-station")
		.on("mouseover", function(dStation) {       // dStation refers to the data bound to the station
			if (this.parentNode.classList.contains("schedule-train_hidden")) return;
			var a = dTrain;
			if (me.graph) me.graph.drawVertice(dStation.id);
			me.tooltip
				.style("opacity", 1);
			me.tooltip.html("Поезд: " + dTrain.id_train + "<br/>" +
					"Станция: " + me.handledVertices[me.handledVerticesIdsMap[dStation.id]].label + "<br/>" +
					"Операция: " + dStation.status.operation + "<br/>" +
					"Время : " + dStation.time
				)
				.style("left", (d3.event.pageX + 15) + "px")
				.style("top", (d3.event.pageY - 28) + "px");
		})
		.on("mouseout",  function() {
			if (this.parentNode.classList.contains("schedule-train_hidden")) return;
			if (me.graph) me.graph.drawVertice();
			me.tooltip
				.style("opacity", 0);
		});
	});


	/*station
		.on("mouseover", function(d) {
			if (me.graph) me.graph.drawVertice(d.id);
			me.tooltip
				.style("opacity", 1);
			me.tooltip.html("Train: " + "<br/>" +
					"Station: " + me.handledVertices[me.handledVerticesIdsMap[d.id]].label + "<br/>" +
					"Operation: " + d.status.operation + "<br/>" +
					"Time : " + d.time
				)
				.style("left", (d3.event.pageX + 15) + "px")
				.style("top", (d3.event.pageY - 28) + "px");
		})
		.on("mouseout",  function() {
			if (me.graph) me.graph.drawVertice();
			me.tooltip
				.style("opacity", 0);
		});*/

}

TycoonSchedule.prototype.getTrainColorByID = function (id_train) {
	return this.colors[id_train];
}

TycoonSchedule.prototype.showTrain = function (id_train, show) {
	if (typeof show === "undefined") show = true;

	d3.select("#" + this.idPrefixer + id_train).classed("schedule-train_hidden", !show);
}

TycoonSchedule.prototype.filterOperations = function (operationsArray) {

}

TycoonSchedule.prototype.onResize = function() {
	var me = this;
	var sz = Utils.getSizesFromConfig(me);
	me.svgWidth  = sz.width;
	me.svgHeight = sz.height;
	me.viewWidth  = me.svgWidth  - me.margin.right - me.margin.left;
	me.viewHeight = me.svgHeight - me.margin.top   - me.margin.bottom;
	me.svg.attr("width",  me.svgWidth)
		  .attr("height", me.svgHeight);
}