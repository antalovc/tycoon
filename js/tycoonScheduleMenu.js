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
	for (var i = 0; i < trains.length; i++)
		this.drawTrainItem(trainsDiv, trains[i]);
}

TycoonScheduleMenu.prototype.drawTrainItem = function(parentDiv, train) {
	var me = this;

	//create external div
	var trainDiv = document.createElement("div");
	trainDiv.setAttribute("class", "schedule-trainDiv");
	trainDiv.isTrainShown = true;
	trainDiv.idTrain = train.id_train;

	//create first inner div to contain colored circle
	var trainColorDiv = document.createElement("div");
	trainColorDiv.setAttribute("class", "schedule-trainColorDiv");
	trainColorDiv.style.backgroundColor = me.schedule.colors[train.id_train];

	//create second inner div to contain train"s id
	var trainIdDiv = document.createElement("div");
	trainIdDiv.setAttribute("class", "schedule-trainIdDiv");
	trainIdDiv.innerHTML = train.id_train;

	//add everything into document
	trainDiv.appendChild(trainColorDiv);
	trainDiv.appendChild(trainIdDiv);
	parentDiv.appendChild(trainDiv);

	//set events
	Utils.addEvent(trainDiv, "click", function(event) {
		var div = event.currentTarget;

		me.schedule.showTrain(div.idTrain, !div.isTrainShown);
		if (div.isTrainShown) 
			div.classList.add("schedule-trainDiv_inactive");
		else 
			div.classList.remove("schedule-trainDiv_inactive");

		div.isTrainShown = !div.isTrainShown;
	});
}