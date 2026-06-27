import{aY as a,bN as y,dE as F,cP as T,aU as I,cC as O,aV as d,ee as k}from"./index-6efb313d.js";import{a2 as _,g as n}from"./index-77dae828.js";import{h as q}from"./CopyToClipboard-DSTf_eKU-ee2dfc99.js";import{n as B}from"./OpenLink-DZHy38vr-edf7f692.js";import{C as E}from"./QrCode-BxAVhbx2-62079688.js";import{n as P}from"./ScreenLayout-Ce16-u0i-a78ebf8c.js";import{l as h}from"./farcaster-DPlSjvF5-1785148d.js";import"./browser-e933942f.js";import"./ModalHeader-YbJk-YIQ-63727d18.js";import"./Screen-CdOj1bUg-f0af9018.js";import"./index-Dq_xe9dz-514db2a0.js";let S="#8a63d2";const A=({appName:p,loading:m,success:i,errorMessage:e,connectUri:r,onBack:s,onClose:c,onOpenFarcaster:o})=>a.jsx(P,y||m?F?{title:e?e.message:"Add a signer to Farcaster",subtitle:e?e.detail:`This will allow ${p} to add casts, likes, follows, and more on your behalf.`,icon:h,iconVariant:"loading",iconLoadingStatus:{success:i,fail:!!e},primaryCta:r&&o?{label:"Open Farcaster app",onClick:o}:void 0,onBack:s,onClose:c,watermark:!0}:{title:e?e.message:"Requesting signer from Farcaster",subtitle:e?e.detail:"This should only take a moment",icon:h,iconVariant:"loading",iconLoadingStatus:{success:i,fail:!!e},onBack:s,onClose:c,watermark:!0,children:r&&y&&a.jsx(M,{children:a.jsx(B,{text:"Take me to Farcaster",url:r,color:S})})}:{title:"Add a signer to Farcaster",subtitle:`This will allow ${p} to add casts, likes, follows, and more on your behalf.`,onBack:s,onClose:c,watermark:!0,children:a.jsxs(N,{children:[a.jsx(R,{children:r?a.jsx(E,{url:r,size:275,squareLogoElement:h}):a.jsx(U,{children:a.jsx(_,{})})}),a.jsxs(V,{children:[a.jsx(L,{children:"Or copy this link and paste it into a phone browser to open the Farcaster app."}),r&&a.jsx(q,{text:r,itemName:"link",color:S})]})]})});let M=n.div`
  margin-top: 24px;
`,N=n.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`,R=n.div`
  padding: 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 275px;
`,V=n.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`,L=n.div`
  font-size: 0.875rem;
  text-align: center;
  color: var(--privy-color-foreground-2);
`,U=n.div`
  position: relative;
  width: 82px;
  height: 82px;
`;const $={component:()=>{let{lastScreen:p,navigateBack:m,data:i}=T(),e=I(),{requestFarcasterSignerStatus:r,closePrivyModal:s}=O(),[c,o]=d.useState(void 0),[j,x]=d.useState(!1),[w,v]=d.useState(!1),g=d.useRef([]),t=i==null?void 0:i.farcasterSigner;d.useEffect(()=>{let C=Date.now(),l=setInterval(async()=>{if(!(t!=null&&t.public_key))return clearInterval(l),void o({retryable:!0,message:"Connect failed",detail:"Something went wrong. Please try again."});t.status==="approved"&&(clearInterval(l),x(!1),v(!0),g.current.push(setTimeout(()=>s({shouldCallAuthOnSuccess:!1,isSuccess:!0}),k)));let u=await r(t==null?void 0:t.public_key),b=Date.now()-C;u.status==="approved"?(clearInterval(l),x(!1),v(!0),g.current.push(setTimeout(()=>s({shouldCallAuthOnSuccess:!1,isSuccess:!0}),k))):b>3e5?(clearInterval(l),o({retryable:!0,message:"Connect failed",detail:"The request timed out. Try again."})):u.status==="revoked"&&(clearInterval(l),o({retryable:!0,message:"Request rejected",detail:"The request was rejected. Please try again."}))},2e3);return()=>{clearInterval(l),g.current.forEach(u=>clearTimeout(u))}},[]);let f=(t==null?void 0:t.status)==="pending_approval"?t.signer_approval_url:void 0;return a.jsx(A,{appName:e.name,loading:j,success:w,errorMessage:c,connectUri:f,onBack:p?m:void 0,onClose:s,onOpenFarcaster:()=>{f&&(window.location.href=f)}})}};export{$ as FarcasterSignerStatusScreen,A as FarcasterSignerStatusView,$ as default};
