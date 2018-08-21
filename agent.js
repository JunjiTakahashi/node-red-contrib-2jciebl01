require('date-utils');
//var awsIot = require('aws-iot-device-sdk');
//var config = require('./config.json');
// 設定ファイルを使いまわすためClientIDにサフィックスを付与する
//config.clientId = config.clientId + "-blend-agent";
//var device = awsIot.device(config);

/*
device.on('connect', function () {
  console.log('connect');
});
device.on('close', function () {
  console.log('close');
});
device.on('reconnect', function () {
  console.log('reconnect');
});
device.on('offline', function () {
  console.log('offline');
});
device.on('error', function (error) {
  console.log('error', error);
});
device.on('message', function (topic, payload) {
  console.log('message', topic, payload.toString());
});
*/

var noble = require('noble');

noble.on('stateChange', function (state) {
  if (state === 'poweredOn') {
    // 重複もすべて取る
    noble.startScanning([], true);
  } else {
    noble.stopScanning();
  }
});

// Publish data.
var envCashe = [];
// 1分毎に処理する
setInterval(function () {
  var now = new Date();
  console.log(now.toISOString());
  // Env
  // uminoie2018 update
  try {
    // uminoie2018 update
    var envWork = envCashe;
    envCashe = [];
    for(key in envWork) {
      var envLen = envWork[key].length;
      if (envLen > 0) {
        var envLast = envWork[key][envLen - 1];
        console.info("publish env: " + JSON.stringify(envLast));
        //device.publish('env', JSON.stringify(envLast));
      }
    }
    // uminoie2018 update
  } catch (err) {
    //console.error(err);
  }
}, 60000);

noble.on('discover', function (peripheral) {
  if (peripheral.advertisement && peripheral.advertisement.manufacturerData) {
    var data = peripheral.advertisement.manufacturerData.toString("hex");
    var buffer = peripheral.advertisement.manufacturerData;
    var mac = peripheral.id;
    mac = mac.match(/[0-9a-z]{2}/g).join(":");
    var now = new Date();
    //console.log(mac + "," + rssi + "," + data + ",-," + now.toISOString());

    // Company ID = OMRON Env センサー
    // SCAN_RSP PDU Payload (37 octets)
    // AD 2 Company ID 5d02
    if (data.startsWith("d502")) {
      if (buffer.length < 22) {
        console.log(mac + " is not configure OMRON-Env. Expected AD 2 length 22, actual " + buffer.length);
      } else {
        // console.log("OMRON-Env," + mac + "," + rssi + "," + data + ",-," + now.toISOString());
        var envData;
        var isApTarget;
        try {
          var dataOffset = -5;
          envData = {
            APID: 'sample'/*config.apId*/,
            ID: mac,
            isApTarget: isApTarget,
            Temperature: buffer.readInt16LE(dataOffset + 8) / 100,  // 単位：0.01 degC
            Humidity: buffer.readUInt16LE(dataOffset + 10) / 100,   // 単位：0.01 %RH
            ambient_light: buffer.readUInt16LE(dataOffset + 12),    // 単位：1 lx
            uv_index: buffer.readUInt16LE(dataOffset + 14) / 100,   // 単位：0.01
            pressure: buffer.readUInt16LE(dataOffset + 16) / 10,    // 単位：0.1 hPa
            Noise: buffer.readUInt16LE(dataOffset + 18) / 100,      // 単位：0.01 dB
            acceleration_x: buffer.readUInt16LE(dataOffset + 20),
            acceleration_y: buffer.readUInt16LE(dataOffset + 22),
            acceleration_z: buffer.readUInt16LE(dataOffset + 24),
            battery_voltage: (buffer.readUInt8(dataOffset + 26) + 100) * 10, // ((取得値 + 100) x 10) mV
            timastamp: now.toISOString()
          };
          isApTarget = mac == config.envMac;
        } catch (err) {
          // 未設定の環境センサーからのパケットのパーシングには失敗する
          //console.log(err);
        }

        // uminoie2018 update
        if (envCashe[peripheral.id] == undefined) {
          envCashe[peripheral.id] = [];
        }
        envCashe[peripheral.id].push(envData);
        // uminoie2018 update
      }
    }
  }
});
