/*
 * Much of the code written for this project was written from scratch with
 * the help of some online examples. Initially, we started with a base from
 * an online example that displayed a map of the US with states that you can
 * click on to zoom into (https://bl.ocks.org/mbostock/2206590).
 *
 * From there we were able to modify the code as we needed. We were able to
 * add in dots that represented the locations of the schools, and add in further
 * UI elements needed for the visualization. Most of the additions required us to create
 * code from scratch. The styling for many of the components used in the visualization
 * are done using BootStrap.
 *
 * This file contains all of the code for using the map, populating the
 * box of information on the right hand side of the visualization, and for
 * selecting and deselecting schools you wish to compare.
 *
 * There are 2 other source files (charts.js and windowSizeChecker.js). The first
 * file contains all of the code for displaying tables, bar charts, pie charts,
 * and line charts. The second file contains code for ensuring the browser is
 * set above the minimum width requirement. For more details, please view
 * the comments for each of those files.
 *
 * There are 3 functions that were directly imported for use
 * in developing this visualization and they are marked below (lines 30, 37, and 160).
 *
 */


// -------- Functions we imported for use from online sources --------
jQuery.fn.scrollTo = function(elem, speed) {
    $(this).animate({
        scrollTop:  $(this).scrollTop() - $(this).offset().top + $(elem).offset().top - 10
    }, speed == undefined ? 500 : speed);
    return this;
};

String.prototype.trunc =
    function( n, useWordBoundary ){
        if (this.length <= n) { return this; }
        var subString = this.substr(0, n-1);
        return (useWordBoundary
                ? subString.substr(0, subString.lastIndexOf(' '))
                : subString) + "&hellip;";
    };

// ------------------------------------------------------------------------

d3.select("#compare_button").attr("disabled", "disabled");

var width = d3.select("#map").style("width");
width = +width.slice(0, -2);

var height = width * 0.623;

var centered;

var selected_schools = [];

var projection = d3.geo.albersUsa()
    .scale(width * 1.385) // 1070
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

// ------ sets the height of infobox equal to height of map -----
var infoH = d3.select("#map").style("height");
d3.select(".info").style("height", infoH);
// --------------------------------------------------------------

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", clicked);

var g = svg.append("g");

var state_names_data;

d3.json("data/state_names.json", function(error, data) {
    if (error) throw error;
    state_names_data = data;
});


var state_mapData;
var combinedData;
var k = 1; // zoom level

d3.json("data/us.json", function(error, us) {
    if (error) throw error;

    state_mapData = topojson.feature(us, us.objects.states).features;

    var allStates_mapData = topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; });

    combinedData = join(state_names_data, state_mapData, "num", "id", function(shapeData, nameData) {
        return {
            id: shapeData.id,
            name: (nameData !== undefined) ? nameData.name : null,
            abbreviation: (nameData !== undefined) ? nameData.abbreviation : null,
            schools: (nameData !== undefined) ? nameData.schools : null,
            geometry: shapeData.geometry,
            properties: shapeData.properties,
            type: shapeData.type
        };
    });

    g.append("g")
        .attr("id", "states")
        .selectAll("path")
        .data(combinedData)
        .enter().append("path")
        .attr("class", "state")
        .attr("d", path)
        .on("mouseover", function(d) {
            if (k === 1) {
                d3.select("#state_name")
                    .classed("temp", false);

                d3.select("#count")
                    .style("opacity", 1);

                d3.select("#numSchools").html(d.schools);

                d3.select("#state_name")
                    .text(d.name)
                    .classed("regular", true)
                    .style("opacity", 0)
                    .transition().duration(300)
                    .style("opacity", 1);
            }
        })
        .on("mouseout", function(d) {
            if (k === 1) {
                d3.select('#state_name')
                    .text(d.name);

                d3.select("#count")
                    .style("opacity", 0);

                d3.select("#numSchools").html('');

                d3.select('#state_name')
                    .classed("regular", false)
                    .classed("temp", true)
                    .text("State Name")
                    .style("opacity", 0)
                    .transition().duration(300)
                    .style("opacity", 1);


                d3.select(".school_name").text('');
                d3.select("#loc").text('');
            }
        })
        .on("click", clicked);

    g.append("path")
        .datum(allStates_mapData)
        .attr("id", "state-borders")
        .attr("vector-effect", "non-scaling-stroke")
        .attr("d", path);

});

