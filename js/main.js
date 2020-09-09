
// set fm up on window load
jQuery(window).load(function() {
    var root = initCanvas();
    var view = new View(root,0,0,32);
    view.refreshView();
});

function initCanvas(){
    canvas = {/*rect: new paper.Shape.Rectangle(new paper.Point(0,0), new paper.Size(30,30)),*/ cellSize: 30, refPoint: new paper.Point(0,0), children : []};

    var i1 = new SimpleItem(canvas, -4, -4, 1, 1); // the properties of this do not matter

    addChildrenDrake(i1, 20);

    function addChildren(item, level) {
        if(level <= 0)
            return; 
        //var c1 = new SimpleItem(item, 12,12,8,8);
        var c1 = new SimpleItem(item, Math.floor(Math.random() * 24), Math.floor(Math.random() * 24), 8, 8);
        var c2 = new SimpleItem(item, Math.floor(Math.random() * 28), Math.floor(Math.random() * 28), 4, 4);
        addChildren(c1, level - 1);
        addChildren(c2, level - 1);
    }

    function addChildrenDrake(item, level) {
        if(level <= 0)
            return; 
        //var c1 = new SimpleItem(item, 12,12,8,8);
        var c1 = new SimpleItem(item, 16,0, 16, 16);
        var c2 = new SimpleItem(item, 16,16, 16, 16);
        addChildrenDrake(c1, level - 1);
        addChildrenDrake(c2, level - 1);
    }

    i1.parent = null;
    i1.cellSize = 30;
    return i1;
}

//-------------------------------------------------------------------------SimpleItem-----------------------------------------------------------------

const colors = ["red", "green", "blue", "yellow", "black", "white", "doge", "doge", "doge", "doge"];
class SimpleItem {
    constructor(parent, x, y, width, height) {
        this.parent = parent;
        parent.children.push(this);
        this.children = [];
        this.gridWidth = 32;
        this.gridHeight = 32;
        this.gridPos = {x:x, y:y};
        this.gridSize = {height:height, width:width};
        // while(!this.color || this.color == this.parent.color)
        //     this.color = colors[Math.floor(Math.random() * 9)];
        this.color = "doge";
    }
}


//-----------------------------------------------------------------------------View------------------------------------------------------------------

const unitMove = 5;
const viewWidth = 1800;
const viewHeight = 1800;
const viewPositionInPaper = new paper.Point(0,0);
const minRenderLength = 15;

const zoomFactor = 1.08;

class View {
    constructor(panel, viewPositionInGridUnitsX, viewPositionInGridUnitsY, viewWidthInGridUnits) {
        this.viewTopLeft = new paper.Point(viewPositionInGridUnitsX, viewPositionInGridUnitsY);
        this.svep = panel;
        this.svep.cellSize = viewWidth / viewWidthInGridUnits;
        this.initListeners();
        
        this.viewBorders = new paper.Shape.Rectangle(viewPositionInPaper, new paper.Size(viewWidth, viewHeight));
        this.viewBorders.strokeColor = "red";
        
    }

    initListeners() {
        var self = this;
        var tool = new paper.Tool();
    
        tool.onKeyDown  = function(event) {
            if(event.key == "w") {
                self.moveView(0,-unitMove);
            }
            if(event.key == "a") {
                self.moveView(-unitMove,0);
            }
            if(event.key == "s") {
                self.moveView(0,unitMove);
            }
            if(event.key == "d") {
                self.moveView(unitMove,0);
            }
            if(event.key == "e") {
                self.zoomIn();
            }
    
            if(event.key == "q") {
                self.zoomOut();
            }
        }
    }

    zoomOut() {
        // move viewTopLeft farther from the view center.
        this.viewTopLeft = this.viewTopLeft.subtract(new paper.Point(viewWidth, viewHeight).divide(this.svep.cellSize).multiply((zoomFactor -1)/2)); // see your notes for the math.
    
        // change master panel cell size.
        this.svep.cellSize /= zoomFactor;

        //paper.view.zoom /= zoomFactor;
        //this.viewBorders.scale(zoomFactor);

        //if( this.updateSvepToSmallestParent())   
        this.updateSvepToSmallestParent();    
        this.refreshView();
    }
    
    zoomIn() {    
        //move viewTopleft closer to view center.
        this.viewTopLeft = this.viewTopLeft.add(new paper.Point(viewWidth, viewHeight).divide(this.svep.cellSize).divide( 2 * zoomFactor / (zoomFactor -1))); // see your notes for the math.
    
        // change the master panel cell size.
        this.svep.cellSize *= zoomFactor;

        //paper.view.zoom *= zoomFactor;
        //this.viewBorders.scale(1/zoomFactor);
        //if(this.updateSvepToSmallestChild())
        //    this.refreshView();
        this.updateSvepToSmallestChild(true);
        this.refreshView();
    }
    
