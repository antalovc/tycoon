var tycoonStore = null,
	tycoonGraph = null,
	tycoonSchedule = null;

function getParameterByName(name, url) {
	if (!url) {
		url = window.location.href;
	}
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var tycoonStore = new TycoonStore({
	edgesFile: getParameterByName('edges'),
	verticesFile: getParameterByName('vertices'),
	scheduleFile: getParameterByName('schedule'),
	sortByX: true,
	onDataReady: function () {

		tycoonGraph = new TycoonGraph({
			configFile: './config/config.json',
			configLegendFile: './config/configLegend.json',
			store: tycoonStore,
			calibrateScale: getParameterByName('calibrateScale'),
			path: window.location.hash ? window.location.hash.substr(1) : ''
		});
		window.onhashchange = function () {
			tycoonGraph.drawRoute(window.location.hash ? window.location.hash.substr(1) : '');
		};

		tycoonSchedule = new TycoonSchedule({
			configFile: './config/configSchedule.json',
			graph: tycoonGraph,
			store: tycoonStore,
		});

		Utils.addEvent(window, "resize", function() {
			if (tycoonGraph.onResize) tycoonGraph.onResize();
			if (tycoonSchedule.onResize) tycoonSchedule.onResize();
		});

	}
});