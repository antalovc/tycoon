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
}

TycoonSchedule.prototype.draw = function() {
	var me = this;

	me.calculatedViewWidth = me.verticesInterval * me.vertices.length;

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

	me.formatTime = d3.timeFormat('%H:%M');
	me.parseTime  = d3.timeParse('%H:%M');

	me.yScale = d3.scaleTime()//time.scale()
		.domain([me.parseTime(me.fromTime), me.parseTime(me.toTime)])
		.range([0, me.viewHeight]);

	var yAxisLeft = d3.axisLeft()
		.scale(me.yScale)
		.ticks(6)
		.tickFormat(me.formatTime);

	me.vis.append("g")
		.call(yAxisLeft);
}

TycoonSchedule.prototype.drawStationsAxis = function() {
	var me = this;

	me.xScale = d3.scaleLinear()//scale.linear()
		.domain([0, me.vertices.length-1])
		.range([0, me.verticesInterval * me.vertices.length]);

	var station = me.vis.append("g")
		.attr("class", "stations")
		.selectAll("g")
		.data(me.vertices)
		.enter().append("g")
		.attr("transform", function(d, i) { return "translate(" + me.xScale(i) + ",0)"; });
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
		.x(function(d, i) { return me.xScale(i); })
		.y(function(d) { return me.yScale(me.parseTime(d.time)); })
		/*.interpolate("linear")*/;

	var colors = Utils.generateNColors(me.trains.length);

	var trains = me.vis.append("g")
		.attr("class", "trains")
		.selectAll("g")
		.data(me.trains)
		.enter();

	var train = trains.append("g")
		.attr("class", "train");
	train.append("path")
		.attr("d", function(d) { return line(d.schedule); })
		.attr("stroke", function(d, i) { return colors[i]; });
	train.selectAll("circle")
		.data(function(d) { return d.schedule; })
		.enter()
			.filter(function(d) { return d; })
		.append("circle")
			.attr("transform", function(d, i) { return "translate(" + me.xScale(i) + "," + me.yScale(me.parseTime(d.time)) + ")"; })
			.attr("r", 2);
}