// -------- Function we imported for use from an online source --------
function join(lookupTable, mainTable, lookupKey, mainKey, select) {
    var l = lookupTable.length,
        m = mainTable.length,
        lookupIndex = [],
        output = [];
    for (var i = 0; i < l; i++) {
        var row = lookupTable[i];
        lookupIndex[row[lookupKey]] = row;
    }
    for (var j = 0; j < m; j++) {
        var y = mainTable[j];
        var x = lookupIndex[y[mainKey]];
        output.push(select(y, x));
    }
    return output;
}
// --------------------------------------------------------------------

var circleSize;
var state_clicked = null;

var content = d3.select(".content");

function clicked(d) {
    var state = d3.select(this);

    if (k !== 1 && d!== undefined) {
        d3.select('#state_name')
            .text(d.name);
        d3.select("#numSchools").html(d.schools);
    }

    var x, y;

    var stateName = d === undefined ? "GA" : d.abbreviation;

    d3.csv("data/" + stateName + ".csv", function(error, data) {
        if (error) throw error;

        /* When a state is clicked, this takes the school data for that state and makes
         * a 'school_selector' div that displays school name and location for each college in
         * that state. Each 'school_selector' div is appended onto a single 'content' div
         * inside the info box.
         */
        data.forEach(function (c) {
            var schoolDiv = content.append("div").attr("class", "school_selector");
            schoolDiv.append("button")
                .attr("type", "button")
                .attr("class", "close cancel")
                .attr("title", "Click to visit website")
                .attr("onclick", "visitWebsite('" + c.INSTURL + "')")
                .append("span")
                .attr("class", "glyphicon glyphicon-globe");
                // .html("&#x21b1;");
            schoolDiv.append('h3').attr('class', 'school_name').text(c.INSTNM);
            schoolDiv.append('p').attr('id', 'loc').text(function () {
                return c.CITY + ', ' + c.STABBR
            });
        });

        var institutions = document.getElementsByClassName("school_name");
        for (var i = 0; i < institutions.length; i++) {
            institutions[i].addEventListener("mouseover", function (n) {
                d3.selectAll(".school_name").style("color", '#6d7993');

                n.srcElement.style.color = "#3cc47c";
                d3.selectAll(".dots").style("fill", function (f) {
                    if (f.INSTNM === n.toElement.innerText) {
                        return "#3cc47c";
                    } else {
                        return '#f4decb';
                    }
                });
            });
            institutions[i].addEventListener("click", function (n) {
                var element;
                d3.selectAll(".dots").each(function (f) {
                   if (f.INSTNM === n.toElement.innerText) {
                       element = f;
                   }
                });
                var schoolAlreadyInArray = schoolExists(element.INSTNM);
                if (selected_schools.length < 10 && !schoolAlreadyInArray) { // for clicking a school name (nation -> state)
                    selected_schools.push(element);
                    var labelBox = d3.select(".label_holder");
                    labelBox.append('span')
                        .attr("class", "label label-success")
                        .text(element.INSTNM)
                        .append("button")
                        .attr("type", "button")
                        .attr("class", "close deselect")
                        .on("click", function () {
                            var index = selected_schools.indexOf(element);

                            if (index > -1) {
                                selected_schools.splice(index, 1);
                            }
                            d3.select(".label:nth-child(" + (index + 1) + ")").remove();

                            if (selected_schools.length < 2) {
                                $("#compare_button").animate({
                                    "opacity": 0
                                });
                                d3.select("#compare_button").attr("disabled", "disabled");
                            }
                        })
                        .append("span").html("&times;");
                }
                if (selected_schools.length >= 2) {
                    $("#compare_button").animate({
                        "opacity": 1
                    });
                    d3.select("#compare_button").attr("disabled", null);
                }
            });
        }


        var node = g.select("#states").selectAll("g")
            .data(data).enter()
            .append("g")
            .attr("class", "colleges");

        if (d && centered !== d) {
            var centroid = path.centroid(d);
            x = centroid[0];
            y = centroid[1];
            if (d.name === 'Texas' || d.name === 'California') {
                k = 2.3;
                circleSize = 1.6;
            } else if (d.name === 'Idaho') {
                k = 2.8;
                circleSize = 1.6;
            } else if (d.name === 'Nevada') {
                k = 3;
                circleSize = 1.5;
            } else if (d.name === 'Delaware' || d.name === 'Massachusetts') {
                k = 13;
                circleSize = 0.4;
            } else if (d.name === 'Connecticut') {
                k = 17;
                circleSize = 0.3;
            } else if (d.name === 'New Jersey') {
                k = 10;
                circleSize = 0.5;
            } else if (d.name === 'Maryland' || d.name === 'Vermont' || d.name === 'New Hampshire') {
                k = 9;
                circleSize = 0.6;
            } else if (d.name === 'Rhode Island') {
                k = 32;
                circleSize = 0.2;
            } else if (d.name === 'Arizona' || d.name === 'New Mexico' || d.name === 'Minnesota' || d.name === 'Florida') {
                k = 4;
                circleSize = 1;
            } else if (d.name === 'South Carolina' || d.name === 'West Virginia' || d.name === 'Iowa' || d.name === 'Ohio' || d.name === 'Pennsylvania') {
                k = 7;
                circleSize = 0.7;
            } else if (d.name === 'Arkansas' || d.name === 'Louisiana' || d.name === 'Kentucky' || d.name === 'Virginia' || d.name === 'New York' || d.name === 'Maine') {
                k = 6;
                circleSize = 0.7;
            } else if (d.name === 'Oklahoma' || d.name === 'Kansas' || d.name === 'Nebraska' || d.name === 'South Dakota' || d.name === 'North Dakota' || d.name === 'Montana' || d.name === 'Wyoming' || d.name === 'Colorado' || d.name === 'Utah' || d.name === 'Oregon' || d.name === 'Washington' || d.name === 'Alaska' || d.name === 'Hawaii') {
                k = 5;
                circleSize = 1;
            } else {
                k = 5;
                circleSize = 0.8;
            }

            if (state_clicked === null) { // for going from nation --> state view
                state.classed("state", false);
                node.append("circle")
                    .attr("cx", function (f) {
                        return projection([f.LONGITUDE, f.LATITUDE])[0];
                    })
                    .attr("cy", function (f) {
                        return projection([f.LONGITUDE, f.LATITUDE])[1];
                    })
                    .attr("r", function () {
                        return circleSize;
                    })
                    .attr("class", "dots")
                    .on("mouseover", function (f) {
                        d3.selectAll('.dots').style("fill", "#f4decb");
                        d3.selectAll(".school_name").each(function() {
                            var name = d3.select(this).text(); // the current element
                            if (name === f.INSTNM) {
                                d3.select(this).style("color", "#3cc47c");
                                $(".content").scrollTo(this);
                            } else {
                                d3.select(this).style("color", "#6d7993");
                            }
                        });
                        d3.select(this).style("fill", "#3cc47c");
                    })
                    .on("click", function (f) { // This onclick is for going from nation --> state view
                        var schoolAlreadyInArray = schoolExists(f.INSTNM);
                        if (selected_schools.length < 10 && !schoolAlreadyInArray) {
                            selected_schools.push(f);
                            var labelBox = d3.select(".label_holder");
                            labelBox.append('span')
                                .attr("class", "label label-success")
                                .text(f.INSTNM)
                                .append("button")
                                .attr("type", "button")
                                .attr("class", "close deselect")
                                .on("click", function () {
                                    var index = selected_schools.indexOf(f);

                                    if (index > -1) {
                                        selected_schools.splice(index, 1);
                                    }
                                    d3.select(".label:nth-child(" + (index + 1) + ")").remove();

                                    if (selected_schools.length < 2) {
                                        $("#compare_button").animate({
                                            "opacity": 0
                                        });
                                        d3.select("#compare_button").attr("disabled", "disabled");
                                    }
                                })
                                .append("span").html("&times;");
                        }
                        if (selected_schools.length >= 2) {
                            $("#compare_button").animate({
                                "opacity": 1
                            });
                            d3.select("#compare_button").attr("disabled", null);
                        }
                    });
                state_clicked = d;
                centered = d;
            }

            if (d !== centered) { // for going from state --> state view
                d3.selectAll("path").classed("state", true);
                state.classed("state", false);

                $(".content").empty();
                d3.selectAll(".colleges").remove();
                centered = d;
                g.select("#states").selectAll("g")
                    .data(data).enter()
                    .append("g")
                    .attr("class", "colleges")
                    .append("circle")
                    .attr("cx", function (f) {
                        return projection([f.LONGITUDE, f.LATITUDE])[0];
                    })
                    .attr("cy", function (f) {
                        return projection([f.LONGITUDE, f.LATITUDE])[1];
                    })
                    .attr("r", function () {
                        return circleSize;
                    })
                    .attr("class", "dots")
                    .on("mouseover", function (f) {
                        d3.selectAll('.dots').style("fill", "#f4decb");
                        d3.selectAll(".school_name").each(function() {
                            var name = d3.select(this).text(); // the current element
                            if (name === f.INSTNM) {
                                d3.select(this).style("color", "#3cc47c");
                                $(".content").scrollTo(this);
                            } else {
                                d3.select(this).style("color", "#6d7993");
                            }
                        });
                        d3.select(this).style("fill", "#3cc47c");
                    })
                    .on("click", function (f) { // This onclick is for going from state --> state view
                        var schoolAlreadyInArray = schoolExists(f.INSTNM);
                        if (selected_schools.length < 10 && !schoolAlreadyInArray) {
                            selected_schools.push(f);
                            var labelBox = d3.select(".label_holder");
                            labelBox.append('span')
                                .attr("class", "label label-success")
                                .text(f.INSTNM)
                                .append("button")
                                .attr("type", "button")
                                .attr("class", "close deselect")
                                .on("click", function () {
                                    var index = selected_schools.indexOf(f);

                                    if (index > -1) {
                                        selected_schools.splice(index, 1);
                                    }
                                    d3.select(".label:nth-child(" + (index + 1) + ")").remove();

                                    if (selected_schools.length < 2) {
                                        $("#compare_button").animate({
                                            "opacity": 0
                                        });
                                        d3.select("#compare_button").attr("disabled", "disabled");
                                    }
                                })
                                .append("span").html("&times;");
                        }
                        if (selected_schools.length >= 2) {
                            $("#compare_button").animate({
                                "opacity": 1
                            });
                            d3.select("#compare_button").attr("disabled", null);
                        }
                    });

                data.forEach(function (c) {
                    var schoolDiv = content.append("div").attr("class", "school_selector");
                    schoolDiv.append("button")
                        .attr("type", "button")
                        .attr("class", "close cancel")
                        .attr("title", "Click to visit website")
                        .attr("onclick", "visitWebsite('" + c.INSTURL + "')")
                        .append("span")
                        .attr("class", "glyphicon glyphicon-globe");
                        // .html("&#x21b1;");
                    schoolDiv.append('h3').attr('class', 'school_name').text(c.INSTNM);
                    schoolDiv.append('p').attr('id', 'loc').text(function () {
                        return c.CITY + ', ' + c.STABBR
                    });
                });

                for (var i = 0; i < institutions.length; i++) {
                    institutions[i].addEventListener("mouseover", function (n) {
                        d3.selectAll(".school_name").style("color", '#6d7993');

                        n.srcElement.style.color = "#3cc47c";
                        d3.selectAll(".dots").style("fill", function (f) {
                            if (f.INSTNM === n.toElement.innerText) {
                                return "#3cc47c";
                            } else {
                                return '#f4decb';
                            }
                        });
                    });
                    institutions[i].addEventListener("click", function (n) {
                        var element;
                        d3.selectAll(".dots").each(function (f) {
                            if (f.INSTNM === n.toElement.innerText) {
                                element = f;
                            }
                        });
                        var schoolAlreadyInArray = schoolExists(element.INSTNM);
                        if (selected_schools.length < 10 && !schoolAlreadyInArray) { // for clicking a school name (state -> state)
                            selected_schools.push(element);
                            var labelBox = d3.select(".label_holder");
                            labelBox.append('span')
                                .attr("class", "label label-success")
                                .text(element.INSTNM)
                                .append("button")
                                .attr("type", "button")
                                .attr("class", "close deselect")
                                .on("click", function () {
                                    var index = selected_schools.indexOf(element);

                                    if (index > -1) {
                                        selected_schools.splice(index, 1);
                                    }
                                    d3.select(".label:nth-child(" + (index + 1) + ")").remove();

                                    if (selected_schools.length < 2) {
                                        $("#compare_button").animate({
                                            "opacity": 0
                                        });
                                        d3.select("#compare_button").attr("disabled", "disabled");
                                    }
                                })
                                .append("span").html("&times;");
                        }
                        if (selected_schools.length >= 2) {
                            $("#compare_button").animate({
                                "opacity": 1
                            });
                            d3.select("#compare_button").attr("disabled", null);
                        }
                    });
                }
            }


        } else {
            x = width / 2;
            y = height / 2;
            k = 1;
            centered = null;

            d3.selectAll(".colleges").remove();

            $(".content").empty();

            d3.selectAll("path").classed("state", true);
        }

        g.transition()
            .duration(750)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
    });
}

