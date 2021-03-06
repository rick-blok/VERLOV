var params = "";
var p = [];
p['begin_datum']="";
p['begin_tijd']="";
p['eind_datum']="";
p['eind_tijd']="";
p['aantal_uur']="";
p['toelichting']="";
p['person_id']=0;
p['empno']=0;
p['verlof_type']="";
p['parafeerder']=0;
p['user_id']=0;
p['nids']=0;
p['to_url']=0;
p['locatie']="";
p['saldo_verlof']=0;
p['saldo_atv']=0;
p['stnd_uren']=0;
p['pagina']=0;

//Verlofcodes. eerste letter voor dag(delen) (- indien nvt), tweede letter voor uren
var types = {
		'Verlof' : "VX", 
		'ATV' : "AY",
		'Buitengewoon' : "-B", //toelichting nodig
		'Calamiteiten' : "-K", //toelichting nodig
		'Artsbezoek'   : "-D", //toelichting nodig
		'Compensatie'  : "-C"
	};

var aanvragenverstuurd=0;
var startVersturen = false;
var errorInInput = false;
var continueOnError = false;
var verloven = [];

var weeksBeforeNow = 0;
var weeksAfterNow = 0;

var http = new XMLHttpRequest();
var messageBox;

function processResponse(){
    if(http.readyState == 4 && http.status == 200) {
        document.getElementById("response").innerHTML = http.responseText;
		
		//reattach scripts to get them working
		var scripts = document.getElementById("response").getElementsByTagName("script");
		var l = scripts.length;
		for (var i=0 ; i < l ; i++){
			var newScript = document.createElement("script");
			var contents = document.createTextNode(scripts[i].innerHTML);
			newScript.appendChild( contents );
			document.getElementById("response").appendChild( newScript );
		}
		// informatie div staat in de weg
		document.querySelector("#response #informatie").style.top = "auto";
		
		// get variables for post
		p['pagina'] 	= document.querySelector("#response input[name='pagina']").value;
		p['person_id'] 	= document.querySelector("#response input[name='person_id']").value;
		p['empno'] 		= document.querySelector("#response input[name='empno']").value;
		p['parafeerder']= document.getElementById("parafeerder").value;
		p['user_id']	= document.querySelector("#response input[name='user_id']").value;
		p['nids']		= document.querySelector("#response input[name='nids']").value;
		p['to_url']		= document.querySelector("#response input[name='to_url']").value;
		p['locatie']	= document.querySelector("#response input[name='locatie']").value;
		p['saldo_verlof']=document.querySelector("#response input[name='saldo_verlof']").value;
		p['saldo_atv']	= document.querySelector("#response input[name='saldo_atv']").value;
		p['stnd_uren']	= document.querySelector("#response input[name='stnd_uren']").value;
		
		if (startVersturen){
			messageBox.getElementsByTagName("p")[aanvragenverstuurd].innerHTML += " OK";
			aanvragenverstuurd++;
			stuurAanvraag(); //op naar de volgende
		} else {
			messageBox.classList.add("noShow");
		}
	} else if (http.readyState == 4){
		messageBox.getElementsByTagName("p")[aanvragenverstuurd].innerHTML += " FOUT: " + http.status + " " + http.statusText;
		//alert("er ging iets mis? \n" + http.status);
	} else { // laat wat actie zien
		messageBox.getElementsByTagName("p")[aanvragenverstuurd].innerHTML += ".";
	}
}

//om een of andere reden komt deze niet mee...
function f_toon_informatie(p_soort){}

function stuurAanvraag(){
	if (aanvragenverstuurd == 0){
		console.log("Start versturen");
		startVersturen = true;
		checkInputCalendar();
		messageBox.getElementsByTagName("h1")[0].innerHTML = "Aanvragen versturen";
		messageBox.getElementsByTagName("input")[1].outerHTML = "";
	} else if (aanvragenverstuurd >= verloven.length){
		//klaar!
		console.log("klaar met versturen");
		errorInInput = false;
		continueOnError = false;
		startVersturen = false;
		messageBox.getElementsByTagName("p")[aanvragenverstuurd].innerHTML += "<br>KLAAR!";
		aanvragenverstuurd = 0;
		clearInputCalendar();
		return;
	}
	
	if (errorInInput && !continueOnError) {
		console.log("fouten gevonden");
		if ( confirm("Er zijn fouten gevonden (rood gemarkeerd), deze worden genegeerd.\nVerder gaan?") ){
			continueOnError = true;
		} else {
			startVersturen = false;
			continueOnError = false;
			return false;
		}
	}
	
	console.log("verstuur nr " + aanvragenverstuurd);

	for (var verlof in verloven[aanvragenverstuurd]){
		p[verlof] = verloven[aanvragenverstuurd][verlof];
	}
	console.debug(p);
	
	var url = 'http://verlof/v1.1/VerlofSubmit.php';
	params = "";
	for (var key in p){
		params +=  key + "=" + p[key] + "&" ;
	}
	params = params.substring(0, params.length - 1);
	http.open('POST', url, true);
	http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	http.send(params);
}


