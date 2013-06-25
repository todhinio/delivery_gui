var basePath="http://85.214.93.186/DeliveryWeb";
var base64Login=null;

var vehicleActive=null;

var tourActive=null;
var tourstopActive=null;
var positionActicve=null;

var tourList=[];
var tourStop=[];
var productGroup=[];
var vehiceList=[];
var imageIconBase='images/icon_on_empty32.png';
var acceptorPin=null;
var deliveryLink="";
var goodsNode="";


var sendCoordIntervall=20000;
var isWriteCoords=true;


var mapIconUrl="http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=$|FF0000|000000";

//Standard Karten implemtierung
function initMap(coord){}

function showTourstopinMap(){}

function updateMyPositiononMap(position){}

function getRouteFromLocation(){}

function toggleTrafficLayer(){}

function zoomToMyPosition(){}

function zoomToAll(){}
//ENDE Standard Karten implemtierung

//Nach Positionsbestimmung
var onCoordsDefinedForTour=function(position){
	console.info("Koordinaten",position);
	positionActicve={
		lat:position.coords.latitude,
		lng:position.coords.longitude
	};
	if(isWriteCoords){		 
		 updateMyPositiononMap(position);
		 var data='{"simplelatlng":{"lng":'+position.coords.longitude+',"lat":'+position.coords.latitude+'}}';
		 setTimeout(function() {
			 sendTourCoords(data);
		}, sendCoordIntervall);
	}
};

var onDeliveryResponse=function(data){
	if(data.simpleResponse.status==200){
		loadTourstop(tourActive,onTourstopUpdated);
	}else{
		console.info("ERROR",data);
		alert(data.simpleResponse.message);
	}
};


var onProductgroupResponse=function(json){
	if(json.simpleproductgroup){
		productGroup=json.simpleproductgroup;
		/*
		$('#tourlist li').remove();
		$.each(json.simpleproductgroup, function(idx, daten){
			$('#tourstop').find('ul').append('<li><a href="#'+daten.name+'" onclick="showTourstopProducts('+idx+')" >'+daten.name+'</a></li>');
		});
		*/
	}
};

var onLocationCoordResponse=function(resp){
	if(resp.simpleResponse.status==200){
		//alert("Location erfolgreich aupgedatet");
	}else{
		alert("Standort konnte nicht aktualisiert werden.");
	}
};

//Nachdem Koordianten für Tour übergeben wurden
var onTourCoordResponse=function(data){
	getPosition(onCoordsDefinedForTour);
};

var onTourlistResponse=function(json){
	if(json.tour){
		//console.info("TOUREN");
		tourList=json.tour;
		
		$('#tourlist li').remove();
		$.each(json.tour, function(idx, daten){
			$('#tourlist').find('ul').append('<li><a href="#'+daten.id+'" onclick="showTour('+idx+')" title="'+daten.id+'Employee" > '+dateToDate(daten.begin)+' - '+dateToTime(daten.begin)+'</a></li>');
		});
		loadProductgroup();
		if(json.tour.length==1){
			showTour(0);
		}else{
			selectSection('tourlist');
			//$('section, nav a').removeClass('aktiv');
			//$('a[href=#tourlist], #tourlist').addClass("aktiv");
			
		}
	}
};

