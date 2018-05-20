"use strict";
/*!
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/*
 * modified 10/06/2011 (david):
 * - make compatabile for browser
 * - added augment function
 * - added aliases publish, subscribe, unsubscribe  
 */
var EventEmitter = function () {};

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//设置最大监听数的方法， 如果没有事件对象，就创建一个，并把事件对象的最大监听数设置为参数的值
EventEmitter.prototype.setMaxListeners = function (n) {
  if (!this._events)
    this._events = {};
  this._events.maxListeners = n;
};
// 定义方法判定是否为数组的
Array.isArray = Array.isArray || function (array) {
  return array.sort && array.length && array.slice;
};
//发射某个种类的事件
EventEmitter.prototype.emit = function (type) {
  // If there is no 'error' event listener then throw.
  //发射如果是error那么就发射错误
  if (type === "error") {
    if (!this._events || !this._events.error || (Array.isArray(this._events.error) && !this._events.error.length)) {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }
  //如果没有事件了就什么都不做返回false
  if (!this._events)
    return false;
  //返回事件对象里的 传入 的type的 数据 命名为 handler
  var handler = this._events[type];
  //如果没有 handler 即 事件对象里没有有关type的数据就 什么不做返回false
  if (!handler)
    return false;
  //如果 handler 即 事件对象返回的数据是 func 那么就运行handler 
  if (typeof handler == "function") {
    switch (arguments.length) {
      // fast cases
      //指传入了事件类型就 直接运行 handler 并将EventEmitter的上下文作为参数传入
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
        // slower
      //传入参数超过3个, 的用法，反正就是把参数全部让handler 调用
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } 
  //否则handler 即 事件对象传回的是数组就 将handlers 依次运行（额外参数都传入， Event的上下文传入）
  else if (Array.isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } 
  //handler 即 事件对象传回的数据就是无法识别的就什么也不做
  else {
    return false;
  }
};
// 创建 emit 发射的别名 publish出版
EventEmitter.prototype.publish = EventEmitter.prototype.emit;

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
//增加 EventEmitter的 监听方法 (type:string, listener:func)的方式传入返回EventEmitter的上下文,this.的事件对象上type的储存不是单个就是数组,
// 对最大监听做了判定
EventEmitter.prototype.addListener = function (type, listener) {
  //如果 listener不是 函数就报错
  if ("function" !== typeof listener) {
    throw new Error("addListener only takes instances of Function");
  }
  //如果没有事件对象 那么 addListener也可以初始化 防止报错
  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit("newListener", type, listener);
  //将 listener 打入事件对象中， 标记名字为type,单个就是单个，超过就用数组的形式储存
  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (Array.isArray(this._events[type])) {

    // If we've already got an array, just append.
    this._events[type].push(listener);

    // Check for listener leak
    //检查监听数是否大于最大监听数，默认为10
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = 10;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error("(node) warning: possible EventEmitter memory " +
          "leak detected. %d listeners added. " +
          "Use emitter.setMaxListeners() to increase limit.",
          this._events[type].length);
        console.trace();
      }
    }
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};
//给 EventEmitter的 addListener 添加 subscribe 和 on 别名
EventEmitter.prototype.on = EventEmitter.prototype.subscribe = EventEmitter.prototype.addListener;
//添加once事件添加监听 (type:string,listener:func)监听只会运行一次
EventEmitter.prototype.once = function (type, listener) {
  if ("function" !== typeof listener) {
    throw new Error(".once only takes instances of Function");
  }

  var self = this;

  function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  };

  g.listener = listener;
  self.on(type, g);

  return this;
};

EventEmitter.prototype.removeListener = function (type, listener) {
  if ("function" !== typeof listener) {
    throw new Error("removeListener only takes instances of Function");
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type])
    return this;

  var list = this._events[type];

  if (Array.isArray(list)) {
    var position = -1;
    for (var i = 0, length = list.length; i < length; i++) {
      if (list[i] === listener ||
        (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;
    list.splice(position, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (list === listener ||
    (list.listener && list.listener === listener)) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.unsubscribe = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners = function (type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type])
    this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function (type) {
  if (!this._events)
    this._events = {};
  if (!this._events[type])
    this._events[type] = [];
  if (!Array.isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

/**
 * Augment an object with the EventEmitter mixin
 * 
 * @param {object} obj The object to be augmented
 */
EventEmitter.mixin = function (obj) {
  for (var method in EventEmitter.prototype) {
    if (!obj.prototype[method]) {
      obj.prototype[method] = EventEmitter.prototype[method];
    }
  }
};
