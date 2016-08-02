// data directories
var pol_csv = "../data/pol_map/USA_pol_data.csv";
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

// $(window).resize(function() {
//   var w = $("#map").width();
//   svg_pol.attr("width", w);
//   svg_pol.attr("height", w * height / width);
// });

// create a queue for asynchronous loading
d3.queue()
	.defer(d3.json, usa_states_json)
	.defer(d3.csv, pol_csv)
	.await(ready);

/* MAIN CODE SECTION FOR LOADING IN DATA AND RENDERING IT */
function ready(error, usa_states, poll) {
	if (error) throw error;
	numStates = (usa_states.objects.states_usa.geometries).length;

	// debug messages
	console.log("Reading in topojson for states.")
	console.log(usa_states);
	console.log(poll);
	console.log(numStates)
	var repVote = {};
	var demVote = {};
	var repRate = {}

	// loop through polling data
	poll.forEach(function(d) { 
		if (d.State != 'DC') {
			if (typeof repVote[d.State] != 'undefined') {
				repVote[d.State] += parseFloat(d['Rep Vote'].replace(",", ""));
				demVote[d.State] += parseFloat(d['Dem Vote'].replace(",", ""));
			} else {
				repVote[d.State] = parseFloat(d['Rep Vote'].replace(",", ""));
				demVote[d.State] = parseFloat(d['Dem Vote'].replace(",", ""));
			}
		} else {
			repVote[d.State] = 0.5
		}
	})
	var states = Object.keys(repVote)
	var min = 1
	var max = 0

	for(var i=0; i<states.length; i++) {
		var state = states[i]
		repRate[state] = repVote[state] / (repVote[state] + demVote[state]);
		min = Math.min(repRate[state], min);
		max = Math.max(repRate[state], max);
	}

	// Define colorscale for map
	var color = d3.scaleOrdinal()
	    .domain([min, max])
	    .range(colorbrewer.RdBu[5]);

	console.log(repRate)
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
		.attr("fill", function(d) {
			var state = abbrState(d.properties.name, 'abbr');
			return color(repRate[state]);
		})
		.on("click", state_clicked);
}

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


//https://gist.github.com/CalebGrove/c285a9510948b633aa47
//
// USAGE:
// abbrState('ny', 'name');
// --> 'New York'
// abbrState('New York', 'abbr');
// --> 'NY'
function abbrState(input, to){
    
    var states = [
        ['Arizona', 'AZ'],
        ['Alabama', 'AL'],
        ['Alaska', 'AK'],
        ['Arizona', 'AZ'],
        ['Arkansas', 'AR'],
        ['California', 'CA'],
        ['Colorado', 'CO'],
        ['Connecticut', 'CT'],
        ['Delaware', 'DE'],
        ['Florida', 'FL'],
        ['Georgia', 'GA'],
        ['Hawaii', 'HI'],
        ['Idaho', 'ID'],
        ['Illinois', 'IL'],
        ['Indiana', 'IN'],
        ['Iowa', 'IA'],
        ['Kansas', 'KS'],
        ['Kentucky', 'KY'],
        ['Kentucky', 'KY'],
        ['Louisiana', 'LA'],
        ['Maine', 'ME'],
        ['Maryland', 'MD'],
        ['Massachusetts', 'MA'],
        ['Michigan', 'MI'],
        ['Minnesota', 'MN'],
        ['Mississippi', 'MS'],
        ['Missouri', 'MO'],
        ['Montana', 'MT'],
        ['Nebraska', 'NE'],
        ['Nevada', 'NV'],
        ['New Hampshire', 'NH'],
        ['New Jersey', 'NJ'],
        ['New Mexico', 'NM'],
        ['New York', 'NY'],
        ['North Carolina', 'NC'],
        ['North Dakota', 'ND'],
        ['Ohio', 'OH'],
        ['Oklahoma', 'OK'],
        ['Oregon', 'OR'],
        ['Pennsylvania', 'PA'],
        ['Rhode Island', 'RI'],
        ['South Carolina', 'SC'],
        ['South Dakota', 'SD'],
        ['Tennessee', 'TN'],
        ['Texas', 'TX'],
        ['Utah', 'UT'],
        ['Vermont', 'VT'],
        ['Virginia', 'VA'],
        ['Washington', 'WA'],
        ['West Virginia', 'WV'],
        ['Wisconsin', 'WI'],
        ['Wyoming', 'WY'],
    ];

    if (to == 'abbr'){
        input = input.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
        for(i = 0; i < states.length; i++){
            if(states[i][0] == input){
                return(states[i][1]);
            }
        }    
    } else if (to == 'name'){
        input = input.toUpperCase();
        for(i = 0; i < states.length; i++){
            if(states[i][1] == input){
                return(states[i][0]);
            }
        }    
    }
}