var onTourstopResponse=function(json){
	if(json.tourstop){
		tourStop=json.tourstop;
		$('#tour li').remove();
		$('#tour div').find('a').html(''+tourActive.vehicle.title);
		//$('#tour div').append('<span>'+tourActive.driver.person.prename+'</span>');
		$.each(json.tourstop, function(idx, daten){
			//console.info("Tourstop",daten);
			
			var sD="";
			var cssDelivered="";
			if(daten.arrival){
				var date=new Date(daten.arrival);
				sD=" ("+dateToTime(date)+")";//date.getDate()+" "+date.getMonth()+" "+date.getFullYear();
				cssDelivered=' class="delivered" ';
			}
			
			var tourIcon=mapIconUrl.replace('$',''+(idx+1));
			$('#tour').find('ul').append('<li '+cssDelivered+'><a href="#'+daten.id+'" title="'+daten.target.title+' in Karte anzeigen" onclick="showTourstopinMap('+idx+')" ><img src="'+tourIcon+'"></a><a href="#'+daten.id+'" onclick="showTourstop('+idx+')" >'+daten.target.title+' '+sD+'</a></li>');
		});
	}
};
//Nachdem aus oder eingeladen wurde (Veränderung der Toruladung)
var onTourstopUpdated=function(json){
	if(json.tourstop && tourstopActive){
		tourStop=json.tourstop;
		var t=0;
		for(t;t<tourStop.length;t++){
			if(tourstopActive.id==tourStop[t].id){
				showTourstop(t);
			}
		}
	}
};
//Gibt die Mitarbeiter zurück, die für den Tag am Stand eingeteils sind
var onTourstopSellerResponse=function(json){
	if(json.seller){
		$('#delivery li').remove();
		if(json.seller.length>0){
			//Fahrer hinzufügen
			$('#delivery').find('ul').append(_writeListElemPerson(tourActive.driver.person));
			$.each(json.seller, function(idx, daten){
				$('#delivery').find('ul').append(_writeListElemPerson(daten.employee.person)/*'<li><a href="javascript:void(0);" onclick="selectConfirmedEmployeeFromA(this)" >'+daten.employee.person.prename +' '+daten.employee.person.lastname+'</a><input name="employee" class="checkboxHidden" type="checkbox" value="'+daten.employee.person.id+'" /><span><img class="iconCheckboxBase" src="'+imageIconBase+'" /></span></li>'*/);
			});
		}else if(tourstopActive){
			loadEmployeeFromLocation(tourstopActive.target);	
		}
	}
};

var onTourstopReceiveResponse=function(json){
	
	writePackDataInList($.isArray(json.pack) ? json.pack :[json.pack],$('#tourstop').find('#receive'));
};

function _writeListElemPerson(person){
	return '<li><a href="javascript:void(0);" onclick="selectConfirmedEmployeeFromA(this)" >'+person.prename +' '+person.lastname+'</a><input name="employee" class="checkboxHidden" type="checkbox" value="'+person.id+'" /><span><img class="iconCheckboxBase" src="'+imageIconBase+'" /></span></li>';
}
var onEmployeeLocationResponse=function(json){
	if(json.employee){
		$('#delivery li').remove();
		//Fahrer hinzufügen
		$('#delivery').find('ul').append(_writeListElemPerson(tourActive.driver.person));
		$.each(json.employee, function(idx, daten){
			$('#delivery').find('ul').append(_writeListElemPerson(daten.person)/*'<li><a href="javascript:void(0);" onclick="selectConfirmedEmployeeFromA(this)" >'+daten.person.prename +' '+daten.person.lastname+'</a><input name="employee" class="checkboxHidden" type="checkbox" value="'+daten.person.id+'" /><span><img class="iconCheckboxBase" src="'+imageIconBase+'" /></span></li>'*/);
		});
	}
};

var onVehicleSetresponse=function(data){
	if(data.simpleResponse&&data.simpleResponse.status==200){
		$('#tour div').find('a').html(''+vehicleActive.title);
	}else{
		alert("Auto konnte nicht geändert werden - Status:"+data.simpleResponse.status);
	}
	
};

var onVehicleResponse=function(data){
	vehiceList=data.vehicle;
	$.each(data.vehicle, function(idx, daten){
		$('#vehicle').find('ul').append('<li><a href="#'+daten.title+'" onclick="onVehicleSelect('+idx+')">'+daten.title+'</a></li>');
	});
};

var onVehicleSelect=function(idx){
	vehicleActive=vehiceList[idx];
	
	sendJsonRequest(basePath+'/driverservice/tour/'+tourActive.id+'/vehicle/'+vehicleActive.id+'?='+Date.now(),onVehicleSetresponse,null,"POST");
	
	selectSection('tour');
};
/*
function activate(sectionName){
	$('a[href=#login], #login').addClass("aktiv");
}
*/
/*Selektiert den aktiven Bereich*/
function selectSection(sectionName){
	$('section, nav a').removeClass('aktiv');
	$('a[href=#'+sectionName+'], #'+sectionName).addClass("aktiv");
}

function activateVehicleSelect(){
	loadVehicle();
	selectSection('vehicle');
}

