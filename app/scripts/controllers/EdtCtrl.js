'use strict';

var App = angular.module('linkedEnibApp');

App.controller('EdtCtrl', function ($scope, $routeParams, edt, session, $timeout, $http) {

    $scope.partSearchResults = [];

    $scope.whatIdToSearch = 0;
    $scope.whoIdToSearch = 0;
    
    if($routeParams.id){
        $scope.whatIdToSearch = $routeParams.id;
        $scope.whoIdToSearch = $routeParams.id;
    }else{
        $scope.whatIdToSearch = 0;
        $scope.whoIdToSearch = 0;
    }

    $scope.newAct = {
        periods: [],
        whatId: -1,
        timezone: new Date().getTimezoneOffset()
    };
    
    $scope.dayOrPeriod = 'PERIOD';

    $scope.actAsocs = [];

    $scope.actTypes = [];

    $scope.newActDays = [];

    $scope.daySelected = function (periodIndex) {
        var selected = false;
        $scope.newActDays[periodIndex].forEach(function (day) {
            if (day)
                selected = true;
        });

        return selected;
    };

//    $scope.onlyThisDay = function (periodIndex, idx) {
//        $scope.newActDays[periodIndex].forEach(function (el, index) {
//            $scope.newActDays[periodIndex][index] = false;
//        });
//        $scope.newActDays[periodIndex][idx] = true;
//    };

    //necesita llamada a getAssociations
    $scope.selectAsoc = function (asoc) {
        $scope.newAct.whatId = asoc.instID;
        $scope.newAct.whatName = asoc.instName;
        
        console.log($scope.newAct.whatId);
        console.log($scope.newAct.whoId);

        $http({method: 'GET', url: session.host + ':3000/acttypes', params: {partLabel: asoc.instLabel}})
            .success(function (acttypes) {
                $scope.actTypes = acttypes;
                $scope.newAct.periods.forEach(function (period) {
                    period.type = $scope.actTypes[0].label;
                });
                return;
            })
            .error(function () {
                return;
            });
    };

    $scope.selectActType = function (typeLabel, periodIndex) {
        $scope.newAct.periods[periodIndex].type = typeLabel;
    };

    //NECESITA llamada a selectAsoc
    $scope.addRemovePeriod = function (periodIndex) {
        //Add
        if (periodIndex === -1) {
            $scope.newAct.periods.push({});
            periodIndex = $scope.newAct.periods.length - 1;
            $scope.newAct.periods[periodIndex].from = {};
            $scope.newAct.periods[periodIndex].to = {};
            $scope.newAct.periods[periodIndex].desc = '';
            $scope.newAct.periods[periodIndex].days = [{day: 'lu', times: [{}]},
                {day: 'ma', times: [{}]}, {day: 'mi', times: [{}]}, {day: 'ju', times: [{}]},
                {day: 'vi', times: [{}]}, {day: 'sa', times: [{}]}];
            $scope.newActDays.push([false, false, false, false, false, false]);
            $scope.newAct.periods[periodIndex].repeat = 'n';
            $scope.newAct.periods[periodIndex].type = ($scope.actTypes.length > 0) ? $scope.actTypes[0].label : 'NOT_SPECIFIED';
            //TODO: Se puede hacer mas elegante esto?
            $timeout(function () {
                $scope.attachCalendar(periodIndex);
            }, 200);
        }
        //Remove
        else {
            $scope.newAct.periods.splice(periodIndex, 1);
            $scope.newActDays.splice(periodIndex, 1);
        }

        console.log($scope.newActDays);
    };

    $scope.addRemoveTime = function (periodIndex, dayIndex, timeIndex) {
        console.log($scope.newAct.periods);
        console.log(periodIndex, dayIndex, timeIndex);
        //Add
        if (timeIndex === -1) {
            $scope.newAct.periods[periodIndex].days[dayIndex].times.push({});
        }
        //Remove
        else {
            $scope.newAct.periods[periodIndex].days[dayIndex].times.splice(timeIndex, 1);
        }
    };

    //Necesita translations..
    $scope.getAssociations = function () {
        $http({method: 'GET', url: session.host + ':3000/asocs'})
            .success(function (asocs) {
                //TODO: Es necesario? el hecho de que sea PRIVATE la última siempre,
                //para que buscar el label si sabemos que es PRIVATE?
                asocs[asocs.length - 1].instName = session.translation.labels[asocs[asocs.length - 1].instName];
                $scope.actAsocs = asocs;
                $scope.selectAsoc(asocs[0]);
                return;
            })
            .error(function () {
                return;
            });
    };

    $scope.partSearch = function () {
        
        if($('#partSearchDDToggle').hasClass("open")){
            ;
        }else{
            $('#partSearchDDToggle').addClass('open');
        }
        
        if ($scope.partSearchTerm === '') {
            $('#partSearchDDToggle').removeClass('open');
            $scope.partSearchResults = [];
            return;
        }
        var path = session.host + ':3000/search?what=Parts&term=' + $scope.partSearchTerm;
        $http({method: 'GET', url: path})
        .success(function (results) {
            console.log(results);
            $scope.partSearchResults = results;
        });
    };

    /*****************************************************************/
    /*****************************************************************/
    /*****************************************************************/
    /*****************************************************************/

    /**
     * Para que las franjas horarias se adapten automáticamente.
     */
    $(window).on('resize', function () {
        if ($scope.newActCollapse) {
            $scope.clearplot();
            $scope.replot();
        }
    });

    $scope.test = function () {
    };

    /** @type {Boolean} Decide si se muestra el EDT o el form de nueva actividad */
    $scope.newActCollapse = true;
    /** @type {Array} Guarda las <div>s que muestran las frajas horarias para poder eliminarlas */
    $scope.divs = [];
    /** @type {Integer} Usado para referenciar un <div> en timeplot() */
    $scope.divIndex = 0;
    /** @type {String} Sufijo usado para elegir entre las <div>s contenedoras
     * 	horizontales o verticales
     */
    $scope.suffix = 'H';
    /**
     * Referencia para usarlo en edt.html para mostrar u ocultar el botón de nueva actividad
     * @type {Service}
     *
     * TODO: Tal vez sea mejor manejarlo via una variable del $scope
     * y no con el servicio directamente?
     */
    $scope.session = session;

    /**
     * Convierte un objeto de tipo Date en un array [Year,Week,DayOfWeek], normalizado según ISO 8601
     * @param {Date Object} DArg
     * @return {Array} [YN, WN, D]
     */
    $scope.DobToYWDarr = function (DArg) {
        var DOb = new Date(DArg); // <- errors with Opera 9
        if (isNaN(DOb))
            return false;
        var D = DOb.getDay();
        if (D == 0)
            D = 7; // D = ISO DoW
        DOb.setDate(DOb.getDate() + (4 - D));   // To nearest Thu, mid-week
        var YN = DOb.getFullYear();           // YN = ISO W-N Year
        // uses Jan 1 of YN; -6h allows for Summer Time
        var ZBDoCY = Math.floor((DOb.getTime() - new Date(YN, 0, 1, -6)) / 864e5);
        var WN = 1 + Math.floor(ZBDoCY / 7);

        return [YN, WN, D]; /* ISO 8601 */
    };

    /**
     * Convierte un array de tipo [Year, Week, DayOfWeek] (ISO 8601) en un objeto de tipo Date
     * @param {Array} AYWD ([Year, Week, DayOfWeek])
     * @return {Date Object} Dob
     */
    $scope.YWDarrToDob = function (AYWD) { // Arg : ISO 8601 : [Y, W, D]
        var DOb = new Date(+AYWD[0], 0, 3);  // Jan 3
        if (isNaN(DOb))
            return false;
        DOb.setDate(3 - DOb.getDay() + (AYWD[1] - 1) * 7 + +AYWD[2]);
        return DOb;
    };

    /**
     * Devuelve el número de semanas en el presente año
     * @return {Integer} week
     */
    $scope.weeksInYear = function () {
        var d = new Date((new Date()).getFullYear(), 11, 31);
        var week = $scope.DobToYWDarr(d)[1];
        return week == 1 ? $scope.DobToYWDarr(d.setDate(24))[1] : week;
    };

    $scope.selectFav = function(fav){
        $scope.whoIdToSearch = 0;
        $scope.whatIdToSearch = fav.idNEO;
        
        $scope.edtGetTimes();
    };

    /**
     * Para una semana dada como parámetro, o para la semana actual si es
     * omitido,	guarda los strings correspondientes a las fechas de esa semana.
     * @param {Integer} w
     */
    $scope.setDates = function (w) {

        // No importa el Day Of Week en week, porque al iterar se sobreescribe
        var week = (w ? [(new Date()).getFullYear(), w, 0] : $scope.DobToYWDarr(new Date()));

        $scope.searchWeek = week[1];

        if (w) {
            $scope.edtGetTimes();
            $scope.clearplot();
            $scope.replot();
        } else {
            $scope.clearplot();
        }

        $scope.daysToShow.forEach(function (el, index) {
            var jour = $scope.YWDarrToDob([week[0], week[1], index + 1]);
            var d = jour.getDate();
            var m = (jour.getMonth() + 1);
            var y = jour.getFullYear();
            el.date = (d < 10 ? '0' : '') + d + '/' + (m < 10 ? '0' : '') + m + '/' + y;
        });
    };

    /**
     * Realiza el pedido de los tipos de elementos a los que se les puede
     * consultar horarios, y los guarda en $scope.items
     *
     $scope.edtAllTypes = function(){
     
     edt.getAllTypes(function(err,data){
     if(err){
     console.log(err);
     } else {
     $scope.items.data = data;
     }
     });
     };*/

    /**
     * Reestablece las variables usadas en la consulta de horarios. Y se vuelven
     * a pedir los tipos de elementos, porque se comparte el array de consulta.
     * Probablemente sería bueno usar arrays distintos para no volver a realizar
     * la consulta.
     */
    $scope.clearSearch = function () {
        
        $scope.setDates();
        $scope.newActCollapse = true;

        $scope.whoIdToSearch = session.getId();
        $scope.whatIdToSearch = 0;

        $scope.edtGetTimes();

    };

    /**
     * Posibles opciones para la repetición de actividades al momento de crearlas
     * @type {Array}
     */
    $scope.actRepeats = {pw: 'Cada semana',
        nw: 'Semana próxima',
        w2: 'Cada dos semanas',
        n: 'Nunca'
    };

    /**
     * Días que se muestran en la tabla de horarios. Si se omite uno, no se
     * grafica. TODO: Verificar si la <div> del día existe antes de graficar!
     * (en timeplot())
     * @type {Array}
     */
    $scope.daysToShow = [{name: 'lu',
            date: '',
            collapsed: true
        },
        {name: 'ma',
            date: '',
            collapsed: true
        },
        {name: 'mi',
            date: '',
            collapsed: true
        },
        {name: 'ju',
            date: '',
            collapsed: true
        },
        {name: 'vi',
            date: '',
            collapsed: true
        },
        {name: 'sa',
            date: '',
            collapsed: true
        }];

    /**
     * Variable deprecated, para testing antes de que los horarios se pidan a la base de datos.
     * @type {Array}
     */
    $scope.times = [];

    /**
     * Devuelve una descripción de la franja horaria en HTML para incrustarla en
     * la <div> del día que corresponda
     * 
     * @param  {Object JSON} timejson
     * @return {HTML} info
     */
    $scope.blockHTML = function (timejson) {

        //w = Math.ceil(w);	
        var info = ['<div style="padding-left: 3px; height: 100%">',
            '<div style="height: 20%">' + session.translation.labels[timejson.type].substr(0, 15) + '</div>',
            '<div style="height: 20%">' + timejson.from + ' - ' + timejson.to + '</div>',
            //TODO!!
            //'<div style="height: 20%">' + timejson.where + '</div>',
            '<div style="height: 20%">' + timejson.whoName + '</div>',
            '<div style="height: 20%">' + timejson.desc + '</div>',
            '</div>'].join('\n');
        /*			
         if(ttip){
         return [	'<core-tooltip show="false"; position="'+pos+'">',
         '<div style="height: '+h+'px; width: '+w+'px;"><core-icon icon="list"></core-icon></div>',
         '<div tip style="height: '+htip+'px">'+info+'</div>',
         '</core-tooltip>'].join('\n');
         } else {
         return info;
         }*/
        return info;
    };

    /**
     * Transforma un string de formato 'XXhXX' (donde X es un dígito [0-9]) a un
     * entero que representa los minutos desde las 00h00.
     * @param  {String} t
     * @return {Integer} mt
     */
    $scope.getminutes = function (t) {
        var mt = t.split('h');
        mt = parseInt(mt[0]) * 60 + parseInt(mt[1]);
        return mt;
    };

    /**
     * Elimina del DOM las divisiones de horarios que se graficaron
     * anteriormente. Es necesario hacer esto antes de graficar con timeplot() 
     */
    $scope.clearplot = function () {

        $scope.divs.forEach(function (el) {
            $('#edt * #' + el.id).remove();
        });

        $scope.divs = [];
        $scope.divIndex = 0;
    };

    /**
     * Shortcut para la función timeplot()
     */
    $scope.replot = function () {
        $scope.timeplot($scope.times, $scope.config);
    };

    /**
     * Crea las <div>s correspondientes a las franjas horarias, coloca la
     * información dentro, y las ubica en el día correspondiente.
     * 
     * @param  {Object} alltimes JSON con los datos de las franjas horarias El
     *                           formato está especificado en el README.md.
     * @param  {Object} config   JSON con los parámetros de colores y límites de
     *                           horarios. El formato está especificado en el README.md
     */
    $scope.timeplot = function (alltimes, config) {

        console.log(alltimes);
        if(alltimes.length == 0)
            return;
        
        var divwidth;
        var divheight;

        if ($('.edt-times-h').css('display') == 'none') {
            $scope.suffix = 'V';
            divwidth = $('.edt-days').width();
            divheight = $('.chartContainerV').height();
        } else {
            $scope.suffix = 'H';
            divwidth = $('.chartContainer').width();
            divheight = $('.chartContainer').height();
        }

        //	Transform times
        var start = $scope.getminutes(config.limits.start);
        var end = $scope.getminutes(config.limits.end);
        var tt = end - start;
        //Para poder poner 'top' por día
        var localIndex = 0;
        var divsPerDay = [0,0,0,0,0,0];
        alltimes.forEach(function (el) {
            var id = $scope.daysToShow[el.day - 1].name + $scope.suffix;
            divsPerDay[el.day-1]++;
            if(divsPerDay[el.day-1] === 1)
                localIndex = 0;
            else
                localIndex++;
            
            console.log(id);
            //var times = el.times;
            //	Transform times
            //times.forEach(function(el){
            el.mti = $scope.getminutes(el.from);
            el.mtf = $scope.getminutes(el.to);
            //});

            //times.sort(function(a, b){
            //	return a.mti - b.mti;
            //});

            var pos, htip;

            if ($scope.suffix == 'H') {
                pos = 'right center';
                //htip = h - 10;

                if ((el.mti - start) > (tt / 2)) {
                    pos = 'left center';
                    //htip = h - 10;
                }

                var x = ((el.mti - start) / tt) * divwidth;
                var w = ((el.mtf - el.mti) / tt) * divwidth;
                $scope.divs[$scope.divIndex] = document.createElement('div');
                $scope.divs[$scope.divIndex].id = 'ttip-' + id + $scope.divIndex;
                $scope.divs[$scope.divIndex].title = "";
                $($scope.divs[$scope.divIndex]).css('position', 'absolute');
                $($scope.divs[$scope.divIndex]).css('left', x);
                $($scope.divs[$scope.divIndex]).css('width', w);
                $($scope.divs[$scope.divIndex]).css('height', divheight);
                $($scope.divs[$scope.divIndex]).css('background-color', config.colors[el.type]);
                if (w >= 85) {
                    $($scope.divs[$scope.divIndex]).append($scope.blockHTML(el));
                    $scope.divs[$scope.divIndex].className += ' edt-block-info';
                } else {
                    $scope.divs[$scope.divIndex].className += ' edt-ttip';
                    $($scope.divs[$scope.divIndex]).tooltip({
                        position: {
                            at: pos,
                            collision: 'none'
                        },
                        content: $scope.blockHTML(el)
                    });
                }
                document.getElementById(id).appendChild($scope.divs[$scope.divIndex]);
                $scope.divIndex++;
                //TODO: new row if superposition found
            } else {
                pos = 'center bottom';
                htip = 50;

                if ((el.mti - start) > (tt / 2)) {
                    pos = 'center top';
                    htip = 50;
                }

                var top = 0;
                var hcum = 0;
                var y = ((el.mti - start) / tt) * divheight;
                var h = ((el.mtf - el.mti) / tt) * divheight;
                top = y - hcum;
                $scope.divs[$scope.divIndex] = document.createElement('div');
                $scope.divs[$scope.divIndex].id = 'ttip-' + id + $scope.divIndex;
                $($scope.divs[$scope.divIndex]).css('position', 'relative');
                if (localIndex === 0) {
                    $($scope.divs[$scope.divIndex]).css('top', top + 'px');
                }
                $($scope.divs[$scope.divIndex]).css('width', '100%');
                $($scope.divs[$scope.divIndex]).css('height', h + 'px');
                $($scope.divs[$scope.divIndex]).css('background-color', config.colors[el.type]);
                if (h >= 70) {
                    $($scope.divs[$scope.divIndex]).append($scope.blockHTML(el));
                    $scope.divs[$scope.divIndex].className += ' edt-block-info';
                } else {
                    $scope.divs[$scope.divIndex].className += ' edt-ttip';
                    $($scope.divs[$scope.divIndex]).tooltip({
                        position: {
                            at: pos,
                            collision: 'none'
                        },
                        content: $scope.blockHTML(el)
                    });
                }
                document.getElementById(id).appendChild($scope.divs[$scope.divIndex]);
                $scope.divIndex++;
                hcum += h;
                //TODO: new row if superposition found

                $('.edt-ttip').off("mouseover").click(function () {
                    $(this).tooltip('open');
                }).off("mouseout");
            }
        });
    };

    /**
     * Da el valor de verdad para el campo days[day].collapsed, que a su vez es
     * el que controla la apertura de la <div> vertical de horarios usado en
     * vistas mobile
     * 
     * @param  {Integer} day Índice del día (ubicación dentro del objeto
     *                       $scope.daysToShow) del día a desplegar.
     */
    $scope.showTimesV = function (day) {
        $scope.daysToShow[day].collapsed = !$scope.daysToShow[day].collapsed;
    };

    /**
     * Teniendo la categoría y el elemento dentro de esa categoría, esta función
     * consulta al servidor las franjas horarias que correspondan a esos
     * parámetros más la semana actual seleccionada.
     * 
     * @param  {String} item Nombre del elemento a consultar.
     *                       Por ejemplo: 'Análisis Matemático I', 'Andrés Manelli'
     * @param  {Integer} week Semana seleccionada en el calendario.
     * 
     * TODO: Se tendría que consultar por ID, no por nombre!
     */
    $scope.edtGetTimes = function () {

        edt.getTimes(   $scope.whatIdToSearch, 
                        $scope.whoIdToSearch, 
                        $scope.searchWeek, 
                        $scope.thisYear, 
                        function (err, times) {
            if (err) {
                console.log(err);
            } else {
                console.log('EDT GET TIMES: ');
                console.log(times);
                $scope.times = times;
                $scope.clearplot();
                $scope.replot();
            }
        });
    };

    /**
     * Consulta al servidor la configuración del calendario, i.e colores y límites horarios.
     */
    $scope.edtGetConfig = function () {

        edt.getConfig(function (err, config) {
            if (err) {
                console.log(err);
                return;
            } else {
                $scope.config = config;
                return;
                //$scope.timeplot($scope.times, $scope.config);
            }
        });
    };

    /**
     * Guarda en el objeto que representa la nueva actividad a guardar la fecha
     * de fin de la misma, en el caso de repetirse una o más veces.
     * 
     * @param  {String} strDate Fecha con formato: dd/mm/yyyy
     */
    $scope.newActRepeatTo = function (strDate, periodIndex) {
        var date = strDate.split('/');
        var day = date[0];
        // month - 1 porque en formato ISO el mes es de 0 a 11
        var month = date[1] - 1;
        var year = date[2];

        date = new Date(year, month, day);
        date = $scope.DobToYWDarr(date);

        $scope.newAct.periods[periodIndex].to = {year: date[0], week: date[1], day: date[2]};
    };

    /**
     * Ejecutada al seleccionar un elemento del menú desplegable de los posibles
     * casos de repetición. Se carga el valor actual en el objeto newAct y se
     * autocompletan los campos afectados, i.e la fecha de fin.
     * 
     * @param  {Object} repeat Objeto que guarda los strings que definen la
     * repetición.
     */
    $scope.newActSelectRepeat = function (repeat, periodIndex) {
        $scope.newAct.periods[periodIndex].repeat = repeat;
    };

    /**
     * Carga en el objeto newAct el lugar dónde se realizará la actividad
     * 
     * @param  {Object} place Objeto que define el lugar
     *                        El formato puede encontrarse en el README.md
     *
     $scope.newActSelectActWhere = function(place){
     $scope.newAct.where = place.name;
     $scope.newAct.whereID = place.id;
     };*/

    /**
     * Verifica si lo ingresado en los <input> de horarios de la nueva actividad
     * son correctos y tienen sentido
     * 
     * @return {Bool} true si el  horario es válido, false en el caso contrario
     */
    $scope.checkTimes = function (periodIndex, dayIndex) {

        //TODO: HACERLO FOR EACH PERIOD Y TIME!
        console.log($scope.config.limits);
        $scope.newAct.periods[periodIndex].days[dayIndex].times.forEach(function (time, timeIndex) {
            console.log(time);
            var msg = null;
            if ($scope.getminutes(time.from) < $scope.getminutes($scope.config.limits.start)) {
                msg = 'La hora inicial no puede ser anterior al inicio general! ('
                    + $scope.config.limits.start + ') en Periodo ' + (periodIndex + 1) + ', ' +
                    session.translation.edt[$scope.daysToShow[dayIndex].name] +
                    ', Horario ' + (timeIndex + 1);
            } else if ($scope.getminutes(time.to) > $scope.getminutes($scope.config.limits.end)) {
                msg = 'La hora final no puede ser posterior al fin general! ('
                    + $scope.config.limits.end + ') en Periodo ' + (periodIndex + 1) + ', ' +
                    session.translation.edt[$scope.daysToShow[dayIndex].name] +
                    ', Horario ' + (timeIndex + 1);
            } else if ($scope.getminutes(time.from) > $scope.getminutes(time.to)) {
                msg = 'La hora inicial no puede ser posterior que la final! en Periodo ' + (periodIndex + 1) + ', ' +
                    session.translation.edt[$scope.daysToShow[dayIndex].name] +
                    ', Horario ' + (timeIndex + 1);
            } else if ($scope.getminutes(time.from) === $scope.getminutes(time.to)) {
                msg = 'La hora inicial y final no pueden ser iguales! en Periodo ' + (periodIndex + 1) + ', ' +
                    session.translation.edt[$scope.daysToShow[dayIndex].name] +
                    ', Horario ' + (timeIndex + 1);
            } else {
                $('#WrongAct').prop('hidden', true);
                return false;
            }

            if (msg) {
                $('#WrongAct').text(msg).prop('hidden', false);
                return true;
            } else {
                $('#WrongAct').prop('hidden', true);
                return false;
            }
        });
    };

    /**
     * Guarda en newAct el valor de la fecha [de inicio] || [de desarrollo] de
     * la actividad. Autocompleta el campo de fin de actividad.
     * 
     * @param  {String} strDate Fecha en formato: dd/mm/yyyy
     */
    $scope.newActWhen = function (strDate, periodIndex) {
        console.log(strDate, periodIndex);
        var date = strDate.split('/');
        var day = date[0];
        // month - 1 porque en formato ISO el mes es de 0 a 11
        var month = date[1] - 1;
        var year = date[2];

        date = new Date(year, month, day);
        $('#newActTo' + $scope.dayOrPeriod + periodIndex).datepicker("option", "minDate", date);
        date = $scope.DobToYWDarr(date);
        
        // Evita la necesidad de checkboxes para un sólo día
        $scope.newActDays[periodIndex] = [false,false,false,false,false,false];
        $scope.newActDays[periodIndex][date[2]-1] = true;
        
        $scope.newAct.periods[periodIndex].from = {year: date[0], week: date[1], day: date[2]};

    };

    /**
     * Envía al servidor el JSON de la nueva actividad.
     * 
     */
    $scope.newActivity = function () {
        
        var actsToCreate = [];
        var error = false;
        if ($scope.newAct.periods.length === 0)
            return;

        $scope.newAct.periods.forEach(function (period, periodIndex) {
            var wstep = 1;
            var wto = period.to.week;
            var wfrom = period.from.week;
            if (period.repeat === 'nw') {
                wto = period.from.week + 1;
            } else if (period.repeat === 'n') {
                wto = wfrom;
            }
            if (period.repeat === 'w2') {
                wstep = 2;
            }
            if (wto < wfrom) {
                //Pasamos de año
                //Sumamos las que nos pasamos
                wto = $scope.weeksInYear() + wto;
            }
            var fromYear = period.from.year;
            var toYear = period.to.year;
            var yearToInsert = fromYear;
            var weekToInsert = -1;
            
            for (var w = wfrom; w <= wto; w += wstep) {
                weekToInsert = w;
                if (w > $scope.weeksInYear()) {
                    weekToInsert = w - $scope.weeksInYear();
                    yearToInsert = toYear;
                }
                
                period.days.forEach(function (day, dayIndex) {
                    if (error)
                        return;
                    if (w == wfrom && (dayIndex + 1 < period.from.day))
                        return;
                    if ($scope.newActDays[periodIndex][dayIndex]) {
                        error = $scope.checkTimes(periodIndex, dayIndex);
                        day.times.forEach(function (time) {
                            actsToCreate.push({
                                day: dayIndex + 1,
                                week: weekToInsert,
                                year: yearToInsert,
                                type: period.type,
                                desc: period.desc,
                                whatId: $scope.newAct.whatId,
                                whoId: $scope.newAct.whoId,
                                whatName: $scope.newAct.whatName,
                                whoName: $scope.newAct.whoName,
                                from: time.from,
                                to: time.to,
                                timezone: $scope.newAct.timezone
                            });
                        });
                    }
                });
                if (error)
                    break;
            }
        });

        if (!error) {
            console.log(actsToCreate);
            edt.newActivity(actsToCreate, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    $scope.clearAct();
                }
            });
        } else
            return;
    };

    /**
     * Función recíproca de getminutes. Recibe un entero (cantidad de minutos) y
     * devuelve el string correspondiente.
     * 
     * @param  {Integer} minutes Cantidad de minutos.
     * @return {String}          Cadena que representa en horas y minutos la cantidad
     *                           de minutos minutes.
     *                           Formato: XXhXX
     */
    $scope.minutes2Str = function (minutes) {
        var h = Math.floor(minutes / 60);
        var m = minutes - h * 60;

        return (h < 10 ? '0' + h : h) + 'h' + (m < 10 ? '0' + m : m);
    };

    /**
     * Impide al usuario ingresar cadenas de caracteres erróneas y no conformes al formato de horarios.
     * Sólo permite ingresar números, y autocompleta la 'h'. Tampoco permite ingresar por ejemplo, 
     * la cifra '7' para las horas.
     * 
     * @param  {String} Valor de hora
     * @return {Bool}    true si la hora fue completada con éxito. false si falta algún dato.
     *
     * TODO: Permitir ingresar sólo el '7' para '07h00' por ejemplo. Lo mismo para los minutos
     */
    $scope.correctTime = function (periodIndex, dayIndex, timeIndex, toFrom) {
        var el = $scope.newAct.periods[periodIndex].days[dayIndex].times[timeIndex][toFrom];
        var matches = /([0-2]{0,1})([0-9]{0,1})(h{0,1})([0-5]{0,1})([0-9]{0,1})/g.exec(el);
        if (matches[1] == '') {
            el = '';
        } else if (matches[2] == '' || parseInt(matches[1] + '' + matches[2]) > 23) {
            el = matches[1];
        } else if (matches[4] == '') {
            el = matches[1] + '' + matches[2] + 'h';
        } else if (matches[5] == '') {
            el = matches[1] + '' + matches[2] + 'h' + '' + matches[4];
        } else if (matches[5] != '') {
            el = matches[1] + '' + matches[2] + 'h' + '' + matches[4] + '' + matches[5];
            $scope.newAct.periods[periodIndex].days[dayIndex].times[timeIndex][toFrom] = el;
            return true;
            //Desabilitar input?
        }

        $scope.newAct.periods[periodIndex].days[dayIndex].times[timeIndex][toFrom] = el;

        return false;
    };

    /**
     * Al completar dos campos de tres de los horarios de la actividad, autocompleta el tercero
     * @param  {String} el Nombre del campo correspondiente al JSON de hora del objeto newAct.
     *
     $scope.calcTime = function(el){
     
     if($scope.correctTime(el)){
     
     if($('#newActStart').parsley().isValid() && $('#newActDur').parsley().isValid(true)){
     var start = $scope.getminutes($scope.newAct.ti);
     var dur = $scope.getminutes($scope.newAct.dur);
     var end = start+dur;
     end = $scope.minutes2Str(end);
     $scope.newAct.tf = end;
     
     if($scope.checkTimes()){$scope.newAct.tf = '';}
     } else if($('#newActStart').parsley().isValid() && $('#newActEnd').parsley().isValid()){
     var start = $scope.getminutes($('#newActStart').val());
     var end = $scope.getminutes($('#newActEnd').val());
     var dur = end-start;
     dur = $scope.minutes2Str(dur);
     $scope.newAct.dur = dur;
     
     if($scope.checkTimes()){$scope.newAct.dur = '';}
     } else if($('#newActDur').parsley().isValid(true) && $('#newActEnd').parsley().isValid()){
     var dur = $scope.getminutes($('#newActDur').val());
     var end = $scope.getminutes($('#newActEnd').val());
     var start = end-dur;
     start = $scope.minutes2Str(start);
     $scope.newAct.ti = start;
     
     if($scope.checkTimes()){$scope.newAct.ti = '';}
     }
     }
     };*/

    $scope.clearAct = function () {
        $scope.newAct.periods = [];
        $scope.newAct.whatId = $scope.actAsocs[0].instID;
        $scope.newAct.whatName = $scope.actAsocs[0].instName;
        $scope.newAct.whoId = session.getId();
        $scope.newAct.whoName = session.profile.firstName[0] + '. ' + session.profile.lastName;

        if($routeParams.id){
            $scope.whatIdToSearch = $routeParams.id;
            $scope.whoIdToSearch = $routeParams.id;
        }else{
            $scope.whatIdToSearch = 0;
            if(session.loggedIn){
                $scope.whoIdToSearch = session.getId();
            }else{
                $scope.whoIdToSearch = 0;
            }
        }

        $scope.newActDays = [];
        $scope.addRemovePeriod(-1);
    };

    $scope.attachCalendar = function (periodIndex) {
        /**
         * Configuración del calendario de fecha de inicio.
         * Por más que diga dd/mm/yy el formato mostrado es dd/mm/yyyy
         */
        $('#newActFrom' + $scope.dayOrPeriod + periodIndex).datepicker({minDate: 0,
            showWeek: true,
            dateFormat: 'dd/mm/yy',
            defaultDate: 0,
            firstDay: 1
        });

        //$('#newActFrom' + $scope.dayOrPeriod + periodIndex).datepicker('setDate', new Date());
        //$scope.newActWhen($('#newActFrom' + $scope.dayOrPeriod + periodIndex).val(), periodIndex);

        /**
         * Configuración del calendario de fecha de cierre.
         * Por más que diga dd/mm/yy el formato mostrado es dd/mm/yyyy
         */
        $('#newActTo' + $scope.dayOrPeriod + periodIndex).datepicker({showWeek: true,
            dateFormat: 'dd/mm/yy',
            firstDay: 1,
            minDate: 0,
//            function(){
//                var idx = 0;
//                $scope.newActDays[periodIndex].some(function(day,ind){idx=ind;return day;});
//                return idx;
//            },
            beforeShowDay: function (date) {
                var rep = $scope.newAct.periods[periodIndex].repeat;
                var ref = $scope.newAct.periods[periodIndex].from;
                date = $scope.DobToYWDarr(date);
                if (rep === 'w2') {
                    // Cada dos semanas
                    return [((date[1] - ref.week) % 2 === 0) && $scope.newActDays[periodIndex][date[2] - 1]];
                } else {
                    return [$scope.newActDays[periodIndex][date[2] - 1]];
                }
            }
        });
    };

    $scope.$on('login', function () {
        $scope.newAct.whoId = session.getId();
        if($routeParams.id){
            $scope.whoIdToSearch = $routeParams.id;
        }else{
            $scope.whoIdToSearch = session.getId();
        }
    });

    $scope.$on('gotSubscriptions', function () {
        $scope.subscriptions = session.subscriptions;
        console.log($scope.subscriptions);
    });

    $scope.$on('gotTranslation', function () {
        $scope.translation = session.translation;
        $scope.getAssociations();
    });

    $scope.$on('gotProfile', function () {
        $scope.newAct.whoName = session.profile.firstName[0] + '. ' + session.profile.lastName;
    });

    if(session.subscriptions){
        $scope.subscriptions = session.subscriptions;
    }

    if (session.loggedIn) {
        $scope.newAct.whoId = session.getId();
        if($routeParams.id){
            $scope.whoIdToSearch = $routeParams.id;
        }else{
            $scope.whoIdToSearch = session.getId();
        }
    }

    if (session.translation) {
        $scope.translation = session.translation;
        $scope.newAct.whatName = session.translation.labels['PRIVATE'];

        $scope.getAssociations();
    }

    if (session.profile) {
        $scope.newAct.whoName = session.profile.firstName[0] + '. ' + session.profile.lastName;
    }

    /**
     * Realiza el pedido de valores por única vez al cargar el controlador,
     * luego de que se haya generado el DOM. Importante!!
     *
     * TODO: Tal vez estas cosas sea mejor hacerlas al cargar la página inicial,
     * en ParentCtrl.js porque sino, cada vez que tocamos 'EDT' vuelve a cargar esto!
     */
    $scope.$on('$viewContentLoaded', function () {
        $scope.setDates();
        $scope.newActCollapse = true;

        /* Como los ids de la tabla del EDT se generan dinámicamente en un ng-repeat,
         * el documento tarda un tiempo en verlos. Deberia haber un evento como $viewContentLoaded
         * que indique cuándo están accesibles. O se debería cambiar la forma en que está hecho el EDT.
         * Por el momento hacer un delay funciona...
         */
        $timeout(function () {

            // Si no está definido no se pueden crear los campos al vuelo
            $scope.actCats = {};

            $scope.config = {limits: {}, colors: {}};
            $scope.edtGetConfig();

            /*	Cargar las semanas en el año, sólo una vez al cargar el controlador
             */
            var wn = $scope.weeksInYear();
            var i;
            $scope.weeks = [];
            for (i = 1; i <= wn; i++) {
                $scope.weeks.push(i);
            }
            ;


            /**
             * today guarda la fecha de hoy para usos posteriores y referencia
             * @type {YWDarr}
             */
            var ajd = new Date();
            var d = ajd.getDate();
            var m = ajd.getMonth();
            var y = ajd.getFullYear();
            // Debe ser Mes/Dia/Año
            $scope.today = ((parseInt(m) + 1) < 10 ? '0' : '') + (parseInt(m) + 1) + '/' + (d < 10 ? '0' : '') + d + '/' + y;
            console.log($scope.today);
            $scope.today = $scope.DobToYWDarr($scope.today);

            /**
             * thisWeek guarda la referencia de la semana actual para usos posteriores
             * @type {Integer}
             */
            console.log($scope.today);
            $scope.thisDay = $scope.today[2];
            $scope.thisWeek = $scope.today[1];
            $scope.thisYear = $scope.today[0];

            /**
             * Mostramos el calendario
             */
            $('#edt').prop('hidden', false);

            /**
             * No sé porqué pero es muy necesario hacer esto
             *
             * TODO: Realmente lo es?
             */
            $('.ui-datepicker').css('margin-top', '0px');

            $scope.addRemovePeriod(-1);
            $scope.edtGetTimes();
        }, 200);
    });

});
