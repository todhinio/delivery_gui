var map=null;
var geocoder=null;
var mapIconUrl="http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=$|FF0000|000000";
var mapIconUrlMyPosition="http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=P|FFFF00|000000";
var mapMarkerTitleDefault="Aktuelle Position";
var mapMarkerIconDefault=null;
var lastLatlng=null;
var markerOpts=[];
var markerMyPosition=null; //Initiiertes Markerobjekt, das st�ndig aktualisiert wird
var trafficLayer = null;
var zoomScaleMyPosition=15;

var directionsDisplay = null;
var directionsService = new google.maps.DirectionsService();

/**
 * 
 * @param latlng google.maps.LatLng
 * @param zoom int
 * @param mapType
 */
function initMap(latlng,zoom,mapType){
	var isActivePos=false;
	if(!mapType){
		mapType=google.maps.MapTypeId.ROADMAP;
	}
	if(!zoom){
		zoom=13;
	}
	if(!latlng){
		if(positionActicve){
			console.info("Kein Latlng übergeben");
			latlng=new google.maps.LatLng(positionActicve.lat,positionActicve.lng);
			isActivePos=true;
		}else{
			alert("Karte kann nicht erstellt werden. Es wurde kein Punkt pbermittelt");
			return false;
		}
	}		
	
	width = document.getElementById('karte').offsetWidth;
	height = document.getElementById('karte').offsetHeight;
	var optionen = {
		zoom: zoom,
		center: latlng,
		mapTypeId: mapType
	};
	//var mapHeight=0,mapWidth=$("#karte").find('ul').css("width"), heightVal=$("#karte").css("height");
	var mapHeight=0,mapWidth=$("#karte").css("width"), heightVal=$("#karte").css("height");
	mapHeight=parseInt(heightVal.substring(0,heightVal.length-2));
	
	
	console.info("width",mapWidth);
	$("#map").css("height",(mapHeight-110)+"px");
	$("#map").css("width",mapWidth+"px");
	
	
	map = new google.maps.Map(document.getElementById('map'), optionen);
	
	if(!isActivePos){
		createMarker(latlng,mapMarkerTitleDefault,mapMarkerIconDefault,false);
	}else{
		markerMyPosition=createMarkerForMyPositon(latlng);
	}
		
	
	
}

/*Zoomt auf den Tourstop in Karte*/
function showTourstopinMap(idx){
	
	selectSection('karte');
	var tourIcon=mapIconUrl.replace('$',''+(idx+1));
	var searchStr=null;
	
	var _ts=tourStop[idx];
	var _adr=_ts.target.address;
	var _latlng=_ts.target.latlng;
	
	if(_adr){
		if(_adr.street){
			searchStr=_adr.street;
			if(_adr.zip && _adr.zip!=0){
				searchStr+=" "+_adr.zip;
			}
			if(_adr.city && _adr.city!=0){
				searchStr+=" "+_adr.city;
			}
		}
	}
	
	if(!map && !positionActicve){
		mapMarkerTitleDefault=searchStr;
		mapMarkerIconDefault=tourIcon;
	}else if(!map){
		initMap();
	}
	
	if(_latlng){
		createMarker(new google.maps.LatLng(_latlng.lat,_latlng.lng),searchStr,tourIcon,true);
	}else if(searchStr!=null){
		geocode({'address': ''+searchStr},function(res){
			var _stopA=_ts;
			return function(res){
				console.info("Stop A",_stopA);
				console.info("AddressSuche "+searchStr,res);
				if(res.length==1){
					createMarker(res[0].geometry.location,res[0].formatted_address,tourIcon,true);
					var data='{"simplelatlng":{"lng":'+res[0].geometry.location.lng()+',"lat":'+res[0].geometry.location.lat()+'}}';
					updateLocationCoords(data,_stopA.target.id);
				}
			};
		}());
		
	}
	//
	
	//getPosition();
}



function createMarker(latLng,markerTitle,iconUrl,pan,draggable){
	if(map){
		var mOpts={
				position: latLng,
				title: markerTitle,
				map: map,
				draggable: draggable
		};
		if(iconUrl){
			mOpts.icon=iconUrl;
		}else{
			mOpts.animation=google.maps.Animation.DROP;
		}
		
		lastLatlng=latLng;
		//console.info("Last",lastLatlng);
		if(pan){
			panTo(latLng);
		}
		return createGoogleMarker(mOpts);
	}else{
		initMap(latLng);
		
		return false;	
	}
}
/**
 * 
 * @param params  Option-Object for Type google.maps.Marker
 * @returns
 */
