var Notification, assert, bugsnag, express, request, sinon;

express = require('express');

sinon = require('sinon');

assert = require('assert');

bugsnag = require("../");

request = require('request');

Notification = require("../lib/notification");

bugsnag.register('00112233445566778899aabbccddeeff');

describe("express middleware", function() {
  var deliverStub;
  deliverStub = null;
  beforeEach(function() {
    return deliverStub = sinon.stub(Notification.prototype, "deliver");
  });
  afterEach(function() {
    return Notification.prototype.deliver.restore();
  });
  return it("should automatically collect request data", function(next) {
    var app, port;
    app = express();
    app.use(app.router);
    app.use(bugsnag.requestHandler);
    app.use(bugsnag.errorHandler);
    app.get("/ping", function(req, res, next) {
      throw new RangeError();
      return res.sned("pong");
    });
    port = app.listen().address().port;
    return request.get("http://localhost:" + port + "/ping", function(err, res, body) {
      assert(deliverStub.calledOnce);
      var event = deliverStub.firstCall.thisValue.events[0];
      var req = event.metaData.request;
      assert.equal(req.url, "http://localhost:" + port + "/ping");
      assert.equal(req.path, "/ping");
      assert.equal(req.method, "GET");
      assert.equal(req.headers.host, "localhost:" + port);
      assert.equal(req.httpVersion, "1.1");
      assert.notEqual(["127.0.0.1", "::ffff:127.0.0.1"].indexOf(req.connection.remoteAddress), -1);
      assert.equal(req.connection.localPort, port);
      assert.notEqual(["IPv4", "IPv6"].indexOf(req.connection.IPVersion), -1);
      // check the event got the correct handled/unhandled properties set
      assert.equal(event.unhandled, true);
      assert.equal(event.severity, "error");
      assert.deepEqual(event.severityReason, { type: "middleware_handler", name: "express/connect" });
      return next();
    });
  });
});