function checkInputCalendar(){
	verloven = [];
	errorInInput = false;

	for (var type in types){
		var e = document.getElementById(type).getElementsByTagName('input');
		for (var i = 0; i < e.length; i++){ 
			// sanitize
			if (!e[i].value.match(/^\d?(\.\d)?$/)){
				if (e[i].value != "" ) {
					e[i].classList.add("error"); 
				}
				errorInInput = true;
				continue;	
			} else if (e[i].value == "" )
				continue;
			e[i].classList.remove("error");
			
			var j = verloven.length;
			verloven[j] = [];
			if (types[type][0] != "-" && Number(e[i].value) % 4 == 0){
				//dag
				if ( (j > 0 && verloven[j-1]["verlof_type"][0] == types[type][0] && verloven[j-1]["eind_tijd"] == "17:12" && Number(e[i-1].value) != 0 ) ){
					// ga verder met de vorige
					verloven[j-1]["eind_datum"] = e[i].name;
					verloven[j-1]["eind_tijd"] = Number(e[i].value) == 4 ? "12:30" : "17:12";
					verloven[j-1]["aantal_uur"] = (Number(verloven[j-1]["aantal_uur"]) + Number(e[i].value)).toString();
					verloven.pop();
				} else {
					// nieuwe aanvraag
					verloven[j]["begin_datum"] = e[i].name;
					verloven[j]["begin_tijd"] = Number(e[i].value) == 4 ? "13:12" : "08:30";
					verloven[j]["eind_datum"] = e[i].name;
					verloven[j]["eind_tijd"] = "17:12";
					verloven[j]["verlof_type"] = types[type][0];
					verloven[j]["verlof_naam"] = type + " dag";
					verloven[j]["aantal_uur"] = e[i].value;
				}
			} else{
				//uren
				verloven[j]["begin_datum"] = e[i].name;
				verloven[j]["begin_tijd"] = "08:30";
				verloven[j]["eind_datum"] = e[i].name;
				verloven[j]["eind_tijd"] = "17:12";
				verloven[j]["verlof_type"] = types[type][1];
				verloven[j]["verlof_naam"] = type + " uur";
				verloven[j]["aantal_uur"] = e[i].value;
				
				if ( types[type][1] == "K" || types[type][1] == "B" || types[type][1] == "D"|| types[type][1] == "L" || types[type][1] == "O" ) {
					do {
						verloven[j]["toelichting"] = prompt("Toelichting voor " + type + " op " + e[i].name, "");
					} while (!verloven[j]["toelichting"] || verloven[j]["toelichting"] == "" || verloven[j]["toelichting"] == " ");
				}
			}
		}
	}
	messageBox.innerHTML = "<H1>Controleer input</H1>";
	for (var i=0; i<verloven.length ; i++){
		messageBox.innerHTML += 
			"<p>verlof " + i + ": "
			+ verloven[i]["verlof_type"] + " ("
			+ verloven[i]["verlof_naam"] + ") "
			+ verloven[i]["begin_datum"] + " "
			+ verloven[i]["begin_tijd"] + " - "
			+ verloven[i]["eind_datum"] + " "
			+ verloven[i]["eind_tijd"] + " ("
			+ verloven[i]["aantal_uur"] + " uur)";
	}
	messageBox.innerHTML += "<p></p>";
	messageBox.innerHTML += "<input type=\"button\" onclick=\"javascript:messageBox.classList.add('noShow');\"  value=\"Sluiten\"> ";
	messageBox.innerHTML +=  "<input type=\"button\" onclick=\"javascript:stuurAanvraag();\"  value=\"Doe aanvraag\"> ";
	messageBox.classList.remove("noShow");
	console.debug(verloven);
}

function clearInputCalendar(){
	document.getElementById("input").reset();
}