function createGoogleMarker(params){
	var m=null, oldMarker=null;
	
	for(m in markerOpts){
		if(markerOpts[m].title==params.title){
			oldMarker=markerOpts[m];
			break;
		}
	}
	if(oldMarker==null){
		var gMarker=new google.maps.Marker(params);
		markerOpts.push(gMarker);
		return gMarker;
	}else{
		return oldMarker;
	}	
}
function createMarkerForMyPositon(latLng){
	var marker=createMarker(latLng,"Aktuelle Position",mapIconUrlMyPosition,false);
	
	return marker;
}

function updateMyPositiononMap(pos){
	
	if(map){
		var myLatLng=new google.maps.LatLng(pos.coords.latitude,pos.coords.longitude);
		if(markerMyPosition){
			markerMyPosition.setPosition(myLatLng);
			
		}else{
			markerMyPosition=createMarkerForMyPositon(myLatLng);
		}
	}
}

function zoomToAll(){
	if(map){
		if(markerOpts.length>1){
			var bound=new google.maps.LatLngBounds();
			for(var m=0;m<markerOpts.length;m++){
				bound.extend(markerOpts[m].getPosition());
			}
			map.fitBounds(bound);
			//map.setZoom(map.getZoom()-1); 
		}else if(markerOpts.length==1){
			panTo(markerOpts[0].getPosition());
		}
	}
}

function zoomToMyPosition(){
	if(markerMyPosition){
		panTo(markerMyPosition.getPosition());
	}
}

function panTo(latLng){
	map.panTo(latLng);
	map.setZoom(zoomScaleMyPosition);
}

function getRouteFromLocation(){
	if(directionsDisplay!=null){
		directionsDisplay.setMap(null);
	}
	$("#routeloc").css("display","none");
	$("#loaderroute").css("display","inline-block");
	if(!positionActicve){
		getPosition(onPositionResponseForRoute);
	}else{
		onPositionResponseForRoute(positionActicve);
	}
}
/**
 * 
 * @param searchObject Suchobjekt mit Parametern zur Adressuche
 * @param onGeocodeSuccsess Funktion die bei Erfolg aufgerufen werden soll
 */
function geocode(searchObject, onGeocodeSuccsess){
	if(!geocoder){
		geocoder = new google.maps.Geocoder();
	}if(!onGeocodeSuccsess){
		onGeocodeSuccsess=onGeocodeResponse;
	}
	geocoder.geocode(searchObject, onGeocodeSuccsess);
}

function toggleTrafficLayer(){
	if(trafficLayer==null){
		trafficLayer = new google.maps.TrafficLayer();
	}
	if(trafficLayer.getMap()==null){
		$("#traffic").css("opacity",0.0);
		trafficLayer.setMap(map);
	}else{
		trafficLayer.setMap(null);
		$("#traffic").css("opacity",0.3);
	}
}

var onPositionResponseForRoute=function(pos){
	$("#loaderroute").css("display","none");
	$("#routeloc").css("display","inline-block");
	
	var lat=pos.lat ? pos.lat : pos.coords.latitude;
	var lng=pos.lng ? pos.lng : pos.coords.longitude;
	var startPoint=new google.maps.LatLng(lat,lng);
	
	
	directionsDisplay = new google.maps.DirectionsRenderer();
	directionsDisplay.setMap(map);
	
	var request = {
	      origin:startPoint,
	      destination:lastLatlng,
	      travelMode: google.maps.DirectionsTravelMode.DRIVING
	 };
	  directionsService.route(request, function(response, status) {
		  //console.info("Routenergebnis",response);
		  
		  	
		  $('#routesum').html("Strecke: "+response.routes[0].legs[0].distance.text+"   Geplante Fahrtzeit: "+response.routes[0].legs[0].duration.text);
	    if (status == google.maps.DirectionsStatus.OK) {
	    	var steps=response.routes[0].legs[0].steps;
	    	if(steps){
	    		for(var s=0;s<steps.length;s++){
	    			console.info("Step "+s,steps[s]);
	    		}
	    	}
	      	directionsDisplay.setDirections(response);
	    }

	    
	  });
	
};



var onGeocodeResponse=function(resp){
	var idx=null;
	var _resp=[];
	
	for(idx in resp){
		var adx=resp[idx];
		_resp.push({"title":adx.formatted_address,"geometry":adx.geometry.location});
	}
	if(_resp.length==1){
		
		createMarker(_resp[0].geometry,_resp[0].title,null,true);
		
	}
	return resp;
};

var _initMapWithPosition=function(position){
	initMap(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
};


