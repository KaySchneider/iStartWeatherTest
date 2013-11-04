const PLACEHOLDER_IMAGE = "loading.gif";
const WU_API_KEY = "YOUR API KEY";//api key from weatherunderground.com

var defaults = {
    forecast: false,
    time:+new Date(),
    location: 'autoip',
    farenheit: true,
    seconds: true,
    timezone:'Europe/Berlin'
};


angular.module('myApp', ['ngRoute','siyfion.sfTypeahead'])
    .provider('Weather', function() {
        var apiKey = "";

        this.getUrl = function(type, ext) {
            return "http://api.wunderground.com/api/" +
                this.apiKey + "/" + type + "/q/" +
                ext + '.json';
        };

        this.setApiKey = function(key) {
            if (key) this.apiKey = key;
        };

        this.$get = function($q, $http) {
            var self = this;
            return {
                offlineDetection: function(city) {
                      console.log(city);
                },
                getWeatherForecast: function(city) {
                    var d = $q.defer();
                    $http({
                        method: 'GET',
                        url: self.getUrl("forecast", city),
                        cache: true
                    }).success(function(data) {
                            d.resolve(data.forecast.simpleforecast);
                        }).error(function(err) {
                            d.reject(err);
                        });
                    return d.promise;
                },
                getCityDetails: function(query) {
                    var d = $q.defer();
                    $http({
                        method: 'GET',
                        url: "http://autocomplete.wunderground.com/aq?query=" +
                            query
                    }).success(function(data) {
                            d.resolve(data.RESULTS);
                        }).error(function(err) {
                            d.reject(err);
                        });
                    return d.promise;
                }
            }
        }
    })
    .factory('OfflineStorage', function () {
        //We store the weather data on the localStorage so there is no need to capture every time the weather from the API
        var defaults = {
            forecast: false,
            time:+new Date(),
            location: 'autoip',
            farenheit: true,
            seconds: true,
            timezone:''
        };
        var service = {
            save: function() {
                console.log(service);
                chrome.storage.local.set({'iswe': angular.toJson( {forecast: service.forecast, ts:+new Date(), location: service.location, timezone:service.timezone ,farenheit:service.farenheit,seconds:service.seconds})});
            }
        }

        return service;
    })
    .factory('locale', function() {
        chrome.i18n.getAcceptLanguages(function (lang) { console.log(lang); });
    })
    .factory('UserService', function() {
        var defaults = {
            location: 'autoip',
            farenheit: true,
            seconds: true
        };

        var service = {

            user: {},
            save: function() {
                sessionStorage.presently =
                    angular.toJson(service.user);
            },
            restore: function() {
                service.user =
                    angular.fromJson(sessionStorage.presently) || defaults

                return service.user;
            }
        };
        service.restore();
        return service;
    })
    .config(function(WeatherProvider) {
        WeatherProvider.setApiKey(WU_API_KEY);
    })
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'templates/home.html',
                controller: 'MainCtrl'
            })
            .when('/settings', {
                templateUrl: 'templates/settings.html',
                controller: 'SettingsCtrl'
            })
            .when('/:!refresh', {
                tempplateUrl:'templates/home.html',
                controller: 'MainCtrl'
            })
            .otherwise({redirectTo: '/'});
    }])
    .controller('MainCtrl',
    function($scope, $timeout, Weather, UserService,OfflineStorage) {
        $scope.date = {};
        $scope.OfflineStorage = OfflineStorage;
        $scope.weather = {}
        $scope.locale = '';
        chrome.storage.local.get('iswe', function(value) {
            // The $apply is only necessary to execute the function inside Angular scope
            $scope.$apply(function() {
                $scope.load(value);
            });
        });
        //get the locales for displaying the date
        chrome.i18n.getAcceptLanguages(function (lang) {
            $scope.$apply(function() {
                $scope.locale = lang[0];
                updateTime();
            });
        });
        $scope.load = function (data) {
            var iswea = angular.fromJson(data.iswe);
            if(typeof(iswea) === 'undefined') {
                iswea = defaults;
            }
            var cooldown = 9000000;
            //cooldown = 10;
            if(typeof( iswea.forecast ) == 'undefined' || iswea.ts + cooldown <= +new Date() || iswea.forecast === false) {
                if( iswea.forecast === false ) {
                    $scope.OfflineStorage.timezone = defaults.timezone;
                    $scope.OfflineStorage.location = defaults.location;
                    $scope.OfflineStorage.farenheit = defaults.farenheit;
                    $scope.OfflineStorage.seconds = defaults.seconds;
                } else {
                    $scope.OfflineStorage.timezone = iswea.timezone;
                    $scope.OfflineStorage.location = iswea.location ;
                    $scope.OfflineStorage.farenheit = iswea.farenheit;
                    $scope.OfflineStorage.seconds = iswea.seconds;
                }
                var getDataString='';
                if($scope.OfflineStorage.location !== 'autoip') {
                    getDataString = 'zmw:' +$scope.OfflineStorage.location.zmw ;
                } else {
                    getDataString = $scope.OfflineStorage.location;
                }
                Weather.getWeatherForecast(getDataString)
                    .then(function(data) {
                        $scope.OfflineStorage.forecast = data;
                        $scope.weather.forecast = data;
                        $scope.OfflineStorage.save();
                        $scope.from = ' wunderground.com';
                    });
            } else {
                $scope.OfflineStorage.forecast =  iswea.forecast ;
                $scope.OfflineStorage.timezone = iswea.timezone;
                $scope.OfflineStorage.location = iswea.location;
                $scope.OfflineStorage.farenheit = iswea.farenheit;
                $scope.OfflineStorage.seconds = iswea.seconds;
                $scope.weather.forecast = $scope.OfflineStorage.forecast;
                $scope.from = ' cache';
            }
        };

        var updateTime = function() {

            var tmpDate =new Date();
            $scope.date.tz =new Date(
            new Date().toLocaleString("en-US", {timeZone: $scope.OfflineStorage.timezone}));

            $timeout(updateTime, 1000);
        };
        //$scope.imageHelper = ;

        $scope.user = OfflineStorage;
        //check the offline cache at first


    })
    .controller('SettingsCtrl',
    function($scope, $location, Weather, OfflineStorage) {
        $scope.OfflineStorage = OfflineStorage;
        chrome.storage.local.get('iswe', function(value) {
            // The $apply is only necessary to execute the function inside Angular scope
            $scope.$apply(function() {
                $scope.load(value);
            });
        });

        $scope.typeaheadConfig =
                {
                    valueKey: 'name',
                    remote: {
                        valueKey: 'name',
                        url:'http://autocomplete.wunderground.com/aq?query=%QUERY',
                        filter: function(parsedResponse){
                            ret = [];
                            parsedResponse.RESULTS.forEach(function(itme) {
                                ret.push(itme);
                            });
                            return ret;
                        }
                    }
                };
        $scope.load = function (data) {
            var iswea = angular.fromJson(data.iswe);
            console.log(typeof( iswea.forecast ));
            console.log(new Date(iswea.ts + 9000000));
            if(typeof( iswea.forecast ) == 'undefined' ) {
                        $scope.OfflineStorage.timezone = defaults.timezone;
                        $scope.OfflineStorage.location = defaults.location;
                        $scope.OfflineStorage.farenheit = defaults.farenheit;
                        $scope.OfflineStorage.seconds = defaults.seconds;
                        $scope.OfflineStorage.save();
            } else {
                $scope.OfflineStorage.forecast = iswea.forecast ;
                $scope.OfflineStorage.timezone = iswea.timezone;
                $scope.OfflineStorage.location = iswea.location;
                $scope.OfflineStorage.farenheit = iswea.farenheit;
                $scope.OfflineStorage.seconds = iswea.seconds;
                console.log($scope.OfflineStorage)
            }
        };
        $scope.save = function() {
            $scope.OfflineStorage.save();
            $location.path('/');
        }
        $scope.fetchCities = Weather.getCityDetails;
    })
    .directive('localimage', function() {
        /**
         * parse the image from weatherunderground.com to an localimage
         * to download other imagesets from weatherunderground you can use
         * my simple nodejs downloader from github:
         * https://github.com/KaySchneider/nimloadhelper
         */
        return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    // wait until after $apply
                    scope.variable = attrs.localimage;
                    var  fileName = scope.variable.split('/').pop();
                    var injectName = './img/' + fileName;
                    element[0].src = injectName;
                },
                replace:true
        }
    })
    .directive('valueOfModel', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                console.log(element, scope, attrs);
            }
        }
    })
    .directive('i18n', function () {
        /**
         * make use of the chrome.i18n API to localise the application
         * into some languages wich are defined in _locales folder
         */
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var key = element[0].innerHTML;
                var translated = chrome.i18n.getMessage(key);
                element[0].innerHTML = translated;
            },
            replace:true
        }
    })
    ;