function createVerlofLijst(){
	var e = document.getElementById("labels");
	
	var div2 = document.createElement("div");
	var txt = document.createTextNode( "-" );
	div2.classList.add("label");
	div2.appendChild(txt);
	e.appendChild(div2);
	
	var div = document.createElement("div");
	var txt = document.createTextNode( "-" );
	div.classList.add("label");
	div.appendChild(txt);
	e.appendChild(div);
	
	for (var type in types){
		var div = document.createElement("div");
		var txt = document.createTextNode( type );
		div.classList.add("label");
		div.appendChild(txt);
		e.appendChild(div);
	}
	
	var e =  document.getElementById("wrapper");

	var div2 = document.createElement("div");
	div2.setAttribute("id", "weeknrs");
	e.appendChild(div2);
	
	var div = document.createElement("div");
	div.setAttribute("id", "header");
	e.appendChild(div);
	
	for (var type in types){
		var div = document.createElement("div");
		div.setAttribute("id", type);
		e.appendChild(div);
	}
}

function addWeekBefore(){
	var d = new Date();
	d.setDate(d.getDate() - ++weeksBeforeNow*7);
	
	addWeek(d, "before");
}

function add5WeeksBefore(){
	for (var i = 0; i < 5 ; i++) {
		addWeekBefore();
	}
}

function addWeekAfter(){
	var d = new Date();
	d.setDate(d.getDate() + ++weeksAfterNow*7);
	
	addWeek(d, "after");
}

function add5WeeksAfter(){
	for (var i = 0; i < 5 ; i++) {
		addWeekAfter();
	}
}

function addWeek( withDate , pos ){
	//monday of specified week
	var startDate = new Date(withDate.getFullYear(), withDate.getMonth(), withDate.getDate() - ((withDate.getUTCDay() + 6) % 7)); 
	//monday of this week
	var d = new Date();
	var thisMonday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getUTCDay() + 6) % 7));
	var thisWeek = ( startDate.getTime() == thisMonday.getTime());
	
	// add dates to header
	var e = document.getElementById("header");
	var div = document.createElement("div");
	div.classList.add("week"); 
	if (thisWeek)
		div.classList.add("current");
	for (var i = 0; i < 7; i++){
		var date = new Date(startDate.getTime());
		date.setDate(startDate.getDate() + i);
		var span  = document.createElement("span");
		var txt = document.createTextNode( date.getDate() + "-" + (date.getMonth()+1) );
		span.appendChild(txt);
		div.appendChild(span);
	}
	if(pos == "after")
		e.appendChild(div);
	else
		e.prepend(div);
	
	div.scrollIntoView();
	
	// add weeknumbers
	var e = document.getElementById("weeknrs");
	var div2 = document.createElement("div");
	div2.classList.add("week"); 
	var txt = document.createTextNode( getWeekNumber(date) );
	div2.appendChild(txt);
	if (thisWeek)
		div2.classList.add("current");
	if(pos == "after")
		e.appendChild(div2);
	else
		e.prepend(div2);
	
	//add inputboxes
	for (var type in types){
		var e = document.getElementById(type);
		var div = document.createElement("div");
		div.classList.add("week"); 
		if (thisWeek)
			div.classList.add("current");
		
		for (var i = 0; i < 5; i++){
			var date = new Date(startDate.getTime());
			date.setDate(startDate.getDate() + i);
			var input = document.createElement("input");
			input.setAttribute("type", "text");
			input.setAttribute("name", date.getDate() + "-" + (date.getMonth()+1) + "-" + date.getFullYear() );
			div.appendChild(input);
		}
		if(pos == "after")
			e.appendChild(div);
		else
			e.prepend(div);
	}
}

function getWeekNumber(d) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    // Get first day of year
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    // Return string of year and week number
    return d.getUTCFullYear() +" week "+ weekNo;
}

window.onload = function (){
	createVerlofLijst();
	var d = new Date();
	addWeek(d, "after");
	addWeekBefore();
	addWeekAfter();
	
	var urlget = "http://verlof/";
	
	// show message
	messageBox = document.getElementById("message");
	messageBox.classList.remove("noShow");
	messageBox.innerHTML = "<h1>Data verzamelen</h1><p>" + urlget + " openen.</p><input type=\"button\" onclick=\"javascript:messageBox.classList.add('noShow');\"  value=\"Sluiten\">";
	
	// Get user specific variables
	http.open("GET", urlget, true);
	http.onreadystatechange = processResponse;
	http.send();
	
	document.getElementById("settingbutton").classList.add("noShow");
};

//IE compatability
HTMLElement = typeof(HTMLElement) != 'undefined' ? HTMLElement : Element;
HTMLElement.prototype.prepend = function(element) {
    if (this.firstChild) {
        return this.insertBefore(element, this.firstChild);
    } else {
        return this.appendChild(element);
    }
};
