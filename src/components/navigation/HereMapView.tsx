import { memo, useRef, useEffect, useMemo, useCallback, useState } from "react"
import { View, StyleSheet } from "react-native"
import { WebView } from "react-native-webview"
import type { FinancialLocation } from "@/types"
import type { RouteLeg } from "@/services/places"
import { colors } from "@/theme"

type LatLng = { latitude: number; longitude: number }

type HereMapViewProps = {
  destination: FinancialLocation
  userLocation: LatLng | null
  route: RouteLeg[] | null
  isActive: boolean
  heading: number | null
}

function generateMapHtml(
  destLat: number,
  destLng: number,
  destName: string,
  destType: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
*{margin:0;padding:0}html,body,#map{width:100%;height:100%;overflow:hidden}
.leaflet-control-attribution{display:none!important}
.dest-marker,.user-marker{background:transparent;border:none}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
var mapReady=false,queue=[],map,destMarker,userMarker,routePolyline;
var userAnim={from:null,to:null,start:0,dur:1000,raf:null};

function post(t,m){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:t,message:m}))}

function createDestIcon(type){
  var i=ICON_MAP[type]||ICON_MAP['Financial Service Provider'];
  return L.divIcon({
    html:'<div style="width:36px;height:36px;border-radius:50%;background:'+i.color+';border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,.3)">'+i.letter+'</div>',
    className:'dest-marker',iconSize:[36,36],iconAnchor:[18,18]
  })
}

var ICON_MAP={ATM:{color:'#43A047',letter:'A'},Bank:{color:'#1E88E5',letter:'B'},'Financial Service Provider':{color:'#9C27B0',letter:'$'}};

function createUserIcon(){
  return L.divIcon({
    html:'<div style="width:28px;height:28px;position:relative">'
      +'<div style="position:absolute;inset:0;border-radius:50%;border:3px solid #2196F3;background:rgba(33,150,243,.2);box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>'
      +'<div id="user-arrow" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(0deg);transform-origin:center center;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:11px solid #2196F3"></div>'
      +'</div>',
    className:'user-marker',iconSize:[28,28],iconAnchor:[14,14]
  })
}

function animateUser(){
  var now=performance.now();
  var t=Math.min(1,(now-userAnim.start)/userAnim.dur);
  var e=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  var lat=userAnim.from.lat+(userAnim.to.lat-userAnim.from.lat)*e;
  var lng=userAnim.from.lng+(userAnim.to.lng-userAnim.from.lng)*e;
  if(userMarker)userMarker.setLatLng([lat,lng]);
  if(t<1){userAnim.raf=requestAnimationFrame(animateUser)}else{userAnim.raf=null}
}

