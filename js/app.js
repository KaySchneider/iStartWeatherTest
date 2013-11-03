const PLACEHOLDER_IMAGE = "loading.gif";
const WU_API_KEY = "YOUR_API_KEY";//api key from weatherunderground.com


angular.module('myApp', ['ngRoute'])
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
            time:+new Date()
        };
        var service = {
            forecast: {},
            save: function() {
                chrome.storage.local.set({'iswe': angular.toJson(service.forecast)});
            }

        }

        return service;
    })
    .factory('UserService', function() {
        var defaults = {
            location: 'autoip',
            farenheit: true
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
        WeatherProvider.setApiKey('');
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
    .directive('autoFill', function($timeout, Weather) {
        return {
            restrict: 'EA',
            scope: {
                autoFill: '&',
                ngModel: '=',
                timezone: '='
            },
            compile: function(tEle, tAttrs) {
                var tplEl = angular.element('<div class="typeahead">' +
                    '<input type="text" autocomplete="off" />' +
                    '<ul id="autolist" ng-show="reslist">' +
                    '<li ng-repeat="res in reslist" ' +
                    '>{{res.name}}</li>' +
                    '</ul>' +
                    '</div>');
                var input = tplEl.find('input');
                input.attr('type', tAttrs.type);
                input.attr('ng-model', tAttrs.ngModel);
                input.attr('timezone', tAttrs.timezone);
                tEle.replaceWith(tplEl);
                return function(scope, ele, attrs, ctrl) {
                    var minKeyCount = attrs.minKeyCount || 3,
                        timer;

                    ele.bind('keyup', function(e) {
                        val = ele.val();
                        if (val.length < minKeyCount) {
                            if (timer) $timeout.cancel(timer);
                            scope.reslist = null;
                            return;
                        } else {
                            if (timer) $timeout.cancel(timer);
                            timer = $timeout(function() {
                                scope.autoFill()(val)
                                    .then(function(data) {
                                        if (data && data.length > 0) {
                                            scope.reslist = data;
                                            scope.ngModel = "zmw:" + data[0].zmw;
                                            scope.timezone = data[0].tz;
                                        }
                                    });
                            }, 300);
                        }
                    });

                    // Hide the reslist on blur
                    input.bind('blur', function(e) {
                        scope.reslist = null;
                        scope.$digest();
                    });
                }
            }
        }
    })
    .controller('MainCtrl',
    function($scope, $timeout, Weather, UserService,OfflineStorage) {
        $scope.date = {};
        $scope.OfflineStorage = OfflineStorage;
        $scope.weather = {}
        chrome.storage.local.get('iswe', function(value) {
            // The $apply is only necessary to execute the function inside Angular scope
            console.log(value);
            $scope.$apply(function() {
                $scope.load(value);
            });
        });
        $scope.load = function (data) {
            if(data.iswe.length === undefined) {
                Weather.getWeatherForecast($scope.user.location)
                    .then(function(data) {
                        $scope.OfflineStorage.forecast = data;
                        $scope.OfflineStorage.save();
                        $scope.weather.forecast = data;
                        $scope.from = 'weatherunderground.com';
                    });
            } else {
                $scope.OfflineStorage.forecast = angular.fromJson(data.iswe);
                $scope.weather.forecast = $scope.OfflineStorage.forecast;
                $scope.from = 'cache';
                console.log(data.iswe);
            }
        };

        var updateTime = function() {
            $scope.date.tz = new Date(new Date()
                .toLocaleString("en-US", {timeZone: $scope.user.timezone}));
            $timeout(updateTime, 1000);
        };
        //$scope.imageHelper = ;

        $scope.user = UserService.user;
        //check the offline cache at first

        updateTime();
    })
    .controller('SettingsCtrl',
    function($scope, $location, Weather, UserService) {
        $scope.user = UserService.user;

        $scope.save = function() {
            UserService.save();
            $location.path('/');
        }
        $scope.fetchCities = Weather.getCityDetails;
    })
    .directive('localimage', function() {
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
    ;


