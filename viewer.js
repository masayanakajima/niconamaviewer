const fetch = require("node-fetch");
const DOMParser = require("xmldom").DOMParser;
const WebSocket = require("ws");

fetch("https://live.nicovideo.jp/watch/co1445646",{
  method:"GET",
})
.then(res =>
  res.text()
)
.then( res => {
  //console.log(res)
  let parser = new DOMParser();
  const doc = parser.parseFromString(res, "text/html");

  //ページに埋め込まれた放送情報を取得する
  const embeddedData = JSON.parse(doc.getElementById("embedded-data").getAttribute("data-props"));

  //放送情報を取得する
  const broadcastId = embeddedData.program.broadcastId || embeddedData.program.reliveProgramId;
  const audienceToken = embeddedData.player.audienceToken;
  const frontendId = embeddedData.site.frontendId;

  //websocketクライアント
  let client = new WebSocket(`wss://a.live2.nicovideo.jp/unama/wsapi/v2/watch/${broadcastId}?audience_token=${audienceToken}&frontend_id=${frontendId}`,{
    headers:{"User-Agent":"firefox"}
  });

  client.on("open",function open() {
    client.send(JSON.stringify({
      "type": "startWatching",
      "data": {
        "stream": { "quality": "high", "protocol": "hls", "latency": "low", "chasePlay": false },
        "room": { "protocol": "webSocket", "commentable": true },
        "reconnect": false
      },
    }));
  });
  client.on("message",function incoming(data) {
    console.log(data);
  });

});