    moveView(x,y) {
        this.viewTopLeft = this.viewTopLeft.add(new paper.Point(x,y).multiply( 32 / this.svep.cellSize).multiply(paper.view.zoom));

        //paper.view.center = paper.view.center.add(new paper.Point(x,y).multiply(32));
        //this.viewBorders.position = this.viewBorders.position.add(new paper.Point(x,y).multiply(32)); // to keep the red frame at the same place.

        
        var change1 = this.updateSvepToSmallestParent();
        var change2 = this.updateSvepToSmallestChild(false);

        //if(change1 || change2)
            this.refreshView();
        
    }
    
    updateSvepToSmallestParent() {
        var self = this;
        var updated = false;

        while(!svepEnclosesView()){
            if(!this.svep.parent)
                break;
            this.svep.parent.cellSize = this.svep.cellSize * this.svep.gridWidth / this.svep.gridSize.width;
            this.viewTopLeft = new paper.Point(this.svep.gridPos.x, this.svep.gridPos.y).add( this.viewTopLeft.divide(this.svep.parent.cellSize / this.svep.cellSize));
            this.svep = this.svep.parent;
            updated = true;
        }
        return updated;

        function svepEnclosesView() {
            if(self.viewTopLeft.x < 0 || self.viewTopLeft.y < 0)
                return false;
            if(self.viewTopLeft.x + viewWidth / self.svep.cellSize > self.svep.gridWidth || self.viewTopLeft.y + viewHeight / self.svep.cellSize > self.svep.gridHeight)
                return false;
            return true;
        }
    }
    
    updateSvepToSmallestChild(zooming) {
        var self = this;

        var updated = false;
        var changedSvep = true;
        while(changedSvep){
            changedSvep = false;
            this.svep.children.forEach( child => {
                if(childEnclosesView(child)){
                    if(zooming)
                    child.cellSize *= zoomFactor;
                    this.viewTopLeft = this.viewTopLeft.subtract(child.gridPos).multiply(this.svep.cellSize / child.cellSize);
                    this.svep = child;
                    changedSvep = true;
                    updated = true;
                }
            });
        }
        return updated;
        
        function childEnclosesView(child) {
            if(self.viewTopLeft.x < child.gridPos.x || self.viewTopLeft.y < child.gridPos.y)
                return false;
            if(self.viewTopLeft.x + viewWidth / self.svep.cellSize > child.gridPos.x + child.gridSize.width || self.viewTopLeft.y + viewHeight / self.svep.cellSize > child.gridPos.y + child.gridSize.height)
                return false;
            return true;
        }
    }

    refreshView() {
        //paper.project.activeLayer.removeChildren();
        
        // reset camera properties
        paper.view.center = viewPositionInPaper.add(viewWidth / 2, viewHeight / 2);
        paper.view.zoom = 1;

        // redraw canvas
        this.svep.refPoint = this.viewTopLeft.multiply(-this.svep.cellSize);
        this.draw(this.svep);

        this.viewBorders.remove();
        this.viewBorders = new paper.Shape.Rectangle(viewPositionInPaper, new paper.Size(viewWidth, viewHeight));
        this.viewBorders.strokeColor = "red";
    }


