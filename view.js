'use strict'

module.exports = createViewController

var createTurntable = require('turntable-camera-controller')
var createOrbit     = require('orbit-camera-controller')
var createMatrix    = require('matrix-camera-controller')

var SCRATCH = new Array(16)

function ViewController(controllers, mode) {
  this._controllerNames = Object.keys(controllers)
  this._controllerList = this._controllerNames.map(function(n) {
    return controllers[n]
  })
  this._mode   = mode
  this._active = controllers[mode]
  if(!this._active) {
    this._mode   = 'turntable'
    this._active = controllers.turntable
  }
}

var proto = ViewController.prototype

var COMMON_METHODS = [
  ['flush', 1],
  ['idle', 1],
  ['lookAt', 4],
  ['rotate', 4],
  ['pan', 4],
  ['translate', 4],
  ['setMatrix', 2],
  ['setDistance', 2]
]

var ACCESS_METHODS = [
  ['getUp', 3],
  ['getEye', 3],
  ['getCenter', 3],
  ['getMatrix', 16]
]

COMMON_METHODS.forEach(function(method) {
  var name = method[0]
  var argNames = []
  for(var i=0; i<method[1]; ++i) {
    argNames.push('a'+i)
  }
  var code = 'var cc=this._controllerList;for(var i=0;i<cc.length;++i){cc[i].'+method[0]+'('+argNames.join()+')}'
  proto[name] = Function.apply(null, argNames.concat(code))
})

ACCESS_METHODS.forEach(function(method) {
  var name = method[0]
  var args = method[1]
  var code = 'return this._active.' + name + '(t,out||new Array(' + args + '))'  
  proto[name] = new Function('t', 'out', code)
})

proto.getDistance = function(t) {
  return this._active.getDistance(t)
}
proto.getDistanceLimits = function(out) {
  return this._active.getDistanceLimits(out)
}
proto.setDistanceLimits = function(lo, hi) {
  return this._active.setDistanceLimits(lo, hi)
}

proto.setMode = function(mode) {
  if(mode === this._mode) {
    return
  }
  var idx = this._controllerNames.indexOf(mode)
  if(idx < 0) {
    return
  }
  var prev  = this._active
  var next  = this._controllerList[idx]
  var lastT = Math.max(prev.lastT(), next.lastT())

  if(this._mode !== 'matrix') {
    next.lookAt(lastT,
      prev.getCenter(lastT),
      prev.getEye(lastT),
      prev.getUp(lastT))
  }

  prev.getMatrix(lastT, SCRATCH)
  next.setMatrix(lastT, SCRATCH)
  
  this._active = next
  this._mode   = mode
}

proto.getMode = function() {
  return this._mode
}

function createViewController(options) {
  options = options || {}
  return new ViewController({
    turntable: createTurntable(options),
    orbit: createOrbit(options),
    matrix: createMatrix(options),
  }, options || 'turntable')
}