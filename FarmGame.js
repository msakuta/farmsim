
function FarmGame(xs,ys){
	this.xs = xs;
	this.ys = ys;
	this.rng = new Xor128();

	this.cells = [];

	this.workingPower = 100;
	this.cash = 100;
	this.time = 0;
	this.autosave_time = 0;

	this.Cell = function(weeds){
		this.weeds = weeds;
		this.weedRoots = 0.5;
		this.plowed = false;
		this.corn = 0;
		this.humidity = 0.5;
	}
	this.Cell.prototype.serialize = function(){
		var v = this;
		return {
			weeds: this.weeds,
			weedRoots: this.weedRoots,
			plowed: this.plowed,
			corn: this.corn,
			humidity: this.humidity,
		};
	}
	this.Cell.prototype.deserialize = function(data){
		this.weeds = data.weeds;
		this.weedRoots = data.weedRoots;
		this.plowed = data.plowed;
		this.corn = data.corn;
		this.humidity = data.humidity;
	}
	this.Cell.prototype.plow = function(){
		var ret = !this.plowed || this.weeds != 0;
		this.weeds = 0;
		this.weedRoots *= 0.75; // You will have a hard time completely remove roots.
		this.plowed = true;
		this.humidity /= 2; // Plowing soil releases humidity inside it.
		return ret;
	}
	this.Cell.prototype.seed = function(){
		if(this.plowed && this.corn < 1){
			this.corn = 1;
			return true;
		}
		else
			return false;
	}
	this.Cell.prototype.harvest = function(){
		if(2 < this.corn){
			return true;
		}
		else
			return false;
	}
	this.Cell.prototype.water = function(){
		// Watering soil makes humidity to approach 1 but never reach it.
		this.humidity += (1. - this.humidity) * 0.5;
		return true;
	}
	this.Cell.prototype.weeding = function(){
		if(this.weeds == 0)
			return false;
		this.weeds = 0;
		this.weedRoots *= 0.75; // You will have a hard time completely remove roots.
		this.humidity *= 0.75; // Humidity is rather kept compared to plowing.
		return true;
	}
}

FarmGame.prototype.init = function(){
	if(typeof(Storage) !== "undefined"){
		this.deserialize(localStorage.getItem("FarmGameSave"));
	}
	else{
		for(var x = 0; x < this.xs; x++){
			var row = [];
			for(var y = 0; y < this.ys; y++){
				var weeds = this.rng.next();
				var cell = new this.Cell(weeds);

				this.onUpdateCell(cell,x,y);

				row.push(cell);
			}
			this.cells.push(row);
		}
	}
}

FarmGame.prototype.onUpdateCell = function(cell,x,y){}

FarmGame.prototype.update = function(){

	// Humidity coefficient of growth for crops and weeds
	function humidityGrowth(cell){
		return (cell.humidity + 0.25) / 1.25;
	}

	// The growth of the grass depends on adjacent cells' grass density.
	function getGrowth(cell,x,y,getter){
		var ret = 0;
		if(0 <= x - 1) ret += getter(this.cells[x - 1][y]);
		if(x + 1 < this.xs) ret += getter(this.cells[x + 1][y]);
		if(0 <= y - 1) ret += getter(this.cells[x][y - 1]);
		if(y + 1 < this.ys) ret += getter(this.cells[x][y + 1]);
		return ret * humidityGrowth(cell);
	}

	for(var x = 0; x < this.cells.length; x++){
		for(var y = 0; y < this.cells[x].length; y++){
			var cell = this.cells[x][y];

			// Obtain growth of weeds
			var growth = (0.0001
				+ getGrowth.call(this, cell, x, y, function(cell){return cell.weeds;}))
					* 0.0001 * cell.weedRoots;

			if(cell.weeds < 1. - growth)
				cell.weeds += growth;
			else
				cell.weeds = 1.;

			// The roots grow very slowly compared to stems and leaves
			var rootsGrowth = (cell.weedRoots
				+ getGrowth.call(this, cell, x, y, function(cell){return (cell.weeds + cell.weedRoots) * 0.1;}))
					* 0.00001;

			if(cell.weedRoots < 1. - rootsGrowth)
				cell.weedRoots += rootsGrowth;
			else
				cell.weedRoots = 1.;

			// Increase corn growth.  Lower growth if there are weeds.
			// If the corn grow enough, it will degrade no matter how weeds are grown, but it
			// still depends on humidity (wet crops rots faster).
			if(0 < cell.corn)
				cell.corn += 0.0005 * (cell.corn < 2 ? 1. - cell.weeds : 1.)
					* humidityGrowth(cell); // Humid soil grows crop better

			// Gradually disperse into the air
			cell.humidity *= 0.9999;

			game.onUpdateCell(cell,x,y);
		}
	}

	if(this.workingPower + 0.1 < 100)
		this.workingPower += 0.1;
	else
		this.workingPower = 100;

	this.time++;

	if(this.autosave_time + 100 < this.time){

		// Check for localStorage
		if(typeof(Storage) !== "undefined"){
			var serialData = this.serialize();
			localStorage.setItem("FarmGameSave", serialData);
			this.onAutoSave(serialData);
		}

		this.autosave_time += 100;
	}
}