function visitWebsite(url) {
    return window.open(
        'http://' + url,
        '_blank'
    );
}


function buttonClicked() {
    $("#map").hide();
    $("#info").hide().addClass("compared");
    $("#input-bar").hide(); // search bar
    $("#backButton").show();
    $(".selection_area").hide();

    compare(selected_schools);
}

function backToMap() {
    $("#map").show();
    $("#info").show().removeClass("compared");
    $(".selection_area").show();

    $("#backButton").hide();
    $("#input-bar").show();

    $(".card").remove();
    $(".small-card").remove();
    $(".toolTip").remove();
    $(".nvtooltip").remove();
    $(".back-top").remove();
}

function hideResults() {
    setTimeout(function() {
        $(".searchbar").animate({width: '260px'});
        document.getElementById("results").style.display = "none";
        document.getElementById("searchBox").value = '';
        d3.select("#resultsList").selectAll("li").remove();
    }, 150);
}

function grow() {
    $(".searchbar").animate({ width: '297px' });
}

function schoolExists(schoolName) {
    return selected_schools.some(function(el) {
        return el.INSTNM === schoolName;
    });
}

$('#searchBox').keyup(function(e) {

    if (e.keyCode == 40 || e.keyCode == 38 || e.keyCode == 13) {
        switch (e.keyCode) {
            case 13:        // return
                e.preventDefault();
                selectResult();
                document.getElementById("searchBox").value = '';
                $('#results').slideUp();
                setTimeout(function () {
                    d3.select("#resultsList").selectAll("li").remove();
                }, 150);
                return;
            case 38:        // up
                e.preventDefault();
                highlightResult(-1);
                return;
            case 40:        // down
                e.preventDefault();
                highlightResult(1);
                return;
        }
    } else {
        showResults();
    }
});

