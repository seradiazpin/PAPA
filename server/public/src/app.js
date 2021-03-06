/**
 * Created by sergiodiazpinilla on 29/11/16.
 */
import angular from 'angular'
import 'angular-ui-router';
import 'angular-ui-grid';
let moment = require('moment');

angular.module('pensiones',["ui.router","ui.grid", "ui.grid.autoResize", 'ui.grid.exporter','ui.grid.edit'])
    .config(($stateProvider,$urlRouterProvider) => {
        $urlRouterProvider.otherwise("/");
        $stateProvider
            .state("login",{
                url: "/",
                templateUrl:("../views/LiquidacionPension/login.html"),
                params:{errorMessage : ""},
                controller: function ($state,$stateParams,$http) {
                    this.errorMessage = $stateParams.errorMessage;
                    this.login = function (admin) {
                        $http({
                            method : 'POST',
                            url:'login',
                            data:{admin}
                        }).then(function (response) {
                            if(!response.data.error){
                                $state.go('personas',{});
                            }else {
                                $state.go('login',{errorMessage :"Usuario o contraseña invalido"});
                            }
                        });
                    };
                },
                controllerAs:"loginCtrl"
            })
            .state("personas",{
                url:"/personas",
                templateUrl : "../views/LiquidacionPension/personas-nav.html",
                resolve:{
                    personasService : function ($http) {
                        return $http.get("/personas");
                    }
                },
                controller : function (personasService,$http,$stateParams) {
                    this.personas = personasService.data;
                    this.delete = function (persona) {
                        let that = this;
                        $http({
                            method : 'POST',
                            url:'/personas/borrar/'+$stateParams.idPersona,
                            data:{id:persona[1]}
                        }).then(
                            function (){
                                let index = that.personas.indexOf(persona);
                                if(index != -1) {
                                    that.personas.splice(index, 1);
                                }
                            });

                    }
                },
                controllerAs:"personasCtrl"

            })
            .state("nueva-persona",{
                url:"/personas/nueva",
                templateUrl:"../views/LiquidacionPension/agregar-persona.html",
                controller : function ($state,$http) {
                    this.errorData = {
                        mesageStatus : " ",
                        mensage:"Favor ingresar archivo .cvs con los siguientes cabecera, fechaDesde,fechaHasta,IBC",
                        errorNumber:0,
                        continuar: false
                    };

                    this.validarData = function($fileContent){
                        this.cvs = this.csvJSON($fileContent.toString());
                        this.validarTabla(this.cvs);
                        angular.element("input[type='file']").val(null);
                    };
                    this.csvJSON = function (csv){
                        let lines = csv.replace(/\r/g,'').split("\n");
                        let result = [];
                        let headers=lines[0].split(";");
                        for(let i=1;i<lines.length;i++){
                            let obj = {};
                            let currentline=lines[i].split(";");
                            for(let j=0;j<headers.length;j++) {
                                obj[headers[j]] = currentline[j];
                            }
                            result.push(obj);
                        }
                        return result; //JavaScript object
                        //return JSON.stringify(result); //JSON
                    };
                    this.validarTabla = function (data) {
                        this.errorData.mensage = "";
                        this.errorData.errorNumber = 0;
                        if (data[data.length-1].fechaDesde === "") {
                            data.pop()
                        };
                        for(let i = 0;i < data.length;i++){
                            let row = data[i];
                            if(this.mayorFecha(row.fechaDesde,data[data.length-1].fechaDesde)){
                                row.error = true;
                                this.errorData.errorNumber++;
                            }
                            if(row.fechaDesde.substring(3, 5) === "04" || row.fechaDesde.substring(3, 5) === "06" || row.fechaDesde.substring(3, 5) === "09" || row.fechaDesde.substring(3, 5) === "11"){
                                if(row.fechaDesde.substring(0, 2) === "31"){
                                    row.fechaDesde = row.fechaDesde.replace("31","30");
                                }
                            }
                            if(row.fechaHasta.substring(3, 5) === "04" || row.fechaHasta.substring(3, 5) === "06" || row.fechaHasta.substring(3, 5) === "09" || row.fechaHasta.substring(3, 5) === "11"){

                                if(row.fechaHasta.substring(0, 2) === "31"){
                                    row.fechaHasta = row.fechaHasta.replace("31","30");
                                }
                            }

                            if(i > 0){
                                let lastRow = data[i-1];
                                if( (row.fechaDesde === lastRow.fechaDesde) &&
                                    (lastRow.fechaHasta ===  row.fechaHasta)){
                                    let d1 = lastRow.IBC.replace("$", "").replace(".", "").replace(",", ".");
                                    let d2 = row.IBC.replace("$", "").replace(".", "").replace(",", ".");
                                    lastRow.IBC = +d1+ +d2;
                                    data.splice(i, 1);
                                    if(lastRow.error){
                                        row.error = false;
                                        lastRow.error = false;

                                    }
                                    row = data[i];
                                    lastRow = data[i-1];
                                }
                                if(!this.mayorFecha(row.fechaDesde,lastRow.fechaDesde)){
                                    let date = moment(row.fechaDesde,"DD/MM/YYYY");
                                    let date2 = moment(lastRow.fechaHasta,"DD/MM/YYYY");
                                    console.log("ECHAS "+row.fechaDesde+ ", "+lastRow.fechaHasta)
                                    console.log("DIA "+date.month());
                                    console.log("DIA "+date2.month());
                                    lastRow.error = true;
                                    row.error = true;
                                    this.errorData.errorNumber++;
                                    console.log("Error con fecha anterior: "+i);
                                }

                                if(!this.mayorFecha(row.fechaHasta,lastRow.fechaDesde)){
                                    row.error = true;
                                    this.errorData.errorNumber++;
                                    console.log("Error con fecha actual: "+i);
                                }
                            }
                        }
                        if(this.errorData.errorNumber === 0){
                            this.errorData.mesageStatus = "Exito";
                            this.errorData.mensage = "No se encontraron errores en los datos puede continuar";
                            this.errorData.continuar = true;
                        }else{
                            this.errorData.mesageStatus = "Error";
                            this.errorData.mensage = "Error encontrado en la filas marcadas en rojo, favor corregir y"+
                                " subir archivo de nuevo";
                            this.errorData.continuar = false;
                        }
                    };
                    this.mayorFecha = function (a ,b) {
                        return moment(a,"DD/MM/YYYY").diff(moment(b,"DD/MM/YYYY"))>0;
                    };
                    this.savePersona = function (persona) {
                        persona.datosPension = this.cvs;
                        console.log(persona);
                        $http({
                            method : 'POST',
                            url:'/personas/nueva',
                            data:{persona}
                        }).then(function () {
                            $state.go('personas',{});
                        });
                    }
                },
                controllerAs:"nuevaPersonaCtrl"
            })
            .state("id",{
                url:"/personas/:idPersona",
                templateUrl:"../views/LiquidacionPension/infomacion-persona.html",
                resolve:{
                    personaService:function ($http, $stateParams) {
                        console.log($stateParams.idPersona);
                        return $http.get("/personas/"+$stateParams.idPersona);
                    }
                },

                controller: function(personaService , $state , $http,$stateParams,$scope) {
                    this.delete = function () {
                        $http({
                            method : 'POST',
                            url:'/personas/borrar/'+$stateParams.idPersona,
                            data:{id:this.persona.documento}
                        }).then(
                            function (){
                                $state.go('personas',{});
                            });

                    };
                    this.gridOptions = {
                        enableSorting: false,
                        headerCellClass: 'text-justify',
                        columnDefs: [
                            {
                            field: 'fechaHasta',
                            displayName: 'Fecha \ndesde',
                            cellClass: "text-justify",
                            width: "*",
                            enableCellEdit: true
                        },
                            {field: 'fechaHasta', displayName: 'Fecha  hasta', cellClass: "text-justify", width: "*"},
                            {
                                field: 'IBC',
                                displayName: 'IBC',
                                cellClass: "text-justify",
                                width: "*",
                                cellFilter: 'currency',
                                enableCellEdit: true
                            },
                             {field:'year', displayName: 'Año', cellClass: "text-justify", width: "*",visible:false },
                             {field:'diasEntre', displayName: 'Dias entre fechas', cellClass: "text-justify", width: "*",visible:false  },
                            {
                                field: 'semanasAcumuladas',
                                displayName: 'Nº semanas acumuladas',
                                cellClass: "text-justify",
                                width: "*",
                                cellFilter: 'number: 0'
                            },
                            {field: 'factorIPC', displayName: 'Factor  IPC', cellClass: "text-justify", width: "*"},
                            {
                                field: 'salarioActualizado',
                                displayName: 'Salario  actualizado',
                                cellClass: "text-justify",
                                width: "*",
                                cellFilter: 'number: 3'
                            },
                            {
                                field: 'IBLtlv',
                                displayName: 'IBL toda la vida',
                                cellClass: "text-justify",
                                width: "*",
                                cellFilter: 'number: 2'
                            },
                            {
                                field: 'numDias10Y',
                                displayName: 'Nº dias 10 años',
                                cellClass: "text-justify",
                                width: "*"
                            },
                            {
                                field: 'IBL10Y',
                                displayName: 'IBL 10 años',
                                cellClass: "text-justify",
                                width: "*",
                                cellFilter: 'number: 2'
                            },
                            {field: 'numDiasuY', displayName: 'Nº dias 1 años', cellClass: "text-justify", width: "*"},
                            {
                                field: 'IBLuy',
                                displayName: 'IBL 1 años',
                                cellClass: "text-justify",
                                width: "*",
                                cellFilter: 'number: 2'
                            }],
                        data: personaService.data.datosPension,
                        enableGridMenu: true,
                        enableSelectAll: true,
                        exporterCsvFilename: personaService.data.documento+"-"+personaService.data.nombre+'.csv',
                        exporterCsvLinkElement: angular.element(document.querySelectorAll(".custom-csv-link-location")),
                        onRegisterApi: function(gridApi){
                            this.gridApi = gridApi;

                            gridApi.edit.on.afterCellEdit($scope,function(rowEntity, colDef, newValue, oldValue){
                                $scope.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue ;
                             });

                        }
                    };
                    this.persona = personaService.data;
                    this.fechasEdit = {
                        nacimiento: moment(personaService.data.fechaNacimiento,"DD/MM/YYYY").format("YYYY-MM-DD"),
                        liquidacion : moment(personaService.data.fechaLiquidacion,"DD/MM/YYYY").format("YYYY-MM-DD")
                    };

                    this.edit = false;
                    this.cancelar = function () {
                        this.edit = !this.edit;
                        if(!this.edit) {
                            this.persona = angular.copy(this.backup);
                            delete this.backup;
                        }
                    };
                    this.editConfirm = function (persona) {
                        this.backup = angular.copy(persona);
                        this.edit = !this.edit;
                        let that = this;
                        console.log(this.fechasEdit.nacimiento);
                        if(!this.edit){
                            persona.fechaNacimiento = persona.fechaNacimiento2;
                            persona.fechaLiquidacion = persona.fechaLiquidacion2;
                            delete persona.fechaNacimiento2;
                            delete persona.fechaLiquidacion2;
                            console.log("guardando persona");
                            $http({
                                method : 'POST',
                                url:'/personas/editar/'+$stateParams.idPersona,
                                data:{persona}
                            }).then(function () {
                                $http.get("/personas/"+$stateParams.idPersona).then(
                                    function (res) {
                                        that.persona = res.data;
                                        that.fechasEdit = {
                                            nacimiento: moment(personaService.data.fechaNacimiento,"DD/MM/YYYY").format("YYYY-MM-DD"),
                                            liquidacion : moment(personaService.data.fechaLiquidacion,"DD/MM/YYYY").format("YYYY-MM-DD")
                                        };
                                    }
                                );
                                delete that.backup;
                            });
                        }

                    };
                    this.borrarPersona = function () {
                        return $http.get("/borrar/"+$stateParams.idPersona)
                            .then(function () {
                                $state.go('personas',{});
                            });
                    };
                    this.export = function () {
                        let grid = this.gridApi.grid;
                        let rowTypes = uiGridExporterConstants.ALL;
                        let colTypes = uiGridExporterConstants.ALL;
                        this.gridApi.exporter.csvExport( rowTypes, colTypes, grid );
                    }
                },
                controllerAs : "personCtrl"
            });
    })
    .directive('onReadFile', function ($parse) {
        return {
            restrict: 'A',
            scope: false,
            link: function(scope, element, attrs) {
                console.log("Reading-file");
                let fn = $parse(attrs.onReadFile);
                element.on('change', function(onChangeEvent) {
                    let reader = new FileReader();
                    reader.onload = function(onLoadEvent) {
                        scope.$apply(function() {
                            fn(scope, {$fileContent:onLoadEvent.target.result});
                        });
                    };
                    reader.readAsText((onChangeEvent.srcElement || onChangeEvent.target).files[0]);
                });

            }
        };
});