function initMap(){
  try{
    map=L.map('map',{center:[${destLat},${destLng}],zoom:14,zoomControl:false,attributionControl:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    window.addEventListener('resize',function(){map.invalidateSize()});
    mapReady=true;
    post('mapReady');
    window.handleCommand({type:'setDestination',lat:${destLat},lng:${destLng},name:${JSON.stringify(destName)},iconType:${JSON.stringify(destType)}});
    for(var i=0;i<queue.length;i++){window.handleCommand(queue[i])}
    queue=[];
  }catch(e){post('mapError',e.message||'Map init failed')}
}

window.handleCommand=function(cmd){
  if(!mapReady){queue.push(cmd);return}
  try{
    switch(cmd.type){
    case'setDestination':{
      if(destMarker)map.removeLayer(destMarker);
      destMarker=L.marker([cmd.lat,cmd.lng],{icon:createDestIcon(cmd.iconType)}).addTo(map);
      break}
    case'updateUserPosition':{
      var tgt=[cmd.lat,cmd.lng];
      if(!userMarker){
        userMarker=L.marker(tgt,{icon:createUserIcon()}).addTo(map);
        userAnim.to={lat:cmd.lat,lng:cmd.lng};
        break
      }
      var cur=userMarker.getLatLng();
      if(userAnim.raf)cancelAnimationFrame(userAnim.raf);
      userAnim.from={lat:cur.lat,lng:cur.lng};
      userAnim.to={lat:cmd.lat,lng:cmd.lng};
      userAnim.start=performance.now();
      userAnim.dur=1000;
      userAnim.raf=requestAnimationFrame(animateUser);
      break}
    case'clearUserLocation':{
      if(userMarker){map.removeLayer(userMarker);userMarker=null}
      if(userAnim.raf){cancelAnimationFrame(userAnim.raf);userAnim.raf=null}
      break}
    case'setUserHeading':{
      if(!userMarker)break;
      var el=userMarker.getElement();
      if(!el)break;
      var arrow=el.querySelector('#user-arrow');
      if(arrow)arrow.style.transform='translate(-50%,-50%) rotate('+cmd.heading+'deg)';
      break}
    case'setRoute':{
      if(routePolyline)map.removeLayer(routePolyline);
      if(!cmd.coords||cmd.coords.length<2)break;
      var latlngs=cmd.coords.map(function(c){return[c.lat,c.lng]});
      routePolyline=L.polyline(latlngs,{color:'${colors.primary[600]}',weight:6,lineCap:'round',lineJoin:'round'}).addTo(map);
      break}
    case'clearRoute':{
      if(routePolyline){map.removeLayer(routePolyline);routePolyline=null}
      break}
    case'fitToRoute':{
      if(!cmd.coords||cmd.coords.length===0)break;
      var b=L.latLngBounds([]);
      for(var k=0;k<cmd.coords.length;k++){b.extend([cmd.coords[k].lat,cmd.coords[k].lng])}
      if(b.isValid())map.fitBounds(b,{padding:[60,60],maxZoom:16,animate:true,duration:0.5});
      break}
    case'fitBounds':{
      if(!cmd.coords||cmd.coords.length===0)break;
      var bb=L.latLngBounds([]);
      for(var j=0;j<cmd.coords.length;j++){bb.extend([cmd.coords[j].lat,cmd.coords[j].lng])}
      if(!bb.isValid()){map.setView([cmd.coords[0].lat,cmd.coords[0].lng],14);break}
      map.fitBounds(bb,{padding:[60,60],maxZoom:16,animate:true,duration:0.5});
      break}
    }}catch(e){post('mapError','Cmd: '+(e.message||e))}
  };
  if(typeof L!=='undefined'){initMap()}else{post('mapError','Leaflet failed to load')}
})();
</script>
</body>
</html>`
}

const MAP_HEIGHT = 320

function HereMapViewImpl({
  destination,
  userLocation,
  route,
  isActive,
  heading,
}: HereMapViewProps) {
  const webViewRef = useRef<WebView>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const pendingCmdsRef = useRef<object[]>([])
  const lastHeadingRef = useRef<number | null>(null)
  const didInitialFitRef = useRef(false)
  const didPreNavFitRef = useRef(false)

  const mapHtml = useMemo(
    () =>
      generateMapHtml(
        destination.latitude,
        destination.longitude,
        destination.name,
        destination.type
      ),
    [destination.latitude, destination.longitude, destination.name, destination.type]
  )

  const sendCommand = useCallback((cmd: object) => {
    if (!webViewRef.current) {
      pendingCmdsRef.current.push(cmd)
      return
    }
    try {
      webViewRef.current.injectJavaScript(
        `window.handleCommand(${JSON.stringify(cmd)});true;`
      )
    } catch (err) {
      console.warn("Map command failed:", err)
    }
  }, [])

  useEffect(() => {
    if (!isMapReady) return
    const pending = pendingCmdsRef.current
    pendingCmdsRef.current = []
    for (const cmd of pending) {
      sendCommand(cmd)
    }
  }, [isMapReady, sendCommand])

  useEffect(() => {
    sendCommand({
      type: "setDestination",
      lat: destination.latitude,
      lng: destination.longitude,
      name: destination.name,
      iconType: destination.type,
    })
  }, [destination.latitude, destination.longitude, destination.name, destination.type, sendCommand])

  useEffect(() => {
    if (userLocation) {
      sendCommand({
        type: "updateUserPosition",
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      })
    } else {
      sendCommand({ type: "clearUserLocation" })
    }
  }, [userLocation, sendCommand])

  useEffect(() => {
    if (route && route.length > 0) {
      const coords = route.flatMap((leg) =>
        leg.coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }))
      )
      sendCommand({ type: "setRoute", coords })
    } else {
      sendCommand({ type: "clearRoute" })
    }
  }, [route, sendCommand])

  useEffect(() => {
    if (!isMapReady) return
    if (isActive) {
      if (route && route.length > 0 && !didInitialFitRef.current) {
        didInitialFitRef.current = true
        const coords: { lat: number; lng: number }[] = [
          { lat: destination.latitude, lng: destination.longitude },
        ]
        for (const leg of route) {
          for (const c of leg.coordinates) {
            coords.push({ lat: c.latitude, lng: c.longitude })
          }
        }
        sendCommand({ type: "fitToRoute", coords })
      }
    } else if (!didPreNavFitRef.current && userLocation) {
      didPreNavFitRef.current = true
      sendCommand({
        type: "fitBounds",
        coords: [
          { lat: userLocation.latitude, lng: userLocation.longitude },
          { lat: destination.latitude, lng: destination.longitude },
        ],
      })
    }
  }, [isMapReady, isActive, route, userLocation, destination.latitude, destination.longitude, sendCommand])

  useEffect(() => {
    if (!isActive) {
      didInitialFitRef.current = false
      didPreNavFitRef.current = false
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive || heading === null) return
    if (lastHeadingRef.current === heading) return
    lastHeadingRef.current = heading
    sendCommand({ type: "setUserHeading", heading })
  }, [isActive, heading, sendCommand])

  return (
    <View
      style={styles.container}
      accessibilityLabel="Map showing destination and navigation route"
    >
      <WebView
        ref={webViewRef}
        style={StyleSheet.absoluteFill}
        source={{ html: mapHtml }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data)
            if (data.type === "mapReady") {
              setIsMapReady(true)
            } else if (data.type === "mapError") {
              console.warn("Leaflet Map error:", data.message)
            }
          } catch (err) {
            console.warn("WebView message parse error:", err)
          }
        }}
        onError={() => console.warn("WebView failed to load")}
      />
    </View>
  )
}

export const HereMapView = memo(HereMapViewImpl)

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    width: "100%",
    backgroundColor: colors.neutral[100],
  },
})