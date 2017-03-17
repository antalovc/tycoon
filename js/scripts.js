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
	parentId: 'tycoon',
	legendId: 'legend',
	width: '100%',
	height: '100%',
	calibrateScale: getParameterByName('calibrateScale'),
	edgesFile:  getParameterByName('edges'),
	verticesFile:  getParameterByName('vertices'),
	path: window.location.hash ? window.location.hash.substr(1) : '',
	margin: {top: 50, right: 50, bottom: 50, left: 50}
});

window.onhashchange = function() {
	tycoonGraph.setPath(window.location.hash ? window.location.hash.substr(1) : '');
};


