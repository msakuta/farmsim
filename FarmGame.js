
function FarmGame(xs,ys){
	this.xs = xs;
	this.ys = ys;
	this.rng = new Xor128();

	this.cells = [];

	this.workingPower = 100;

	this.Cell = function(grass){
		this.grass = grass;
		this.cultivated = false;
		this.corn = 0;
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
}

FarmGame.prototype.init = function(){
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
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.seed()){
		this.workingPower -= workCost;
		return true;
	}
	else
		return false;
}
