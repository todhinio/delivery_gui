var basePath="https://www.wiberry.de/widriver";//"http://85.214.93.186/DeliveryWeb";

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
var inputRequiredValue=" XX ";

var sendCoordIntervall=30000;
var isWriteCoords=false;
var doCheckTourstop=true;
var loadingNode=null;
var edittypePack=[];

var _packEdited=null;
var _origPackvalue=0;

var isReceiver=false;
var username="";
var userid="";
var _deliveryList=[];
var tourstopGoods=null;
var mapIconUrl="http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=$|FF0000|000000";
var hasSecondQuery=false;
var stopAcceptor=null;
var errorList=[];
var activeTaskId=null;
errorList[517]="Es kann nicht nur ein Teil des Paketes ausgeliefert werden, da sich kein anderes Paket mit gleichen Produkt am Standort befindet, in dem das Produkt überführt werden kann!";
errorList[539]="Die Mengen, die Du abholen möchtest, dürften sich gar nicht am Stand befinden";

//Standard Karten implemtierung
function initMap(coord){}

function showTourstopinMap(){}

function updateMyPositiononMap(position){}

function getRouteFromLocation(){}

function toggleTrafficLayer(){}

function zoomToMyPosition(){}

function zoomToAll(){}
//ENDE Standard Karten implemtierung

function selectAllInput(){
	
	var save_this = $(this);
    window.setTimeout (function(){ 
       save_this.select(); 
    },100);
}
//Nach Positionsbestimmung
var onCoordsDefinedForTour=function(position){
	
	positionActicve={
		lat:position.coords.latitude,
		lng:position.coords.longitude
	};
	if(isWriteCoords){
		console.info("Koordinaten",position);		 
		 updateMyPositiononMap(position);
		 var data='{"simplelatlng":{"lng":'+position.coords.longitude+',"lat":'+position.coords.latitude+'}}';
		 setTimeout(function() {
			 sendTourCoords(data);
		}, sendCoordIntervall);
	}
};

var onDeliveryResponse=function(data){
	if(data.simpleResponse.status==200){
		if(deliveryLink.indexOf("shifttransfer")>-1){
			console.info("FIND "+activeTaskId,$(activeTaskId));
			$(activeTaskId).attr('checked',true);
			selectSection('tourstop');
		}else{
			selectSection('tour');
			if(tourstopActive.type==3 && !hasSecondQuery){
				if(deliveryLink.indexOf("receive")>-1){
					_validateDelivery("iconDeliver");
				}else{
					_validateDelivery("iconReceive");
				}
			}else{
				hasSecondQuery=false;
				loadTourstop(tourActive,/*onTourstopUpdated*/onTourstopResponse);
			}
		}
	}else{
		console.info("ERROR",data);
		hasSecondQuery=false;
		writeStatusError(data.simpleResponse);
		
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
		writeError("Standort konnte nicht aktualisiert werden.");
	}
};

var onEdittypePackResponse=function(json){
	edittypePack=json.simplemode;
	console.info("onEdittypePackResponse",json);
	getDialog(writeEditpackChoice());
};

//Nachdem Koordianten f�r Tour �bergeben wurden
var onTourCoordResponse=function(data){
	getPosition(onCoordsDefinedForTour);
};

var onTourChargeResponse=function(json){
	//console.info("CHARGE Tour ",json);
	
	
	if(loadingNode){
		$(loadingNode).remove();
	}
	//console.info("WARE TOUR ",json);
	
	writePackDataInList(json,$('#tourcharge').find('#tourchargelist'),false,true,true);
};

var onTourlistResponse=function(json){
	if(json.tour){
		//console.info("TOUREN");
		tourList=json.tour;
		if(loadingNode){
			$(loadingNode).remove();
		}
		
		$('#tourlist li').remove();
		$.each(json.tour, function(idx, daten){
			$('#tourlist').find('ul').append('<li><a href="#'+daten.id+'" onclick="showTour('+idx+')" title="'+daten.id+' " > '+dateToDate(daten.begin)+' - '+dateToTime(daten.begin)+'</a></li>');
		});
		
		if(json.tour.length==0){
			
			$('#tourlist').find('ul').append('<li><a href="#"  > Keine Touren für heute </a></li>');
		}else{
			loadProductgroup();
		}
		
		if(json.tour.length==1){
			showTour(0);
		}else{
			selectSection('tourlist');
			//$('section, nav a').removeClass('aktiv');
			//$('a[href=#tourlist], #tourlist').addClass("aktiv");
			
		}
	}
};
var onTourstopCheck=function(json){
	if(json.tourstop){
		if(json.tourstop.length!=tourStop.length){
			writeError("ACHTUNG AENDERUNG IN ROUTE 2");
			
			onTourstopResponse(json);
		}
		checkTourStop();
	}
};
var onTourstopResponse=function(json){
	if(json.tourstop){
		tourStop=json.tourstop;
		if(loadingNode){
			$(loadingNode).remove();
		}
		$('#tour li').remove();
		//console.info("TOUR",tourActive);
		if(tourActive.vehicle){
			$('#tour').find('#tourVehicle').html(''+tourActive.vehicle.title);
		}
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
			if(daten.target.details || daten.arrivalset){
				sD+='<div class=\"tourstop_details\">'+(daten.arrivalset ? dateToTime(daten.arrivalset) :"") +"  "+ (	daten.target.details ? daten.target.details : "") +'</div>';
			}
			
			var tourIcon=mapIconUrl.replace('$',''+(idx+1));
			
			$('#tour').find('ul').append('<li '+cssDelivered+'><a href="#'+daten.id+'" title="'+daten.target.title+' in Karte anzeigen" onclick="showTourstopinMap('+idx+')" ><img src="'+tourIcon+'"></a><a href="#'+daten.id+'" onclick="showTourstop('+idx+')" >'+daten.target.title+' '+((daten.type &&daten.type == 2) ? " -> " : "")+' '+sD+' </a></li>');
		});
		checkTourStop();
	}
};

