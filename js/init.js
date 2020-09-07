// functions related to initializing fm

var fm = function(){

    var init = function(){
        
        paper.setup('paperCanvas');

        //fm.config();
    }

    return {
        init: init
    };

}(); // Adding the () to the end calls the function that was just created.


// set fm up on window load
jQuery(window).load(function() {
    fm.init();
    
});

