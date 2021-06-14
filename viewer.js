const fetch = require("node-fetch");
const DOMParser = require("xmldom").DOMParser;
const WebSocket = require("ws");

fetch("https://live.nicovideo.jp/watch/co2797258",{
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
    const json = JSON.parse(data);
    console.log(json);

    if (json.data) {
    //  console.log("aaa "+json.data)
      if (json.data.messageServer) {
        console.log(json);
        const wsUrl = json.data.messageServer.uri;
        const threadId = json.data.threadId;
        const commentsocket = new WebSocket(wsUrl, "niconama", {
          "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
          "Sec-WebSocket-Protocol": "msg.nicovide.jp#json",
        });

        commentsocket.on("open",function open(){
          commentsocket.send(JSON.stringify({
              "thread": {
                "thread": threadId,
                "version": "20061206",
                "user_id": "guest",
                "res_from": -150,
                "with_global": 1,
                "scores": 1,
                "nicoru": 0
              }
          }));
        });

        commentsocket.on("message",function incoming(chat) {
          console.log(chat);
        });

        setInterval(() => {
          commentsocket.ping();
          console.log("ping!!");
        }, 60000);
      }
    }
  });

});