//Auslieferung der Ware
function sendDelivery(){
	var n = $(goodsNode).find("input:checked" );
	
	var packList=[];
	
	$.each(n, function(idx, cB){
		packList.push({"id":cB.value,"quantity":$(cB).parent().find("input:text").val()});
	});
	if(tourstopActive){
		if(packList.length>0){
			//Bestätigt durch
			var stopAcceptor=null;
			var acc = $("#delivery").find("input:checked" );
			$.each(acc, function(idx, a){
				stopAcceptor=a.value;
			});
			var sendObj={
				"simpledelivery":{
					"tourstop":tourstopActive.id,
					"pack":packList
				}
			};
			if(stopAcceptor){
				sendObj.simpledelivery.acceptor=stopAcceptor;
				if(acceptorPin){
					sendObj.simpledelivery.pin=""+acceptorPin;
				}
			}
			//console.info('SEND TO '+basePath+'/location/'+tourstopActive.target.id+'/delivery',sendObj);
			sendJsonRequest(deliveryLink,onDeliveryResponse,null,"POST",JSON.stringify(sendObj));
			acceptorPin=null;
		}else{
			alert("Es wurde keine Ware übergeben");
		}
		//onDeliveryResponse
	}else{
		alert("Kein Tourstop aktiv, Daten können nicht gesendet werden");
	}
}

function selectConfirmedEmployeeFromA(node){
	selectConfirmedEmployee($(node).parent().find('span').find('img'));
}

function showDelivery(linkNode){
	console.log("type:",linkNode);
	var linkClassName = $(linkNode).attr('class');
	//Wenn ein Halken gesetzt wurde
	if(linkClassName.indexOf('iconDeliver')>-1){
		deliveryLink=basePath+'/driverservice/location/'+tourstopActive.target.id+'/delivery?='+Date.now();
		goodsNode="#stoupgroup";
		console.info("Ausliefern");
	}else{
		deliveryLink=basePath+'/driverservice/tourstop/'+tourstopActive.target.id+'/receive?='+Date.now();
		goodsNode="#receive";
		console.info("Abholen");
	}
	selectSection('delivery');
}


function showPin(elem){
	acceptorPin=null;
	$("#pininput").remove();
	$("#delivery").append('<div id="pininput" ><span onmousedown="cancelPininput(this)" >x</span><div><h2>PIN</h2> '+$(elem).html()+'</div><input id="password_input" type="password" value="" /><a class="iconBase iconConfirm" href="javascript:void(0);"  onclick="confirmPin(this)" ></a></div>');
	$("#password_input").focus();
	
}

function cancelPininput(){
	$("#pininput").remove();
}
function confirmPin(elem){
	acceptorPin=""+$(elem).parent().find("input").val();
	$("#pininput").remove();
	
	sendDelivery();
}

/*Liste der Autos laden*/
function showTourstop(stopIndex){
	var _ts=tourStop[stopIndex];
	tourstopActive=_ts;
	
	selectSection('tourstop');
	
	loadTourstopSeller(_ts);
	
	$('#receive li').remove();
	$('#stoupgroup li').remove();
	
	if(tourstopActive.type==2){
		loadTourstopReceive(tourstopActive);
	}
	$('#stopgrouptitle span').remove();
	$('#stopgrouptitle a').remove();
	$('#receivetitle span').remove();
	$('#receivetitle a').remove();
	if(tourstopActive.type==1 || tourstopActive.type==3){
		$('#stopgrouptitle').append('<a class="iconBase iconDeliver" href="javascript:void(0)" onclick="showDelivery(this)" title="Ausliefern" ><img src="images/icon_on_empty32.png" /></a>');
		$('#stopgrouptitle').append('<span> Auslieferung <span>');
	}
	if(tourstopActive.type==2 || tourstopActive.type==3){
		$('#receivetitle').append('<a class="iconBase iconReceiver" href="javascript:void(0)" onclick="showDelivery(this)"  title="Abholen" ><img src="images/icon_on_empty32.png" /> </a>');
		$('#receivetitle').append('<span> Ware abholen<span>');
	}
	
	$('#stoptarget').html(_ts.target.title);
	if($('#stopphone a')){
		$('#stopphone a').remove();
	}
	if(_ts.target.phone){
		$('#stopphone').append('<a class="iconBase iconPhone" href="tel:'+clearPhoneNumber(_ts.target.phone)+'" title="'+_ts.target.phone+'"><img src="'+imageIconBase+'"/></a>');
	}
	
	var adrtxt=createAddressTxt(_ts.target.address); 
	$('#stoptarget_adr').html(adrtxt);
	
	if(_ts.delivery){
		$('#stoupgroup li').remove();
		writePackDataInList($.isArray(_ts.delivery) ? _ts.delivery : [_ts.delivery],$('#tourstop').find('#stoupgroup'));
	}else if(tourstopActive.type==1 || tourstopActive.type==4){
		$('#tourstop').find('#stoupgroup').append("<li>Keine Ware zugeordnet</li>");
	}
}

