// data directories
var pol_file = "../data/pol_map/USA_pol_data.csv";
var usa_json = "../data/pol_map/usa.topo.json";
var usa_states_json = "../data/pol_map/states_usa.topo.json";
var usa_cities_json = "../data/pol_map/cities_usa.topo.json";

// initialize size params
var m_width = $("#pol_map").width()
var width = 938;
// var mapRatio = 0.6;
var height = 500;
var country, state, centered;

// 1. projection onto USA type geo
var projection = d3.geoAlbersUsa()
	.scale(800)
	.translate([width*0.5, height*0.5]);

// 2. path geometry
var path = d3.geoPath()
	.projection(projection);

// create the svg_pol root inside our div html
var svg_pol = d3.select("#pol_map").append("svg")
	.attr("width", m_width)
	.attr("height", m_width*height/width)
	.attr("preserveAspectRatio", "xMidYMid")
	.attr("viewBox", "0 0 " + width + " " + height)

// Optional: Add background behind the displayed map
svg_pol.append("rect")
    .attr("class", "background")
    .attr("fill", "yellow")
    .attr("width", width)
    .attr("height", height)
    .on("click", zoom); // allows zooming bcak out

var g = svg_pol.append("g");

$(window).resize(function() {
  var w = $("#map").width();
  svg.attr("width", w);
  svg.attr("height", w * height / width);
});

// load topojson for usa split by states
d3.json(usa_states_json, function(error, usa_states){
	if (error) return console.error(error);
	console.log("Reading in topojson for states.")
	console.log(usa_states);

	state = null;
	g.append("g")
			.attr("id", "states")
		.selectAll("path")
			.data(topojson.feature(usa_states, usa_states.objects.states_usa).features)
		.enter()
		.append("path")
		.attr("id", function(d) { return d.id; })
		.attr("class", function(d) { return "states " + d.properties.name; })
		.attr("d", path)
		.attr("fill", "gray")
		.on("click", state_clicked);

	// g.append("path")
 //      .datum(topojson.mesh(usa_states, usa_states.objects.states_usa, function(a, b) { return a !== b; }))
 //      .attr("id", "state-borders")
 //      .attr("d", path);
});

function state_clicked (d) {
	g.selectAll("#cities").remove();

	if (d && state != d) {
		var xyz = get_xyz(d);
		state = d;

		country_code = state.id.substring(0, 3).toLowerCase();
		state_name = state.properties.name;
		console.log(country_code);
		console.log(state_name);

		zoom(d); // zoom into the state

		d3.json(usa_cities_json, function(error, usa_cities) {
			g.append("g")
				.attr("id", "cities")
				.selectAll("path")
				.data(topojson.feature(usa_cities, usa_cities.objects.cities).features.filter(function(d) { 
					return state_name == d.properties.state; }))
				.enter()
				.append("path")
				.attr("id", function(d) { return d.properties.name; })
				.attr("class", "city")
				.attr("d", path.pointRadius(10 / xyz[2]))
				.attr("fill", "white");
		});
	} else {
		state = null;
		zoom(d);
	}
}

function get_xyz(d) {
	var bounds = path.bounds(d);
	var w_scale = (bounds[1][0] - bounds[0][0]) / width;
	var h_scale = (bounds[1][1] - bounds[0][1]) / height;
	var z = 0.96 / Math.max(w_scale, h_scale);
	var x = (bounds[1][0] + bounds[0][0]) / 1.75;
	var y = (bounds[1][1] + bounds[0][1]) / 1.85+ (height / z / 6);
	return [x, y, z];
}

function zoom(d) {
	g.selectAll(["#cities"]).remove();
	var x, y, k;

	if ( d && centered != d) {
		var centroid = path.centroid(d);
		x = centroid[0];
		y = centroid[1];
		k = 4;
		centered=d;
	} else {
		x = width/2;
		y = height/2;
		k = 1;
		centered = null;
	}

	g.selectAll("path")
		.classed("active", centered && function(d) { return d == centered; });
	g.transition()
		.duration(750)
		.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
		.style("stroke-width", 1.5 / k + "px");
}