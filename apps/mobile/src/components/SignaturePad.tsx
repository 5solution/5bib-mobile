/**
 * apps/mobile/src/components/SignaturePad.tsx
 *
 * Finger-drawn e-signature pad — web parity with check-in read-html.tsx
 * (react-canvas-draw, brush #2563EB radius 2). Implemented as an inline-HTML
 * <canvas> inside react-native-webview so we need no extra native dependency.
 *
 * Protocol: after every completed stroke the page posts
 *   { type: 'signature', dataUrl: 'data:image/png;base64,…' }
 * and the trash button posts { type: 'clear' }. Parent keeps the latest
 * dataUrl; null = empty signature (web blocks submit on empty too).
 */
import React, { useMemo } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { tokens } from '../theme/tokens';

export interface SignaturePadProps {
  /** Latest signature PNG as data-URL, or null when empty/cleared. */
  onChange: (dataUrl: string | null) => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

const PAD_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#fff;}
  #wrap{position:relative;width:100%;height:100%;}
  canvas{display:block;width:100%;height:100%;touch-action:none;}
  #clear{position:absolute;right:8px;bottom:8px;width:36px;height:36px;border:none;
    border-radius:8px;background:#E4E7EC;color:#475467;font-size:16px;line-height:36px;
    text-align:center;padding:0;}
</style></head><body>
<div id="wrap">
  <canvas id="pad"></canvas>
  <button id="clear" aria-label="clear">&#x2715;</button>
</div>
<script>
(function(){
  var canvas=document.getElementById('pad');
  var ctx=canvas.getContext('2d');
  var drawing=false, hasInk=false, last=null;
  function resize(){
    var r=window.devicePixelRatio||1;
    var w=canvas.clientWidth, h=canvas.clientHeight;
    var snapshot=hasInk?canvas.toDataURL():null;
    canvas.width=w*r; canvas.height=h*r;
    ctx.scale(r,r);
    ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle='#2563EB';
    if(snapshot){var img=new Image();img.onload=function(){ctx.drawImage(img,0,0,w,h);};img.src=snapshot;}
  }
  resize();
  window.addEventListener('resize',resize);
  function pos(e){
    var t=(e.touches&&e.touches[0])||e;
    var rect=canvas.getBoundingClientRect();
    return {x:t.clientX-rect.left,y:t.clientY-rect.top};
  }
  function start(e){e.preventDefault();drawing=true;last=pos(e);}
  function move(e){
    if(!drawing)return;
    e.preventDefault();
    var p=pos(e);
    ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();
    last=p; hasInk=true;
  }
  function end(e){
    if(!drawing)return;
    drawing=false;
    if(hasInk){
      window.ReactNativeWebView.postMessage(JSON.stringify(
        {type:'signature',dataUrl:canvas.toDataURL('image/png')}));
    }
  }
  canvas.addEventListener('touchstart',start,{passive:false});
  canvas.addEventListener('touchmove',move,{passive:false});
  canvas.addEventListener('touchend',end);
  canvas.addEventListener('mousedown',start);
  canvas.addEventListener('mousemove',move);
  canvas.addEventListener('mouseup',end);
  document.getElementById('clear').addEventListener('click',function(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    hasInk=false;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'clear'}));
  });
})();
</script></body></html>`;

export function SignaturePad({ onChange, height = 220, style }: SignaturePadProps) {
  const source = useMemo(() => ({ html: PAD_HTML }), []);
  return (
    <View
      style={[
        {
          height,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: tokens.color.neutral200,
          overflow: 'hidden',
          backgroundColor: '#fff',
        },
        style,
      ]}
    >
      <WebView
        source={source}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled={false}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data) as {
              type: string;
              dataUrl?: string;
            };
            if (msg.type === 'signature' && msg.dataUrl) onChange(msg.dataUrl);
            if (msg.type === 'clear') onChange(null);
          } catch {
            // non-JSON message — ignore
          }
        }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
