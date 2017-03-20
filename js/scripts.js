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

var tycoonGraph = new TycoonGraph({
	configFile: './data/config.json',
	configLegendFile: './data/configLegend.json',
	calibrateScale: getParameterByName('calibrateScale'),
	edgesFile:  getParameterByName('edges'),
	verticesFile:  getParameterByName('vertices'),
	path: window.location.hash ? window.location.hash.substr(1) : ''
});

window.onhashchange = function() {
	tycoonGraph.setPath(window.location.hash ? window.location.hash.substr(1) : '');
};