function highlightResult(n) {

    var $res = $("#resultsList");

    var hilgt = $res.find('.highlight');
    var newhilgt;

    // if we don't have a highlighted element...
    var hasNoResults= $res.find('li').first()[0].innerText == "No Results Found";
    if (!hilgt.length && !hasNoResults) {
        if (n > 0) {
            console.log("made it");
            // highlight the first one
            $res.find('li').first().addClass('highlight');
            document.getElementById("searchBox").value = $res.find('li').first()[0].innerText;
        } else {
            console.log("made it here");
            // highlight the last one
            $res.find('li').last().addClass('highlight');
            document.getElementById("searchBox").value = $res.find('li').last()[0].innerText;
        }
    }

    if (!hasNoResults) {
        if (n > 0) {
            var newhilgt = hilgt.next();
            document.getElementById("searchBox").value = hilgt.next()[0].innerText;
        } else {
            var newhilgt = hilgt.prev();
            document.getElementById("searchBox").value = hilgt.prev()[0].innerText;
        }


        if (newhilgt.length) {
            newhilgt.addClass('highlight');
            hilgt.removeClass('highlight');
        }
    }
}

function selectResult() {
    var sel = $("#resultsList").find( '.highlight' );
    if( sel.length ) {
        var sch = sel[0].__data__;
        var schoolAlreadyInArray = schoolExists(sch.INSTNM);
        if (selected_schools.length < 10 && !schoolAlreadyInArray) {
            selected_schools.push(sch);
            var labelBox = d3.select(".label_holder");
            labelBox.append('span')
                .attr("class", "label label-success")
                .text(sch.INSTNM)
                .append("button")
                .attr("type", "button")
                .attr("class", "close deselect")
                .on("click", function () {
                    var index = selected_schools.indexOf(sch);

                    if (index > -1) {
                        selected_schools.splice(index, 1);
                    }
                    d3.select(".label:nth-child(" + (index + 1) + ")").remove();

                    if (selected_schools.length < 2) {
                        $("#compare_button").animate({
                            "opacity": 0
                        });
                        d3.select("#compare_button").attr("disabled", "disabled");
                    }
                })
                .append("span").html("&times;");
        }
        if (selected_schools.length >= 2) {
            $("#compare_button").animate({
                "opacity": 1
            });
            d3.select("#compare_button").attr("disabled", null);
        }
    }
}