function writePackDataInList(packList,node){
	var stopView={};
	
	$.each(packList, function(idx, daten){
		orderPackToProductgroup(stopView,daten);
	});
	var pg=null;
	
	for(pg in productGroup){
		var _g=productGroup[pg];
		if(stopView[""+_g.id]){
			var elem=stopView[""+_g.id];
			//console.log("VIEWELEM "+_g.id,elem);
			var prdList='<ul class="listInvisible">';
			$.each(elem.item, function(idx, item){
				prdList+='<li>'+item.product.title+'<img class="iconCheckboxBase" src="'+imageIconBase+'" /><input class="checkboxHidden" type="checkbox" value="'+item.id+'" name="stop_pack" /><span>'+item.unit.unit+'</span><input style="display:none" type="text" onblur="setPackValue(this)" name="quantity" value="'+item.quantity+'" ><span name="quantity_view" onmousedown="togglePackQuantityInput(this)">'+item.quantity+'</span></li>';
			});
			prdList+='</ul>';
			node.append('<li><a href="#'+elem.name+'" >'+elem.name+'</a><img class="iconCheckboxBase" src="'+imageIconBase+'" /><span>'+elem.item.length+'</span>'+prdList+'</li>');
		}
	}
	
}

function orderPackToProductgroup(view,pack){
	//console.log("SEARCH ",pack);
	var ig=getProductgroupFromProductid(pack.product.id);
	if(ig){
		if(view[""+ig.id]){
			view[""+ig.id].item.push(pack);
		}else{
			view[""+ig.id]={};
			view[""+ig.id].name=""+ig.name;
			view[""+ig.id].item=[];
			view[""+ig.id].item.push(pack);
		}
		//console.log(""+pack.product.title+" in group "+ig.name);
	}
}

//Erfassung der Geokoordinaten
function getPosition(onPositionLoad){
	if(!onPositionLoad){
		alert("Du hast mir nicht gesagt, was ich mit dem Punkt machen soll!");
	}else{
		console.info("FRAGE");
		navigator.geolocation.getCurrentPosition(onPositionLoad);
	}
}

/* Hier wird die Produktgruppe zurückgegeben, in dem sich das Produkt befindet */
function getProductgroupFromProductid(pId){
	var groupResult=null,pg=null,p=null;
	for(pg in productGroup){
		var _g=productGroup[pg];
		var _gp=_g.product;
		for(p in _gp){
			if(_gp[p].id==pId){
				groupResult=_g;
				break;
			}
		}
		if(groupResult!=null){
			break;
		}
	}
	return groupResult;
}

function togglePackQuantityInput(node){
	//console.log("FIND INPUT",);
	$(node).css('display','none');
	$(node).parent().find('input:text').css('display','block');
}
function setPackValue(node){
	//console.log("FIND INPUT",);
	var iV=$(node).val();
	$(node).css('display','none');
	
	togglePackCheckBox($(node).parent().find('img'),'iconCheckboxChecked');
	
	$.each($(node).parent().find('span'), function(idx, sNode){
		
		if($(sNode).attr('name')=="quantity_view"){
			$(sNode).html(iV);
			$(sNode).css('display','inline');
		}
	});
	
}

