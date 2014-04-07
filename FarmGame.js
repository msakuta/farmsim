
function FarmGame(xs,ys){
	this.xs = xs;
	this.ys = ys;
	this.rng = new Xor128();

	this.cells = [];

	this.Cell = function(grass){
		this.grass = grass;
		this.cultivated = false;
	}
	this.Cell.prototype.cultivate = function(){
		this.grass = 0;
		this.cultivated = true;
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

			game.onUpdateCell(cell,x,y);
		}
	}

}
