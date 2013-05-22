(function() {
  "use strict";
  
  var fractalClock = angular.module('fractalClock', []);

  fractalClock.directive('processing', function() {
    return {
      scope: true,
      link: function(scope, iElement, iAttrs) {
        scope.$sketch = new Processing(iElement[0], scope[iAttrs.processing]);
      }
    };
  });

  fractalClock.directive('integer', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$parsers.unshift(function(viewValue) {
          return parseInt(viewValue);
        });
      }
    };
  });

  fractalClock.directive('float', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$parsers.unshift(function(viewValue) {
          return parseFloat(viewValue);
        });
      }
    };
  });

  fractalClock.controller('FractalClockController', function($scope, $timeout) {
    $scope.clock = {
      width: 5.0,
      length: 40.0,
      repetitions: 10,
      connections: 10,
      color: {
        hue: 150,
        saturation: 255,
        lightness: 255,
        alpha: 165,
        shift: -5
      }
    };

    $scope.debug = [];

    $scope.sketch = function(sketch) {
      var date;

      date = new Date();

      sketch.setup = function() {
        sketch.size(400, 400);
        sketch.smooth();
        sketch.colorMode(sketch.HSB, 255);
        sketch.strokeCap(sketch.ROUND);
      };

      sketch.draw = function() {
        sketch.background(0);

        var currentDate = new Date();
        var time = currentDate.getTime();
        var s = sketch.map(time % 60000, 0, 60000, 0, sketch.TWO_PI) - sketch.HALF_PI;
        var m = sketch.map(time % 3600000, 0, 3600000, 0, sketch.TWO_PI) - sketch.HALF_PI;
        var h = sketch.map(time % 43200000, 0, 43200000, 0, sketch.TWO_PI) - sketch.HALF_PI;
 
        var lines = [
          [sketch.cos(h) * $scope.clock.length, sketch.sin(h) * $scope.clock.length],
          [sketch.cos(m) * $scope.clock.length, sketch.sin(m) * $scope.clock.length],
          [sketch.cos(s) * $scope.clock.length, sketch.sin(s) * $scope.clock.length]
        ];

        drawLines(lines, s, m, h);
      };

      var cycle = function(value, amount, max) {
        value += amount;
        if (value < 0) {
          value += max;
        } else if (value > max) {
          value %= max;
        }
        return value;
      };

      var stepDown = function(value, amount) {
        value -= amount;
        if (value < 0) {
          value = 0;
        }
        return value;
      };

      var drawLines = function(lines, s, m, h) {
        var start, hue, saturation, lightness, alpha, alphaStep, width, widthStep;

        // Color
        hue = $scope.clock.color.hue;
        saturation = $scope.clock.color.saturation;
        lightness = $scope.clock.color.lightness;
        alpha = $scope.clock.color.alpha;
        
        alphaStep = parseFloat($scope.clock.connections / 255.0);
        sketch.translate(200.0, 200.0); // Set origin to center of sketch

        for (var r = $scope.clock.repetitions - 1; r >= 0; r--) {
          start = [0.0, 0.0]; // Start from center
          alpha = $scope.clock.color.alpha;
          hue = $scope.clock.color.hue;
          width = $scope.clock.width * ($scope.clock.repetitions - r) / $scope.clock.repetitions;
          widthStep = width / ($scope.clock.connections * 4);

          // Make main line slightly thicker
          if (r == 0) {
            width *= 1.25;
          }

          for (var c = $scope.clock.connections - 1; c >= 0; c--) {
            for (var i = lines.length - 1; i >= 0; i--) {
              var end = [
                lines[i][0] + start[0],
                lines[i][1] + start[1]
              ];

              sketch.strokeWeight(width);
              sketch.stroke(hue, saturation, lightness, alpha);
              sketch.line(start[0], start[1], end[0], end[1]);
              start = end;

              // Step values
              hue = cycle(hue, $scope.clock.color.shift, 255);
              alpha = stepDown(alpha, alphaStep);
              width = stepDown(width, widthStep);
            }
          }

          sketch.rotate(m + sketch.HALF_PI);
        }
      };
    };
  });
}());