function showResults() {

    var input = document.getElementById("searchBox").value;
    var searchTerms = input.split(" ");

    var list = d3.select("#resultsList");

    if (input !== "") {
        setTimeout(function () {
            $('#results').slideDown();
        }, 150);

        d3.csv("data/allData.csv", function (error, data) {
            if (error) return error;

            data = data.filter(function (d) {
                return new RegExp(searchTerms.join('.*'), "i").test(d.INSTNM);
            });

            d3.select("#resultsList").selectAll("li").data(data.filter(function (d) {
                return new RegExp(searchTerms.join('.*'), "i").test(d.INSTNM);
            })).enter().append("li");

            d3.select("#resultsList").selectAll("li").data(data.filter(function (d) {
                return new RegExp(searchTerms.join('.*'), "i").test(d.INSTNM);
            }))
                .attr("class", "liElement")
                .on("mouseover", function (f) {
                    d3.selectAll("li").classed('highlight', false);
                })
                .on("click", function (f) {
                    var schoolAlreadyInArray = schoolExists(f.INSTNM);
                    if (selected_schools.length < 10 && !schoolAlreadyInArray) {
                        selected_schools.push(f);
                        var labelBox = d3.select(".label_holder");
                        labelBox.append('span')
                            .attr("class", "label label-success")
                            .text(f.INSTNM)
                            .append("button")
                            .attr("type", "button")
                            .attr("class", "close deselect")
                            .on("click", function () {
                                var index = selected_schools.indexOf(f);

                                if (index > -1) {
                                    selected_schools.splice(index, 1);
                                }
                                d3.select(".label:nth-child(" + (index + 1) + ")").remove();

                                if (selected_schools.length < 2) {
                                    $("#compare_button").animate({
                                        "opacity": 0
                                    });
                                    d3.select("#compare_button").attr("disabled", "disabled");
                                }
                            })
                            .append("span").html("&times;");
                    }
                    if (selected_schools.length >= 2) {
                        $("#compare_button").animate({
                            "opacity": 1
                        });
                        d3.select("#compare_button").attr("disabled", null);
                    }
                    hideResults();

                })
                .html(function (d) {
                    return d.INSTNM;
                });

            var hilgt = $("#resultsList").find('.highlight');
            if (!hilgt.length) {
                $("#resultsList").find('li').first().addClass('highlight');
            }

            d3.select("#resultsList").selectAll("li").data(data.filter(function (d) {
                return new RegExp(searchTerms.join('.*'), "i").test(d.INSTNM);
            })).exit().remove();

            if (data.length === 0) {
                list.append("li").attr("class", "liElement notFound").html("No Results Found");
            }
        });
    }
    else {
        $('#results').slideUp();
        setTimeout(function () {
            d3.select("#resultsList").selectAll("li").remove();
        }, 150);
    }

}

$(document).keyup(function (e) {
    var $sb = $('#searchBox');
    if ($('#searchBox:focus').length == 0) {
        if (e.which == 13) { $sb.focus(); }
        if (e.which == 67 && selected_schools.length > 1 && !$('#info').hasClass('compared')) { buttonClicked() }
        if (e.which == 66 && selected_schools.length > 1 && $('#info').hasClass('compared')) { backToMap() }
    }
    if (e.keyCode == 27 && $('#searchBox:focus').length > 0) {
        $sb.blur();
    }
});