    draw(item) {
        var self = this;

        if(!item.rect){
            item.rect = new paper.Shape.Rectangle(new paper.Point(0,0), new paper.Size(0,0));
            item.rect.fillColor = item.color;
            item.rect.onMouseDown = function(event){ console.log(item);}

            if(item.color == "doge" && !item.raster )
                item.raster = new paper.Raster("./drake.jpg",item.rect.position);
        }

        if(item == this.svep) { // svep's cellSize and refPoint depend on the view. every other item's depends on svep.
            //item.rect = new paper.Shape.Rectangle(item.refPoint.add( viewPositionInPaper), new paper.Size(item.gridWidth, item.gridHeight).multiply(item.cellSize));
            //item.rect.strokeColor = "yellow";
            // if(item.color == "doge") {
            //     item.raster = new paper.Raster("/home/cemcebeci/Desktop/doge.jpeg",item.rect.position);
            //     item.raster.scale(item.rect.bounds.width/item.raster.bounds.width);
            // }
            // else{
            //     item.rect.fillColor = item.color;
            // }
            // item.raster = new paper.Raster("/home/cemcebeci/Desktop/drake.jpg",item.rect.position);
            // item.raster.scale(item.rect.bounds.width/item.raster.bounds.width);

            // item.raster.opacity = 1 - Math.min(1,item.raster.bounds.width/viewWidth) ;
            item.rect.size = new paper.Size(item.gridWidth, item.gridHeight).multiply(item.cellSize);
            item.rect.position = item.refPoint.add( viewPositionInPaper).add( new paper.Point( item.rect.size.width / 2, item.rect.size.height / 2));
            if(item.raster){
                item.raster.scale(item.rect.bounds.width / item.raster.bounds.width);
                item.raster.position = item.rect.position;
            }

            item.children.forEach( child => {
                
                if(inView(child)){
                    self.draw(child);
                } else if(child.rect) {
                    hide(child);

                    function hide( item) {
                        item.rect.remove();
                        item.rect = null;
                        if(item.raster) {item.raster.remove();item.raster = null;}
                        item.children.forEach( child => {if(child.rect) {hide(child);}});  
                    }
                }

                function inView(child) {
                    if(child.gridPos.x > self.viewTopLeft.x + viewWidth / self.svep.cellSize || child.gridPos.y > self.viewTopLeft.y + viewHeight / self.svep.cellSize)
                        return false;
                    if(child.gridPos.x + child.gridSize.width < self.viewTopLeft.x || child.gridPos.y + child.gridSize.height < self.viewTopLeft.y)
                        return false;

                    // this attribute is used to calculate which of this item's children are in the view.
                    child.viewTopLeftInGrid = (self.viewTopLeft.subtract(child.gridPos)).multiply(child.gridWidth / child.gridSize.width);
                    return true;
                }   
            });
            return;
        }
    
        item.cellSize = item.parent.cellSize * item.gridSize.width / item.gridWidth; // temporary, okay for squares. 
        if(determineSize(item).width < minRenderLength || determineSize(item).height < minRenderLength){ // a very sloppy written optimization.
            if(item.raster) {item.raster.remove();item.raster = null;}
            item.rect.remove();
            item.rect = null;
            return;
        }

        item.refPoint = item.parent.refPoint.add( new paper.Point(item.parent.cellSize * item.gridPos.x, item.parent.cellSize * item.gridPos.y));
        //item.rect = new paper.Shape.Rectangle( determinePosition(item), determineSize(item));
        item.rect.size = determineSize(item);
        item.rect.position = determinePosition(item).add( new paper.Point( item.rect.size.width / 2, item.rect.size.height / 2));
        if(item.raster){
            item.raster.scale(item.rect.bounds.width / item.raster.bounds.width);
            item.raster.position = item.rect.position;
        }
        // if(item.color == "doge") {
        //     item.raster = new paper.Raster("/home/cemcebeci/Desktop/doge.jpeg",item.rect.position);
        //     item.raster.scale(item.rect.bounds.width/item.raster.bounds.width);
        // }
        // else{
        //     item.rect.fillColor = item.color;
        // }

        //item.raster.opacity = 1 - Math.min(1,item.raster.bounds.width/viewWidth) ;

        item.rect.strokeColor = "black";


        item.children.forEach( child => {
                
            if(inView(child)){
                self.draw(child);
            } else if(child.rect) {
                hide(child);

                function hide( item) {     
                    item.rect.remove();
                    item.rect = null;
                    if(item.raster) {item.raster.remove();item.raster = null;}
                    item.children.forEach( child => {if(child.rect) {hide(child);}});  
                }
            }

            function inView(child) {
                if(child.gridPos.x > item.viewTopLeftInGrid.x + viewWidth / item.cellSize || child.gridPos.y > item.viewTopLeftInGrid.y + viewHeight / item.cellSize)
                    return false;
                if(child.gridPos.x + child.gridSize.width < item.viewTopLeftInGrid.x || child.gridPos.y + child.gridSize.height < item.viewTopLeftInGrid.y)
                    return false;

                // this attribute is used to calculate which of this item's children are in the view.
                child.viewTopLeftInGrid = (item.viewTopLeftInGrid.subtract(child.gridPos)).multiply(child.gridWidth / child.gridSize.width);

                return true;
            }
        });


        function determinePosition(item){
            return new paper.Point(item.parent.refPoint.add( new paper.Point(item.parent.cellSize * item.gridPos.x, item.parent.cellSize * item.gridPos.y))).add(viewPositionInPaper);
        }
    
        function determineSize(item){
            return new paper.Size(item.parent.cellSize * item.gridSize.width, item.parent.cellSize * item.gridSize.height);
        }
    }
}