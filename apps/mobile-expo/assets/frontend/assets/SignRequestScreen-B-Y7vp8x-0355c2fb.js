import{aY as a,cQ as A,cC as N,cP as k,aV as r,cN as O,dm as E,eU as b,eV as C,ee as z,ao as I,eY as P}from"./index-ba860db5.js";import{g as u,bm as q}from"./index-00419ca3.js";import{h as V}from"./CopyToClipboard-DSTf_eKU-e9d249b3.js";import{a as $}from"./Layouts-BlFm53ED-696867af.js";import{a as F,i as H}from"./JsonTree-aPaJmPx7-1ef3d092.js";import{n as J}from"./ScreenLayout-Ce16-u0i-552077d3.js";import{c as Q}from"./createLucideIcon-f6cc000b.js";import"./ModalHeader-YbJk-YIQ-1ed844bc.js";import"./Screen-CdOj1bUg-dadd3ff4.js";import"./index-Dq_xe9dz-184c2771.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]],K=Q("square-pen",Y),W=u.img`
  && {
    height: ${e=>e.size==="sm"?"65px":"140px"};
    width: ${e=>e.size==="sm"?"65px":"140px"};
    border-radius: 16px;
    margin-bottom: 12px;
  }
`;let B=e=>{if(!I(e))return e;try{let s=P(e);return s.includes("�")?e:s}catch{return e}},G=e=>{try{let s=q.decode(e),i=new TextDecoder().decode(s);return i.includes("�")?e:i}catch{return e}},X=e=>{let{types:s,primaryType:i,...l}=e.typedData;return a.jsxs(a.Fragment,{children:[a.jsx(te,{data:l}),a.jsx(V,{text:(o=e.typedData,JSON.stringify(o,null,2)),itemName:"full payload to clipboard"})," "]});var o};const Z=({method:e,messageData:s,copy:i,iconUrl:l,isLoading:o,success:g,walletProxyIsLoading:m,errorMessage:x,isCancellable:d,onSign:c,onCancel:y,onClose:p})=>a.jsx(J,{title:i.title,subtitle:i.description,showClose:!0,onClose:p,icon:K,iconVariant:"subtle",helpText:x?a.jsx(ee,{children:x}):void 0,primaryCta:{label:i.buttonText,onClick:c,disabled:o||g||m,loading:o},secondaryCta:d?{label:"Not now",onClick:y,disabled:o||g||m}:void 0,watermark:!0,children:a.jsxs($,{children:[l?a.jsx(W,{style:{alignSelf:"center"},size:"sm",src:l,alt:"app image"}):null,a.jsxs(M,{children:[e==="personal_sign"&&a.jsx(T,{children:B(s)}),e==="eth_signTypedData_v4"&&a.jsx(X,{typedData:s}),e==="solana_signMessage"&&a.jsx(T,{children:G(s)})]})]})}),ue={component:()=>{let{authenticated:e}=A(),{initializeWalletProxy:s,closePrivyModal:i}=N(),{navigate:l,data:o,onUserCloseViaDialogOrKeybindRef:g}=k(),[m,x]=r.useState(!0),[d,c]=r.useState(""),[y,p]=r.useState(),[S,w]=r.useState(null),[_,f]=r.useState(!1);r.useEffect(()=>{e||l("LandingScreen")},[e]),r.useEffect(()=>{s(O).then(n=>{x(!1),n||(c("An error has occurred, please try again."),p(new E(new b(d,C.E32603_DEFAULT_INTERNAL_ERROR.eipCode))))})},[]);let{method:R,data:j,confirmAndSign:v,onSuccess:D,onFailure:U,uiOptions:t}=o.signMessage,L={title:(t==null?void 0:t.title)||"Sign message",description:(t==null?void 0:t.description)||"Signing this message will not cost you any fees.",buttonText:(t==null?void 0:t.buttonText)||"Sign and continue"},h=n=>{n?D(n):U(y||new E(new b("The user rejected the request.",C.E4001_USER_REJECTED_REQUEST.eipCode))),i({shouldCallAuthOnSuccess:!1}),setTimeout(()=>{w(null),c(""),p(void 0)},200)};return g.current=()=>{h(S)},a.jsx(Z,{method:R,messageData:j,copy:L,iconUrl:t!=null&&t.iconUrl&&typeof t.iconUrl=="string"?t.iconUrl:void 0,isLoading:_,success:S!==null,walletProxyIsLoading:m,errorMessage:d,isCancellable:t==null?void 0:t.isCancellable,onSign:async()=>{f(!0),c("");try{let n=await v();w(n),f(!1),setTimeout(()=>{h(n)},z)}catch(n){console.error(n),c("An error has occurred, please try again."),p(new E(new b(d,C.E32603_DEFAULT_INTERNAL_ERROR.eipCode))),f(!1)}},onCancel:()=>h(null),onClose:()=>h(S)})}};let M=u.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`,ee=u.p`
  && {
    margin: 0;
    width: 100%;
    text-align: center;
    color: var(--privy-color-error-dark);
    font-size: 14px;
    line-height: 22px;
  }
`,te=u(F)`
  margin-top: 0;
`,T=u(H)`
  margin-top: 0;
`;export{ue as SignRequestScreen,Z as SignRequestView,ue as default};
