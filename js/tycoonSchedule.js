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
					me.initConfig(me.mergeObjs(config, configContents));
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

	this.mergeObjs(this, config);

	/* mandatory config params: */
	// ["parentId", "width", "height"]
	this.parentNode = d3.select('#' + config.parentId);

	var sz = this.getSizes(config);
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

TycoonSchedule.prototype.getSizes = function(config) {
	var resHeight = config.height, 
		resWidth  = config.width,
		isWidthPc  = (typeof resWidth === 'string' && resWidth.slice(-1) === '%'),
		isHeightPc = (typeof resHeight === 'string' && resHeight.slice(-1) === '%');

	if (isWidthPc || isHeightPc) {
		var node = document.getElementById(config.parentId),
			style = getComputedStyle(node, null),
			sz = node.getBoundingClientRect();
			resHeight = (sz.height - parseInt(style.getPropertyValue('border-top-width')) 
				- parseInt(style.getPropertyValue('border-bottom-width')))
				* parseInt(resHeight) / 100;
			resWidth = (sz.width - parseInt(style.getPropertyValue('border-left-width')) 
				- parseInt(style.getPropertyValue('border-right-width')))
				* parseInt(resWidth) / 100;
	}

	return {width: resWidth, height: resHeight};
}

TycoonSchedule.prototype.draw = function() {
	var me = this;

	me.calculatedViewHeight = me.verticesInterval * me.vertices.length;

	me.svg
		.attr('height', me.calculatedViewHeight + me.margin.top + me.margin.bottom)		;

	me.vis.attr('height', me.calculatedViewHeight)
		.attr('transform', "translate(" + me.margin.left + "," + me.margin.top + ")");

	me.drawTimeAxis();
	me.drawStationsAxis();
	me.drawTrains();
}

TycoonSchedule.prototype.drawTimeAxis = function() {
	var me = this;

	me.formatTime = d3.timeFormat('%H:%M');
	me.parseTime  = d3.timeParse('%H:%M');

	me.xScale = d3.scaleTime()//time.scale()
		.domain([me.parseTime(me.fromTime), me.parseTime(me.toTime)])
		.range([0, me.viewWidth]);

	var xAxisTop = d3.axisTop()
		.scale(me.xScale)
		.ticks(6)
		.tickFormat(me.formatTime),
		xAxisBottom = d3.axisBottom()
		.scale(me.xScale)
		.ticks(6)
		.tickFormat(me.formatTime);

	me.vis.append("g")
		.call(xAxisTop);
	me.vis.append("g")
		.attr("transform", "translate(0," + me.calculatedViewHeight + ")")
		.call(xAxisBottom);

}

TycoonSchedule.prototype.drawStationsAxis = function() {
	var me = this;

	me.yScale = d3.scaleLinear()//scale.linear()
		.domain([0, me.vertices.length-1])
		.range([0, me.verticesInterval * me.vertices.length]);

	var station = me.vis.append("g")
		.attr("class", "stations")
		.selectAll("g")
		.data(me.vertices)
		.enter().append("g")
		.attr("transform", function(d, i) { return "translate(0," + me.yScale(i) + ")"; });
	station.append("text")
		.attr("x", -6)
		.attr("dy", ".35em")
		.text(function(d) { return d.label; });
	station.append("line")
		.attr("x2", me.viewWidth);
}

TycoonSchedule.prototype.drawTrains = function() {
	var me = this;
	var line = d3.line()
		.defined(function (d) { return d !== null; })
		.x(function(d) { return me.xScale(me.parseTime(d.time)); })
		.y(function(d, i) { return me.yScale(i); })
		/*.interpolate("linear")*/;

	var trains = me.vis.append("g")
		.attr("class", "trains")
		.selectAll("g")
		.data(me.trains)
		.enter();

	var train = trains.append("g")
		.attr("class", "train");
	train.append("path")
		.attr("d", function(d) { return line(d); });
	train/*.selectAll("circle")*/
		/*.data(function(d) { return d.stops; })*/
		/*.enter()*/.append("circle")
			.attr("transform", function(d, i) { return "translate(" + me.xScale(me.parseTime(d.time)) + "," + me.yScale(i) + ")"; })
			.attr("r", 2);
}

TycoonSchedule.prototype.mergeObjs = function(dst, src) {
	for (var attrname in src) { if (src.hasOwnProperty(attrname)) dst[attrname] = src[attrname]; }
	return dst;
};

//TODO: basic class or singleton for 
// mergeObjs,getSizes,loadConfig