var onTourstopChargeResponse=function(json){
	//console.info("CHARGE Tourstop ",json);
	if(loadingNode){
		$(loadingNode).remove();
	}
	if(tourstopActive.type!=3){
		writePackDataInList(json,$('#tourstop').find('#stoupgroup'),false,false,true);
	}else{
		writePackDataInList(json,$('#tourstop').find('#stoupgroup'),false,false,true);
		
		
		writePackDataInList(json,$('#tourstop').find('#receive'),false,false,true);
		//alert("ANDERS");
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
//Gibt die Mitarbeiter zur�ck, die f�r den Tag am Stand eingeteils sind
var onTourstopSellerResponse=function(json){
	console.info("SELLER",json);
	if(json.simpleuser){
		$('#delivery li').remove();
		if(json.simpleuser.length>0){
			//Fahrer hinzuf�gen
			//$('#delivery').find('ul').append(_writeListElemPerson(tourActive.driver));
			$.each(json.simpleuser, function(idx, daten){
				if(daten.username && daten.username.toUpperCase()==username.toUpperCase()){
					userid=daten.id;
				}else{
					$('#delivery').find('ul').append(_writeListElemPerson(daten)/*'<li><a href="javascript:void(0);" onclick="selectConfirmedEmployeeFromA(this)" >'+daten.employee.person.prename +' '+daten.employee.person.lastname+'</a><input name="employee" class="checkboxHidden" type="checkbox" value="'+daten.employee.person.id+'" /><span><img class="iconCheckboxBase" src="'+imageIconBase+'" /></span></li>'*/);
				}
			});
		}else if(tourstopActive){
			loadEmployeeFromLocation(tourstopActive.target);	
		}
	}
};
//Wenn waren abgeholte werden sollen
var onTourstopReceiveResponse=function(json){
	
	if(tourstopActive.type==4){
		writePackDataInList(json,$('#tourstop').find('#receive'),true,false,true,true);
	}else{
		writePackDataInList(json,$('#tourstop').find('#receive'),false,false,true);
	}
};

function _writeListElemPerson(person){
	var personId="";
	var label="";
	if(typeof person =="object"){
		personId=person.id;
		label=person.firstname+" "+person.lastname;
	}else{
		personId=person;
		label=person;
	}
	return '<li><a href="javascript:void(0);" onclick="selectConfirmedEmployeeFromA(this)" >'+label+'</a><input name="employee" class="checkboxHidden" type="checkbox" value="'+personId+'" /><span><img class="iconCheckboxBase" src="'+imageIconBase+'" /></span></li>';
}
var onEmployeeLocationResponse=function(json){
	//console.info("EMPLOYEE",json);
	if(json.simpleuser){
		$('#delivery li').remove();
		//Fahrer hinzuf�gen
		//$('#delivery').find('ul').append(_writeListElemPerson(tourActive.driver));
		$.each(json.simpleuser, function(idx, daten){
			console.info("    WRITE",daten);
			$('#delivery').find('ul').append(_writeListElemPerson(daten)/*'<li><a href="javascript:void(0);" onclick="selectConfirmedEmployeeFromA(this)" >'+daten.person.prename +' '+daten.person.lastname+'</a><input name="employee" class="checkboxHidden" type="checkbox" value="'+daten.person.id+'" /><span><img class="iconCheckboxBase" src="'+imageIconBase+'" /></span></li>'*/);
		});
	}
};

var onVehicleSetresponse=function(data){
	if(data.simpleResponse&&data.simpleResponse.status==200){
		console.info("IS",$('#tour').find('#tourVehicle'));
		if(tourActive){
			tourActive.vehicle=vehicleActive;
		}
		$('#tour').find('#tourVehicle').html(''+vehicleActive.title);
	}else{
		writeError("Auto konnte nicht geändert werden - Status:"+data.simpleResponse.status);
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
	
	sendJsonRequest(basePath+'/rest/driverservice/tour/'+tourActive.id+'/vehicle/'+vehicleActive.id+'?='+Date.now(),onVehicleSetresponse,null,"POST");
	
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

function checkItemSum(cB,_deliveryList){
	var sumB=0,sumS=0,pu=0;
	if(!_deliveryList){
		_deliveryList=[];
	}
	$.each($(cB).parent().find("input[type=text]"), function(idx, a){
		console.info("FOUND "+idx,a);
		if(a.name=="stop_productunit"){
			pu=a.value;
		}else if(a.name=="stop_productsumbig"){
			sumB=a.value;
		}else if(a.name=="stop_productsumsmall"){
			sumS=a.value;
		}
	});
	
	var sm=sumProductPacksFromTourstop(tourstopGoods,$(cB).parent().find("input[type=checkbox]").val());
	var packVal=sm-((sumB>0) ? (parseFloat((sumB*pu))+parseFloat(sumS)) : sumS);
	
	if(packVal>=0){
		hideInputError($(cB).parent());
		$.each($(cB).parent().parent().find('ul').find("input[type=checkbox]"), function(idx, sB){
			var pck=getTourstopPackById(tourstopGoods,sB.value);
			if(pck){
				var vS=0;
				
				var edit_type="1";
				if(pck.isPart){
					edit_type="3";
				}
				//console.info("		WERT von "+packVal+" -> "+(packVal-pck.quantity));
				if(pck.quantity<=packVal && packVal>0){
					packVal=packVal-pck.quantity;
				}else if(pck.quantity >packVal &&packVal>0){
					vS=pck.quantity-packVal;
					packVal=0;
				}else{
					vS=pck.quantity;
				}
				$(sB).parent().find("input[type=text]").val(vS);
				_deliveryList.push({"id":sB.value,"quantity":vS,"type":edit_type});
			}
			//console.info("SEARCH PACK "+sB.value,getTourstopPackById(tourstopGoods,sB.value));
			//console.info("->HAS",sB);	
		});
	}else{
		showInputError($(cB).parent());
		writeError("Die EIngabe ist nicht korrekt.<br/> Es können nicht mehr Mengen abgeholt als hingeliefert werden werden!");
	}
	return _deliveryList;
	
}

function showInputError(node){
	$(node).find("input[type=text]").css("background-color","#f1b9b9");
}
function hideInputError(node){
	$(node).find("input[type=text]").css("background-color","white");
}

function createDeliverLink(){
	
}
function sendShiftTransfer(){
	_validateDelivery('iconTransfer');
}


function validateDelivery(delNode){
	var linkClassName = $(delNode).attr('class');
	_validateDelivery(linkClassName,delNode);
}

function sendGoodsSubmit(){
	if(tourstopActive.type==1 || tourstopActive.type==3){
		_validateDelivery('iconDeliver',true);
	}else if(isReceiver){
		_validateDelivery('iconReceive',true);
	}else{
		alert("FEHLER");
	}
}

function _validateDelivery(linkClassName,delNode){
	
	//Wenn ein Halken gesetzt wurde
	
	var gN=[];
	if(linkClassName.indexOf('iconDeliver')>-1){
		deliveryLink=basePath+'/rest/driverservice/location/'+tourstopActive.target.id+'/delivery?='+Date.now();
		goodsNode="#stoupgroup";
		gN.push(goodsNode);
		
		gN=["#stoupgroup","#task"];
	}
	if(linkClassName.indexOf('iconReceive')>-1){
		//Bei Zurücknahme in das Auto hat der Fahrer zur Zeit noch Wahlfreiheit
		deliveryLink=basePath+'/rest/driverservice/tourstop/'+tourstopActive.target.id+'/receive?='+Date.now();
		goodsNode="#receive";
		//gN.push(goodsNode);
		gN=["#receive","#task"];
	}
	if(linkClassName.indexOf('iconTransfer')>-1){
		//Bei Zurücknahme in das Auto hat der Fahrer zur Zeit noch Wahlfreiheit
		deliveryLink=basePath+'/rest/driverservice/tourstop/'+tourstopActive.target.id+'/shifttransfer?='+Date.now();
		goodsNode="#tasktransfer";
		gN.push(goodsNode);
	}
	
	if(tourstopActive.type==3){
		gN=["#receive","#stoupgroup","#task"];
	}
	var g=null,cnt=0;
	for(g in gN){
		var n1 = $(gN[g]).find("input:checkbox:not(:checked)" );
		if(n1.length>0){
			$.each(n1, function(idx, nC){
				$(nC).parent().css("backgroundColor","red");
			});
			
		}else{
			var n2 = $(gN[g]).find("input:checked");
			$.each(n2, function(idx, iC){
				$(iC).parent().css("backgroundColor","white");
			});
		}
		cnt+=n1.length;	
	}
	
	
	//var n1 = $(goodsNode).find("input:checkbox:not(:checked)" );
	if(cnt>0){
		getDialog("Du mu&#223;t alle Waren ausliefern. Wenn Waren nicht vorhanden oder ver&#228;ndert vorliegen &#228;ndere bitte einfach den Mengenwert.<br/> Dr&#252;cke hierzu einfach auf die Zahl und trage den richtigen Wert ein.</br><button onclick=\"closeDialog()\" >Ok</button></a>");
		return false;
	}
	
	
	
	
	var n = (tourstopActive.type==4) ? $(goodsNode).find('h4').find("input:checked" ) : $(goodsNode).find("input:checked" );
	_deliveryList=[];
	var hasError=false;
	//console.info("Ware ",goodsNode);
	/*if(n.length==0){
		hasError=true;
		
		return true;
	}else{*/
		$.each(n, function(idx, cB){
			var tF=$(cB).parent().find("input[type=text]");
			//console.info("Textfields",tF.length);
			if(tF && tF.length>1){
				//Neier Weg
				var sumB=0,sumS=0,pu=0;
				$.each($(cB).parent().find("input[type=text]"), function(idx, a){
					console.info("FOUND "+idx,a);
					if(a.name=="stop_productunit"){
						pu=a.value;
					}else if(a.name=="stop_productsumbig"){
						sumB=a.value;
					}else if(a.name=="stop_productsumsmall"){
						sumS=a.value;
					}
				});
				var sm=sumProductPacksFromTourstop(tourstopGoods,cB.value);
				var packVal=sm-((sumB>0) ? (parseFloat((sumB*pu))+parseFloat(sumS)) : sumS);
				//console.info("		STARTE MIT "+packVal);
				$.each($(cB).parent().parent().find('ul').find("input:checked"), function(idx, sB){
					var pck=getTourstopPackById(tourstopGoods,sB.value);
					if(pck){
						var vS=0;
						
						var edit_type="1";
						if(pck.isPart){
							edit_type="3";
						}
						//console.info("		WERT von "+packVal+" -> "+(packVal-pck.quantity));
						if(pck.quantity<=packVal && packVal>0){
							packVal=packVal-pck.quantity;
						}else if(pck.quantity >packVal &&packVal>0){
							vS=pck.quantity-packVal;
							packVal=0;
						}else{
							vS=pck.quantity;
						}
						$(sB).parent().find("input[type=text]").val(vS);
						_deliveryList.push({"id":sB.value,"quantity":vS,"type":edit_type});
					}
					//console.info("SEARCH PACK "+sB.value,getTourstopPackById(tourstopGoods,sB.value));
					//console.info("->HAS",sB);	
				});
				
				/*if(validateProductValue(packVal,inputRequiredValue)){
					console.info("PACKS "+cB.value,getProductPacksFromTourstop(tourstopGoods,cB.value));
					
					
				}else{hasError=true;}*/
			}else{
				//Alter Weg
				var packVal=$(cB).parent().find("input[type=text]").val();//alternativ name=xy
				var editType=$(cB).parent().find("input[type=hidden]");
				console.info(packVal+"!="+inputRequiredValue);
				if(validateProductValue(packVal,inputRequiredValue)){
				//if(packVal!=inputRequiredValue){
					//console.info("    add");
					_deliveryList.push({"id":cB.value,"quantity":packVal,"type":editType.val()});
				}else{
					var iN=$(cB).parent().find("input:text");
					//iN[0].focus();
					hasError=true;
					console.info("    ERROR",iN);
				}
			}
		});
	//}
	if(_deliveryList.length==0){
		writeError("Zum Übergeben der Ware muss sie rechts angehakt werden!");
	}else if(!hasError){
		console.info("LÜBBT",_deliveryList);
		if(delNode){
			stopAcceptor=null;
			showDelivery(delNode);
		}else{
			hasSecondQuery=true;
			sendDelivery(null,true);
		}
		
	}else{
		writeError("Bitte vollständig ausfüllen");
	}
}
function createSimplePackFromNode(cB){
	var packVal=$(cB).parent().find("input[type=text]").val();//alternativ name=xy
	var editType=$(cB).parent().find("input[type=hidden]");
	console.info(packVal+"!="+inputRequiredValue);
	if(validateProductValue(packVal,inputRequiredValue)){
	//if(packVal!=inputRequiredValue){
		//console.info("    add");
		return {"id":cB.value,"quantity":packVal,"type":editType.val()};
	}else{
		return null;
	}
}
function getTourstopPackById(tourstopGoods, pId){
	var g=null,pk=null, tsg=tourstopGoods.charge.goods;
	for(g in tsg){
		var tp=tsg[g];
		if(tp.pack && tp.pack.id== pId){
			pk=tp.pack;
			break;
		}
	}
	return pk;
	
}
function sumProductPacksFromTourstop(tourstopGoods, pId){
	var sum=0,p=null,ps=getProductPacksFromTourstop(tourstopGoods, pId);
	for(p in ps){
		sum+=ps[p].quantity;
	}
	//console.info("Produkt "+pId	+" SUMME "+sum);
	return sum;
}
function getProductPacksFromTourstop(tourstopGoods, pId){
	var g=null,pc=[], tsg=tourstopGoods.charge.goods;
	for(g in tsg){
		var tp=tsg[g];
		if(tp.pack && tp.pack.product && tp.pack.product.id==pId){
			pc.push(tp.pack);
		}
	}
	return pc;
}

function validateProductValue(packVal,inputRequiredValue){
	if(packVal!=inputRequiredValue){
		return true;
	}else{
		return false;
	}
}

//Auslieferung der Ware
function sendDelivery(item,hideAcceptorSelect){
	
		console.info("ITEM",item);	
	
	
		if(tourstopActive){
			if(_deliveryList.length>0){
				
				//Bestätigt durch
				
				if(!item,hideAcceptorSelect){
					if(!hideAcceptorSelect){
						var acc = $("#delivery").find("input:checked");
					
						$.each(acc, function(idx, a){
							stopAcceptor=a.value;
						});
					}
				}else{
					stopAcceptor=null;
				}
				console.info("Acceptor",stopAcceptor);
				
				var _tmpDelivery={
					"simpledelivery":{
						"tourstop":tourstopActive.id,
						"pack":_deliveryList
					}
				};
				if(stopAcceptor){
					_tmpDelivery.simpledelivery.acceptor=stopAcceptor;
					if(acceptorPin){
						_tmpDelivery.simpledelivery.password=""+acceptorPin;
					}
				}else{
					_tmpDelivery.simpledelivery.acceptor=userid;
				}
				//console.info('SEND TO '+basePath+'/location/'+tourstopActive.target.id+'/delivery',_tmpDelivery);
				sendJsonRequest(deliveryLink,onDeliveryResponse,null,"POST",JSON.stringify(_tmpDelivery));
				acceptorPin=null;
			}else{
				writeError("Es wurde keine Ware übergeben");
			}
			//onDeliveryResponse
		}else{
			writeError("Kein Tourstop aktiv, Daten können nicht gesendet werden");
		}
	
}

function selectConfirmedEmployeeFromA(node){
	selectConfirmedEmployee($(node).parent().find('span').find('img'));
}

function showDelivery(linkNode){
	//console.log("type:",linkNode);
	/*
	var linkClassName = $(linkNode).attr('class');
	//Wenn ein Halken gesetzt wurde
	if(linkClassName.indexOf('iconDeliver')>-1){
		deliveryLink=basePath+'/rest/driverservice/location/'+tourstopActive.target.id+'/delivery?='+Date.now();
		goodsNode="#stoupgroup";
		
		//�berpr�ft, ob alles ausgeliefert wurde
		var n1 = $(goodsNode).find("input:checkbox:not(:checked)" );
		if(n1.length>0){
			getDialog("Du mu&#223;t alle Waren ausliefern. Wenn Waren nicht vorhanden oder ver&#228;ndert vorliegen &#228;ndere bitte einfach den Mengenwert.<br/> Dr&#252;cke hierzu einfach auf die Zahl und trage den richtigen Wert ein.</br><button onclick=\"closeDialog()\" >Ok</button></a>");
			return false;
		}
	}else{
		//Bei Zur�cknahme in das Auto hat der Fahrer zur Zeit noch Wahlfreiheit
		deliveryLink=basePath+'/rest/driverservice/tourstop/'+tourstopActive.target.id+'/receive?='+Date.now();
		goodsNode="#receive";
		
	}*/
	
	
	
	selectSection('delivery');
}

function checkTourStop(){
	if(doCheckTourstop){
		setTimeout(function() {
			loadTourstop(tourActive,onTourstopCheck);
		}, sendCoordIntervall);
	}
	
}

function showPin(elem){
	acceptorPin=null;
	var pinDiv='<div><h3>Bestätig durch</h3> '+$(elem).html()+'</div><div id="pininput"><input id="password_input" type="password" value="" /><a class="iconBase iconConfirm" href="javascript:void(0);"  onclick="confirmPin(this)" ></a><br/>Passwort eingeben</div>';
	
	
	getDialog(pinDiv,'#delivery');
	//alert(pinCtx);
	
	$("#password_input").focus();
	
}

function closeDialog(){
	$("#dialog").remove();
	$("#dialogFrame").remove();
}
function confirmPin(elem){
	acceptorPin=""+$(elem).parent().find("input").val();
	closeDialog();
	
	sendDelivery();
}

function getDialog(inputTxt,node,onCancel){
	if(!node){
		node='body';
	}
	closeDialog();
	if(!onCancel){
		onCancel="closeDialog";
	}
	
	var dialogFrame='<div id="dialogFrame" style=""></div><div id="dialog" ><span onmousedown="'+onCancel+'(this)" >x</span>@</div>';
	var windowContent=dialogFrame.replace(/@/,inputTxt);
	$(node).append(windowContent);
	
	return windowContent;
}

function writeError(message, status){
	getDialog(message,'body');
	//alert(message);
}
function writeStatusError(errorMsg){
	var status=0;
	var message=null;
	if(errorMsg.status){
		status=errorMsg.status;
	}
	
	message=errorList[status] || "Es ist ein unbekannter Fehler aufgetreten";
		
	
	
	getDialog(message,'body');
	
}
/*Liste der Autos laden*/
function showTourstop(stopIndex){
	var _ts=tourStop[stopIndex];
	tourstopActive=_ts;
	
	//console.info("Tourstop",_ts);
	if(_ts.arrival){
		return true;
	}
	
	selectSection('tourstop');
	
	loadTourstopSeller(_ts);
	
	$('#receive li').remove();
	$('#stoupgroup li').remove();
	$('#task li').remove();
	
	if(tourstopActive.type==4){
		loadTourstopReceive(tourstopActive);
	}else if(tourstopActive.type==1 || tourstopActive.type==2 || tourstopActive.type==3){
		if(tourstopActive.type==2){
			loadTourstopCharge(tourActive,tourstopActive,onTourstopReceiveResponse);
		}else{
			loadTourstopCharge(tourActive,tourstopActive);
		}
		
	}
	$('#stopgrouptitle span').remove();
	$('#stopgrouptitle a').remove();
	$('#receivetitle span').remove();
	$('#receivetitle a').remove();
	
	/*
	if(tourstopActive.type==1 || tourstopActive.type==3){
		$('#stopgrouptitle').append('<a class="wiconBase32 iconDeliver" href="javascript:void(0)" onclick="validateDelivery(this)" title="Ausliefern" ><img src="images/icon_on_empty32.png" /></a>');
		$('#stopgrouptitle').append('<span> Auslieferung <span>');
	}
	
	if(tourstopActive.type==2 || tourstopActive.type==3 || tourstopActive.type==4){
		$('#receivetitle').append('<a class="wiconBase32 iconReceiver" href="javascript:void(0)" onclick="validateDelivery(this)"  title="Abholen" ><img src="images/icon_on_empty32.png" /> </a>');
		$('#receivetitle').append('<span> Ware abholen<span>');
	}*/
	
	$('#stoptarget').html(_ts.target.title);
	if($('#stopphone a')){
		$('#stopphone a').remove();
	}
	if(_ts.target.phone){
		$('#stopphone').append('<a class="iconBase iconPhone" href="tel:'+clearPhoneNumber(_ts.target.phone)+'" title="'+_ts.target.phone+'"><img src="'+imageIconBase+'"/></a>');
	}
	
	var adrtxt=createAddressTxt(_ts.target.address); 
	$('#stoptarget_adr').html(adrtxt);
	
	if(_ts.goods){
		$('#stoupgroup li').remove();
		//console.info("PACKS ",_ts.goods);
		//writePackDataInList($.isArray(_ts.goods) ? _ts.goods : [_ts.goods],$('#tourstop').find('#stoupgroup'));
	}else if(tourstopActive.type==1 || tourstopActive.type==3){
		$('#tourstop').find('#stoupgroup').append("<li>Keine Ware zugeordnet</li>");
	}
}

function writePackDataInList(inCharge,node,inputRequired,hideSelect,doSum,sumInput){
	
	tourstopGoods=inCharge;
	var stopView={};
	var hasData=false;
	var packList=[];
	var partList=[];
	var orderList=[];
	var taskList=[];
	var jobList=[];
	
	isReceiver=false;
	if(node.attr('id')=='receive'){
		isReceiver=true;
	}
	if(isReceiver && tourstopActive.type<4){
		if(inCharge.charge.job && !isArray(inCharge.charge.job)){
			packList.push(inCharge.charge.job);
		}else if(inCharge.charge.job){
			packList=inCharge.charge.job;
		}
		
	}else{
		//console.info("Charge:"+isReceiver,inCharge);
		if(inCharge.charge.goods && !isArray(inCharge.charge.goods)){
			packList.push(inCharge.charge.goods);
		}else if(inCharge.charge.goods){
			packList=inCharge.charge.goods;
		}
		
		if(inCharge.charge.part && !isArray(inCharge.charge.part)){
			partList.push(inCharge.charge.part);
		}else if(inCharge.charge.part){
			partList=inCharge.charge.part;
		}
		
		//Vorbestellungen
		if(inCharge.charge.order && !isArray(inCharge.charge.order)){
			orderList.push(inCharge.charge.order);
		}else if(inCharge.charge.order){
			orderList=inCharge.charge.order;
		}
	}
	
	if(inCharge.charge.task && !isArray(inCharge.charge.task)){
			taskList.push(inCharge.charge.task);
		}else if(inCharge.charge.task){
			taskList=inCharge.charge.task;
		}
	
	if(packList.length>0||orderList.length>0||partList.length>0){
		hasData=true;
	}
	console.info(hasData+" HAS DATA IN ",node);
	//Vorbestellungen
	$.each(orderList, function(idx, daten){
		orderOrderToProductgroup(stopView,daten);
	});
	
	//Packs
	$.each(packList, function(idx, daten){
		orderPackToProductgroup(stopView,(daten.pack || daten.job) ? daten : daten.charge);
	});
	//Jobs
	/*
	$.each(jobList, function(idx, daten){
		orderPackToProductgroup(stopView,(daten.pack || daten.job) ? daten : daten.charge);
	});*/
	//Packparts
	$.each(partList, function(idx, daten){
		daten.isPart=true;
		orderPackToProductgroup(stopView,daten);
	});
	
	var pg=null;
	if(hasData){
		if(isReceiver){
			if(tourstopActive.type==2 || tourstopActive.type==3 || tourstopActive.type==4){
				$('#receivetitle').append('<a class="wiconBase32 iconReceiver" href="javascript:void(0)" onclick="validateDelivery(this)"  title="Abholen" ><img src="images/icon_on_empty32.png" /> </a>');
				$('#receivetitle').append('<span> Ware abholen<span>');
			}
		}else{
			if(tourstopActive.type==1 || tourstopActive.type==3){
				$('#stopgrouptitle').append('<a class="wiconBase32 iconDeliver" href="javascript:void(0)" onclick="validateDelivery(this)" title="Ausliefern" ><img src="images/icon_on_empty32.png" /></a>');
				$('#stopgrouptitle').append('<span> Auslieferung <span>');
			}
		}
	}
	for(pg in productGroup){
		var _g=productGroup[pg];
		if(stopView[""+_g.id]){
			var elem=stopView[""+_g.id];
		
			var prdList='<ul class="listVisible">';
			//console.info(_g=productGroup[pg]);
			var grpProducts=isArray(_g.product) ? _g.product : [].concat(_g.product); 
			//var _g=productGroup[pg];
			for(p in grpProducts){
				var _p=grpProducts[p];
				
				var sum=0;
				var prdListElem='';
				var prdListElemItem='';
				var firstLoop=true;
				var packUnit=0;
				$.each(elem.item, function(idx, item){
					var elem=item.pack ? item.pack : item.job ? item.job : item.item.pack;
					if(elem.product.id==_p.id){
						var tempQuantity=elem.quantity;
						
						
						var edit_type="1";
						if(item.isPart){
							//console.info("Sonderfall Part ",item);
							edit_type="3";
							tempQuantity=item.quantity;
						}
						sum+=(tempQuantity*1);
						
						var unitText=elem.unit ? elem.unit.unit : elem.product.unit;
						var itemValue=tempQuantity;
						var itemDefault="";
						if(inputRequired){
							itemValue=inputRequiredValue;
							itemDefault="("+tempQuantity+")";
						}
						/*
						if(doSum){
							itemValue="@";
						}*/
						//console.info("Item",item);
						//var selectHtml='<img class="iconCheckboxBase" src="'+imageIconBase+'" /><input class="checkboxHidden" type="checkbox" value="'+item.id+'" name="stop_pack" /><span> '+unitText+'</span><input onfocus="selectInput(this)"  style="display:none" type="text" onblur="checkPackValue(this)" name="quantity" value="'+itemValue+'" ><input type="hidden" name="edit_type" value="'+edit_type+'" ><span name="quantity_view" onmousedown="togglePackQuantityInput(this)">'+itemDefault+' '+itemValue+'</span>';
						var selectHtml='<img class="iconCheckboxBase" src="'+imageIconBase+'" /><input class="checkboxHidden" type="checkbox" value="'+item.id+'" name="stop_pack" /><span> '+unitText+'</span><input  onchange="togglePackQuantityInput(this)"  style="display:inline-block" type="text" onblur="checkPackValue(this)" name="quantity" value="'+itemValue+'" ><input type="hidden" name="edit_type" value="'+edit_type+'" ><span style="display:none" name="quantity_view" onmousedown="togglePackQuantityInput(this)">'+itemDefault+' '+itemValue+'</span>';//<span class="wiconBase32 iconTrash" ></span>';
						/*if(sumInput){
							selectHtml='';
						}
						else */if(hideSelect){
							selectHtml='<span> '+unitText+'</span><span name="quantity_view" >'+itemValue+'</span>';
						}
						prdListElemItem+='<li>'+elem.product.title+selectHtml+'</li>';
						if(firstLoop){
							if(sumInput){
								packUnit=elem.product.packageunit;
								
								console.info("Product",elem.product);
								prdListElem=''+elem.product.title+'<img class="iconCheckboxBase" src="'+imageIconBase+'" /><input class="checkboxHidden" type="checkbox" value="'+elem.product.id+'" name="stop_pack" /><input class="checkboxHidden" name="stop_productunit" type="text" value="'+packUnit+'"><span class="wichargeitemsumsmall"> '+unitText+'</span><input onchange="checkItemSum(this)" name="stop_productsumsmall" type="text" value="@"><span class="wichargeitemsumbig"> Kiste(n) und <p style="position:absolute;top:6px;font-size:10px">(a '+packUnit+' '+unitText+')</p>  </span><input name="stop_productsumbig" onchange="checkItemSum(this)" type="text" value="§"> ';
								//prdListElem=''+elem.product.title+'<span> '+unitText+'</span><span name="quantity_view" >@</span>';
							}else if(doSum /*&& hideSelect*/){
								prdListElem=''+elem.product.title+'<span> '+unitText+'</span><span name="quantity_view" >@</span>';
							}
							firstLoop=false;
						}
					}
				});
				if(doSum){
					var restSum=sum;
					var sumKiste=0, onclckEvt="";
					
					if(sum>=packUnit&& sumInput){
						restSum = sum % packUnit;
						sumKiste=(sum-restSum)/packUnit;
					}else{
						sumKiste=0;
						onclckEvt="onclick=\"toggleProductDetails(this)\"";
					}
					
					
					prdListElem='<li><h4 '+onclckEvt+' >'+prdListElem+'</h4><ul style="display:none">'+prdListElemItem+'</ul></li>';
					prdListElem=prdListElem.replace(/@/,''+restSum);
					prdListElem=prdListElem.replace(/§/,''+sumKiste);
				}else{
					prdListElem+=prdListElemItem;
				}
				prdList+=prdListElem;
			}
			
			prdList+='</ul>';
			var groupSelectHtml='';
			if(!hideSelect){
				groupSelectHtml='<img class="iconCheckboxBase" src="'+imageIconBase+'" /><span>'+elem.item.length+'</span>';
			}
			node.append('<li><a href="#'+elem.name+'" >'+elem.name+'</a>'+groupSelectHtml+prdList+'</li>');
		}
		
		
	}
	
	if(stopView["order"]){
		var orderList='<ul class="listVisible">';
		for(pg in stopView["order"]){
			var oE=stopView["order"][pg];
			
			var oElem='<li>';
			var edit_otype='1';
			if(isReceiver){
				edit_otype='4';
			}
			var selectHtml='<img class="iconCheckboxBase" src="'+imageIconBase+'" /><input class="checkboxHidden" type="checkbox" value="'+oE.id+'" name="stop_pack" /><span> '+oE.order.product.unit+'</span><input style="display:none" type="text" onblur="checkPackValue(this,'+isReceiver+')" name="quantity" value="'+oE.order.quantity+'" ><input type="hidden" name="edit_type" value="'+edit_otype+'" ><span name="quantity_view" onmousedown="togglePackQuantityInput(this)"> '+oE.order.quantity+'</span>';
			
			
			console.info("ELEM "+oE.order.customer,oE);
			oElem+=''+oE.order.customer+' '+oE.order.product.title+' '+selectHtml;
			oElem+='</li>';
			
			orderList+=oElem;
		}
		orderList+='</ul>';
		
		var groupSelectHtml='';
		if(!hideSelect){
			groupSelectHtml='<img class="iconCheckboxBase" src="'+imageIconBase+'" /><span>'+stopView["order"].length+'</span>';
		}
		node.append('<li><a href="#Vorbestellungen" >Vorbestellungen</a>'+groupSelectHtml+orderList+'</li>');
	}
	
	$(node).parent().find('#stopgrouptask span').remove();
	$(node).parent().find('#stopgrouptask a').remove();
	$(node).parent().find('#task li').remove();
	
	if(taskList.length>0 && $(node).parent().find('#task')){
			
			var t=null;
			
			$(node).parent().find('#stopgrouptask').append('<a class="wiconBase32 iconDeliver" href="javascript:void(0)" title="Aufgaben" ><img src="images/icon_on_empty32.png" /></a>');
			$(node).parent().find('#stopgrouptask').append('<span> Aufgaben <span>');
			for(t in taskList){
				//console.info("TASK",taskList[t]);
				
				var iconClick="<img class=\"iconCheckboxBase\" src=\""+imageIconBase+"\" /><input id=\"task"+taskList[t].id+"\" class=\"checkboxHidden\" type=\"checkbox\" value=\"0\" name=\"task_check\" />";
				var liClick="";
				if(taskList[t].description.indexOf("Lieferschein")>-1){
					iconClick="<input id=\"task"+taskList[t].id+"\" class=\"checkboxHidden\" type=\"checkbox\" value=\"1\" name=\"task_check\" />";
					liClick="onclick=\"showTaskDetail("+taskList[t].id+","+taskList[t].tasktype.externalId+")\" ";
				}
				$(node).parent().find('#task').append("<li "+liClick+" >"+iconClick+taskList[t].description+"</li>");
				
			}
	}
	
}
function showTaskDetail(taskId,taskType){
	console.info("Task "+taskId+" type "+taskType);
	activeTaskId="#task"+taskId;
	$('#tasktransfer li').remove();
	loadTourstopReceive(tourstopActive, onTourstopBill);
	selectSection('tourtask');
}
function onTourstopBill(json){
	writePackDataInList(json,$('#tourtask').find('#tasktransfer'),true,false,true,true);	
}
function selectInput(iNode){
	console.info("Node",iNode);
}
function toggleProductDetails(productNode){
	var prdListD=$(productNode).parent().find('ul');
	var prdListDisp=prdListD.css("display");
	console.info("Details "+prdListDisp);
	var prdListDisp=prdListD.css("display",(prdListDisp == "none") ? "block" : "none");
}
function orderOrderToProductgroup(view,chargeItemOrder){
	
	var oN="order";
	if(view[""+oN]){
		view[""+oN].push(chargeItemOrder);
	}else{
		view[""+oN]=[];
		view[""+oN].push(chargeItemOrder);
	}
	
}
function orderPackToProductgroup(view,chargeItem){
	
	var ig=getProductgroupFromProductid(chargeItem.pack ? chargeItem.pack.product.id : chargeItem.job ? chargeItem.job.product.id : chargeItem.item ? chargeItem.item.pack.product.id : null);
	if(ig){
		if(view[""+ig.id]){
			view[""+ig.id].item.push(chargeItem);
		}else{
			view[""+ig.id]={};
			view[""+ig.id].name=""+ig.name;
			view[""+ig.id].item=[];
			view[""+ig.id].item.push(chargeItem);
		}
		//console.log(""+pack.product.title+" in group "+ig.name);
	}
}

//Erfassung der Geokoordinaten
function getPosition(onPositionLoad){
	if(!onPositionLoad){
		writeError("Du hast mir nicht gesagt, was ich mit dem Punkt machen soll!");
	}else{
		navigator.geolocation.getCurrentPosition(onPositionLoad);
	}
}

/* Hier wird die Produktgruppe zur�ckgegeben, in dem sich das Produkt befindet */
function getProductgroupFromProductid(pId){
	if(!pId){
		return null;
	}
	var groupResult=null,pg=null,p=null;
	for(pg in productGroup){
		var _g=productGroup[pg];
		var _gp=_g.product;
		//console.info("      "+g.name,_g.product);
		if(_gp){
			if( isArray(_gp)){
				for(p in _gp){
					if(_gp[p].id==pId){
						groupResult=_g;
						break;
					}
				}
			}else{
				if(_gp.id==pId){
					groupResult=_g;
					break;
				}
			}
		}
		if(groupResult!=null){
			break;
		}
	}
	return groupResult;
}

function isArray(someVar){
	if( Object.prototype.toString.call( someVar ) === '[object Array]' ) {
		return true;
	}else{
		return false;
	}
}

function onSelectEdittypePack(elem){
	console.info("Edittype",elem);
	if(_packEdited){
		var pVal=$(_packEdited).parent().find('input[type=text]').val();
		if(elem){
			var nVal=$(elem).find('input[type=hidden]').val();
			console.info("Neuer Wert "+nVal);
			$(_packEdited).parent().find('input[name=edit_type]').val(nVal);
			if(nVal==900){
				pVal=0;
			}
		}
		
		setPackView($(_packEdited).parent().find('input[type=text]'),pVal);
		_packEdited=null;
		_origPackvalue=0;
		closeDialog();
	}
}

function cancelEditpack(){
	if(_packEdited){
		closeDialog();
		
		//console.info("INPUT",$(_packEdited).parent().find('input[type=text]')[0]);
		$(_packEdited).parent().find('input[type=text]').val(_origPackvalue);
		
		setPackView($(_packEdited).parent().find('input[type=text]'),_origPackvalue);
		_packEdited=null;
		_origPackvalue=0;
	}
	
}

function writeEditpackChoice(){
	
	var rCtx='<div class="edittypeTitle">Grund der &Auml;nderung <div class="edittypeList">@</div></div>';
	
	var eOut="";
	if(edittypePack.length==0){
		eOut="Lade...";
		loadEdittypePack();
	}else{
		var e=null;
		for(e in edittypePack){
			var etP=edittypePack[e];
			eOut+='<div class="edittype" onmousedown="onSelectEdittypePack(this)">'+etP.description+'<input name="edit_name" type="hidden" value="'+etP.mode+'" /></div>';
		}
	}
	eOut+='<a class="iconBase iconCancel" href="javascript:void(0);" title="Abbrechen" onclick="cancelEditpack(this)" ></a>';
	
	var rOut=rCtx.replace(/@/,eOut);
	return rOut; 
}

function togglePackQuantityInput(node){
	//console.log("FIND INPUT",);
	if(_packEdited){
		var packInput=$(_packEdited).parent().find('input[type=text]');
		var ok=checkPackValue(packInput);
		if(!ok){
			return false;
		}
	}	
		//$(node).css('display','none');
		
		var inputNode=$(node).parent().find('input[type=text]');
		
		//inputNode.css('display','block');
		_origPackvalue=inputNode.val()*1;
		_packEdited=node;
		
		inputNode.select();
		//console.info("input ",inputNode[0]);
		
		//inputNode[0].select();
	//$(node).parent().find('input:text').first().select();
}
function restPack(node){
	var pn=$(node).parent();
	var inp=find('input[type=text]');
	//var refVal=pn.find('span[name=quantity_view]').html()*1;
	if(inp!=_origPackvalue){
		inp.val(_origPackvalue);
	}
} 
/*
$("input[type=text]").focus(function(){
	// Select field contents
    this.select();
});*/

function checkPackValue(node/*,receiveDelivery*/){
	//console.log("FIND INPUT",);
	var iV=0;
	var refVal=$(node).parent().find('span[name=quantity_view]').html()*1;
	var val=$(node).val();
	iV=parseFloat(val*1);
	
	if(!iV){
		if(iV!=0 && !isNaN(iV)){
			$(node).val(refVal);
		}
	}

	
	console.info("checkPackValue "+refVal+" != "+iV+" "+(refVal!=iV));
	if(!isReceiver && refVal!=iV && iV >= 0){
		
		var rCtx=writeEditpackChoice();
		getDialog(rCtx,null,"cancelEditpack");
		return false;
	}else if(!isNaN(iV)){
		if(/*refVal<iV || */iV < 0){
			$(node).val(refVal);
			getDialog("Ungültiger Wert!<br/><button onclick=\"closeDialog()\">Ok</button>",null,"cancelEditpack");
		}else{
			console.info("HIER NOCH ORIGINALWERT HERAUSLESEN",$(node).parent());
			onSelectEdittypePack();
		}
		return true;
		//alert("Ware zur�ck "+iV);
	}else{
		if(inputRequiredValue==val){
			onSelectEdittypePack();
		}
		return false;
	}
	
	
}
function setPackView(node,value){
	
	//$(node).css('display','none');
	togglePackCheckBox($(node).parent().find('img'),'iconCheckboxChecked');
	$.each($(node).parent().find('span'), function(idx, sNode){
		if($(sNode).attr('name')=="quantity_view"){
			$(sNode).html(value);
			//$(sNode).css('display','inline');
		}
	});
}

//L�scht Sonderzeichne aus der Telefonnummer
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
	if(isWriteCoords){
		getPosition(onCoordsDefinedForTour);
	}
	if(!_t.vehicle){
		activateVehicleSelect();
		//Wenn kein Auto gew�hlt, dann Auto ausw�hlen
	}else{
		//Ansonsten Tour anzeigen
		selectSection('tour');
	}
	loadTourstop(tourActive);
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
		sendJsonRequest(basePath+'/rest/driverservice/vehicle?='+Date.now(),onVehicleResponse);
		
	}
}
function loadProductgroup(){
//http://localhost:8080/DeliveryWeb/rest/driverservice/productgroup
	sendJsonRequest(basePath+'/rest/driverservice/productgroup?='+Date.now(),onProductgroupResponse);
}
function loadTourlist(){
	loadingNode=createLoader($('#login'));
	sendJsonRequest(basePath+'/rest/driverservice/tour?='+Date.now(),onTourlistResponse);
}

function loadTourCharge(tour){
	if(!tour){
		tour=tourActive;
	}
	$('#tourcharge li').remove();
	
	selectSection('tourcharge');
	loadingNode=createLoader($('#tourcharge'));
	sendJsonRequest(basePath+'/rest/driverservice/tour/'+tour.id+'/charge?='+Date.now(),onTourChargeResponse);
}

function loadTourstop(tour,onResponseEvent){
	if(!onResponseEvent){
		onResponseEvent=onTourstopResponse;
		loadingNode=createLoader($('#tour'));
	}
	
	sendJsonRequest(basePath+'/rest/driverservice/tour/'+tour.id+'/tourstop?='+Date.now(),onResponseEvent);
}

function loadTourstopCharge(tour,stop,onResponseEvent){
	if(!onResponseEvent){
		onResponseEvent=onTourstopChargeResponse;
		loadingNode=createLoader($('#tourstop'));
	}
	
	sendJsonRequest(basePath+'/rest/driverservice/tour/'+tour.id+'/tourstop/'+stop.id+'/charge?='+Date.now(),onResponseEvent);
}

function loadTourstopSeller(tourstop,onResponseEvent){
	if(!onResponseEvent){
		onResponseEvent=onTourstopSellerResponse;
	}
	sendJsonRequest(basePath+'/rest/driverservice/tourstop/'+tourstop.id+'/seller?='+Date.now(),onResponseEvent);
}
function loadTourstopReceive(tourstop,onResultEvt){
	if(!onResultEvt){
		onResultEvt=onTourstopReceiveResponse;
	}
	sendJsonRequest(basePath+'/rest/driverservice/tourstop/'+tourstop.id+'/goods2receive?='+Date.now(),onResultEvt);
}

function loadEmployeeFromLocation(location,onResponseEvent){
	if(!onResponseEvent){
		onResponseEvent=onEmployeeLocationResponse;
	}
	sendJsonRequest(basePath+'/rest/driverservice/location/'+location.id+'/employee?='+Date.now(),onResponseEvent);
}
function loadEdittypePack(){
	sendJsonRequest(basePath+'/rest/driverservice/pack/edittype?='+Date.now(),onEdittypePackResponse);
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
		sendJsonRequest(basePath+'/rest/driverservice/tour/'+tourActive.id+'/latlng?='+Date.now(),onTourCoordResponse,null,"POST",coordStr);
	}
}

function updateLocationCoords(coordStr,locationId){
	//console.info("Update "+coord.lat()+" / "+coord.lng());
	sendJsonRequest(basePath+'/rest/driverservice/location/'+locationId+'/latlng?='+Date.now(),onLocationCoordResponse,null,"POST",coordStr);
	// /location/{id}/latlng
}

function sendJsonRequest(reqUrl,onSuccess,onError,method,data){
	if(!onError){
		onError=function (xhr, textStatus, errorThrown) {
			if(loadingNode){
				$(loadingNode).remove();
			}
			if(xhr.status == 401 || xhr.status == 403){
				writeError("Anmeldung nicht erfolgreich",xhr.status);
			}else if(xhr.status == 503){
				selectSection('login');
				writeError("Zur Zeit kann keine Verbindung zum Server hergestellt werden!");
			}else if(xhr.status == 500){
				selectSection('login');
				writeError("Die Verbindung wurde unerwartet unterbrochen. Bitte melde Dich erneut an!");
			}else{
				writeError("Error response "+textStatus,xhr.status);
			}
	    	//console.log("FEHLER "+textStatus,xhr.status);
	    };
	}
	if(!method){
		method="GET";
	}
	var reqParams={
	    type: method,
	    url: reqUrl,
	    contentType:"application/json;charset=utf-8",
	    dataType: "json",
	    headers:{"Authorization":"Basic "+base64Login},
	    /*statusCode: {
	        401:function() { writeError("401",401); },
	        404:function() { writeError("404",404); },
	        201:function() { writeError("201",201); },
	        202:function() { writeError("202",202); }
	    },*/
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
		//F�llen der Elemente
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
$("#stoupgroup,#receive,#task,#tasktransfer").delegate("img", "click", function() {
	
	//console.log("Click Img PARENT INPUT",_p);
	$(this).toggleClass('iconCheckboxChecked');
	
	togglePackCheckBox(this);
	
});

$("#stoupgroup,#receive","#tasktransfer").delegate("li>a", "click", function() {
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

$("#receive").delegate('input','click',function() {
	//alert("JA");
	 $(this).focus();
	   $(this).select();
	});
/* Anmeldung */
$('#login :button').on('click',function(){
	//alert("login:");
	var password="";
	username="";
	$.each($('#login input'), function(idx, data){
		if(data.name=="username"){
			username=""+data.value;
			createCookie("username",username);
		}
		if(data.name=="password"){
			password=data.value;
			createCookie("password",password);
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


/* Wird bei App-Start ausgef�hrt */
$(function(){
	//navigator.geolocation.getCurrentPosition(positionsAusgabe);	 
	//alert("username:"+readCookie("username"));
	
	$.each($('#login input'), function(idx, data){
		if(data.name=="username"){
			data.value=readCookie("username");
		}
		if(data.name=="password"){
			data.value=readCookie("password") || "";
			if(username && data.value!=""){
				console.info("MELDE AN "+username+":"+data.value);
				base64Login=$.base64.encode(username+":"+data.value);
				loadTourlist();
			}		
		}
	});
	
    $('a[href=#login], #login').addClass("aktiv");
    
    //loadTour();
});
function createLoader(node){
	var e = $("<span style=\"display:inline-block;padding-left:45%\" ><img src=\"images/loader.gif\" /></span>");
	$(node).append(e);
	
	return e;
}
function createCookie(name, value, days) {
    var expires = "";
    document.cookie = escape(name) + "=" + escape(value) + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = escape(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return unescape(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}

