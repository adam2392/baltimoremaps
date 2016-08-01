/*
    GLOBAL VARS
*/
var width = 600;
var mapRatio = 0.6;
var height = width * mapRatio;
var embiggen = 1.00;
var mapVOffset = 0.05
var mapHeight = height - mapVOffset

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

// var region = document.getElementById("regions")
var region = document.getElementById("regions").value
var census_file = "../data/" + region + "_census_data.csv";
var shape_file = "../data/" + region + "_geo_data.json";

var cs = ['rgb(255,255,217)','rgb(237,248,177)','rgb(199,233,180)','rgb(127,205,187)','rgb(65,182,196)','rgb(29,145,192)','rgb(34,94,168)','rgb(37,52,148)','rgb(8,29,88)']
var q = d3.scaleQuantile()
    .range(cs)

var loLim = 4;
var hiLim = 15;
var loIdx = 2;
var hiIdx = 10;

var dataMap = d3.map(); // Create an array, see https://github.com/mbostock/d3/wiki/Arrays

var data = [];
var counts = [];
var dataKeys = [];

$(function() {
    console.log("Creating sliders using jQuery...")
    var trueValues = [" < $10000", "$15000", "$20000", "$25000", "$30000", "$35000", "$40000", "$45000", "$50000", "$60000", "$75000", "$100000", "$125000", "$150000", "$200000", " > $200000"];

    var values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 41]

    var slider = $("#income-range").slider({
        orientation: 'horizontal',
        range: true,
        min: 2,
        max: 41,
        values: [loLim, hiLim],
        slide: function(event, ui) {
            var includeLeft = event.keyCode != $.ui.keyCode.RIGHT;
            var includeRight = event.keyCode != $.ui.keyCode.LEFT;
            var value = findNearest(includeLeft, includeRight, ui.value);
            if (ui.value == ui.values[0]) {
                slider.slider('values', 0, value);
            }
            else {
                slider.slider('values', 1, value);
            }
            $("#amount").val(getRealValue(slider.slider('values', 0)) + ' to ' + getRealValue(slider.slider('values', 1)));
            updateNew(values.indexOf(slider.slider('values', 0)), values.indexOf(slider.slider('values', 1)));
            return false;
        },
    });

    $("#amount").val(getRealValue(slider.slider('values', 0)) + ' to ' + getRealValue(slider.slider('values', 1)));

    function findNearest(includeLeft, includeRight, value) {
        var nearest = null;
        var diff = null;
        for (var i = 0; i < values.length; i++) {
            if ((includeLeft && values[i] <= value) || (includeRight && values[i] >= value)) {
                var newDiff = Math.abs(value - values[i]);
                if (diff == null || newDiff < diff) {
                    nearest = values[i];
                    diff = newDiff;
                }
            }
        }
        return nearest;
    }

    function getRealValue(sliderValue) {
        for (var i = 0; i < values.length; i++) {
            if (values[i] >= sliderValue) {
                return trueValues[i];
            }
        }
        return 0;
    }

});

/* 
    AREA FOR FUNCTIONS TO CREATE MAP
*/
function makeMap() {
    // debug statements
    console.log("Creating the map... makeMap()");
	svg.remove();

    // create the svg inside "map" div
	svg = d3.select("#map").append("svg")
        .attr("width", width)
        .attr("height", height);

    // get the corresponding region
    var region = document.getElementById("regions").value

    // initialize file locations for corresponding region
    var census_file = "../data/" + region + "_census_data.csv";
    var shape_file = "../data/" + region + "_geo_data.json";
    // var census_file = "../data/" + "delmarva" + "_census_data.csv";
    // var shape_file = "../data/" + "balt_city" + "_geo_data.json";

    // wait for json/csv of shape_files/census_files to be loaded
    // -> call main function
    queue()
        .defer(d3.json, shape_file)
        .defer(d3.csv, census_file)
        .await(ready);
}
queue()
    .defer(d3.json, shape_file)
    .defer(d3.csv, census_file)
    .await(ready);

function ready(error, shapes, csvData) {
    if(error) throw error;
    console.log("Running ready()...");
    loadCSVData(csvData);
// Create a unit projection.
    var projection = d3.geoMercator()
        .scale(1)
        .translate([0, 0]);

    // Create a path generator.
    var path = d3.geoPath()
        .projection(projection);

    // Compute the bounds of a feature of interest, then derive scale & translate.
    var b = path.bounds(shapes),
    s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / mapHeight),
    t = [(width - s * (b[1][0] + b[0][0])) / 2, mapVOffset*mapHeight + (mapHeight - s * (b[1][1] + b[0][1])) / 2];

    // Update the projection to use computed scale & translate.
    projection
        .scale(s)
        .translate(t);

    svg.selectAll("path")
        .data(shapes.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class","cc")
        .attr("fill", function(d) {
            if (dataMap.get(d.id) == 0 || isNaN(dataMap.get(d.id))) {
                return "#eee";
            }          
            return q(dataMap.get(d.id));
        })
        .on("mouseover", function(d) {
            var blockGroup = d3.select(this);
            blockGroup.classed('active', true);
            this.parentNode.appendChild(this);
        })
        .on("mouseout", function(d) {
            var blockGroup = d3.select(this);
            blockGroup.classed('active', false);
        })
        .attr("vector-effect", "non-scaling-stroke");
    
// Start Legend -----------------------
      // svg.append("text")
      //   .attr("id", "leftlabel")
      //   .style({"font-size":"18px","font-weight":"bold", "fill":"#333", "text-anchor": "end"})
      //   .attr("x", 40)
      //   .attr("y", 20)
      //   .text("0%"); 

      // svg.append("text")
      //   .attr("id", "rightlabel")
      //   .style({"font-size":"18px","font-weight":"bold", "fill":"#333"})
      //   .attr("x", 510)
      //   .attr("y", 20)
      //   .text("100%");

      svg.selectAll("rect")
        .data(cs)
        .enter()
        .append("rect")
        .attr("x", function(d,i){
          return 50 + (i * 50);
        })
        .attr("y", 10)
        .attr("width", 50)
        .attr("height", 10)
        .attr("fill", function(d) {return d})
// End legend -----------------------
}

function loadCSVData(csvData) {
    data = csvData;
    counts = [];
    var dataKeys = Object.keys(data[0]); // get the first column, which are the keys
    dataKeys.shift();                   // shift out the objectID = fips key

    csvData.map(function(d){
        var count = 0;
        var total = 0;
        for (var i=loIdx; i < hiIdx + 1; i++) {
            count += +d[dataKeys[i]];
        };
        for(var i = 0; i < dataKeys.length; i++){
            total += +d[dataKeys[i]];
        }

        var pctCount = 1.0 * count / total;
        counts.push(pctCount);
        dataMap.set(d.fips, pctCount);
    })
    var filtered = counts.filter(isBigEnough); // Remove 0 elements
    q.domain([0, 1]); // adjust domain of quantiles
}

function isBigEnough(value) {
  return value > 0;
}