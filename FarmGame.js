
function FarmGame(xs,ys){
	this.xs = xs;
	this.ys = ys;
	this.rng = new Xor128();

	this.cells = [];

	this.workingPower = 100;
	this.cash = 100;
	this.time = 0;
	this.autosave_time = 0;

	this.Cell = function(grass){
		this.grass = grass;
		this.cultivated = false;
		this.corn = 0;
	}
	this.Cell.prototype.serialize = function(){
		var v = this;
		return {
			grass: this.grass,
			cultivated: this.cultivated,
			corn: this.corn,
		};
	}
	this.Cell.prototype.deserialize = function(data){
		this.grass = data.grass;
		this.cultivated = data.cultivated;
		this.corn = data.corn;
	}
	this.Cell.prototype.cultivate = function(){
		var ret = !this.cultivated || this.grass != 0;
		this.grass = 0;
		this.cultivated = true;
		return ret;
	}
	this.Cell.prototype.seed = function(){
		if(this.cultivated && this.corn < 1){
			this.corn = 1;
			return true;
		}
		else
			return false;
	}
	this.Cell.prototype.harvest = function(){
		if(2 < this.corn){
			this.corn = 0;
			return true;
		}
		else
			return false;
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
				var grass = this.rng.next();
				var cell = new this.Cell(grass);

				this.onUpdateCell(cell,x,y);

				row.push(cell);
			}
			this.cells.push(row);
		}
	}
}

FarmGame.prototype.onUpdateCell = function(cell,x,y){}

FarmGame.prototype.update = function(){

	// The growth of the grass depends on adjacent cells' grass density.
	function getGrowth(x,y){
		var ret = 0.0001;
		if(0 <= x - 1) ret += this.cells[x - 1][y].grass * 0.0001;
		if(x + 1 < this.xs) ret += this.cells[x + 1][y].grass * 0.0001;
		if(0 <= y - 1) ret += this.cells[x][y - 1].grass * 0.0001;
		if(y + 1 < this.ys) ret += this.cells[x][y + 1].grass * 0.0001;
		return ret;
	}

	for(var x = 0; x < this.cells.length; x++){
		for(var y = 0; y < this.cells[x].length; y++){
			var cell = this.cells[x][y];

			var growth = getGrowth.call(this, x, y);

			if(cell.grass < 1. - growth)
				cell.grass += growth;
			else
				cell.grass = 1.;

			// Increase corn growth.  Lower growth if there are weeds.
			if(0 < cell.corn)
				cell.corn += 0.0005 * (1. - cell.grass);

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
				var cell = new this.Cell(c.grass);
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
				var grass = this.rng.next();
				var cell = new this.Cell(grass);

				this.onUpdateCell(cell,x,y);

				row.push(cell);
			}
			this.cells.push(row);
		}
	}
}

FarmGame.prototype.cultivate = function(cell){
	var workCost = 20; // Cultivation costs high
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.cultivate()){
		this.workingPower -= workCost;
		return true;
	}
	else
		return false;
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

FarmGame.prototype.harvest = function(cell){
	var workCost = 15; // Harvesting is a bit hard physical task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.harvest()){
		this.workingPower -= workCost;
		this.cash += 10;
		return true;
	}
	else
		return false;
}

FarmGame.prototype.onAutoSave = function(str){
}
