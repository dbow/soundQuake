$(document).ready(function(){
	var canvas = document.getElementById('image_loader');
	canvas.setAttribute('width', $(document).width());
	canvas.setAttribute('height', $(document).height());
	var context = canvas.getContext('2d');

	var w, h;

	var result = [];
	
	var img = new Image();
	img.onload = function(){  
	 	context.drawImage(img,0,0); 
	 	$("<img/>").attr("src", $(img).attr("src"))
		    .load(function() {
		        w = this.width;
		        h = this.height;

		        //TODO Abstract this out
				    console.log(getPixelsFromMap(30, 30));
		    });
	};  

	img.src = 'img/map.png';

	//Assess Canvas element for pixels, takes total image dimensions an equally spaces out the sample spot based on rows and columns
	var getPixelsFromMap = function (nCol, nRow) {

		var its = nCol*nRow;
		var xSpace = Math.floor(w/nCol);
		var ySpace = Math.floor(h/nRow);

		for (var i = 0; i < its; i++) {
			var x = Math.round((i%nCol * xSpace) + (xSpace/2));
			var y = Math.round((Math.floor(i/nCol) * ySpace) + (ySpace/2));
			var r = context.getImageData(x,y,1,1);
			result.push(r);
		}

		return result;
		
	}


});