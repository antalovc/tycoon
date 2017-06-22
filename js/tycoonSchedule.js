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
					if (error) return console.warn('Failed load vertices file at ' + 
						config.configFile + ':\n' + error);
					me.initConfig(Utils.mergeObjs(config, configContents));
				})
	}
	else
		me.initConfig(config);
}

TycoonSchedule.prototype.initConfig = function(config) {

	this.store = config.store;
	if (!this.store) console.warn('Tycoon schedule: no data store provided');

	//defaults
	this.width    = '100%';
	this.height   = '100%';
	this.margin   = {top: 50, right: 50, bottom: 50, left: 50};
	this.fromTime = '00:00';
	this.toTime   = '23:59';

	Utils.mergeObjs(this, config);

	/* mandatory config params: */
	// ["parentId", "width", "height"]
	this.parentNode = d3.select('#' + config.parentId);

	var sz = Utils.getSizesFromConfig(config);
	this.width      = sz.width;
	this.height     = sz.height;

	this.viewWidth  = this.width  - this.margin.right - this.margin.left;
	this.viewHeight = this.height - this.margin.top   - this.margin.bottom;

	this.initVisuals();
}

TycoonSchedule.prototype.initVisuals = function() {
	var me = this;

	// Define the zoom function for the zoomable tree
	/*function zoom() {
		var duration = 0;
		if (!d3.event.sourceEvent) duration = me.zoomDuration;
		me.vis.transition().duration(duration).attr("transform", d3.event.transform);
	}*/
	// Define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
	/*this.zoomListener = d3.zoom().scaleExtent([0.001, 1000]).on("zoom", zoom);*/

	// Create svg canvas to draw in
	this.svg = this.parentNode.insert('svg:svg', ':first-child')
		.attr('width',  this.width)
		.attr('height', this.height)
		/*.call(this.zoomListener)*/;

	this.vis = this.svg.append('svg:g');

	this.loadData();
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

	//get list of unique vertices and their ids if needed
	me.handledVertices = [],
	me.handledVerticesIds = [];
	if (me.removeAbsentVertices) {
		me.trains.forEach(function(d) {
			d.schedule.forEach(function(st) {
				me.handledVerticesIds.push(st.id);
			})
		});
		me.handledVerticesIds = Utils.UniqueSort(me.handledVerticesIds);
		me.handledVerticesIds.forEach(function(id) {
			me.handledVertices.push(me.vertices[id-1]);
		});
	}
	else {
		me.handledVertices = me.vertices;
		me.handledVerticesIds = me.vertices;
	}
}

TycoonSchedule.prototype.draw = function() {
	var me = this;

	me.calculatedViewWidth = me.verticesInterval * me.handledVertices.length;

	me.svg
		.attr('width', me.calculatedViewWidth + me.margin.left + me.margin.right)		;

	me.vis.attr('width', me.calculatedViewWidth)
		.attr('transform', "translate(" + me.margin.left + "," + me.margin.top + ")");

	me.drawTimeAxis();
	me.drawStationsAxis();
	me.drawTrains();
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

	var trains = me.vis.append("g")
		.attr("class", "schedule-trains")
		.selectAll("g")
		.data(me.trains)
		.enter();

	//create groups for each route
	var train = trains.append("g")
		.attr("class", "schedule-train")
		.attr("stroke", function(d, i) { return colors[i]; });

	//add route that connects all points to show on hover
	train.append("path")
		.attr("class", "schedule-backline")
		.attr("d", function(d) {return line(d.schedule); });

	//add route that connects only connected points
	train.append("path")
		.attr("class", "schedule-line")
		.attr("d", function(d) { return line(d.schedule); })

	//add stations markers
	train.selectAll(".schedule-station")
		.data(function(d) { return d.schedule; })
		.enter().append("circle")
			.attr("class", "schedule-station")
			.style("display",     function(d) { return d == null ? "none" : null; })
			.attr("transform",    function(d) { return d !== null ? ("translate(" + me.xScale(d.id) + "," + me.yScale(me.parseTime(d.time)) + ")") : null; })
			.attr("fill",         function(d) { return d !== null ? "#fff" : null; })
			.attr("stroke-width", function(d) {return d !== null ? (d.status ? "4px" : "1.5px") : null; })
			.attr("r", 2);

	train
		.on("mouseover", function(d) {
			if (me.graph) 
				me.graph.drawRoute(d.schedule.map(function(station) {
					return station.id;
				}), false);
		})
		.on("mouseout",  function(d) {var a = 1;});
}