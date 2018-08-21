require('date-utils');
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
        console.log(
          'Macアドレス: ' + envLast.ID + '\n' +
          '電波強度: ' + envLast.rssi + '\n' +
          '温度: ' + envLast.Temperature + '\n' +
          '湿度: ' + envLast.Humidity + '\n' +
          '照度: ' + envLast.ambient_light + '\n' +
          'UV指数: ' + envLast.uv_index + '\n' +
          '気圧: ' + envLast.pressure + '\n' +
          '音量: ' + envLast.Noise + '\n' +
          'バッテリー: ' + envLast.battery_voltage + '\n');
      }
    }
    // uminoie2018 update
  } catch (err) {
    //console.error(err);
  }
}, 60000);

noble.on('discover', function (peripheral) {
  if (peripheral.advertisement && peripheral.advertisement.manufacturerData) {
    var manufacturerData = peripheral.advertisement.manufacturerData;
    var type = manufacturerData.toString("hex");
    var buffer = manufacturerData;
    var uuid = peripheral.id;
    var macAddress = peripheral.id.match(/[0-9a-z]{2}/g).join(":");
    var rssi = peripheral.rssi;
    var now = new Date();
    
    // Company ID = OMRON Env センサー
    // SCAN_RSP PDU Payload (37 octets)
    // AD 2 Company ID 5d02
    if (type.startsWith("d502")) {
      if (buffer.length < 22) {
        console.log(mac + " is not configure OMRON-Env. Expected AD 2 length 22, actual " + buffer.length);
      } else {
        // console.log("OMRON-Env," + mac + "," + rssi + "," + data + ",-," + now.toISOString());
        var envData;
        try {
          var dataOffset = -5;
          envData = {
              UUID: uuid,
              ID: macAddress,
              rssi: rssi,
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
