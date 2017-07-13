function TycoonScheduleMenu(config) {
	this.loadConfig(config);
}

TycoonScheduleMenu.prototype.loadConfig = function(config) {
	this.initConfig(config);
}

TycoonScheduleMenu.prototype.initConfig = function(config) {
	if (!config.schedule) console.warn("No parent element provided for trains list!"); 
	if (!config.parentId) console.warn("No schedule provided for trains list!"); 
	Utils.mergeObjs(this, config);

	this.draw();
}

TycoonScheduleMenu.prototype.draw = function() {
	var me = this;

	var parentEl = document.getElementById(me.parentId);

	//create the menu itself
	var menu = me.menu = document.createElement("div");
	menu.setAttribute("class", "schedule-menu");
	parentEl.insertBefore(menu, parentEl.firstChild);

	//create the button to invoke the menu
	var menuShowBtn = document.createElement("a");
	menuShowBtn.setAttribute("href", "#");
	menuShowBtn.setAttribute("class", "schedule-menuButton schedule-menuButton_showing");
	parentEl.insertBefore(menuShowBtn, parentEl.firstChild);
	Utils.addEvent(menuShowBtn, "click", function(event) {
		event.preventDefault();
		menu.classList.add("schedule-menu_shown");
	});

	//create the button to hide the menu
	var menuHideBtn = document.createElement("a");
	menuHideBtn.setAttribute("href", "#");
	menuHideBtn.setAttribute("class", "schedule-menuButton schedule-menuButton_hiding");
	menu.appendChild(menuHideBtn);
	Utils.addEvent(menuHideBtn, "click", function(event) {
		event.preventDefault();
		menu.classList.remove("schedule-menu_shown");
	});

	//me.drawOperationsList();
	me.drawTrainsList();
}

TycoonScheduleMenu.prototype.drawOperationsList = function() {
	var operationsDiv = document.createElement("div");
	operationsDiv.setAttribute("class", "schedule-operationsList");
	this.menu.appendChild(operationsDiv);
}

TycoonScheduleMenu.prototype.drawTrainsList = function() {
	var trainsDiv = document.createElement("div");
	trainsDiv.setAttribute("class", "schedule-trainsList");
	this.menu.appendChild(trainsDiv);

	var trains = this.schedule.trains;
	trainsIds = new Array(trains.length);
	for (var j = 0; j < trains.length; j++)
		trainsIds[j] = trains[j].id_train;
	this.drawTrainItem(trainsDiv, trainsIds, "Все поезда", "grey")
	for (var i = 0; i < trains.length; i++) {
		var trainId = trains[i].id_train;
		this.drawTrainItem(trainsDiv, trainId, trainId, this.schedule.colors[trainId]); 
	}
}

TycoonScheduleMenu.prototype.drawTrainItem = function(parentDiv, trainId, text, color) {
	var me = this;

	//create external div
	var idPrefix = "schedule-train-";
	var trainDiv = document.createElement("div");
	trainDiv.setAttribute("class", "schedule-trainDiv");
	trainDiv.isTrainShown = true;
	trainDiv.idTrain = trainId;
	trainDiv.setAttribute("id", idPrefix + trainId);

	//create first inner div to contain colored circle
	var trainColorDiv = document.createElement("div");
	trainColorDiv.setAttribute("class", "schedule-trainColorDiv");
	trainColorDiv.style.backgroundColor = color;

	//create second inner div to contain train"s id
	var trainIdDiv = document.createElement("div");
	trainIdDiv.setAttribute("class", "schedule-trainIdDiv");
	trainIdDiv.innerHTML = text;

	//add everything into document
	trainDiv.appendChild(trainColorDiv);
	trainDiv.appendChild(trainIdDiv);
	parentDiv.appendChild(trainDiv);

	//set events
	Utils.addEvent(trainDiv, "click", function(event) {
		var div = event.currentTarget,
			idTrain = div.idTrain,
			el, i;

		if (!Array.isArray(idTrain))
			me.schedule.showTrain(idTrain, !div.isTrainShown);
		else
			for (i = 0; i < idTrain.length; i++) {
				el = document.getElementById(idPrefix + idTrain[i]);
				me.schedule.showTrain(idTrain[i], !div.isTrainShown);
				el.isTrainShown = !div.isTrainShown;
				if (div.isTrainShown) 
					el.classList.add("schedule-trainDiv_inactive");
				else 
					el.classList.remove("schedule-trainDiv_inactive");
			}


		if (div.isTrainShown) 
			div.classList.add("schedule-trainDiv_inactive");
		else 
			div.classList.remove("schedule-trainDiv_inactive");

		div.isTrainShown = !div.isTrainShown;
	});
}