//Löscht Sonderzeichne aus der Telefonnummer
function clearPhoneNumber(inNumber){
	var phone=""+inNumber;
	phone=phone.replace(/\//,'');
	phone=phone.replace(/-/g,'');
	phone=phone.replace(/ /g,'');
	return phone;
}
function createAddressTxt(_ta){
	return _ta ? (_ta.street ? _ta.street : "") + (_ta.district ? " "+_ta.district : "") + (_ta.zip ? " "+_ta.zip : "") + (_ta.city ? " "+_ta.city : "") : "Keine Angaben";
}

function showTour(tourIndex){
	_t=tourList[tourIndex];
	tourActive=_t;
	getPosition(onCoordsDefinedForTour);
	if(!_t.vehicle){
		activateVehicleSelect();
		//Wenn kein Auto gewählt, dann Auto auswählen
	}else{
		//Ansonsten Tour anzeigen
		selectSection('tour');
	}
	loadTourstop(_t);
}
function dateToTime(date){
	if(typeof date == "string"){
		date=new Date(date);
	}
	var dd=""+date.getHours();
	var MM=""+(date.getMinutes());
	
	return out=(dd.length ==1 ? "0" : "") +dd+":"+(MM.length ==1 ? "0" : "")+MM+" Uhr";
}
function dateToDate(date){
	if(typeof date == "string"){
		date=new Date(date);
	}
	var dd=""+date.getDate();
	var MM=""+(date.getMonth()+1);
	return ""+(dd.length ==1 ? "0" : "") +dd+"."+(MM.length ==1 ? "0" : "")+MM+"."+date.getFullYear();
}

function loadVehicle(reload){
	if(vehiceList.length==0||reload){
		sendJsonRequest(basePath+'/driverservice/vehicle?='+Date.now(),onVehicleResponse);
		
	}
}
function loadProductgroup(){
//http://localhost:8080/DeliveryWeb/driverservice/productgroup
	sendJsonRequest(basePath+'/driverservice/productgroup?='+Date.now(),onProductgroupResponse);
}
function loadTourlist(){
	sendJsonRequest(basePath+'/driverservice/tour?='+Date.now(),onTourlistResponse);
}
function loadTourstop(tour,onResponseEvent){
	if(!onResponseEvent){
		onResponseEvent=onTourstopResponse;
	}
	sendJsonRequest(basePath+'/driverservice/tour/'+tour.id+'/tourstop?='+Date.now(),onResponseEvent);
}

function loadTourstopSeller(tourstop,onResponseEvent){
	if(!onResponseEvent){
		onResponseEvent=onTourstopSellerResponse;
	}
	sendJsonRequest(basePath+'/driverservice/tourstop/'+tourstop.id+'/seller?='+Date.now(),onResponseEvent);
}
function loadTourstopReceive(tourstop){
	sendJsonRequest(basePath+'/driverservice/tourstop/'+tourstop.id+'/goods2receive?='+Date.now(),onTourstopReceiveResponse);
}

function loadEmployeeFromLocation(location,onResponseEvent){
	if(!onResponseEvent){
		onResponseEvent=onEmployeeLocationResponse;
	}
	sendJsonRequest(basePath+'/driverservice/location/'+location.id+'/employee?='+Date.now(),onResponseEvent);
}
/*
function getCoords(onCoordsDefined){
	if(!onCoordsDefined){
		onCoordsDefined=onCoordsDefinedForTour;
	}
	console.log("Hole koordinate");
	navigator.geolocation.getCurrentPosition(onCoordsDefined);	
}*/

function sendTourCoords(coordStr){
	if(tourActive!=null){
		sendJsonRequest(basePath+'/driverservice/tour/'+tourActive.id+'/latlng?='+Date.now(),onTourCoordResponse,null,"POST",coordStr);
	}
}

function updateLocationCoords(coordStr,locationId){
	//console.info("Update "+coord.lat()+" / "+coord.lng());
	sendJsonRequest(basePath+'/driverservice/location/'+locationId+'/latlng?='+Date.now(),onLocationCoordResponse,null,"POST",coordStr);
	// /location/{id}/latlng
}

function sendJsonRequest(reqUrl,onSuccess,onError,method,data){
	if(!onError){
		onError=function (xhr, textStatus, errorThrown) {
	    	console.log("FEHLER",textStatus);
	    };
	}
	if(!method){
		method="GET";
	}
	var reqParams={
	    type: method,
	    url: reqUrl,
	    contentType: "application/json; charset=utf-8",
	    dataType: "json",
	    headers:{"Authorization":"Basic "+base64Login},
	    statusCode: {
	        401:function() { alert("401"); },
	        404:function() { alert("404"); },
	        201:function() { alert("201"); },
	        202:function() { alert("202"); }
	    },
	    success: onSuccess,
	    error: onError
	};
	if(data){
		reqParams.data=data;
	}
	$.ajax(reqParams);
}



function selectConfirmedEmployee(node){
	$(node).toggleClass('iconCheckboxChecked');
	var itemClassName = $(node).attr('class');
	//Wenn ein Halken gesetzt wurde
	if(itemClassName.indexOf('iconCheckboxChecked')>-1){
		var _p=$(node).parent().parent();
		_p.find('input').attr('checked',true);
		var iVal=_p.find('input').val();
		var n = $("#delivery").find("input:checked" );
		$.each(n, function(idx, cB){
			if($(cB).val()!=iVal){
				$(cB).attr('checked',false);
				$(cB).parent().find('img').removeClass('iconCheckboxChecked');
			
				console.info("Aendere "+$(cB).val(),cB);
			}
		});
		showPin(_p.find('a'));
	}
}

function togglePackCheckBox(node, styleClassName){
	var _p=$(node).parent();
	var itemClassName = styleClassName ? styleClassName : $(node).attr('class');
	
	var fIn=_p.find('input');
	var iImg=_p.find('img');
	
	if(itemClassName.indexOf('iconCheckboxChecked')>-1){
		//console.info("Setze Wert ",_p.find('input').length);
		//Füllen der Elemente
		if(fIn.length==1){
			//fIn.val(_p.attr('name'));
			fIn.attr('checked',true);
		}else{
			iImg.removeClass('iconCheckboxChecked');
			iImg.addClass('iconCheckboxChecked');
			$.each(fIn, function(idx, subIn){
				subIn.checked=true;
			});
		}
	}else{
		//Leeren der Elemente
		if(fIn.length==1){
			fIn.attr('checked',false);
		}else{
			iImg.removeClass('iconCheckboxChecked');
			$.each(fIn, function(idx, subIn){
				subIn.checked=false;
			});
		}
	}
}

$("#delivery").delegate("img", "click", function() {
	selectConfirmedEmployee(this);
});

/*Auswahl welche Waren ausgeliefert werden sollen */
$("#stoupgroup,#receive").delegate("img", "click", function() {
	
	//console.log("Click Img PARENT INPUT",_p);
	$(this).toggleClass('iconCheckboxChecked');
	
	togglePackCheckBox(this);
	/*
	var _p=$(this).parent();
	var itemClassName = $(this).attr('class');
	
	var fIn=_p.find('input');
	var iImg=_p.find('img');
	
	if(itemClassName.indexOf('iconCheckboxChecked')>-1){
		//console.info("Setze Wert ",_p.find('input').length);
		//Füllen der Elemente
		if(fIn.length==1){
			//fIn.val(_p.attr('name'));
			fIn.attr('checked',true);
		}else{
			iImg.removeClass('iconCheckboxChecked');
			iImg.addClass('iconCheckboxChecked');
			$.each(fIn, function(idx, subIn){
				subIn.checked=true;
			});
		}
	}else{
		//Leeren der Elemente
		if(fIn.length==1){
			fIn.attr('checked',false);
		}else{
			iImg.removeClass('iconCheckboxChecked');
			$.each(fIn, function(idx, subIn){
				subIn.checked=false;
			});
		}
	}*/
	/*
	var n = $("#stoupgroup").find("input:checked" );
	$.each(n, function(idx, cB){
		console.info("FOUND "+cB.value,cB);
	});*/
});

$("#stoupgroup,#receive").delegate("li>a", "click", function() {
	$(this).parent().children("ul").toggleClass("listInvisible");
});

$('h2 a,div span a').on('click',function(){
	$('section, nav a').removeClass('aktiv');
	$($(this).attr('href')).addClass('aktiv');
	return false;
});

/* Toolbar Funktionen 
$('nav a').on('click',function(){
	$('section, nav a').removeClass('aktiv');
	$(this).addClass('aktiv');
	$($(this).attr('href')).addClass('aktiv');
	return false;
});
*/


/* Anmeldung */
$('#login :button').on('click',function(){
	//alert("login:");
	var username="",password="";
	$.each($('#login input'), function(idx, data){
		if(data.name=="username"){
			username=data.value;
		}
		if(data.name=="password"){
			password=data.value;
		}
		
	});
	//alert("Setze Passwort "+username+" / "+password);
	base64Login=$.base64.encode(username+":"+password);
	
	loadTourlist();
	
});

/* Optionen */
$('#optionen :checkbox').on('change', function(){
	console.log('#uebersicht .'+this.className);
	$('#uebersicht li.'+this.className).toggleClass('versteckt');
});


/* Wird bei App-Start ausgeführt */
$(function(){
	//navigator.geolocation.getCurrentPosition(positionsAusgabe);	        
    $('a[href=#login], #login').addClass("aktiv");
    //loadTour();
});