FarmGame.prototype.serialize = function(){
	var saveData = {workingPower: this.workingPower, cash: this.cash, xs: this.xs, ys: this.ys};
	var cells = [];
	for(var x = 0; x < this.cells.length; x++){
		var row = [];
		for(var y = 0; y < this.cells[x].length; y++){
			var v = this.cells[x][y];
			row.push(v.serialize());
		}
		cells.push(row);
	}
	saveData.cells = cells;
	return JSON.stringify(saveData);
}

FarmGame.prototype.deserialize = function(stream){
	var data = JSON.parse(stream);
	if(data != null){
		this.workingPower = data.workingPower;
		this.cash = data.cash;
		this.xs = data.xs;
		this.ys = data.ys;
		this.cells = [];
		var cells = data.cells;
		for(var x = 0; x < cells.length; x++){
			var row = [];
			for(var y = 0; y < cells[x].length; y++){
				var c = cells[x][y];
				if(!c)
					continue;
				var cell = new this.Cell(c.weeds);
				cell.deserialize(c);
				row.push(cell);
				this.onUpdateCell(cell,x,y);
			}
			this.cells.push(row);
		}
	}
	else{
		for(var x = 0; x < this.xs; x++){
			var row = [];
			for(var y = 0; y < this.ys; y++){
				var weeds = this.rng.next();
				var cell = new this.Cell(weeds);

				this.onUpdateCell(cell,x,y);

				row.push(cell);
			}
			this.cells.push(row);
		}
	}
}

FarmGame.prototype.select = function(cell){return true;}
FarmGame.prototype.select.description = function(){return i18n.t("Selects a cell to inspect");}

FarmGame.prototype.plow = function(cell){
	var workCost = 20; // Cultivation costs high
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.plow()){
		this.workingPower -= workCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.plow.description = function(){
	return i18n.t("Plow and make ridges") + "\n"
		+ i18n.t("Working Power Cost") + ": 20";
}

FarmGame.prototype.seed = function(cell){
	var workCost = 10; // Seeding is not a hard physical task.
	var moneyCost = 1;
	if(this.workingPower < workCost || this.cash < moneyCost)
		return false; // Give up due to low working power
	if(cell.seed()){
		this.workingPower -= workCost;
		this.cash -= moneyCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.seed.description = function(){
	return i18n.t("Apply crop seeds") + "\n"
		+ i18n.t("Working Power Cost") + ": 10\n"
		+ i18n.t("Money Cost") + ": $1";
}

FarmGame.prototype.harvest = function(cell){
	var workCost = 15; // Harvesting is a bit hard physical task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.harvest()){
		this.workingPower -= workCost;
		// Overgrown crops do not produce money but consumes working power to clean.
		if(cell.corn < 3.0)
			this.cash += 10;
		cell.corn = 0;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.harvest.description = function(){
	return i18n.t("Harvest and sell crops\nto gain money")
		+ "\n" + i18n.t("Working Power Cost") + ": 15";
}

FarmGame.prototype.water = function(cell){
	var workCost = 5; // Harvesting is a bit hard physical task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.water()){
		this.workingPower -= workCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.water.description = function(){
	return i18n.t("Water soil") + "\n"
		+ i18n.t("Working Power Cost") + ": 5";
}

FarmGame.prototype.weeding = function(cell){
	var workCost = 15; // Harvesting is a bit hard physical task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.weeding()){
		this.workingPower -= workCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.weeding.description = function(){
	return i18n.t("Weed out without plowing\n"
		+ "Soil humidity is rather kept") + "\n"
		+ i18n.t("Working Power Cost") + ": 15";
}

FarmGame.prototype.onAutoSave = function(str){
}
