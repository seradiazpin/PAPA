/**
 * Created by sergiodiazpinilla on 29/11/16.
 */
import angular from 'angular'
import 'angular-ui-router';
import 'angular-ui-grid';
let moment = require('moment');


angular.module('pensiones',["ui.router","ui.grid", "ui.grid.autoResize", 'ui.grid.exporter'])
    .config(($stateProvider,$urlRouterProvider) => {
        $urlRouterProvider.otherwise("/personas");
        $stateProvider
            .state("personas",{
                url:"/personas",
                templateUrl : "templates/personas-nav.html",
                resolve:{
                    personasService : function ($http) {
                        return $http.get("/personas");
                    }
                },
                controller : function (personasService) {
                    this.personas = personasService.data;
                },
                controllerAs:"personasCtrl"

            })
            .state("nueva-persona",{
                url:"/nuevo-persona",
                templateUrl:"templates/agregar-persona.html",
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
                        for(let i = 0;i < data.length;i++){
                            let row = data[i];
                            if(this.mayorFecha(row.fechaDesde,data[data.length-1].fechaDesde)){
                                row.error = true;
                                this.errorData.errorNumber++;
                            }
                            if(i > 0){
                                let lastRow = data[i-1];
                                if(!this.mayorFecha(row.fechaDesde,lastRow.fechaHasta)){
                                    row.error = true;
                                    this.errorData.errorNumber++;
                                }

                                if(!this.mayorFecha(row.fechaDesde,lastRow.fechaDesde)){
                                    lastRow.error = true;
                                    this.errorData.errorNumber++;
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
                            url:'personas/nueva',
                            data:{persona}
                        }).then(function () {
                            $state.go('personas',{});
                        });
                    }
                },
                controllerAs:"nuevaPersonaCtrl"
            })
            .state("id",{
                url:"/:idPersona",
                templateUrl:"templates/infomacion-persona.html",
                resolve:{
                    personaService:function ($http, $stateParams) {
                        console.log($stateParams.idPersona);
                        return $http.get($stateParams.idPersona);
                    }
                },

                controller: function(personaService) {
                    this.gridOptions = {
                        enableSorting: false,
                        headerCellClass: 'text-justify',
                        columnDefs: [{
                            field: 'fechaHasta',
                            displayName: 'Fecha \ndesde',
                            cellClass: "text-justify",
                            width: "*"
                        },
                            {field: 'fechaHasta', displayName: 'Fecha  hasta', cellClass: "text-justify", width: "*"},
                            {
                                field: 'IBC',
                                displayName: 'IBC',
                                cellClass: "text-justify",
                                width: "*",
                                cellFilter: 'currency'
                            }/*,
                             {field:'year', displayName: 'Año', cellClass: "text-justify", width: "*" },
                             {field:'diasEntre', displayName: 'Dias entre fechas', cellClass: "text-justify", width: "*" }*/,
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
                        }
                    };
                    this.persona = personaService.data;
                    this.export = function () {
                        let grid = this.gridApi.grid;
                        let rowTypes = uiGridExporterConstants.ALL;
                        let colTypes = uiGridExporterConstants.ALL;
                        this.gridApi.exporter.csvExport( rowTypes, colTypes, grid );
                    }
                },
                controllerAs : "personCtrl"
            });
    }).directive('onReadFile', function ($parse) {
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